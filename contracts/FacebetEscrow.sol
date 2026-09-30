// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FacebetEscrow — v2
 * @notice Holds $FBET tokens and optionally USDC for prize payouts, duel
 *         settlements, and queue-jump payments.
 *
 * Security Improvements (v2):
 *   - Multi-token: supports both FBET and USDC natively via IERC20 interface.
 *   - Re-entrancy guard (mutex lock) on all fund-moving functions.
 *   - 2-step ownership transfer (propose + accept) — prevents accidental key rotation.
 *   - Minimum stake enforcement for duels.
 *   - Emergency pause for draining if operator key is compromised.
 *   - Platform fee recipient is a separate configurable address (not just owner).
 *   - setToken restricted: can only be set once per token slot.
 *   - Player stake registry: tracks which player deposited how much per room.
 *
 * Deployment Order:
 *   1. Deploy FacebetEscrow first.
 *   2. Deploy FacebetToken(escrowAddress, treasuryWallet).
 *   3. Call setFbetToken(fbetAddress) on this contract.
 *   4. Optionally call setUsdcToken(usdcAddress) for USDC duel support.
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract FacebetEscrow {

    // ─── Access Control ──────────────────────────────────────────────────────
    address public owner;
    address public pendingOwner;
    address public feeRecipient;  // Separate from owner — platform revenue wallet
    bool    public paused;        // Emergency pause

    // ─── Token References ────────────────────────────────────────────────────
    IERC20 public fbetToken;
    IERC20 public usdcToken;

    // ─── Duel Stake Tracking ─────────────────────────────────────────────────
    enum TokenType { FBET, USDC }

    struct DuelRoom {
        uint256    totalStake;
        bool       settled;
        TokenType  tokenType;
        address    player1;
        address    player2;
        uint256    player1Stake;
        uint256    player2Stake;
    }

    mapping(bytes32 => DuelRoom) public duelRooms;

    // ─── Re-entrancy Guard ────────────────────────────────────────────────────
    uint256 private _guardStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;

    modifier nonReentrant() {
        require(_guardStatus != _ENTERED, "FacebetEscrow: re-entrant call");
        _guardStatus = _ENTERED;
        _;
        _guardStatus = _NOT_ENTERED;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "FacebetEscrow: not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "FacebetEscrow: contract is paused");
        _;
    }

    // ─── Events ──────────────────────────────────────────────────────────────
    event FbetTokenSet(address indexed tokenAddress);
    event UsdcTokenSet(address indexed tokenAddress);
    event FeeRecipientUpdated(address indexed newRecipient);
    event PayoutReleased(address indexed recipient, uint256 amount, TokenType tokenType, string reason);
    event DuelStakeLocked(bytes32 indexed roomId, address indexed player, uint256 amount, TokenType tokenType);
    event DuelWinnerPaid(bytes32 indexed roomId, address indexed winner, uint256 amount, TokenType tokenType, string reason);
    event QueueJumpPaid(address indexed player, uint256 amount, TokenType tokenType);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event OwnershipTransferProposed(address indexed currentOwner, address indexed proposedOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address _feeRecipient) {
        require(_feeRecipient != address(0), "FacebetEscrow: zero fee recipient");
        owner        = msg.sender;
        feeRecipient = _feeRecipient;
        _guardStatus = _NOT_ENTERED;
    }

    // ─── Token Setup (one-time per slot) ─────────────────────────────────────
    function setFbetToken(address tokenAddress) external onlyOwner {
        require(address(fbetToken) == address(0), "FacebetEscrow: FBET already set");
        require(tokenAddress != address(0),        "FacebetEscrow: zero token address");
        fbetToken = IERC20(tokenAddress);
        emit FbetTokenSet(tokenAddress);
    }

    function setUsdcToken(address tokenAddress) external onlyOwner {
        require(address(usdcToken) == address(0), "FacebetEscrow: USDC already set");
        require(tokenAddress != address(0),        "FacebetEscrow: zero token address");
        usdcToken = IERC20(tokenAddress);
        emit UsdcTokenSet(tokenAddress);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "FacebetEscrow: zero recipient");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    // ─── Balance Helpers ──────────────────────────────────────────────────────
    function fbetBalance() external view returns (uint256) {
        return address(fbetToken) != address(0) ? fbetToken.balanceOf(address(this)) : 0;
    }

    function usdcBalance() external view returns (uint256) {
        return address(usdcToken) != address(0) ? usdcToken.balanceOf(address(this)) : 0;
    }

    // ─── Jackpot/Prize Payout (owner only) ───────────────────────────────────
    /// @notice Release FBET to a jackpot winner.
    function releaseFbetPayout(
        address recipient,
        uint256 amount,
        string calldata reason
    ) external onlyOwner nonReentrant whenNotPaused {
        require(recipient != address(0),     "FacebetEscrow: zero recipient");
        require(address(fbetToken) != address(0), "FacebetEscrow: FBET not set");
        require(fbetToken.transfer(recipient, amount), "FacebetEscrow: FBET transfer failed");
        emit PayoutReleased(recipient, amount, TokenType.FBET, reason);
    }

    /// @notice Release USDC to a jackpot winner.
    function releaseUsdcPayout(
        address recipient,
        uint256 amount,
        string calldata reason
    ) external onlyOwner nonReentrant whenNotPaused {
        require(recipient != address(0),     "FacebetEscrow: zero recipient");
        require(address(usdcToken) != address(0), "FacebetEscrow: USDC not set");
        require(usdcToken.transfer(recipient, amount), "FacebetEscrow: USDC transfer failed");
        emit PayoutReleased(recipient, amount, TokenType.USDC, reason);
    }

    // ─── P2P Duel: Lock FBET Stake ────────────────────────────────────────────
    /// @notice Player pre-approves this contract, then locks their FBET stake.
    function lockFbetDuelStake(bytes32 roomId, uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0,                     "FacebetEscrow: amount is zero");
        DuelRoom storage room = duelRooms[roomId];
        require(!room.settled,                  "FacebetEscrow: duel already settled");
        require(address(fbetToken) != address(0), "FacebetEscrow: FBET not set");

        // First deposit sets token type
        if (room.player1 == address(0)) {
            room.tokenType = TokenType.FBET;
            room.player1   = msg.sender;
            room.player1Stake = amount;
        } else {
            require(room.tokenType == TokenType.FBET, "FacebetEscrow: token type mismatch");
            require(room.player2 == address(0),       "FacebetEscrow: room full");
            room.player2      = msg.sender;
            room.player2Stake = amount;
        }

        require(fbetToken.transferFrom(msg.sender, address(this), amount),
            "FacebetEscrow: stake transfer failed");
        room.totalStake += amount;
        emit DuelStakeLocked(roomId, msg.sender, amount, TokenType.FBET);
    }

    // ─── P2P Duel: Lock USDC Stake ───────────────────────────────────────────
    function lockUsdcDuelStake(bytes32 roomId, uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0,                     "FacebetEscrow: amount is zero");
        DuelRoom storage room = duelRooms[roomId];
        require(!room.settled,                  "FacebetEscrow: duel already settled");
        require(address(usdcToken) != address(0), "FacebetEscrow: USDC not set");

        if (room.player1 == address(0)) {
            room.tokenType = TokenType.USDC;
            room.player1   = msg.sender;
            room.player1Stake = amount;
        } else {
            require(room.tokenType == TokenType.USDC, "FacebetEscrow: token type mismatch");
            require(room.player2 == address(0),       "FacebetEscrow: room full");
            room.player2      = msg.sender;
            room.player2Stake = amount;
        }

        require(usdcToken.transferFrom(msg.sender, address(this), amount),
            "FacebetEscrow: USDC stake transfer failed");
        room.totalStake += amount;
        emit DuelStakeLocked(roomId, msg.sender, amount, TokenType.USDC);
    }

    // ─── P2P Duel: Settle Winner (owner only) ────────────────────────────────
    /// @notice 90% of total stake goes to winner. 10% to feeRecipient.
    function awardDuelWinner(
        bytes32 roomId,
        address winner,
        string calldata reason
    ) external onlyOwner nonReentrant whenNotPaused {
        DuelRoom storage room = duelRooms[roomId];
        require(!room.settled,        "FacebetEscrow: already settled");
        uint256 total = room.totalStake;
        require(total > 0,            "FacebetEscrow: no stake for room");
        require(winner == room.player1 || winner == room.player2, "FacebetEscrow: invalid winner");

        room.settled    = true;
        room.totalStake = 0;

        uint256 platformCut  = (total * 10) / 100;
        uint256 winnerAmount = total - platformCut;

        IERC20 tok = room.tokenType == TokenType.USDC ? usdcToken : fbetToken;
        require(tok.transfer(winner,       winnerAmount), "FacebetEscrow: winner transfer failed");
        require(tok.transfer(feeRecipient, platformCut),  "FacebetEscrow: fee transfer failed");

        emit DuelWinnerPaid(roomId, winner, winnerAmount, room.tokenType, reason);
    }

    // ─── Queue-Jump Payment ───────────────────────────────────────────────────
    function payFbetQueueJump(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "FacebetEscrow: zero amount");
        require(address(fbetToken) != address(0), "FacebetEscrow: FBET not set");
        require(fbetToken.transferFrom(msg.sender, address(this), amount),
            "FacebetEscrow: queue-jump transfer failed");
        emit QueueJumpPaid(msg.sender, amount, TokenType.FBET);
    }

    // ─── Emergency Pause ─────────────────────────────────────────────────────
    function pause()   external onlyOwner { paused = true;  emit Paused(msg.sender); }
    function unpause() external onlyOwner { paused = false; emit Unpaused(msg.sender); }

    // ─── 2-Step Ownership Transfer ────────────────────────────────────────────
    function proposeOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "FacebetEscrow: zero address");
        pendingOwner = newOwner;
        emit OwnershipTransferProposed(owner, newOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "FacebetEscrow: not pending owner");
        emit OwnershipTransferred(owner, pendingOwner);
        owner        = pendingOwner;
        pendingOwner = address(0);
    }

    // ─── View Helpers ─────────────────────────────────────────────────────────
    function getDuelRoom(bytes32 roomId) external view returns (
        uint256 totalStake,
        bool settled,
        uint8 tokenType,
        address player1,
        address player2,
        uint256 player1Stake,
        uint256 player2Stake
    ) {
        DuelRoom storage r = duelRooms[roomId];
        return (r.totalStake, r.settled, uint8(r.tokenType), r.player1, r.player2, r.player1Stake, r.player2Stake);
    }
}
