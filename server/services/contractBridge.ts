import { createPublicClient, http, parseAbi } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// LotteryLiveEscrow ABI definition matching contracts/LotteryLiveEscrow.sol
export const LOTTERY_ESCROW_ABI = parseAbi([
  'function buyTickets(address player, uint256 ticketCount) external payable',
  'function awardPrize(address winner, uint256 amount, string calldata reason) external',
  'function getPotInfo() external view returns (uint256 total, uint256 rollover, uint256 price, uint256 feePercent)',
  'event TicketPurchased(address indexed player, uint256 ticketCount, uint256 amountPaid)',
  'event WinnerAwarded(address indexed winner, uint256 amount, string reason)'
]);

// Official Base Mainnet Escrow Contract Address
export const ESCROW_CONTRACT_ADDRESS = "0x81b7e08f65bdf5648606c89998a9cc816435c5b2";

export const getBasePublicClient = (isTestnet = false) => {
  return createPublicClient({
    chain: isTestnet ? baseSepolia : base,
    transport: http()
  });
};

export const fetchOnChainPotInfo = async (isTestnet = false) => {
  try {
    const client = getBasePublicClient(isTestnet);
    const data: any = await (client as any).readContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: LOTTERY_ESCROW_ABI,
      functionName: 'getPotInfo'
    });
    return {
      success: true,
      totalPotWei: data[0].toString(),
      rolloverWei: data[1].toString(),
      ticketPriceWei: data[2].toString(),
      feePercent: Number(data[3])
    };
  } catch (error: any) {
    // Return gracefully if contract read falls back to ledger
    return {
      success: false,
      error: error.message || "Contract read offline"
    };
  }
};
