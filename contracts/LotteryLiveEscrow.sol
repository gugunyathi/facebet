// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LotteryLiveEscrow {
    address public owner;
    uint256 public constant TICKET_COST = 0.0003 ether; // Equivalent to ~$1 on Base
    uint256 public rolloverPot;
    uint256 public platformBalance;
    
    // Allocation splits: 85% goes directly to the rollover pool, 15% funds the AI models
    uint256 public constant POT_SPLIT = 85;
    uint256 public constant PLATFORM_SPLIT = 15;

    event TicketPurchased(address indexed player, uint256 count, uint256 timestamp);
    event PrizeAwarded(address indexed winner, uint256 amount, string aiReason);
    event RolloverUpdated(uint256 newTotal);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the platform operator can call this.");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Accepting ticket purchases and splitting funds into the escrow vaults
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

    // Triggered automatically by the backend server when Gemini confirms a match win
    function awardPrize(address payable winner, string calldata aiReason) external onlyOwner {
        require(rolloverPot > 0, "No funds available in the rollover pot pool.");
        
        uint256 payoutAmount = rolloverPot;
        rolloverPot = 0; // Prevent re-entrancy attacks by draining the pot before sending

        (bool success, ) = winner.call{value: payoutAmount}("");
        require(success, "Cryptocurrency transfer to winner failed.");

        emit PrizeAwarded(winner, payoutAmount, aiReason);
        emit RolloverUpdated(0);
    }

    // Withdraw platform revenue streams to maintain infrastructure and fund AI models
    function withdrawPlatformFees(address payable target) external onlyOwner {
        uint256 amount = platformBalance;
        platformBalance = 0;
        (bool success, ) = target.call{value: amount}("");
        require(success, "Platform fee withdrawal failed.");
    }

    // View helper to read active pooled value balances
    function getGameStats() external view returns (uint256 currentPot, uint256 currentPlatformFees) {
        return (rolloverPot, platformBalance);
    }

    // Transfer ownership to a new address (e.g., a multisig or updated operator key)
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address.");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    receive() external payable {}
}
