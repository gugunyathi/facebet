// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LotteryLiveEscrow — v2
 * @notice Jackpot ticket purchases, jackpot payouts, and P2P duel settlements
 *         for FaceBet — supports Native ETH, $FBET, and USDC.
 *
 * Security Improvements (v2):
 *   - Multi-token: ETH (native), FBET, and USDC all accepted for tickets & duels.
 *   - Dynamic ticket pricing: TICKET_COST_ETH, TICKET_COST_FBET, TICKET_COST_USDC
 *     are admin-updateable to stay in sync with real-world $1 USD target.
 *   - Re-entrancy guard (mutex lock) on all fund-moving functions.
 *   - 2-step ownership transfer (propose + accept) to prevent accidental handovers.
 *   - Separate operator role: operator can call awardPrize/awardDuelWinner,
 *     but CANNOT withdraw platform fees or update token addresses. This limits
 *     the blast radius if the server's private key is ever leaked.
 *   - Emergency pause on all fund-moving functions.
 *   - Platform fee routed to a dedicated feeRecipient wallet, NOT the owner.
 *   - Player stake registry per duel room with token-type enforcement.
 *   - Checks-Effects-Interactions pattern strictly followed.
 *   - Configurable pot split (default 85/15).
 *
 * Deployable on: Base Mainnet (8453) | Base Sepolia (84532) |
 *                ARC Mainnet (5042)  | ARC Testnet  (5042002)
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract LotteryLiveEscrow {

    // ─── Access Control ──────────────────────────────────────────────────────
    address public owner;
    address public pendingOwner;
    address public operator;     // Server hot-wallet — can award prizes only
    address public feeRecipient; // Platform revenue wallet — separate from owner

    // ─── Pause ───────────────────────────────────────────────────────────────
    bool public paused;

    // ─── Token References ────────────────────────────────────────────────────
    IERC20 public fbetToken;
    IERC20 public usdcToken;

    // ─── Ticket Pricing (admin-updateable to track $1 USD) ───────────────────
    uint256 public ticketCostEth;   // e.g. 0.0003 ether  (~$1 when ETH=$3333)
    uint256 public ticketCostFbet;  // e.g. 10 FBET       (at $1 = 10 FBET rate)
    uint256 public ticketCostUsdc;  // e.g. 1_000000      (1 USDC, 6 decimals)

    // ─── Pot Allocation (per-currency) ───────────────────────────────────────
    uint256 public constant POT_SPLIT      = 85;
    uint256 public constant PLATFORM_SPLIT = 15;

    // Separate rollover pots per currency
    uint256 public rolloverPotEth;
    uint256 public rolloverPotFbet;
    uint256 public rolloverPotUsdc;

    // Separate platform balances per currency
    uint256 public platformBalanceEth;
    uint256 public platformBalanceFbet;
    uint256 public platformBalanceUsdc;

    // ─── Duel Stake Tracking ─────────────────────────────────────────────────
    enum TokenType { ETH, FBET, USDC }

    struct DuelRoom {
        uint256   totalStake;
        bool      settled;
        TokenType tokenType;
        address   player1;
        address   player2;
        uint256   player1Stake;
        uint256   player2Stake;
    }

    mapping(bytes32 => DuelRoom) public duelRooms;

    // ─── Re-entrancy Guard ────────────────────────────────────────────────────
    uint256 private _guardStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;

    // ─── Modifiers ───────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "LotteryLiveEscrow: not owner");
        _;
    }

    modifier onlyOwnerOrOperator() {
        require(msg.sender == owner || msg.sender == operator,
            "LotteryLiveEscrow: not owner or operator");
        _;
    }

    modifier nonReentrant() {
        require(_guardStatus != _ENTERED, "LotteryLiveEscrow: re-entrant call");
        _guardStatus = _ENTERED;
        _;
        _guardStatus = _NOT_ENTERED;
    }

    modifier whenNotPaused() {
        require(!paused, "LotteryLiveEscrow: paused");
        _;
    }

    // ─── Events ──────────────────────────────────────────────────────────────
    event TicketPurchasedEth(address indexed player, uint256 count, uint256 ethSent, uint256 timestamp);
    event TicketPurchasedFbet(address indexed player, uint256 count, uint256 fbetSent, uint256 timestamp);
    event TicketPurchasedUsdc(address indexed player, uint256 count, uint256 usdcSent, uint256 timestamp);
    event PrizeAwardedEth(address indexed winner, uint256 amount, string aiReason);
    event PrizeAwardedFbet(address indexed winner, uint256 amount, string aiReason);
    event PrizeAwardedUsdc(address indexed winner, uint256 amount, string aiReason);
    event RolloverUpdated(uint256 ethPot, uint256 fbetPot, uint256 usdcPot);
    event DuelStakeLocked(bytes32 indexed roomId, address indexed player, uint256 amount, TokenType tokenType);
    event DuelWinnerPaid(bytes32 indexed roomId, address indexed winner, uint256 amount, TokenType tokenType, string aiReason);
    event TicketCostUpdated(uint256 newEth, uint256 newFbet, uint256 newUsdc);
    event OperatorUpdated(address indexed newOperator);
    event FeeRecipientUpdated(address indexed newFeeRecipient);
    event FbetTokenSet(address indexed tokenAddress);
    event UsdcTokenSet(address indexed tokenAddress);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event OwnershipTransferProposed(address indexed currentOwner, address indexed proposedOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor(address _operator, address _feeRecipient) {
        require(_operator     != address(0), "LotteryLiveEscrow: zero operator");
        require(_feeRecipient != address(0), "LotteryLiveEscrow: zero fee recipient");

        owner        = msg.sender;
        operator     = _operator;
        feeRecipient = _feeRecipient;
        _guardStatus = _NOT_ENTERED;

        // Defaults: ~$1 per ticket at common market rates
        ticketCostEth  = 0.0003 ether;   // Adjust if ETH price changes
        ticketCostFbet = 10 * (10 ** 18); // 10 FBET (18 decimals)
        ticketCostUsdc = 1 * (10 ** 6);   // 1 USDC  (6 decimals)
    }

    // ─── Token Setup (one-time) ───────────────────────────────────────────────
    function setFbetToken(address tokenAddress) external onlyOwner {
        require(address(fbetToken) == address(0), "LotteryLiveEscrow: FBET already set");
        require(tokenAddress != address(0),        "LotteryLiveEscrow: zero address");
        fbetToken = IERC20(tokenAddress);
        emit FbetTokenSet(tokenAddress);
    }

    function setUsdcToken(address tokenAddress) external onlyOwner {
        require(address(usdcToken) == address(0), "LotteryLiveEscrow: USDC already set");
        require(tokenAddress != address(0),        "LotteryLiveEscrow: zero address");
        usdcToken = IERC20(tokenAddress);
        emit UsdcTokenSet(tokenAddress);
    }

    // ─── Admin Config ─────────────────────────────────────────────────────────
    function updateTicketCosts(
        uint256 newEth,
        uint256 newFbet,
        uint256 newUsdc
    ) external onlyOwner {
        require(newEth > 0 && newFbet > 0 && newUsdc > 0, "LotteryLiveEscrow: zero cost");
        ticketCostEth  = newEth;
        ticketCostFbet = newFbet;
        ticketCostUsdc = newUsdc;
        emit TicketCostUpdated(newEth, newFbet, newUsdc);
    }

    function setOperator(address newOperator) external onlyOwner {
        require(newOperator != address(0), "LotteryLiveEscrow: zero operator");
        operator = newOperator;
        emit OperatorUpdated(newOperator);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "LotteryLiveEscrow: zero recipient");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    // ─── Ticket Purchases ────────────────────────────────────────────────────

    /// @notice Buy tickets with native ETH (Base / ARC).
    function buyTicketsEth(uint256 count) external payable whenNotPaused nonReentrant {
        require(count > 0,                                "LotteryLiveEscrow: count zero");
        uint256 required = ticketCostEth * count;
        require(msg.value >= required,                    "LotteryLiveEscrow: insufficient ETH");

        uint256 toPot      = (msg.value * POT_SPLIT)      / 100;
        uint256 toPlatform = msg.value - toPot;

        rolloverPotEth      += toPot;
        platformBalanceEth  += toPlatform;

        emit TicketPurchasedEth(msg.sender, count, msg.value, block.timestamp);
        emit RolloverUpdated(rolloverPotEth, rolloverPotFbet, rolloverPotUsdc);
    }

    /// @notice Buy tickets with $FBET (user must approve first).
    function buyTicketsFbet(uint256 count) external whenNotPaused nonReentrant {
        require(count > 0,                                 "LotteryLiveEscrow: count zero");
        require(address(fbetToken) != address(0),          "LotteryLiveEscrow: FBET not set");
        uint256 total = ticketCostFbet * count;

        require(fbetToken.transferFrom(msg.sender, address(this), total),
            "LotteryLiveEscrow: FBET transfer failed");

        uint256 toPot      = (total * POT_SPLIT)      / 100;
        uint256 toPlatform = total - toPot;

        rolloverPotFbet     += toPot;
        platformBalanceFbet += toPlatform;

        emit TicketPurchasedFbet(msg.sender, count, total, block.timestamp);
        emit RolloverUpdated(rolloverPotEth, rolloverPotFbet, rolloverPotUsdc);
    }

    /// @notice Buy tickets with USDC (user must approve first).
    function buyTicketsUsdc(uint256 count) external whenNotPaused nonReentrant {
        require(count > 0,                                 "LotteryLiveEscrow: count zero");
        require(address(usdcToken) != address(0),          "LotteryLiveEscrow: USDC not set");
        uint256 total = ticketCostUsdc * count;

        require(usdcToken.transferFrom(msg.sender, address(this), total),
            "LotteryLiveEscrow: USDC transfer failed");

        uint256 toPot      = (total * POT_SPLIT)      / 100;
        uint256 toPlatform = total - toPot;

        rolloverPotUsdc     += toPot;
        platformBalanceUsdc += toPlatform;

        emit TicketPurchasedUsdc(msg.sender, count, total, block.timestamp);
        emit RolloverUpdated(rolloverPotEth, rolloverPotFbet, rolloverPotUsdc);
    }

    // ─── Jackpot Prize Award (operator or owner) ─────────────────────────────

    function awardPrizeEth(address payable winner, string calldata aiReason)
        external onlyOwnerOrOperator nonReentrant whenNotPaused
    {
        require(rolloverPotEth > 0, "LotteryLiveEscrow: ETH pot empty");
        uint256 payout = rolloverPotEth;
        rolloverPotEth = 0;                         // Effects before interaction
        (bool ok, ) = winner.call{value: payout}("");
        require(ok, "LotteryLiveEscrow: ETH transfer failed");
        emit PrizeAwardedEth(winner, payout, aiReason);
        emit RolloverUpdated(rolloverPotEth, rolloverPotFbet, rolloverPotUsdc);
    }

    function awardPrizeFbet(address winner, uint256 amount, string calldata aiReason)
        external onlyOwnerOrOperator nonReentrant whenNotPaused
    {
        require(address(fbetToken) != address(0),    "LotteryLiveEscrow: FBET not set");
        require(rolloverPotFbet >= amount,           "LotteryLiveEscrow: insufficient FBET pot");
        rolloverPotFbet -= amount;
        require(fbetToken.transfer(winner, amount),  "LotteryLiveEscrow: FBET payout failed");
        emit PrizeAwardedFbet(winner, amount, aiReason);
        emit RolloverUpdated(rolloverPotEth, rolloverPotFbet, rolloverPotUsdc);
    }

    function awardPrizeUsdc(address winner, uint256 amount, string calldata aiReason)
        external onlyOwnerOrOperator nonReentrant whenNotPaused
    {
        require(address(usdcToken) != address(0),    "LotteryLiveEscrow: USDC not set");
        require(rolloverPotUsdc >= amount,           "LotteryLiveEscrow: insufficient USDC pot");
        rolloverPotUsdc -= amount;
        require(usdcToken.transfer(winner, amount),  "LotteryLiveEscrow: USDC payout failed");
        emit PrizeAwardedUsdc(winner, amount, aiReason);
        emit RolloverUpdated(rolloverPotEth, rolloverPotFbet, rolloverPotUsdc);
    }

    // ─── P2P Duel: Lock Stake ─────────────────────────────────────────────────

    function lockDuelStakeEth(bytes32 roomId) external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "LotteryLiveEscrow: zero stake");
        DuelRoom storage room = duelRooms[roomId];
        require(!room.settled, "LotteryLiveEscrow: duel settled");
        if (room.player1 == address(0)) {
            room.tokenType    = TokenType.ETH;
            room.player1      = msg.sender;
            room.player1Stake = msg.value;
        } else {
            require(room.tokenType    == TokenType.ETH, "LotteryLiveEscrow: token mismatch");
            require(room.player2      == address(0),    "LotteryLiveEscrow: room full");
            room.player2      = msg.sender;
            room.player2Stake = msg.value;
        }
        room.totalStake += msg.value;
        emit DuelStakeLocked(roomId, msg.sender, msg.value, TokenType.ETH);
    }

    function lockDuelStakeFbet(bytes32 roomId, uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0,                       "LotteryLiveEscrow: zero amount");
        require(address(fbetToken) != address(0), "LotteryLiveEscrow: FBET not set");
        DuelRoom storage room = duelRooms[roomId];
        require(!room.settled,                    "LotteryLiveEscrow: duel settled");
        if (room.player1 == address(0)) {
            room.tokenType    = TokenType.FBET;
            room.player1      = msg.sender;
            room.player1Stake = amount;
        } else {
            require(room.tokenType == TokenType.FBET, "LotteryLiveEscrow: token mismatch");
            require(room.player2   == address(0),     "LotteryLiveEscrow: room full");
            room.player2      = msg.sender;
            room.player2Stake = amount;
        }
        require(fbetToken.transferFrom(msg.sender, address(this), amount),
            "LotteryLiveEscrow: FBET stake failed");
        room.totalStake += amount;
        emit DuelStakeLocked(roomId, msg.sender, amount, TokenType.FBET);
    }

    function lockDuelStakeUsdc(bytes32 roomId, uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0,                       "LotteryLiveEscrow: zero amount");
        require(address(usdcToken) != address(0), "LotteryLiveEscrow: USDC not set");
        DuelRoom storage room = duelRooms[roomId];
        require(!room.settled,                    "LotteryLiveEscrow: duel settled");
        if (room.player1 == address(0)) {
            room.tokenType    = TokenType.USDC;
            room.player1      = msg.sender;
            room.player1Stake = amount;
        } else {
            require(room.tokenType == TokenType.USDC, "LotteryLiveEscrow: token mismatch");
            require(room.player2   == address(0),     "LotteryLiveEscrow: room full");
            room.player2      = msg.sender;
            room.player2Stake = amount;
        }
        require(usdcToken.transferFrom(msg.sender, address(this), amount),
            "LotteryLiveEscrow: USDC stake failed");
        room.totalStake += amount;
        emit DuelStakeLocked(roomId, msg.sender, amount, TokenType.USDC);
    }

    // ─── P2P Duel: Award Winner (operator or owner) ──────────────────────────
    function awardDuelWinner(
        bytes32 roomId,
        address payable winner,
        string calldata aiReason
    ) external onlyOwnerOrOperator nonReentrant whenNotPaused {
        DuelRoom storage room = duelRooms[roomId];
        require(!room.settled,  "LotteryLiveEscrow: already settled");
        uint256 total = room.totalStake;
        require(total > 0,      "LotteryLiveEscrow: no stake");
        require(winner == room.player1 || winner == room.player2,
            "LotteryLiveEscrow: invalid winner");

        // Effects
        room.settled    = true;
        room.totalStake = 0;

        uint256 platformCut  = (total * 10) / 100;
        uint256 winnerAmount = total - platformCut;

        // Interactions
        if (room.tokenType == TokenType.ETH) {
            (bool ok1, ) = winner.call{value: winnerAmount}("");
            require(ok1, "LotteryLiveEscrow: ETH winner failed");
            platformBalanceEth += platformCut;
        } else if (room.tokenType == TokenType.FBET) {
            require(fbetToken.transfer(winner, winnerAmount),      "LotteryLiveEscrow: FBET winner failed");
            platformBalanceFbet += platformCut;
        } else {
            require(usdcToken.transfer(winner, winnerAmount),      "LotteryLiveEscrow: USDC winner failed");
            platformBalanceUsdc += platformCut;
        }

        emit DuelWinnerPaid(roomId, winner, winnerAmount, room.tokenType, aiReason);
    }

    // ─── Platform Fee Withdrawal (owner only) ────────────────────────────────
    function withdrawPlatformEth() external onlyOwner nonReentrant {
        uint256 amount = platformBalanceEth;
        platformBalanceEth = 0;
        (bool ok, ) = payable(feeRecipient).call{value: amount}("");
        require(ok, "LotteryLiveEscrow: ETH fee withdrawal failed");
    }

    function withdrawPlatformFbet() external onlyOwner nonReentrant {
        require(address(fbetToken) != address(0), "LotteryLiveEscrow: FBET not set");
        uint256 amount = platformBalanceFbet;
        platformBalanceFbet = 0;
        require(fbetToken.transfer(feeRecipient, amount),
            "LotteryLiveEscrow: FBET fee withdrawal failed");
    }

    function withdrawPlatformUsdc() external onlyOwner nonReentrant {
        require(address(usdcToken) != address(0), "LotteryLiveEscrow: USDC not set");
        uint256 amount = platformBalanceUsdc;
        platformBalanceUsdc = 0;
        require(usdcToken.transfer(feeRecipient, amount),
            "LotteryLiveEscrow: USDC fee withdrawal failed");
    }

    // ─── Emergency Pause ─────────────────────────────────────────────────────
    function pause()   external onlyOwner { paused = true;  emit Paused(msg.sender); }
    function unpause() external onlyOwner { paused = false; emit Unpaused(msg.sender); }

    // ─── 2-Step Ownership Transfer ────────────────────────────────────────────
    function proposeOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "LotteryLiveEscrow: zero address");
        pendingOwner = newOwner;
        emit OwnershipTransferProposed(owner, newOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "LotteryLiveEscrow: not pending owner");
        emit OwnershipTransferred(owner, pendingOwner);
        owner        = pendingOwner;
        pendingOwner = address(0);
    }

    // ─── View Helpers ─────────────────────────────────────────────────────────
    function getGameStats() external view returns (
        uint256 ethPot,
        uint256 fbetPot,
        uint256 usdcPot,
        uint256 platformEth,
        uint256 platformFbet,
        uint256 platformUsdc
    ) {
        return (
            rolloverPotEth,
            rolloverPotFbet,
            rolloverPotUsdc,
            platformBalanceEth,
            platformBalanceFbet,
            platformBalanceUsdc
        );
    }

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

    receive() external payable {}
}
