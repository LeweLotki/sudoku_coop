## Why

The app works end-to-end locally and is now moving toward private deployment: the backend will be containerized on a single Heroku web dyno and the extension will be zipped and shared with a few friends. Before that, the open `/ws` endpoint, 4-character session codes, never-expiring in-memory sessions, and absence of any rate limiting make the service trivially abusable by anyone who finds the URL. This change adds pragmatic MVP hardening to gate access and limit accidental spam — it is explicitly **not** full enterprise security.

## What Changes

- Require an `ACCESS_TOKEN` (read from a `token` query parameter) for every `/ws` connection; reject missing/invalid tokens before any app message is processed, using a timing-safe comparison.
- Add a WebSocket Origin allowlist so arbitrary web pages cannot open a socket (cross-site WebSocket hijacking defense), while still allowing the extension.
- Increase session codes to 8 characters from the existing human-friendly alphabet, configurable via `SESSION_CODE_LENGTH`, keeping uniqueness/collision handling.
- Add session expiration (`SESSION_TTL_SECONDS`, default 7200) with lazy cleanup before create/join/highlight; expired sessions are removed and further events return `session:error`.
- Add simple per-connection in-memory limits: max message size, message rate, invalid-message count, max active sessions, and max guests per session, each with a clear `session:error`.
- Pin guest highlights to the session the guest actually joined (ignore a mismatched `sessionId` in the payload).
- Tighten CORS to explicit methods/headers instead of wildcards alongside `allow_credentials`.
- Extension: centralize and make the backend URL configurable for production `wss://` via `VITE_BACKEND_WS_URL`, append the access token via `VITE_ACCESS_TOKEN`, and confirm manifest permissions stay narrow (no `<all_urls>`, SudokuPad-only content script, production `wss://` host permission).
- Update `.env.example`, backend README, and extension README; document the one-dyno requirement and token-rotation guidance.

This change preserves the existing WebSocket event protocol and host/guest behavior. No login system, OAuth, database, Redis, user accounts, analytics, or distributed rate limiting are added; sessions remain in-memory, which requires exactly one Heroku web dyno.

## Capabilities

### New Capabilities
- None. This change hardens existing behavior rather than introducing a new capability area.

### Modified Capabilities
- `realtime-coordination`: add WebSocket access-token authentication and Origin allowlist; change session codes to 8 characters; add session TTL/expiration; add per-connection rate/size/invalid-message limits, max active sessions, and max guests per session; pin highlights to the joined session.
- `extension-connection`: backend URL becomes environment-configurable (production `wss://`, local `ws://` default); the access token is appended to the WebSocket URL; reaffirm narrow manifest permissions including the production `wss://` host permission and no token persisted to storage.

## Impact

- Backend: `core/config.py` (new settings), `main.py` (CORS, `/ws` token + origin gate), `websocket/connection_manager.py` (token validation, rate/size/invalid limits, lazy expiry, highlight pinning), `sessions/service.py` and `sessions/models.py` (TTL cleanup, max-sessions/max-guests, code length), `websocket/events.py` (new error messages), `.env.example`, backend tests, backend README.
- Extension: `src/shared/config.ts` (env-based URL + token, URL builder), `src/background/serviceWorker.ts` (use built URL), `vite.config.ts`/env typings, `manifest.json` (production `wss://` host permission), extension tests, extension README.
- Config/ops: new env vars (`ACCESS_TOKEN`, `SESSION_CODE_LENGTH`, `SESSION_TTL_SECONDS`, `MAX_MESSAGES_PER_10_SECONDS`, `MAX_INVALID_MESSAGES_PER_CONNECTION`, `MAX_MESSAGE_BYTES`, `MAX_ACTIVE_SESSIONS`, `MAX_GUESTS_PER_SESSION`, allowed WS origins) and Heroku config vars; deployment constrained to one web dyno.
- No new runtime dependencies; no database/Redis.
