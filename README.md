# 🌟 FACE BET — Hybrid Web3 Live Video Gaming & AI Lottery Platform on Base & ARC

**FACE BET** is a next-generation, high-octane Web3 live video gaming, facial AI evaluation, and decentralized lottery arena built natively on the **Base L2 Network** (`0x2105`) and **ARC Network**. Players engage in live video duels, match facial expressions against AI target trends using **Google Gemini Multimodal AI**, and compete for jackpot prize pools funded via USDC micro-tickets and **$FBET** token bids.

---

## ⚡ Key Features & Recent Updates

### 💎 $FBET Token Integration & Cross-Chain Utility
- **Jackpot Prize Pool (POT)**: Compounding prize pools displayed in both **$FBET** and USD equivalence.
- **Queue Bids & Staking**: Bid presets denominated in $FBET (`2.00 FBET`, `5.00 FBET`, `10.00 FBET`, `50.00 FBET`, `100.00 FBET`) with Priority Jump capabilities.
- **Fixed Exchange Rate**: Transparent placeholder exchange rate of **$1 = 10 FBET** across all betting and wallet interfaces.

### 🌐 Global Display Preference State & Currency Toggle
- **Centralized Currency Context (`CurrencyContext.tsx`)**: Global React context persisting user display preference (`$USD` vs `$FBET`) in `localStorage`.
- **Global Header Toggle (`Display: $FBET / $USD`)**: Prominent top navigation toggle controlling all bets, pots, wallet balances, and transaction displays across the entire platform.

### 📜 $FBET Transaction Ledger & User Profile History
- **Transaction History View (`TimelinePage.tsx`)**: Dedicated ledger view tracking all `$FBET` transfers, bid entries, ticket purchases, and jackpot winnings.
- **Token & Type Filtering**: Instant filtering by token (`ALL`, `$FBET`, `USDC`, `Base ETH`) and transaction type (`Jackpot Winnings`, `Bid Entries`, `Token Transfers`, `Ticket Purchases`).
- **User Profile Modal (`BurgerMenu.tsx`)**: Dedicated modal for logged-in users tracking personal gameplay history (duels won, win rate, king reigns) and personal transaction history.

### 🎨 Brand Identity & Custom Biometric Logo
- **Custom Facebet Logo (`FacebetLogo.tsx`)**: High-contrast biometric face silhouette with camera viewfinder brackets, horizontal laser scan beam with neon bloom glow, and a circular "BET" token badge.
- **App Color Theme**: Vibrant gradient palette combining Cyber Gold/Amber (`#FBBF24`), Violet/Purple (`#A855F7`), Pink/Magenta (`#EC4899`), and Neon Cyan (`#06B6D4`).

### ⚔️ Real-Time P2P Camera Duels & Dynamic Rotational Queue
- **King-of-the-Hill Matchmaking**: Continuous rotational queue where players transition seamlessly between Spectator, Challenger (Player 2), and King (Player 1) roles.
- **Side-by-Side Arena Controls**: Below the player camera view boxes:
  - **Left Side**: "SELECT BID / STAKE AMOUNT" panel with currency conversion toggle (`⇄`).
  - **Right Side**: "START P2P ARENA MATCH" action button dynamically reflecting active $FBET or $USD bids.
- **WebRTC PeerJS Mesh Network & Live Spectator Broadcasting**.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide & React Icons. (Deployed on Vercel)
- **Web3 & SDKs**: `@base-org/account`, `@base-org/account-ui`, `viem`, `ethers`, Hardhat.
- **AI Engine**: `@google/genai` (Gemini Multimodal Live Frame Analysis).
- **WebRTC & Real-Time**: PeerJS, WebSockets, Canvas Stream Capture API.
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

| Method | Endpoint / Event | Description |
| :--- | :--- | :--- |
| **REST APIs** | | |
| `GET` | `/api/auth/nonce` | Generate cryptographic SIWE authentication nonce |
| `POST` | `/api/auth/verify` | Verify wallet signature & authenticate user session |
| `POST` | `/api/buy-tickets` | Process Base USDC ticket purchases ($1.00 = 10 Tickets) |
| `POST` | `/api/subscriptions/verify` | Process Base recurring VIP subscriptions ($5.00/mo = 50 Tickets) |
| `GET` | `/api/onchain-pot` | Query live Base escrow smart contract jackpot balance |
| `POST` | `/api/duel/matchmake` | Enters a user into the live King-of-the-Hill match queue |
| `GET` | `/api/duel/active-challenges` | Query active waiting human duel rooms |
| `POST` | `/api/evaluate-duel` | Dual camera frame Gemini AI evaluation for P2P duels |
| `POST` | `/api/evaluate-frame` | Submit player camera frame for Gemini AI expression scoring |
| `POST` | `/api/queue/deduct-ticket` | Deduct entry ticket after each auto re-queue |
| `GET` | `/api/active-trend` | Get active global facial expression target trend |
| `GET` | `/api/timeline` | Fetch live winner timeline feed |
| `GET` | `/api/game-stats` | Fetch global platform game stats and active pot balances |
| **WebSocket Events** | | *(Sent via `wss://` Render server connection)* |
| `SEND` | `JOIN_ARENA_QUEUE` | Register peer ID and wallet to join the active match lineup |
| `SEND` | `LEAVE_ARENA_QUEUE` | Withdraw from the lineup and revert to spectator status |
| `RECEIVE`| `ARENA_STATE_UPDATE` | Global broadcast of current King, Challenger, and Queue roster |
| `RECEIVE`| `P2P_MATCH_FOUND` | Legacy matchmaking trigger event (Superseded by Arena State) |

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
