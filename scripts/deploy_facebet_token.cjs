/**
 * deploy_facebet_token.cjs
 * 
 * Deploys FacebetEscrow + FacebetToken (FBET) to Base Mainnet or ARC Mainnet.
 * 
 * Deployment order (IMPORTANT):
 *   1. Deploy FacebetEscrow  → get its address
 *   2. Deploy FacebetToken(escrowAddress, treasuryWallet)
 *      → constructor mints 10B FBET: 50% to escrow, 50% to treasury
 *   3. Call escrow.setToken(tokenAddress) to bind token to escrow
 * 
 * Usage:
 *   npx hardhat run scripts/deploy_facebet_token.cjs --network base
 *   npx hardhat run scripts/deploy_facebet_token.cjs --network arc
 */

const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");

// ── Config ────────────────────────────────────────────────────────────────────
const TREASURY_WALLET = "0x1094811bA281Aa46F373Cf2Ed305ce0002d287ab";

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();

  const network  = await ethers.provider.getNetwork();
  const chainId  = Number(network.chainId);
  const balance  = await ethers.provider.getBalance(deployer.address);

  console.log("=".repeat(62));
  console.log("  FaceBet Token (FBET) Deployment");
  console.log("=".repeat(62));
  console.log(`  Deployer  : ${deployer.address}`);
  console.log(`  Treasury  : ${TREASURY_WALLET}`);
  console.log(`  Chain     : ${chainId}`);
  console.log(`  Gas Token : ${ethers.formatEther(balance)} (native)`);
  console.log("=".repeat(62));

  if (balance === 0n) {
    throw new Error(
      "Deployer wallet has 0 balance.\n" +
      "  Base Mainnet : bridge ETH at https://bridge.base.org\n" +
      "  ARC Mainnet  : fund USDC via https://faucet.circle.com"
    );
  }

  // ── Gas settings: minimum required ───────────────────────────────────────
  // We let the network estimate gas; do NOT set a manual gasPrice so the node
  // returns the current base-fee (EIP-1559 on Base, standard on ARC).
  // Both chains support EIP-1559; setting maxPriorityFeePerGas=0 on low-traffic
  // windows is the cheapest approach.
  const gasOptions = {};
  if (chainId === 8453 || chainId === 84532) {
    // Base: EIP-1559 — use minimum priority fee (1 wei tip)
    const feeData = await ethers.provider.getFeeData();
    gasOptions.maxFeePerGas         = feeData.maxFeePerGas;
    gasOptions.maxPriorityFeePerGas = 1n; // 1 wei tip — minimum on Base
  }
  // ARC uses legacy gas pricing; leaving gasOptions empty lets hardhat auto-price

  // ── Step 1: Deploy FacebetEscrow ─────────────────────────────────────────
  console.log("\n[1/3] Deploying FacebetEscrow...");
  const EscrowFactory = await ethers.getContractFactory("FacebetEscrow");
  const escrow = await EscrowFactory.deploy(gasOptions);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`      ✅ FacebetEscrow deployed : ${escrowAddress}`);

  // ── Step 2: Deploy FacebetToken ──────────────────────────────────────────
  console.log("\n[2/3] Deploying FacebetToken (FBET)...");
  const TokenFactory = await ethers.getContractFactory("FacebetToken");
  const token = await TokenFactory.deploy(escrowAddress, TREASURY_WALLET, gasOptions);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`      ✅ FacebetToken deployed  : ${tokenAddress}`);

  // Verify on-chain balances
  const totalSupply   = await token.totalSupply();
  const escrowBalance = await token.balanceOf(escrowAddress);
  const treasuryBal   = await token.balanceOf(TREASURY_WALLET);
  console.log(`\n      Total Supply : ${ethers.formatUnits(totalSupply, 18)} FBET`);
  console.log(`      Escrow  (50%): ${ethers.formatUnits(escrowBalance, 18)} FBET`);
  console.log(`      Treasury(50%): ${ethers.formatUnits(treasuryBal,  18)} FBET`);

  // ── Step 3: Bind token to escrow ─────────────────────────────────────────
  console.log("\n[3/3] Binding FBET token to escrow (setToken)...");
  const setTx = await escrow.setToken(tokenAddress, gasOptions);
  await setTx.wait();
  console.log(`      ✅ escrow.setToken(${tokenAddress}) confirmed`);

  // ── Explorer links ───────────────────────────────────────────────────────
  let explorerBase = "";
  let envKeyToken  = "";
  let envKeyEscrow = "";

  if (chainId === 8453) {
    explorerBase = "https://basescan.org/address/";
    envKeyToken  = "FBET_TOKEN_ADDRESS_BASE";
    envKeyEscrow = "FBET_ESCROW_ADDRESS_BASE";
  } else if (chainId === 5042) {
    explorerBase = "https://explorer.arc.io/address/";
    envKeyToken  = "FBET_TOKEN_ADDRESS_ARC";
    envKeyEscrow = "FBET_ESCROW_ADDRESS_ARC";
  } else if (chainId === 84532) {
    explorerBase = "https://sepolia.basescan.org/address/";
    envKeyToken  = "FBET_TOKEN_ADDRESS_BASE_SEPOLIA";
    envKeyEscrow = "FBET_ESCROW_ADDRESS_BASE_SEPOLIA";
  }

  console.log("\n" + "=".repeat(62));
  console.log("  Deployment Complete!");
  console.log("=".repeat(62));
  if (explorerBase) {
    console.log(`\n  🔗 FacebetToken  : ${explorerBase}${tokenAddress}`);
    console.log(`  🔗 FacebetEscrow : ${explorerBase}${escrowAddress}`);
  }

  // ── Update .env ───────────────────────────────────────────────────────────
  const envPath = path.join(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");

    const upsert = (key, val) => {
      const re = new RegExp(`^${key}=.*$`, "m");
      if (re.test(envContent)) {
        envContent = envContent.replace(re, `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}`;
      }
    };

    if (envKeyToken)  upsert(envKeyToken,  tokenAddress);
    if (envKeyEscrow) upsert(envKeyEscrow, escrowAddress);

    fs.writeFileSync(envPath, envContent);
    console.log(`\n  ✅ .env updated:`);
    if (envKeyToken)  console.log(`     ${envKeyToken}=${tokenAddress}`);
    if (envKeyEscrow) console.log(`     ${envKeyEscrow}=${escrowAddress}`);
  }

  console.log("\n  📋 To verify contracts on Basescan:");
  if (chainId === 8453 || chainId === 84532) {
    const netFlag = chainId === 8453 ? "base" : "base-sepolia";
    console.log(`     npx hardhat verify --network ${netFlag} ${escrowAddress}`);
    console.log(`     npx hardhat verify --network ${netFlag} ${tokenAddress} "${escrowAddress}" "${TREASURY_WALLET}"`);
  }

  console.log("\n  📋 Deploy to the other chain:");
  const otherNet = chainId === 8453 ? "arc" : "base";
  console.log(`     npx hardhat run scripts/deploy_facebet_token.cjs --network ${otherNet}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Deployment failed:", err.message || err);
    process.exit(1);
  });
