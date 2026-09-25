require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.OPERATOR_PRIVATE_KEY || "";

// ─── ARC Network (by Circle) — Correct official parameters ───────────────────
// Chain IDs: Mainnet = 5042 | Testnet = 5042002
// Gas token: USDC (stablecoin-native — NOT ETH)
// RPC: https://rpc.mainnet.arc.io (mainnet) | https://rpc.testnet.arc.io (testnet)
// Explorer: https://explorer.arc.io
// Faucet: https://faucet.circle.com
const ARC_MAINNET_RPC_URL = process.env.ARC_MAINNET_RPC_URL || "https://rpc.mainnet.arc.io";
const ARC_TESTNET_RPC_URL = process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.io";

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Base Sepolia Testnet
    "base-sepolia": {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY.replace(/^0x/, "")}`] : [],
      gasPrice: "auto",
    },
    // Base Mainnet
    base: {
      url: "https://mainnet.base.org",
      chainId: 8453,
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY.replace(/^0x/, "")}`] : [],
      gasPrice: "auto",
    },
    // ARC Mainnet (chainId: 5042) — Gas token: USDC
    arc: {
      url: ARC_MAINNET_RPC_URL,
      chainId: 5042,
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY.replace(/^0x/, "")}`] : [],
      gasPrice: "auto",
    },
    // ARC Testnet (chainId: 5042002) — Gas token: USDC from faucet.circle.com
    "arc-testnet": {
      url: ARC_TESTNET_RPC_URL,
      chainId: 5042002,
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY.replace(/^0x/, "")}`] : [],
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "PLACEHOLDER",
      "base-sepolia": process.env.BASESCAN_API_KEY || "PLACEHOLDER",
      // ARC uses its own explorer — contract verification done manually via explorer.arc.io
      arc: process.env.ARC_EXPLORER_API_KEY || "PLACEHOLDER",
      "arc-testnet": process.env.ARC_EXPLORER_API_KEY || "PLACEHOLDER",
    },
    customChains: [
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "arc",
        chainId: 5042,
        urls: {
          apiURL: "https://explorer.arc.io/api",
          browserURL: "https://explorer.arc.io",
        },
      },
      {
        network: "arc-testnet",
        chainId: 5042002,
        urls: {
          apiURL: "https://explorer.testnet.arc.io/api",
          browserURL: "https://explorer.testnet.arc.io",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
