// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FacebetToken (FBET)
 * @notice Native utility token for the FaceBet platform.
 *         Used for pot contributions, bid/bet stakes, and queue-jump payments.
 *
 * Tokenomics (per chain):
 *   Total Supply : 10,000,000,000 FBET  (10 billion, 18 decimals)
 *   50% -> Payout Escrow contract (FacebetEscrow) for prize payouts
 *   50% -> Owner / treasury wallet  (0x1094811bA281Aa46F373Cf2Ed305ce0002d287ab)
 *
 * Deployable on: Base Mainnet (8453) | ARC Mainnet (5042)
 */
contract FacebetToken {
    // ERC-20 State
    string  public constant name     = "FaceBet";
    string  public constant symbol   = "FBET";
    uint8   public constant decimals = 18;

    uint256 public totalSupply;

    mapping(address => uint256)                     public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // Admin
    address public owner;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner_, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "FBET: caller is not owner");
        _;
    }

    /**
     * @param escrowAddress  Address of the FacebetEscrow contract (50% payout pool).
     * @param treasuryWallet Address that receives the other 50% (your wallet).
     */
    constructor(address escrowAddress, address treasuryWallet) {
        require(escrowAddress  != address(0), "FBET: zero escrow address");
        require(treasuryWallet != address(0), "FBET: zero treasury address");

        owner = msg.sender;

        uint256 _total = 10_000_000_000 * (10 ** uint256(decimals));
        totalSupply = _total;

        uint256 escrowAlloc   = _total / 2;
        uint256 treasuryAlloc = _total - escrowAlloc;

        balanceOf[escrowAddress]  = escrowAlloc;
        balanceOf[treasuryWallet] = treasuryAlloc;

        emit Transfer(address(0), escrowAddress,  escrowAlloc);
        emit Transfer(address(0), treasuryWallet, treasuryAlloc);
    }

    // ERC-20 Core
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "FBET: insufficient allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0),          "FBET: transfer to zero address");
        require(balanceOf[from] >= amount, "FBET: insufficient balance");
        unchecked {
            balanceOf[from] -= amount;
            balanceOf[to]   += amount;
        }
        emit Transfer(from, to, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "FBET: new owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
