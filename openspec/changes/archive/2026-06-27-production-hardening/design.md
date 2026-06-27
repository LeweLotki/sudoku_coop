## Context

The backend is a FastAPI app with a single `/ws` WebSocket endpoint, an in-memory `SessionService` guarded by an `asyncio.Lock`, and a `ConnectionManager` that reads/parses/dispatches one connection's messages. The extension is an MV3 build (popup + background service worker + content script) where the background owns the single WebSocket and reads the URL from `extension/src/shared/config.ts`. Session models already carry `created_at` and `last_activity_at`; codes already use the human-friendly alphabet but at length 4.

This is a private MVP: one Heroku web dyno, an extension zipped to a handful of friends, no accounts, no database, no Redis. The hardening must be pragmatic, preserve the existing event protocol, and avoid new dependencies.

## Goals / Non-Goals

**Goals:**
- Gate `/ws` behind an access token validated before any app message, with constant-time comparison.
- Block cross-site WebSocket hijacking from ordinary web pages via an Origin allowlist.
- 8-character, configurable, collision-free session codes.
- Session TTL with lazy cleanup; expired sessions rejected.
- Per-connection size/rate/invalid-message limits; max active sessions; max guests per session.
- Pin guest highlights to the joined session.
- Centralized, env-configurable extension backend URL (`wss://` in prod) with token appended; narrow manifest.
- Clear docs: env vars, one-dyno requirement, token rotation.

**Non-Goals:**
- Login/OAuth/accounts, database, Redis, distributed/IP rate limiting, multi-dyno session sharing, analytics/telemetry, invasive logging, admin panel, paid infra.
- Treating the bundled extension token as a true secret.

## Decisions

### Access token via `token` query parameter
Clients connect to `wss://host/ws?token=...`. The backend reads `websocket.query_params["token"]` and compares against `settings.access_token` with `secrets.compare_digest` (constant-time, avoids leaking length/prefix via timing). On mismatch/missing, the server calls `await websocket.close(code=4401)` (application close code in the 4000–4999 private range; 4401 chosen to mirror HTTP 401) **before** entering the receive loop, so no app message is processed.

- **Why query param over header:** browser `WebSocket` cannot set arbitrary headers; query param is the simplest interoperable approach and is what the prompt specifies. Trade-off accepted below.
- **Dev behavior:** `ACCESS_TOKEN` is required. To avoid silently disabling auth in production, the app refuses to start (or rejects all connections) if `ACCESS_TOKEN` is empty when `APP_ENV`/`ENVIRONMENT` is not `development`. In development a default `change-me-local-dev-token` may be used only when explicitly configured. The real token is never committed; `.env.example` carries a placeholder.

### Token is an invite token, not a secret
Once bundled into the zipped extension (`VITE_ACCESS_TOKEN`), the token is readable by anyone with the zip. It exists only to keep random internet users off the endpoint, not to provide real authentication. READMEs will state this explicitly and document rotating the Heroku `ACCESS_TOKEN` config var (and rebuilding/resharing the zip) if the zip leaks.

### Origin allowlist for CSWSH defense
The token alone mostly mitigates CSWSH (a malicious page would need the token), but as defense-in-depth the backend inspects the `Origin` header: connections from `chrome-extension://` origins (the extension) and any origin in a configurable allowlist pass; `http(s)` web-page origins not in the allowlist are rejected. Missing Origin (native/test clients) is allowed since browsers always send Origin and only browser pages are the CSWSH threat. The extension ID for an unpacked/zip install can vary, so we allow the `chrome-extension://` scheme generally rather than pinning a single ID.

### Session codes: length 8, configurable, unique
Keep the existing `secrets.choice` generator and `_generate_unique_code` retry loop; only the default `SESSION_CODE_LENGTH` changes 4 → 8 in settings and `.env.example`. Alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` is unchanged.

### Session expiration: lazy cleanup
A session is expired when `now - last_activity_at > SESSION_TTL_SECONDS` (using last activity keeps active sessions alive; create/join/highlight all refresh `last_activity_at`). A `_purge_expired()` helper runs inside the service lock at the start of `create_session`, `join_session`, and `broadcast_highlight`. Expired sessions are popped from the registry. Join/highlight against an expired (now-absent) session returns `session:error` "Session expired". No background task is added — lazy cleanup is sufficient and simplest; a background sweeper is explicitly avoided to keep the lifecycle clean for one dyno.

### Per-connection limits in the ConnectionManager
Limits are per-connection state local to `ConnectionManager.handle` (no shared/global limiter, no Redis):
- **Size:** check `len(raw.encode("utf-8")) > MAX_MESSAGE_BYTES` → `session:error` "Message too large" (counts as invalid).
- **Rate:** fixed/sliding window — keep timestamps of recent messages; if more than `MAX_MESSAGES_PER_10_SECONDS` within the window → `session:error` "Rate limit exceeded" (or close). A simple deque of monotonic timestamps trimmed to the window is enough.
- **Invalid count:** increment on each `EventError`/oversized/parse failure; when it exceeds `MAX_INVALID_MESSAGES_PER_CONNECTION` → send "Too many invalid messages" then `close()`.

### Capacity limits in the SessionService
Under the existing lock: `create_session` raises `EventError("Too many active sessions")` when `len(self._sessions) >= MAX_ACTIVE_SESSIONS`; `join_session` raises `EventError("Session is full")` when `len(session.guests) >= MAX_GUESTS_PER_SESSION`. These live in the service because that is where the registry and per-session guest set are owned.

### Highlight pinned to joined session
`ConnectionManager` already tracks the connection's `session_id` after join. For `cell:highlight`, use the connection's stored `session_id` rather than the payload's `sessionId` (or reject when they differ). `broadcast_highlight` already verifies `guest in session.guests`, so this is mostly a hardening clarification plus an explicit mismatch rejection.

### CORS tightening
Replace `allow_methods=["*"]`/`allow_headers=["*"]` with the explicit set actually needed (the health endpoint uses `GET`). CORS does not govern WebSocket handshakes, so this is a small hygiene fix for the HTTP surface; `allow_credentials=True` is retained only with explicit origins/methods/headers.

### Extension config: env-based URL builder
`config.ts` exposes `BACKEND_WS_URL` from `import.meta.env.VITE_BACKEND_WS_URL` (default `ws://localhost:8000/ws`) and `ACCESS_TOKEN` from `VITE_ACCESS_TOKEN`. A pure `buildBackendUrl(baseUrl, token)` helper appends `token` via `URL`/`URLSearchParams` (preserving existing params, `?` vs `&`). The background uses `buildBackendUrl(...)` instead of the raw constant. A `vite-env.d.ts` declares the env var types. Real tokens come from an untracked `.env` (gitignored `.env.*` already covers it); `.env.example` documents placeholders.

### Manifest
Add the production `wss://<heroku-domain>/*` host permission (kept narrow) alongside the existing `https://sudokupad.app/*` and local `ws://localhost:8000/*`. Confirm no `<all_urls>` and the SudokuPad-only content script. `scripting`/`tabs` are retained (used by on-demand injection and tab lookup); `activeTab` retained as it backs the active-tab fast path.

## Risks / Trade-offs

- **Token visible in URLs/logs** → Heroku's router and proxies log request paths including `?token=...`. Mitigation: treat it strictly as an invite token (documented), keep it out of application logs, and rely on `wss://` for transport encryption. A header/subprotocol approach was considered but rejected to match the prompt and keep the browser client simple.
- **Token in the extension bundle is extractable** → documented as an invite token with rotation guidance; not relied on for real auth.
- **Lazy-only expiration** → a session with no further create/join/highlight traffic lingers in memory until the next relevant operation triggers cleanup. Acceptable for a ~3-person MVP and bounded by `MAX_ACTIVE_SESSIONS`.
- **In-memory state requires one dyno** → multiple dynos would split sessions across processes and break joins. Mitigation: document and deploy with exactly one web dyno; no autoscaling.
- **Origin allowlist vs varying extension ID** → allowing the whole `chrome-extension://` scheme is broader than pinning one ID, but pinning is brittle for zip installs; the token remains the primary gate.
- **Per-connection (not global) rate limiting** → many connections could still aggregate load, but `MAX_ACTIVE_SESSIONS` and `MAX_GUESTS_PER_SESSION` cap total connections, which is sufficient for this scale.

## Migration Plan

1. Add backend settings + `.env.example`; set Heroku config vars (`ACCESS_TOKEN` = long random value, plus limits/TTL/code length as needed).
2. Deploy backend on a single web dyno; verify token gate via the manual scenarios (no token → rejected, wrong → rejected, correct → accepted).
3. Build the extension with `VITE_BACKEND_WS_URL=wss://<domain>/ws` and `VITE_ACCESS_TOKEN=<token>`; zip and share.
4. Rollback: revert to the previous build/release; since state is in-memory and ephemeral there is no data migration. Rotating `ACCESS_TOKEN` invalidates all existing extension builds (intended for leak response).

## Open Questions

- Final production Heroku domain for the `wss://` host permission (placeholder used until known).
- Whether to also expose a settings-based token paste in the popup later; deferred — env-based build token is preferred for this change.
