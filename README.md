# 🌟 FACE BET — Hybrid Web3 Live Video Gaming & AI Lottery Platform on Base

**FACE BET** is a next-generation, high-octane Web3 live video gaming, facial AI evaluation, and decentralised lottery arena built natively on the **Base L2 Network** (`0x2105`). Players engage in live video duels, match facial expressions against AI target trends using **Google Gemini Multimodal AI**, and compete for jackpot prize pools funded via USDC micro-tickets.

---

## ⚡ Key Features & Recent Updates

### ⚔️ Real-Time P2P Camera Duels & Human Matching
- **Default P2P Arena Mode**: Default mode prioritizes real human-vs-human camera matches.
- **WebSocket Challenge Broadcasting**: When a user enters the P2P duel queue, `HUMAN_DUEL_REQUEST` WebSocket notifications are instantly broadcasted across all connected clients.
- **Real Player Challenge Notification Banner**: Users in P2PAI (Boss) Arena receive an in-app banner alert whenever a live human challenger enters the queue, with a one-click **"⚡ Switch to P2P Arena & Accept Duel"** action button.
- **Edge-to-Edge Gapless Video Frames**: Camera views touch directly edge-to-edge separated only by blue (P1) and pink (P2) player borders.
- **Mobile Viewport Controls**:
  - **`📱 Stack / ↔️ Side-by-Side`**: Instant toggle between vertical video stack and horizontal split-screen view.
  - **`⤢ Fullscreen`**: Viewport expansion to fill the complete mobile display, with `↙↗ Exit Fullscreen` toggle.

### 🔵 Base Account SDK & Native Web3 Auth
- **Sign in with Base**: Built with `@base-org/account`, `@base-org/account-ui`, and `viem`.
- **SIWE Cryptographic Verification**: EIP-4361 Sign-In with Ethereum nonce verification API (`/api/auth/nonce` & `/api/auth/verify`).
- **Multi-Wallet Fallbacks**: Full support for Coinbase Wallet extension, MetaMask, and ARC Network (`0x12d0`).
- **Network Switcher**: Toggle between **Base Mainnet (8453)** and **Base Sepolia Testnet (84532)**.

### 💳 Native Base Payments (`pay`) & Subscriptions (`subscribe`)
- **One-Click USDC Payments (`pay`)**: Execute $1.00 USDC ticket purchases directly on Base for 10 game entry slots.
- **Auto-Renewing Subscriptions (`subscribe`)**: Recurring $5.00/month VIP Pass subscriptions with EIP-712 spend permissions for 50 auto-renewing tickets/month.
- **Multi-Channel Fiat Gateway**: Paystack credit card and mobile money fallback checkout.

### 🔮 Dual Live Video Arenas
- **P2AI Arena (Person vs AI Hologram)**:
  - Real-time video frame capture processed through **Google Gemini 2.0 Flash AI** to evaluate facial expressions against live target trends.
  - High-performance canvas downscaling (320x240 @ 0.55 JPEG) reducing network bandwidth usage by **>90%**.
- **P2P Arena (Person vs Person Video Duel)**:
  - Low-latency WebRTC video duel matching via PeerJS.
  - Built-in multi-region STUN/ICE relay servers (`Google`, `Twilio`) for seamless connectivity behind strict firewalls and mobile NATs.

### 📜 Smart Contracts & On-Chain Escrow
- **LotteryLiveEscrow.sol & LotteryEscrow.sol**: Solidity escrow contracts governing ticket pool deposits, 85% rollover prize pool allocation, 15% platform fee splits, and `transferOwnership` governance.
- **Deployed on ARC Network**: Live on ARC Mainnet (5042) and ARC Testnet (5042002).
- **Contract Service Bridge (`contractBridge.ts`)**: Real-time on-chain pot queries via Viem (`GET /api/onchain-pot`) and automated prize payouts (`awardPrizeOnChain`).

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide & React Icons. (Deployed on Vercel)
- **Web3 & SDKs**: `@base-org/account`, `@base-org/account-ui`, `viem`, `ethers`, Hardhat.
- **AI Engine**: `@google/genai` (Gemini Multimodal Live Frame Analysis).
- **WebRTC & Real-Time**: PeerJS, WebSockets, Canvas Stream Capture API (Optimized single-stream re-use).
- **Backend Server**: Node.js, Express, TypeScript, Mongoose / In-Memory Session Engine. (Deployed on Render)
- **Smart Contracts**: Solidity `^0.8.20` (`LotteryLiveEscrow.sol`, `LotteryEscrow.sol`).

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js (v18+)
- npm or yarn

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/facebet.git
cd facebet
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/facebet
GEMINI_API_KEY=your_gemini_api_key_here
PAYSTACK_SECRET_KEY=sk_test_your_paystack_key
VITE_API_URL=https://facebet.onrender.com
CONTRACT_ADDRESS_ARC_TESTNET=your_arc_testnet_contract_address
CONTRACT_ADDRESS_ARC_MAINNET=your_arc_mainnet_contract_address
```

### 3. Start Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to launch the app.

---

## 🔌 API Reference & Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/auth/nonce` | Generate cryptographic SIWE authentication nonce |
| `POST` | `/api/auth/verify` | Verify wallet signature & authenticate user session |
| `POST` | `/api/buy-tickets` | Process Base USDC ticket purchases ($1.00 = 10 Tickets) |
| `POST` | `/api/subscriptions/verify` | Process Base recurring VIP subscriptions ($5.00/mo = 50 Tickets) |
| `GET` | `/api/onchain-pot` | Query live Base escrow smart contract jackpot balance |
| `POST` | `/api/duel/matchmake` | Prioritizes human vs human P2P matchmaking & challenge broadcast |
| `GET` | `/api/duel/active-challenges` | Query active waiting human duel rooms |
| `POST` | `/api/evaluate-duel` | Dual camera frame Gemini AI evaluation for P2P duels |
| `POST` | `/api/evaluate-frame` | Submit player camera frame for Gemini AI expression scoring |
| `POST` | `/api/queue/deduct-ticket` | Deduct entry ticket after each auto re-queue |
| `GET` | `/api/active-trend` | Get active global facial expression target trend |
| `GET` | `/api/timeline` | Fetch live winner timeline feed |

---

## 📄 Smart Contract Overview (`contracts/LotteryLiveEscrow.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LotteryLiveEscrow {
    address public owner;
    uint256 public constant TICKET_COST = 0.0003 ether; // ~$1.00 USD
    uint256 public rolloverPot;
    uint256 public platformBalance;

    event TicketPurchased(address indexed player, uint256 count, uint256 timestamp);
    event PrizeAwarded(address indexed winner, uint256 amount, string aiReason);
    event RolloverUpdated(uint256 newTotal);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function buyTickets(uint256 ticketCount) external payable;
    function awardPrize(address payable winner, string calldata aiReason) external;
    function withdrawPlatformFees(address payable target) external;
    function getGameStats() external view returns (uint256 currentPot, uint256 currentPlatformFees);
    function transferOwnership(address newOwner) external;
    receive() external payable {}
}
```

---

## 📜 License
MIT License. Created for the ARC, Base & Coinbase Ecosystem.
