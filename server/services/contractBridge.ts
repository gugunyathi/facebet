import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

// ─── Owner / Treasury Wallet ─────────────────────────────────────────────────
export const OWNER_WALLET_ADDRESS = "0x1094811bA281Aa46F373Cf2Ed305ce0002d287ab";

// ─── Deployed Contract Addresses Resolution ───────────────────────────────────
export type SupportedNetwork = 'base' | 'base-sepolia' | 'arc' | 'arc-testnet';

export const getContractAddress = (network: SupportedNetwork = 'base'): string => {
  switch (network) {
    case 'base':
      return process.env.CONTRACT_ADDRESS_BASE_MAINNET || "0x09e6c54F955862aBbE21936Ee0ac5Fb0F445D155";
    case 'base-sepolia':
      return process.env.CONTRACT_ADDRESS_BASE_SEPOLIA || "0x7A3b4894c3703758578b67A47c435befBb4Cf05a";
    case 'arc':
      return process.env.CONTRACT_ADDRESS_ARC_MAINNET || "";
    case 'arc-testnet':
      return process.env.CONTRACT_ADDRESS_ARC_TESTNET || "";
    default:
      return process.env.CONTRACT_ADDRESS_BASE_MAINNET || "0x09e6c54F955862aBbE21936Ee0ac5Fb0F445D155";
  }
};

// ─── ARC Network Chain Definitions ───────────────────────────────────────────
const arcMainnet = {
  id: 4816,
  name: 'ARC Network',
  nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.arc.network'] } },
  blockExplorers: { default: { name: 'ARC Explorer', url: 'https://explorer.arc.network' } },
} as const;

const arcTestnet = {
  id: 4817,
  name: 'ARC Testnet',
  nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc-testnet.arc.network'] } },
  blockExplorers: { default: { name: 'ARC Testnet Explorer', url: 'https://explorer-testnet.arc.network' } },
} as const;

// ─── LotteryLiveEscrow ABI ────────────────────────────────────────────────────
export const LOTTERY_ESCROW_ABI = parseAbi([
  'function buyTickets(uint256 ticketCount) external payable',
  'function awardPrize(address payable winner, string calldata aiReason) external',
  'function withdrawPlatformFees(address payable target) external',
  'function getGameStats() external view returns (uint256 currentPot, uint256 currentPlatformFees)',
  'function TICKET_COST() external view returns (uint256)',
  'function POT_SPLIT() external view returns (uint256)',
  'function PLATFORM_SPLIT() external view returns (uint256)',
  'function owner() external view returns (address)',
  'event TicketPurchased(address indexed player, uint256 count, uint256 timestamp)',
  'event PrizeAwarded(address indexed winner, uint256 amount, string aiReason)',
  'event RolloverUpdated(uint256 newTotal)',
]);

// ─── Public & Wallet Client Factory ───────────────────────────────────────────
export const getChainObj = (network: SupportedNetwork = 'base') => {
  const chainMap: Record<SupportedNetwork, any> = {
    'base': base,
    'base-sepolia': baseSepolia,
    'arc': arcMainnet,
    'arc-testnet': arcTestnet,
  };
  return chainMap[network] || base;
};

export const getPublicClient = (network: SupportedNetwork = 'base') => {
  return createPublicClient({
    chain: getChainObj(network),
    transport: http(),
  });
};

export const getWalletClient = (network: SupportedNetwork = 'base') => {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY is not configured in .env");
  }
  const cleanKey = `0x${privateKey.trim().replace(/^0x/, "")}` as `0x${string}`;
  const account = privateKeyToAccount(cleanKey);

  return createWalletClient({
    account,
    chain: getChainObj(network),
    transport: http(),
  });
};

// ─── On-Chain Pot Query ───────────────────────────────────────────────────────
export const fetchOnChainPotInfo = async (network: SupportedNetwork = 'base') => {
  const contractAddress = getContractAddress(network);

  if (!contractAddress) {
    return {
      success: false,
      error: `Contract not yet deployed on ${network}.`,
      rolloverPotWei: '0',
      platformBalanceWei: '0',
      network,
    };
  }

  try {
    const client = getPublicClient(network);
    const data: any = await (client as any).readContract({
      address: contractAddress as `0x${string}`,
      abi: LOTTERY_ESCROW_ABI,
      functionName: 'getGameStats',
    });

    return {
      success: true,
      network,
      contractAddress,
      rolloverPotWei: data[0].toString(),
      platformBalanceWei: data[1].toString(),
    };
  } catch (error: any) {
    return {
      success: false,
      network,
      contractAddress,
      error: error.message || 'Contract read failed',
      rolloverPotWei: '0',
      platformBalanceWei: '0',
    };
  }
};

// ─── Award Prize On-Chain (Owner Only) ─────────────────────────────────────────
export const awardPrizeOnChain = async (
  winnerAddress: string,
  aiReason: string,
  network: SupportedNetwork = 'base'
) => {
  const contractAddress = getContractAddress(network);
  if (!contractAddress) {
    throw new Error(`Contract address not configured for ${network}`);
  }

  const walletClient = getWalletClient(network);
  const publicClient = getPublicClient(network);

  const hash = await walletClient.writeContract({
    address: contractAddress as `0x${string}`,
    abi: LOTTERY_ESCROW_ABI,
    functionName: 'awardPrize',
    args: [winnerAddress as `0x${string}`, aiReason],
    chain: getChainObj(network),
    account: walletClient.account!,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  return {
    success: receipt.status === 'success',
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    network,
    contractAddress,
    winnerAddress,
    aiReason,
  };
};
