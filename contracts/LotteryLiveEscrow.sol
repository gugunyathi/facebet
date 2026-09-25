// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title LotteryLiveEscrow — FaceBet P2P & Jackpot Escrow Contract
/// @notice Handles ticket purchases, jackpot payouts, and P2P duel prize settlements.
///         Deployable on Base Mainnet, Base Sepolia, ARC Mainnet, and ARC Testnet.
contract LotteryLiveEscrow {
    address public owner;
    uint256 public constant TICKET_COST = 0.0003 ether; // ~$1 on Base / ARC
    uint256 public rolloverPot;
    uint256 public platformBalance;

    // Allocation splits: 85% goes to rollover pool, 15% to platform/AI funding
    uint256 public constant POT_SPLIT = 85;
    uint256 public constant PLATFORM_SPLIT = 15;

    // Duel stake tracking — maps roomId hash to locked stake amount
    mapping(bytes32 => uint256) public duelStakes;
    mapping(bytes32 => bool)    public duelSettled;

    // ─── Events ──────────────────────────────────────────────────────────────
    event TicketPurchased(address indexed player, uint256 count, uint256 timestamp);
    event PrizeAwarded(address indexed winner, uint256 amount, string aiReason);
    event RolloverUpdated(uint256 newTotal);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event DuelStakeLocked(bytes32 indexed roomId, address indexed player, uint256 amount);
    event DuelWinnerPaid(bytes32 indexed roomId, address indexed winner, uint256 amount, string aiReason);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the platform operator can call this.");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ─── Jackpot Ticket Purchase ──────────────────────────────────────────────
    /// @notice Purchase tickets. ETH is split 85/15 between rollover pot and platform.
    function buyTickets(uint256 ticketCount) external payable {
        require(ticketCount > 0, "Must buy at least 1 ticket slot.");
        uint256 requiredAmount = TICKET_COST * ticketCount;
        require(msg.value >= requiredAmount, "Insufficient ETH sent for purchase.");

        uint256 totalAmount = msg.value;
        uint256 toPot = (totalAmount * POT_SPLIT) / 100;
        uint256 toPlatform = totalAmount - toPot;

        rolloverPot += toPot;
        platformBalance += toPlatform;

        emit TicketPurchased(msg.sender, ticketCount, block.timestamp);
        emit RolloverUpdated(rolloverPot);
    }

    // ─── Jackpot Prize Award (Owner Only) ────────────────────────────────────
    /// @notice Triggered automatically by the backend when Gemini confirms a match win.
    function awardPrize(address payable winner, string calldata aiReason) external onlyOwner {
        require(rolloverPot > 0, "No funds available in the rollover pot pool.");

        uint256 payoutAmount = rolloverPot;
        rolloverPot = 0; // Drain before sending to prevent re-entrancy

        (bool success, ) = winner.call{value: payoutAmount}("");
        require(success, "Cryptocurrency transfer to winner failed.");

        emit PrizeAwarded(winner, payoutAmount, aiReason);
        emit RolloverUpdated(0);
    }

    // ─── P2P Duel: Lock Stake ─────────────────────────────────────────────────
    /// @notice Players send ETH to lock their stake for a P2P duel room.
    ///         Both players call this with the same roomId before the duel starts.
    function lockDuelStake(bytes32 roomId) external payable {
        require(msg.value > 0, "Must send ETH to lock duel stake.");
        require(!duelSettled[roomId], "Duel already settled.");
        duelStakes[roomId] += msg.value;
        emit DuelStakeLocked(roomId, msg.sender, msg.value);
    }

    // ─── P2P Duel: Award Winner (Owner Only) ─────────────────────────────────
    /// @notice Called by the backend after Gemini AI determines the P2P duel winner.
    ///         Transfers 90% of locked stake to winner; 10% to platform.
    function awardDuelWinner(
        bytes32 roomId,
        address payable winner,
        string calldata aiReason
    ) external onlyOwner {
        require(!duelSettled[roomId], "Duel already settled.");
        uint256 totalStake = duelStakes[roomId];
        require(totalStake > 0, "No stake locked for this duel room.");

        duelSettled[roomId] = true;
        duelStakes[roomId] = 0;

        uint256 platformCut = (totalStake * 10) / 100;
        uint256 winnerPayout = totalStake - platformCut;

        platformBalance += platformCut;

        (bool success, ) = winner.call{value: winnerPayout}("");
        require(success, "Duel winner ETH transfer failed.");

        emit DuelWinnerPaid(roomId, winner, winnerPayout, aiReason);
    }

    // ─── Platform Fee Withdrawal ──────────────────────────────────────────────
    /// @notice Withdraw platform revenue to fund infrastructure and AI models.
    function withdrawPlatformFees(address payable target) external onlyOwner {
        uint256 amount = platformBalance;
        platformBalance = 0;
        (bool success, ) = target.call{value: amount}("");
        require(success, "Platform fee withdrawal failed.");
    }

    // ─── View Helpers ─────────────────────────────────────────────────────────
    function getGameStats() external view returns (uint256 currentPot, uint256 currentPlatformFees) {
        return (rolloverPot, platformBalance);
    }

    function getDuelStake(bytes32 roomId) external view returns (uint256 stakeAmount, bool settled) {
        return (duelStakes[roomId], duelSettled[roomId]);
    }

    // ─── Ownership Transfer ───────────────────────────────────────────────────
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address.");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    receive() external payable {}
}
