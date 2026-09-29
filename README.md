# 🌟 FACE BET — Hybrid Web3 Live Video Gaming & AI Lottery Platform on Base

**FACE BET** is a next-generation, high-octane Web3 live video gaming, facial AI evaluation, and decentralised lottery arena built natively on the **Base L2 Network** (`0x2105`). Players engage in live video duels, match facial expressions against AI target trends using **Google Gemini Multimodal AI**, and compete for jackpot prize pools funded via USDC micro-tickets and $0.20 bid stakes.

---

## ⚡ Key Features & Recent Updates

### 🎨 Brand Identity & Custom Biometric Logo
- **Custom Facebet Logo (`FacebetLogo.tsx`)**: High-contrast biometric face silhouette with camera viewfinder brackets, horizontal laser scan beam with neon bloom glow, and a circular "BET" token badge.
- **App Color Theme**: Vibrant gradient palette combining Cyber Gold/Amber (`#FBBF24`), Violet/Purple (`#A855F7`), Pink/Magenta (`#EC4899`), and Neon Cyan (`#06B6D4`).
- **Unified Branding**: Prominent **FACEBET** title & logo integrated across the home hero section, navigation header, sliding burger drawer, subpages header, and browser favicon (`/public/favicon.svg`).
- **Hero Headline**: Updated primary landing page headline: **"Game Face On! Battle Expressions. Win Big JackPots."** with brand logo header directly above it.

### ⚔️ Real-Time P2P Camera Duels & Dynamic Rotational Queue
- **King-of-the-Hill Matchmaking**: Continuous rotational queue where players transition seamlessly between Spectator, Challenger (Player 2), and King (Player 1) roles.
- **Side-by-Side Arena Controls**: Below the player camera view boxes:
  - **Left Side**: "SELECT BID / STAKE AMOUNT" panel with preset buttons (`$0.20`, `$0.50`, `$1.00`, `$5.00`, `$10.00`).
  - **Right Side**: "START P2P ARENA MATCH" action button (`⚔️ START P2P ARENA MATCH ($0.20 BIDS)`), dynamically updating with the selected bid.
  - **Below Them**: "LIVE ARENA QUEUE ROSTER" panel showing the active King, Challenger, and queued players list.
- **Floating Home Button**: Independent glassmorphic Home button (`<Home size={15} />`) placed directly beneath the red Quit/Exit button on both player camera feeds for instant return to the main landing page.
- **WebRTC PeerJS Mesh Network**: 
  - Centralized Render WebSocket backend strictly manages JSON state and queue positions.
  - Active players (King & Challenger) automatically broker direct 1-to-1 WebRTC connections.
  - **Live Spectator Mesh**: Active players autonomously broadcast their video feeds point-to-point to all queued spectators for true zero-latency audience viewing.
- **Role-Gated Hardware Efficiency**: Hardware cameras (`getUserMedia`) are strictly engaged only when a user is actively battling, eliminating browser stream limits and preserving spectator bandwidth.
- **Mobile Viewport Controls**:
  - **`📱 Stack / ↔️ Side-by-Side`**: Instant toggle between vertical video stack and horizontal split-screen view.
  - **`⤢ Fullscreen`**: Viewport expansion to fill the complete mobile display, with `↙↗ Exit Fullscreen` toggle.

### 🍔 Reorganized Drawer Navigation (Burger Menu)
- **Top Navigation Ordering**: Main navigation links positioned **at the very top / above Free Spectator Mode**:
  1. **Live Arena Stream**: *"Watch active P2P video matches face-to-face"*
  2. **Web3 Auth & About**: *"Verify wallet, $1 = 10 tickets & game info"*
  3. **FACE BET Timeline**: *"Live draws, winner logs & jackpot records"*
  4. **Settings**: *"Web3 network, video quality & sound options"*

### 🔵 Base Account SDK & Native Web3 Auth
- **Unified Wallet & Chain Selector (`UnifiedWalletChainButton.tsx`)**: Single button combining wallet address, network badge, and chain icon with quick network switching dropdown.
- **Sign in with Base**: Built with `@base-org/account`, `@base-org/account-ui`, and `viem`.
- **SIWE Cryptographic Verification**: EIP-4361 Sign-In with Ethereum nonce verification API (`/api/auth/nonce` & `/api/auth/verify`).
- **Multi-Wallet Fallbacks**: Full support for Coinbase Wallet extension, MetaMask, and ARC Network (`0x12d0`).
- **Network Switcher**: Toggle between **Base Mainnet (8453)** and **Base Sepolia Testnet (84532)**.

### 💳 Native Base Payments (`pay`) & Subscriptions (`subscribe`)
- **One-Click USDC Payments (`pay`)**: Execute $1.00 USDC ticket purchases directly on Base for 10 game entry slots.
- **Auto-Renewing Subscriptions (`subscribe`)**: Recurring $5.00/month VIP Pass subscriptions with EIP-712 spend permissions for 50 auto-renewing tickets/month.
- **START MATCH Action Button**: Displays `$0.20` price tag on the Start Match button next to the Base Pay button across all screen resolutions.
- **Multi-Channel Fiat Gateway**: Paystack credit card and mobile money fallback checkout.

### 🔮 Dual Live Video Arenas
- **P2AI Arena (Person vs AI Hologram)**:
  - Real-time video frame capture processed through **Google Gemini 2.0 Flash AI** to evaluate facial expressions against live target trends.
  - High-performance canvas downscaling (320x240 @ 0.55 JPEG) reducing network bandwidth usage by **>90%**.
- **P2P Arena (Person vs Person Video Duel)**:
  - Low-latency WebRTC video duel matching via PeerJS with dynamic spectator mesh broadcasting.
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

---

## 📜 License
MIT License. Created for the ARC, Base & Coinbase Ecosystem.
