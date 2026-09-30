// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FacebetEscrow
 * @notice Holds 50% of the FBET token supply for prize payouts, duel settlements,
 *         and queue-jump payments. Deployed BEFORE FacebetToken so its address
 *         can be passed into the token constructor.
 *
 *  - Owner (platform operator) can release FBET to any winner or payee.
 *  - Accepts FBET deposits from anyone (users paying to jump queue, etc.).
 *  - Tracks duel stakes: players approve + call lockDuelStake; owner settles.
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract FacebetEscrow {
    address public owner;
    IERC20  public token; // Set once after token is deployed

    // Duel stake tracking
    mapping(bytes32 => uint256) public duelStakes;
    mapping(bytes32 => bool)    public duelSettled;

    // Events
    event TokenSet(address indexed tokenAddress);
    event PayoutReleased(address indexed recipient, uint256 amount, string reason);
    event DuelStakeLocked(bytes32 indexed roomId, address indexed player, uint256 amount);
    event DuelWinnerPaid(bytes32 indexed roomId, address indexed winner, uint256 amount, string reason);
    event QueueJumpPaid(address indexed player, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "FacebetEscrow: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ── One-time token address binding (called after FacebetToken is deployed) ──
    function setToken(address tokenAddress) external onlyOwner {
        require(address(token) == address(0), "FacebetEscrow: token already set");
        require(tokenAddress != address(0),   "FacebetEscrow: zero token address");
        token = IERC20(tokenAddress);
        emit TokenSet(tokenAddress);
    }

    // ── View escrow FBET balance ──────────────────────────────────────────────
    function escrowBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    // ── Release payout to winner (jackpot / match prize) ─────────────────────
    function releasePayout(
        address recipient,
        uint256 amount,
        string calldata reason
    ) external onlyOwner {
        require(recipient != address(0), "FacebetEscrow: zero recipient");
        require(token.transfer(recipient, amount), "FacebetEscrow: transfer failed");
        emit PayoutReleased(recipient, amount, reason);
    }

    // ── P2P Duel: Player locks FBET stake ─────────────────────────────────────
    // Player must approve this contract for mount FBET before calling.
    function lockDuelStake(bytes32 roomId, uint256 amount) external {
        require(amount > 0,               "FacebetEscrow: amount is zero");
        require(!duelSettled[roomId],     "FacebetEscrow: duel already settled");
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "FacebetEscrow: stake transfer failed"
        );
        duelStakes[roomId] += amount;
        emit DuelStakeLocked(roomId, msg.sender, amount);
    }

    // ── P2P Duel: Owner settles and pays winner ───────────────────────────────
    // 90% to winner | 10% stays in escrow as platform fee
    function awardDuelWinner(
        bytes32 roomId,
        address winner,
        string calldata reason
    ) external onlyOwner {
        require(!duelSettled[roomId], "FacebetEscrow: already settled");
        uint256 total = duelStakes[roomId];
        require(total > 0,            "FacebetEscrow: no stake for room");

        duelSettled[roomId] = true;
        duelStakes[roomId]  = 0;

        uint256 platformCut  = (total * 10) / 100;
        uint256 winnerAmount = total - platformCut;

        require(token.transfer(winner, winnerAmount), "FacebetEscrow: winner transfer failed");
        emit DuelWinnerPaid(roomId, winner, winnerAmount, reason);
    }

    // ── Queue-jump payment (user pays FBET, burned into escrow pot) ───────────
    function payQueueJump(uint256 amount) external {
        require(amount > 0, "FacebetEscrow: zero amount");
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "FacebetEscrow: queue-jump transfer failed"
        );
        emit QueueJumpPaid(msg.sender, amount);
    }

    // ── Ownership transfer ────────────────────────────────────────────────────
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "FacebetEscrow: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ── View helper ───────────────────────────────────────────────────────────
    function getDuelStake(bytes32 roomId) external view returns (uint256 amount, bool settled) {
        return (duelStakes[roomId], duelSettled[roomId]);
    }
}
