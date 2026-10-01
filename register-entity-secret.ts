import "dotenv/config";
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

const rawApiKey: string | undefined = process.env.CIRCLE_API_KEY;
const apiKey = rawApiKey?.trim().replace(/^["']|["']$/g, "");
if (!apiKey) {
  throw new Error("CIRCLE_API_KEY is required. Set it in .env first.");
}

console.log(`Using CIRCLE_API_KEY: ${apiKey.substring(0, 18)}... (length: ${apiKey.length})`);

let entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();
let isNewSecret = false;

if (!entitySecret) {
  entitySecret = randomBytes(32).toString("hex");
  isNewSecret = true;
  console.log("Generated new 32-byte entity secret.");
} else {
  console.log(`Using existing entity secret from .env: ${entitySecret.substring(0, 8)}...`);
}

const recoveryFilePath: string = "./recovery";
mkdirSync(recoveryFilePath, { recursive: true });

console.log("Registering entity secret ciphertext with Circle...");

await registerEntitySecretCiphertext({
  apiKey,
  entitySecret,
  recoveryFileDownloadPath: recoveryFilePath,
});

if (isNewSecret) {
  appendFileSync(".env", `\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`);
  console.log("CIRCLE_ENTITY_SECRET appended to .env");
}

console.log("✅ Entity secret successfully registered with Circle!");
console.log(`✅ Recovery file saved in: ${recoveryFilePath}`);
