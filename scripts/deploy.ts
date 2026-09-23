import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

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
      "  Base Mainnet: bridge ETH from Ethereum at https://bridge.base.org"
    );
  }

  // ─── Deploy LotteryLiveEscrow ─────────────────────────────────────────────
  console.log("\n[1/2] Deploying LotteryLiveEscrow...");
  const LotteryLiveEscrow = await ethers.getContractFactory("LotteryLiveEscrow");
  const liveEscrow = await LotteryLiveEscrow.deploy();
  await liveEscrow.waitForDeployment();
  const liveEscrowAddress = await liveEscrow.getAddress();
  console.log(`      ✅ LotteryLiveEscrow deployed at: ${liveEscrowAddress}`);

  // ─── Deploy LotteryEscrow ─────────────────────────────────────────────────
  console.log("\n[2/2] Deploying LotteryEscrow...");
  const LotteryEscrow = await ethers.getContractFactory("LotteryEscrow");
  const escrow = await LotteryEscrow.deploy();
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`      ✅ LotteryEscrow deployed at:     ${escrowAddress}`);

  // ─── Read on-chain owner verification ────────────────────────────────────
  const liveOwner = await liveEscrow.owner();
  const legacyOwner = await escrow.owner();
  console.log("\n=".repeat(60));
  console.log("Deployment Complete!");
  console.log(`LotteryLiveEscrow owner: ${liveOwner}`);
  console.log(`LotteryEscrow owner:     ${legacyOwner}`);
  console.log("=".repeat(60));

  // ─── Determine env key based on network ──────────────────────────────────
  let envKeyLive = "";
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
  }

  // ─── Update .env file with deployed addresses ─────────────────────────────
  const envPath = path.join(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");

    // Update or append CONTRACT_ADDRESS_BASE_SEPOLIA / CONTRACT_ADDRESS_BASE_MAINNET
    if (envKeyLive) {
      const regex = new RegExp(`^${envKeyLive}=.*$`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${envKeyLive}=${liveEscrowAddress}`);
      } else {
        envContent += `\n${envKeyLive}=${liveEscrowAddress}`;
      }
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`\n✅ .env updated: ${envKeyLive}=${liveEscrowAddress}`);
  }

  // ─── Print explorer links ─────────────────────────────────────────────────
  if (explorerBase) {
    console.log("\n🔗 Verify on Block Explorer:");
    console.log(`   LotteryLiveEscrow : ${explorerBase}${liveEscrowAddress}`);
    console.log(`   LotteryEscrow     : ${explorerBase}${escrowAddress}`);
    console.log("\n📋 To verify source code (optional, requires BASESCAN_API_KEY):");
    console.log(`   npx hardhat verify --network ${network.name} ${liveEscrowAddress}`);
    console.log(`   npx hardhat verify --network ${network.name} ${escrowAddress}`);
  }

  return { liveEscrowAddress, escrowAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  });
