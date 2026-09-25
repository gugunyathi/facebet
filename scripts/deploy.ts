import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("FaceBet Smart Contract Deployment");
  console.log("=".repeat(60));
  console.log(`Deployer address : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance : ${ethers.formatEther(balance)} ETH`);

  const network = await ethers.provider.getNetwork();
  console.log(`Network          : ${network.name} (chainId: ${network.chainId})`);
  console.log("=".repeat(60));

  if (balance === 0n) {
    throw new Error(
      "Deployer wallet has 0 ETH. Please fund it before deploying.\n" +
      "  Base Sepolia faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet\n" +
      "  Base Mainnet: bridge ETH from Ethereum at https://bridge.base.org\n" +
      "  ARC Testnet: get test tokens from the ARC faucet"
    );
  }

  // ─── Deploy LotteryLiveEscrow ─────────────────────────────────────────────
  console.log("\n[1/2] Deploying LotteryLiveEscrow...");
  const LotteryLiveEscrow = await ethers.getContractFactory("LotteryLiveEscrow");
  const liveEscrow = await LotteryLiveEscrow.deploy();
  await liveEscrow.waitForDeployment();
  const liveEscrowAddress = await liveEscrow.getAddress();
  console.log(`      ✅ LotteryLiveEscrow deployed at: ${liveEscrowAddress}`);

  // ─── Deploy LotteryEscrow (legacy) ───────────────────────────────────────
  console.log("\n[2/2] Deploying LotteryEscrow...");
  const LotteryEscrow = await ethers.getContractFactory("LotteryEscrow");
  const escrow = await LotteryEscrow.deploy();
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`      ✅ LotteryEscrow deployed at:     ${escrowAddress}`);

  // ─── Read on-chain owner verification ────────────────────────────────────
  const liveOwner = await liveEscrow.owner();
  const legacyOwner = await escrow.owner();
  console.log("\n" + "=".repeat(60));
  console.log("Deployment Complete!");
  console.log(`LotteryLiveEscrow owner: ${liveOwner}`);
  console.log(`LotteryEscrow owner:     ${legacyOwner}`);
  console.log("=".repeat(60));

  // ─── Determine env key based on network ──────────────────────────────────
  let envKeyLive   = "";
  let envKeyLegacy = "";
  let explorerBase = "";

  if (network.chainId === 84532n) {
    envKeyLive   = "CONTRACT_ADDRESS_BASE_SEPOLIA";
    envKeyLegacy = "CONTRACT_ADDRESS_LEGACY_BASE_SEPOLIA";
    explorerBase = "https://sepolia.basescan.org/address/";
  } else if (network.chainId === 8453n) {
    envKeyLive   = "CONTRACT_ADDRESS_BASE_MAINNET";
    envKeyLegacy = "CONTRACT_ADDRESS_LEGACY_BASE_MAINNET";
    explorerBase = "https://basescan.org/address/";
  } else if (network.chainId === 5042n) {
    envKeyLive   = "CONTRACT_ADDRESS_ARC_MAINNET";
    envKeyLegacy = "";
    explorerBase = "https://explorer.arc.io/address/";
  } else if (network.chainId === 5042002n) {
    envKeyLive   = "CONTRACT_ADDRESS_ARC_TESTNET";
    envKeyLegacy = "";
    explorerBase = "https://explorer.testnet.arc.io/address/";
  }

  // ─── Update .env file with deployed addresses ─────────────────────────────
  const envPath = path.join(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");

    // Update or append the primary live contract key
    if (envKeyLive) {
      const regex = new RegExp(`^${envKeyLive}=.*$`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${envKeyLive}=${liveEscrowAddress}`);
      } else {
        envContent += `\n${envKeyLive}=${liveEscrowAddress}`;
      }
    }

    // Update or append the legacy escrow key (Base only)
    if (envKeyLegacy) {
      const regexLegacy = new RegExp(`^${envKeyLegacy}=.*$`, "m");
      if (regexLegacy.test(envContent)) {
        envContent = envContent.replace(regexLegacy, `${envKeyLegacy}=${escrowAddress}`);
      } else {
        envContent += `\n${envKeyLegacy}=${escrowAddress}`;
      }
    }

    // Also update LOTTERY_ESCROW_ADDRESS alias for ARC mainnet
    if (network.chainId === 5042n) {
      const regexAlias = new RegExp(`^LOTTERY_ESCROW_ADDRESS=.*$`, "m");
      if (regexAlias.test(envContent)) {
        envContent = envContent.replace(regexAlias, `LOTTERY_ESCROW_ADDRESS=${liveEscrowAddress}`);
      }
    }

    fs.writeFileSync(envPath, envContent);
    if (envKeyLive) console.log(`\n✅ .env updated: ${envKeyLive}=${liveEscrowAddress}`);
    if (envKeyLegacy) console.log(`✅ .env updated: ${envKeyLegacy}=${escrowAddress}`);
  }

  // ─── Print explorer links ─────────────────────────────────────────────────
  if (explorerBase) {
    console.log("\n🔗 Verify on Block Explorer:");
    console.log(`   LotteryLiveEscrow : ${explorerBase}${liveEscrowAddress}`);
    if (envKeyLegacy) {
      console.log(`   LotteryEscrow     : ${explorerBase}${escrowAddress}`);
    }
    if (network.chainId === 84532n || network.chainId === 8453n) {
      console.log("\n📋 To verify source code (optional, requires BASESCAN_API_KEY):");
      console.log(`   npx hardhat verify --network ${network.name} ${liveEscrowAddress}`);
      if (envKeyLegacy) {
        console.log(`   npx hardhat verify --network ${network.name} ${escrowAddress}`);
      }
    }
  }

  // ─── Print deploy commands for other networks ─────────────────────────────
  console.log("\n📋 Deploy to other networks:");
  console.log("   npx hardhat run scripts/deploy.ts --network base-sepolia");
  console.log("   npx hardhat run scripts/deploy.ts --network base");
  console.log("   npx hardhat run scripts/deploy.ts --network arc-testnet");
  console.log("   npx hardhat run scripts/deploy.ts --network arc");

  return { liveEscrowAddress, escrowAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  });
