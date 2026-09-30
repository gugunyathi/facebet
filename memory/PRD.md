# FaceBet — Product Requirements Document

## Original Problem Statement
Fetch GitHub repo (facebet), auto-queue users to compete, and ensure smart contracts work for payments/payouts. Upgrade the UI to make it more user-friendly and addictive without changing features, logic, or smart contracts. Use iPhone-type default fonts. Add a Filter Store where users can buy items (facial expressions, hats, halloween, xmas, masks) to increase their chances of winning; integrate items & keywords into duel logic.

## Architecture
- **Node backend** at `/app/server` (Express + WS) running on port 8002.
- **FastAPI proxy** at `/app/backend/server.py` routes `/api` (HTTP + WS) from port 8001 to Node.
- **Vite frontend** at `/app/src` served via `/app/frontend/package.json` wrapper on port 3000.
- **DB**: MongoDB (`facebet` DB).
- **Integrations**: Gemini (`@google/genai`), viem (Base + Base Sepolia + ARC), PeerJS (WebRTC).

## Implemented (2026-09-30)
### Core (from GitHub `facebet` repo)
- Automated matchmaking queue with King-of-the-Hill rotation.
- WebRTC P2P duel via PeerJS.
- Gemini frame evaluator + composite trend scheduler.
- On-chain contract bridge for jackpot + duel escrow (viem, Base / Base Sepolia / ARC).
- Currency toggle (USD ↔ $FBET), transaction history, landing page.

### 2026-09-30 additions (this session)
1. **Filter Boost Wiring** — `server/services/storeCatalog.ts` (15-filter catalog + `Inventory` model). `evaluate-duel` looks up each player's equipped filter, computes boost (doubled on theme match), and injects filter name + emoji + keywords + boost hint into the Gemini prompt. Fallback path also applies boost delta.
2. **Payout Activation** — `evaluate-duel` now uses `ContractBridge.executeDuelPayout(roomId, …)` when `roomId` provided, `executeOnChainPayout` otherwise. Network resolved from request body → winner's Mongo session → default `base`. Returns `payoutMode: onchain | fallback` and network in the response.
3. **Queue Stability** — `backend/server.py` WebSocket proxy hardened: 3-retry upstream connect, per-frame `suppress` guards on send, WebSocketState checks, ping/pong heartbeats (20 s), and pending-task cancellation on close.
4. **Daily Streak Bonus** — `Inventory.dailyStreak` + `lastDailyAt`. `POST /api/store/claim-daily` awards `3 + (streak-1)` tickets, streak caps at 7 (max 9 tickets/day), resets to 1 on missed day.

### Store API (all under `/api/store`)
- `GET /catalog` — full filter list.
- `GET /inventory/:peerId` — owned + equipped + streak + eligibility.
- `POST /buy` — `{peerId, filterId}` (deducts tickets, adds to inventory).
- `POST /equip` — `{peerId, filterId | null}` (must be owned).
- `POST /claim-daily` — `{peerId}` (grants tickets with streak bonus).

## Backlog (P0 → P2)
### P0
- Build **Filter Store UI** in `/app/src` (currently the store is API-only; needs a modal/page in the arena to browse, buy, and equip filters, plus a "Claim Daily" CTA showing the streak).
- Real `OPERATOR_PRIVATE_KEY` wiring so the duel payout stops falling back to a simulated tx hash on Base Sepolia.

### P1
- Overlay the equipped filter's emoji on the player's WebRTC video track (visual affirmation of the boost).
- Persist per-match filter usage stats so we can surface "Crown wins" / "Ninja wins" leaderboards.
- Add Gemini frame-level judgement of whether the filter emoji is actually visible on-camera (bonus for genuine display).

### P2
- Localise streak/store copy (Vitest snapshot tests).
- Expiring/limited-time seasonal filters (Christmas, Halloween rotate).
- Split `server/index.ts` (~2000 LOC) into routers by domain.

## Known Issues
- Gemini `gemini-3.8-flash` may 429/404 — falls back to boost-biased random verdict (functional but not ideal).
- Node dev-server logs `EADDRINUSE :3000` from a stray listen call (harmless when using the FastAPI proxy on 8001 → 8002).

## Test Credentials
See `/app/memory/test_credentials.md` (Web3 wallet auth — no email/password).
