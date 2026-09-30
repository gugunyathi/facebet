import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(70));
  console.log("FaceBet Smart Contract Deployment — v2");
  console.log("=".repeat(70));
  console.log(`Deployer address   : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance   : ${ethers.formatEther(balance)} ETH`);

  const network = await ethers.provider.getNetwork();
  console.log(`Network            : ${network.name} (chainId: ${network.chainId})`);
  console.log("=".repeat(70));

  if (balance === 0n) {
    throw new Error(
      "Deployer wallet has 0 ETH. Please fund it before deploying.\n" +
      "  Base Sepolia faucet : https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet\n" +
      "  Base Mainnet        : bridge ETH via https://bridge.base.org\n" +
      "  ARC Testnet         : get tokens from the ARC faucet"
    );
  }

  // ─── Pull config from environment ─────────────────────────────────────────
  const operatorAddress  = process.env.OPERATOR_ADDRESS  || deployer.address;
  const treasuryWallet   = process.env.TREASURY_ADDRESS  || deployer.address;
  const feeRecipient     = process.env.FEE_RECIPIENT     || deployer.address;

  // Optional: wire in existing USDC address for the target network
  const usdcAddresses: Record<string, string> = {
    "84532":   "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
    "8453":    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet USDC
    "5042":    "",                                             // ARC Mainnet (fill in)
    "5042002": "",                                             // ARC Testnet (fill in)
  };
  const usdcAddress = usdcAddresses[network.chainId.toString()] || "";

  console.log(`\nOperator wallet    : ${operatorAddress}`);
  console.log(`Treasury wallet    : ${treasuryWallet}`);
  console.log(`Fee recipient      : ${feeRecipient}`);
  if (usdcAddress) console.log(`USDC address       : ${usdcAddress}`);
  console.log("=".repeat(70));

  // ─── 1. Deploy FacebetEscrow ──────────────────────────────────────────────
  console.log("\n[1/4] Deploying FacebetEscrow...");
  const FacebetEscrow = await ethers.getContractFactory("FacebetEscrow");
  const escrow = await FacebetEscrow.deploy(feeRecipient);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`      ✅ FacebetEscrow deployed at       : ${escrowAddress}`);

  // ─── 2. Deploy FacebetToken ───────────────────────────────────────────────
  console.log("\n[2/4] Deploying FacebetToken...");
  const FacebetToken = await ethers.getContractFactory("FacebetToken");
  const fbet = await FacebetToken.deploy(escrowAddress, treasuryWallet);
  await fbet.waitForDeployment();
  const fbetAddress = await fbet.getAddress();
  console.log(`      ✅ FacebetToken (FBET) deployed at : ${fbetAddress}`);

  // ─── 3. Bind FBET token into FacebetEscrow ───────────────────────────────
  console.log("\n[3/4] Binding FBET token into FacebetEscrow...");
  await (await escrow.setFbetToken(fbetAddress)).wait();
  console.log(`      ✅ FBET token bound to FacebetEscrow`);

  // ─── 4. Deploy LotteryLiveEscrow ─────────────────────────────────────────
  console.log("\n[4/4] Deploying LotteryLiveEscrow (v2)...");
  const LotteryLiveEscrow = await ethers.getContractFactory("LotteryLiveEscrow");
  const liveEscrow = await LotteryLiveEscrow.deploy(operatorAddress, feeRecipient);
  await liveEscrow.waitForDeployment();
  const liveEscrowAddress = await liveEscrow.getAddress();
  console.log(`      ✅ LotteryLiveEscrow deployed at   : ${liveEscrowAddress}`);

  // ─── 5. Bind token addresses into LotteryLiveEscrow ─────────────────────
  console.log("\n[5/5] Binding token addresses into LotteryLiveEscrow...");
  await (await liveEscrow.setFbetToken(fbetAddress)).wait();
  console.log(`      ✅ FBET token bound`);

  if (usdcAddress) {
    await (await liveEscrow.setUsdcToken(usdcAddress)).wait();
    console.log(`      ✅ USDC token bound: ${usdcAddress}`);
  } else {
    console.log(`      ⚠️  USDC not set — add USDC address for target network and call setUsdcToken()`);
  }

  // ─── Determine env keys per network ──────────────────────────────────────
  let envKeyLiveEscrow = "";
  let envKeyEscrow     = "";
  let envKeyFbet       = "";
  let explorerBase     = "";

  if (network.chainId === 84532n) {
    envKeyLiveEscrow = "CONTRACT_ADDRESS_BASE_SEPOLIA";
    envKeyEscrow     = "FBET_ESCROW_ADDRESS_BASE";
    envKeyFbet       = "FBET_TOKEN_ADDRESS_BASE";
    explorerBase     = "https://sepolia.basescan.org/address/";
  } else if (network.chainId === 8453n) {
    envKeyLiveEscrow = "CONTRACT_ADDRESS_BASE_MAINNET";
    envKeyEscrow     = "FBET_ESCROW_ADDRESS_BASE";
    envKeyFbet       = "FBET_TOKEN_ADDRESS_BASE";
    explorerBase     = "https://basescan.org/address/";
  } else if (network.chainId === 5042n) {
    envKeyLiveEscrow = "CONTRACT_ADDRESS_ARC_MAINNET";
    envKeyEscrow     = "FBET_ESCROW_ADDRESS_ARC";
    envKeyFbet       = "FBET_TOKEN_ADDRESS_ARC";
    explorerBase     = "https://explorer.arc.io/address/";
  } else if (network.chainId === 5042002n) {
    envKeyLiveEscrow = "CONTRACT_ADDRESS_ARC_TESTNET";
    envKeyEscrow     = "FBET_ESCROW_ADDRESS_ARC";
    envKeyFbet       = "FBET_TOKEN_ADDRESS_ARC";
    explorerBase     = "https://explorer.testnet.arc.io/address/";
  }

  // ─── Update .env file ────────────────────────────────────────────────────
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath, "utf8");

    const setKey = (content: string, key: string, value: string): string => {
      const regex = new RegExp(`^${key}=.*$`, "m");
      return regex.test(content)
        ? content.replace(regex, `${key}=${value}`)
        : content + `\n${key}=${value}`;
    };

    if (envKeyLiveEscrow) env = setKey(env, envKeyLiveEscrow, liveEscrowAddress);
    if (envKeyEscrow)     env = setKey(env, envKeyEscrow,     escrowAddress);
    if (envKeyFbet)       env = setKey(env, envKeyFbet,       fbetAddress);

    fs.writeFileSync(envPath, env);
    console.log("\n✅ .env updated with new contract addresses");
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(70));
  console.log("Deployment Complete! Contract Addresses:");
  console.log(`  LotteryLiveEscrow : ${liveEscrowAddress}`);
  console.log(`  FacebetEscrow     : ${escrowAddress}`);
  console.log(`  FacebetToken(FBET): ${fbetAddress}`);
  console.log("=".repeat(70));

  if (explorerBase) {
    console.log("\n🔗 Block Explorer Links:");
    console.log(`  LotteryLiveEscrow : ${explorerBase}${liveEscrowAddress}`);
    console.log(`  FacebetEscrow     : ${explorerBase}${escrowAddress}`);
    console.log(`  FacebetToken      : ${explorerBase}${fbetAddress}`);

    if (network.chainId === 84532n || network.chainId === 8453n) {
      console.log("\n📋 Verify source code (requires BASESCAN_API_KEY in hardhat.config):");
      console.log(`  npx hardhat verify --network ${network.name} ${liveEscrowAddress} "${operatorAddress}" "${feeRecipient}"`);
      console.log(`  npx hardhat verify --network ${network.name} ${escrowAddress} "${feeRecipient}"`);
      console.log(`  npx hardhat verify --network ${network.name} ${fbetAddress} "${escrowAddress}" "${treasuryWallet}"`);
    }
  }

  console.log("\n📋 Deploy commands:");
  console.log("  npx hardhat run scripts/deploy.ts --network base-sepolia");
  console.log("  npx hardhat run scripts/deploy.ts --network base");
  console.log("  npx hardhat run scripts/deploy.ts --network arc-testnet");
  console.log("  npx hardhat run scripts/deploy.ts --network arc");

  return { liveEscrowAddress, escrowAddress, fbetAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  });
