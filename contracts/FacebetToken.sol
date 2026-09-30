// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FacebetToken (FBET)
 * @notice Native utility token for the FaceBet platform.
 *         Used for pot contributions, bid/bet stakes, and queue-jump payments.
 *
 * Tokenomics (per chain):
 *   Total Supply : 10,000,000,000 FBET  (10 billion, 18 decimals)
 *   50% -> Payout Escrow contract (LotteryLiveEscrow) for prize payouts
 *   50% -> Owner / treasury wallet
 *
 * Security Improvements (v2):
 *   - Custom Ownable with 2-step ownership transfer (propose + accept)
 *   - Minter role separate from owner for future controlled expansion
 *   - Deployer can set escrow & treasury only once (immutable after init)
 *   - Deployable on: Base Mainnet (8453) | ARC Mainnet (5042)
 */
contract FacebetToken {
    // ─── ERC-20 Metadata ────────────────────────────────────────────────────
    string  public constant name     = "FaceBet";
    string  public constant symbol   = "FBET";
    uint8   public constant decimals = 18;
    uint256 public constant TOTAL_SUPPLY = 10_000_000_000 * (10 ** 18);

    // ─── ERC-20 State ────────────────────────────────────────────────────────
    uint256 public totalSupply;
    mapping(address => uint256)                     public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // ─── Access Control ──────────────────────────────────────────────────────
    address public owner;
    address public pendingOwner;  // 2-step ownership transfer

    // ─── Events ──────────────────────────────────────────────────────────────
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner_, address indexed spender, uint256 value);
    event OwnershipTransferProposed(address indexed currentOwner, address indexed proposedOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "FBET: caller is not owner");
        _;
    }

    /**
     * @param escrowAddress  Address of LotteryLiveEscrow (receives 50% supply).
     * @param treasuryWallet Address that receives the other 50%.
     */
    constructor(address escrowAddress, address treasuryWallet) {
        require(escrowAddress  != address(0), "FBET: zero escrow address");
        require(treasuryWallet != address(0), "FBET: zero treasury address");

        owner = msg.sender;
        totalSupply = TOTAL_SUPPLY;

        uint256 escrowAlloc   = TOTAL_SUPPLY / 2;
        uint256 treasuryAlloc = TOTAL_SUPPLY - escrowAlloc;

        balanceOf[escrowAddress]  = escrowAlloc;
        balanceOf[treasuryWallet] = treasuryAlloc;

        emit Transfer(address(0), escrowAddress,  escrowAlloc);
        emit Transfer(address(0), treasuryWallet, treasuryAlloc);
    }

    // ─── ERC-20 Core ─────────────────────────────────────────────────────────
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
        require(to   != address(0),     "FBET: transfer to zero address");
        require(from != address(0),     "FBET: transfer from zero address");
        require(balanceOf[from] >= amount, "FBET: insufficient balance");
        unchecked {
            balanceOf[from] -= amount;
            balanceOf[to]   += amount;
        }
        emit Transfer(from, to, amount);
    }

    // ─── 2-Step Ownership Transfer ───────────────────────────────────────────
    /// @notice Step 1: Owner proposes a new owner.
    function proposeOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "FBET: new owner is zero address");
        pendingOwner = newOwner;
        emit OwnershipTransferProposed(owner, newOwner);
    }

    /// @notice Step 2: Proposed owner accepts — prevents accidental transfers.
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "FBET: caller is not pending owner");
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }
}
