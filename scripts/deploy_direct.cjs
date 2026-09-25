const { ethers } = require("ethers");
const solc = require("solc");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function compileContracts() {
  console.log("Compiling contracts using solc...");
  const escrowPath = path.join(__dirname, "../contracts/LotteryEscrow.sol");
  const liveEscrowPath = path.join(__dirname, "../contracts/LotteryLiveEscrow.sol");

  const input = {
    language: "Solidity",
    sources: {
      "LotteryEscrow.sol": { content: fs.readFileSync(escrowPath, "utf8") },
      "LotteryLiveEscrow.sol": { content: fs.readFileSync(liveEscrowPath, "utf8") },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatal = output.errors.filter((e) => e.severity === "error");
    if (fatal.length > 0) {
      console.error("Compilation errors:", fatal);
      throw new Error("Solidity compilation failed.");
    }
  }

  const legacyArtifact = output.contracts["LotteryEscrow.sol"]["LotteryEscrow"];
  const liveArtifact = output.contracts["LotteryLiveEscrow.sol"]["LotteryLiveEscrow"];

  console.log("✅ Solidity compilation successful!");
  return { legacyArtifact, liveArtifact };
}

async function deployToNetwork(networkName, rpcUrl, chainIdExpected) {
  console.log("\n" + "=".repeat(60));
  console.log(`Starting deployment to ${networkName}...`);
  console.log("=".repeat(60));

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.OPERATOR_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY or OPERATOR_PRIVATE_KEY is missing in .env file.");
  }

  const cleanKey = privateKey.trim().replace(/^0x/, "");
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(cleanKey, provider);

  console.log(`Deployer Address : ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer Balance : ${ethers.formatEther(balance)} ETH`);

  const network = await provider.getNetwork();
  console.log(`Network Connected: ${network.name} (Chain ID: ${network.chainId})`);

  if (balance === 0n) {
    console.error(`\n⚠️  WARNING: ${wallet.address} has 0 ETH on ${networkName}.`);
    if (networkName.includes("Sepolia")) {
      console.error("   Get free Base Sepolia ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet or https://faucet.quicknode.com/base/sepolia");
    } else {
      console.error("   Bridge ETH to Base Mainnet at: https://bridge.base.org");
    }
    return null;
  }

  const { legacyArtifact, liveArtifact } = await compileContracts();

  // 1. Deploy LotteryLiveEscrow
  console.log("\n[1/2] Deploying LotteryLiveEscrow...");
  const LiveFactory = new ethers.ContractFactory(liveArtifact.abi, liveArtifact.evm.bytecode.object, wallet);
  const liveContract = await LiveFactory.deploy();
  await liveContract.waitForDeployment();
  const liveAddress = await liveContract.getAddress();
  console.log(`      ✅ LotteryLiveEscrow deployed at: ${liveAddress}`);

  // 2. Deploy LotteryEscrow
  console.log("\n[2/2] Deploying LotteryEscrow...");
  const LegacyFactory = new ethers.ContractFactory(legacyArtifact.abi, legacyArtifact.evm.bytecode.object, wallet);
  const legacyContract = await LegacyFactory.deploy();
  await legacyContract.waitForDeployment();
  const legacyAddress = await legacyContract.getAddress();
  console.log(`      ✅ LotteryEscrow deployed at:     ${legacyAddress}`);

  // Wait 5 seconds for block indexing
  console.log("\nWaiting 5 seconds for block indexing...");
  await sleep(5000);

  // Verify ownership on-chain with fallback
  let liveOwner = "unknown";
  let legacyOwner = "unknown";

  try {
    const liveInstance = new ethers.Contract(liveAddress, liveArtifact.abi, provider);
    liveOwner = await liveInstance.owner();
  } catch (e) {
    console.log(`  (Live owner check deferred: ${e.message.split('\n')[0]})`);
  }

  try {
    const legacyInstance = new ethers.Contract(legacyAddress, legacyArtifact.abi, provider);
    legacyOwner = await legacyInstance.owner();
  } catch (e) {
    console.log(`  (Legacy owner check deferred: ${e.message.split('\n')[0]})`);
  }

  console.log("\nOn-chain owner verification:");
  console.log(`  LotteryLiveEscrow owner: ${liveOwner}`);
  console.log(`  LotteryEscrow owner:     ${legacyOwner}`);

  // Save to .env
  const envPath = path.join(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    let liveKey = "CONTRACT_ADDRESS_BASE_SEPOLIA";
    let legacyKey = "CONTRACT_ADDRESS_LEGACY_BASE_SEPOLIA";
    let explorerUrl = "https://sepolia.basescan.org/address/";

    if (networkName.includes("Base Mainnet")) {
      liveKey = "CONTRACT_ADDRESS_BASE_MAINNET";
      legacyKey = "CONTRACT_ADDRESS_LEGACY_BASE_MAINNET";
      explorerUrl = "https://basescan.org/address/";
    } else if (networkName.includes("ARC Testnet")) {
      liveKey = "CONTRACT_ADDRESS_ARC_TESTNET";
      legacyKey = "";
      explorerUrl = "https://explorer.testnet.arc.io/address/";
    } else if (networkName.includes("ARC Mainnet")) {
      liveKey = "CONTRACT_ADDRESS_ARC_MAINNET";
      legacyKey = "";
      explorerUrl = "https://explorer.arc.io/address/";
    }

    const updateOrAppend = (key, val) => {
      if (!key) return;
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}`;
      }
    };

    updateOrAppend(liveKey, liveAddress);
    if (legacyKey) updateOrAppend(legacyKey, legacyAddress);

    fs.writeFileSync(envPath, envContent);
    console.log(`\n✅ Updated .env with contract addresses!`);

    console.log("\n🔗 Block Explorer Links:");
    console.log(`   LotteryLiveEscrow: ${explorerUrl}${liveAddress}`);
    if (legacyKey) console.log(`   LotteryEscrow:     ${explorerUrl}${legacyAddress}`);
  }

  return { liveAddress, legacyAddress };
}

async function main() {
  const target = process.argv[2] || "sepolia";

  if (target === "sepolia" || target === "both") {
    await deployToNetwork("Base Sepolia Testnet", "https://sepolia.base.org", 84532);
  }
  if (target === "mainnet" || target === "both") {
    await deployToNetwork("Base Mainnet", "https://mainnet.base.org", 8453);
  }
  if (target === "arc" || target === "both") {
    await deployToNetwork("ARC Mainnet", process.env.ARC_MAINNET_RPC_URL || "https://rpc.mainnet.arc.io", 5042);
  }
  if (target === "arc-testnet") {
    await deployToNetwork("ARC Testnet", process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.io", 5042002);
  }
}

main().catch((err) => {
  console.error("\n❌ Deployment Error:", err);
  process.exit(1);
});
