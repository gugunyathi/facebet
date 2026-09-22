# 🌟 FACE BET — Hybrid Web3 Live Video Gaming & AI Lottery Platform on Base

**FACE BET** is a next-generation, high-octane Web3 live video gaming, facial AI evaluation, and decentralised lottery arena built natively on the **Base L2 Network** (`0x2105`). Players engage in live video duels, match facial expressions against AI target trends using **Google Gemini Multimodal AI**, and compete for jackpot prize pools funded via USDC micro-tickets.

---

## ⚡ Key Features

### 🔵 Base Account SDK & Native Web3 Auth
- **Sign in with Base**: Built with `@base-org/account`, `@base-org/account-ui`, and `viem`.
- **SIWE Cryptographic Verification**: EIP-4361 Sign-In with Ethereum nonce verification API (`/api/auth/nonce` & `/api/auth/verify`).
- **Multi-Wallet Fallbacks**: Full support for Coinbase Wallet extension, MetaMask, and ARC Network (`0x12d0`).
- **Network Switcher**: Seamless toggle between **Base Mainnet (8453)** and **Base Sepolia Testnet (84532)**.

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
- **LotteryLiveEscrow.sol**: Solidity escrow contract governing ticket pool deposits, 85% rollover prize pool allocation, and 15% platform fee splits.
- **Contract Service Bridge (`contractBridge.ts`)**: Real-time on-chain pot queries via Viem (`GET /api/onchain-pot`).

### 📊 Real-Time Feeds & Persistent Sessions
- **Live Winner Timeline**: Real-time timeline events for jackpot wins and ticket purchases.
- **Session Hydration**: `localStorage` session state persistence for offline ticket balance tracking and guest demo modes.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide & React Icons.
- **Web3 & Base SDKs**: `@base-org/account`, `@base-org/account-ui`, `viem`, `ethers`.
- **AI Engine**: `@google/genai` (Gemini Multimodal Live Frame Analysis).
- **WebRTC & Real-Time**: PeerJS, WebSockets, Canvas Stream Capture API.
- **Backend Server**: Node.js, Express, TypeScript, Mongoose / In-Memory Session Engine.
- **Smart Contracts**: Solidity `^0.8.20` (`LotteryLiveEscrow.sol`).

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
```

### 3. Start Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to launch the app.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/auth/nonce` | Generate cryptographic SIWE authentication nonce |
| `POST` | `/api/auth/verify` | Verify wallet signature & authenticate user session |
| `POST` | `/api/buy-tickets` | Process Base USDC ticket purchases ($1.00 = 10 Tickets) |
| `POST` | `/api/subscriptions/verify` | Process Base recurring VIP subscriptions ($5.00/mo = 50 Tickets) |
| `GET` | `/api/onchain-pot` | Query live Base escrow smart contract jackpot balance |
| `POST` | `/api/evaluate-frame` | Submit player camera frame for Gemini AI expression scoring |
| `GET` | `/api/active-trend` | Get active global facial expression target trend |
| `GET` | `/api/timeline` | Fetch live winner timeline feed |

---

## 📄 Smart Contract Overview (`contracts/LotteryLiveEscrow.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LotteryLiveEscrow {
    address public owner;
    uint256 public constant TICKET_PRICE = 0.0003 ether; // ~$1.00 USD
    uint256 public totalPot;
    uint256 public rolloverPot;
    uint256 public platformFeePercent = 15;

    function buyTickets(address player, uint256 ticketCount) external payable;
    function awardPrize(address winner, uint256 amount, string calldata reason) external;
    function getPotInfo() external view returns (uint256 total, uint256 rollover, uint256 price, uint256 feePercent);
}
```

---

## 📜 License
MIT License. Created for the Base & Coinbase CDP Ecosystem.
