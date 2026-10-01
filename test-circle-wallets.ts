import "dotenv/config";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const apiKey = process.env.CIRCLE_API_KEY?.trim();
const entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();

if (!apiKey || !entitySecret) {
  throw new Error("CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET must be set in .env");
}

console.log("Initializing Circle Developer-Controlled Wallets Client...");

const client = initiateDeveloperControlledWalletsClient({
  apiKey,
  entitySecret,
});

try {
  const response = await client.listWalletSets({});
  console.log("✅ Circle Client successfully authenticated!");
  console.log(`Found ${response.data?.walletSets?.length ?? 0} existing Wallet Sets.`);
  if (response.data?.walletSets && response.data.walletSets.length > 0) {
    console.log("Wallet Sets:", response.data.walletSets);
  }
} catch (error: any) {
  console.error("Error querying Circle Wallets API:", error);
}
