# Test Credentials — FaceBet

No username/password auth. Players authenticate with a wallet (SIWE) or **Demo mode**.

- Demo login (UI): Connect → "Demo Base" or "Demo ARC" → random wallet, 10 welcome tickets (once per wallet).
- Demo login (API): `POST /api/auth-wallet {"walletAddress":"0x<40 hex>","network":"base"}` → returns `user.peerId` (= `p_<address lowercase no 0x>`), `availableTickets`.
- Session tickets: `GET /api/session/<peerId>`
- Admin-only endpoints (`/api/lottery/buy-tickets`, `/api/contract/award-prize`) require header `x-admin-key: fb_admin_7c1e9a4d2b8f` (ADMIN_API_KEY in backend/.env).
- OPERATOR_PRIVATE_KEY is intentionally EMPTY → payouts report status `not_configured` (no fake tx hashes).
