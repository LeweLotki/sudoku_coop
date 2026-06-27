## 1. Inspect current backend

- [x] 1.1 Re-read `core/config.py`, `sessions/service.py`, `sessions/models.py`, `websocket/connection_manager.py`, `websocket/events.py`, and `main.py` to confirm hook points before editing
- [x] 1.2 Confirm session models already expose `created_at`/`last_activity_at` and the code generator/uniqueness loop

## 2. Backend security config

- [x] 2.1 Add settings to `core/config.py`: `access_token`, `allowed_ws_origins` (comma-split like `allowed_origins`), `session_ttl_seconds` (default 7200), `max_messages_per_10_seconds` (30), `max_invalid_messages_per_connection` (10), `max_message_bytes` (2048), `max_active_sessions` (50), `max_guests_per_session` (5)
- [x] 2.2 Change `session_code_length` default 4 → 8
- [x] 2.3 Add a startup guard so a non-development `ENVIRONMENT`/`APP_ENV` with empty `ACCESS_TOKEN` fails fast (never silently disable auth in production)

## 3. WebSocket token + origin validation

- [x] 3.1 In the `/ws` handler (`main.py`) or `ConnectionManager`, read `token` from `websocket.query_params` and compare to `settings.access_token` with `secrets.compare_digest`
- [x] 3.2 Validate the `Origin` header against `chrome-extension://` scheme + configured allowlist; allow missing Origin
- [x] 3.3 Reject invalid/missing token or disallowed origin by closing with an app close code (e.g. 4401) BEFORE the receive loop; ensure no app message is processed
- [x] 3.4 Ensure the token value is never logged or echoed in error messages

## 4. Session code length

- [x] 4.1 Verify the generator now produces 8-character codes from the alphabet via the updated setting (no generator code change expected beyond config)

## 5. Session TTL cleanup

- [x] 5.1 Add a `_purge_expired()` helper in `SessionService` (runs inside the lock) that removes sessions where `now - last_activity_at > session_ttl_seconds`
- [x] 5.2 Call cleanup at the start of `create_session`, `join_session`, and `broadcast_highlight`
- [x] 5.3 Make `join_session`/`broadcast_highlight` raise `EventError("Session expired")` when the target session is missing due to expiry

## 6. Rate limiting, size, and invalid-message limits

- [x] 6.1 Add new error builders/messages in `events.py`: "Message too large", "Rate limit exceeded", "Too many invalid messages", "Session is full", "Too many active sessions" (keep `session:error` shape)
- [x] 6.2 In `ConnectionManager.handle`, reject messages exceeding `max_message_bytes` with "Message too large"
- [x] 6.3 Track per-connection message timestamps and reject/`close` when exceeding `max_messages_per_10_seconds` with "Rate limit exceeded"
- [x] 6.4 Count invalid messages per connection; after `max_invalid_messages_per_connection`, send "Too many invalid messages" and close the connection

## 7. Capacity limits and highlight pinning

- [x] 7.1 In `create_session`, raise `EventError("Too many active sessions")` when `len(sessions) >= max_active_sessions`
- [x] 7.2 In `join_session`, raise `EventError("Session is full")` when guests reach `max_guests_per_session`
- [x] 7.3 In the `cell:highlight` dispatch, use the connection's joined `session_id` (reject mismatched payload `sessionId`)

## 8. CORS hygiene

- [x] 8.1 Replace wildcard `allow_methods`/`allow_headers` with the explicit set needed for the HTTP surface while keeping `allow_credentials` with explicit origins

## 9. Backend env + docs

- [x] 9.1 Update `.env.example` with all new vars and an `ACCESS_TOKEN=change-me-local-dev-token` placeholder; fix the stale "no settings read" comment
- [x] 9.2 Update backend README: env var table, one-dyno requirement, token rotation, that logs must not contain the token

## 10. Backend tests

- [x] 10.1 Token: connection without token rejected, with wrong token rejected, with correct token accepted
- [x] 10.2 Session code: generated length is 8 and uses the allowed alphabet; collision handling still works
- [x] 10.3 Expiration: expired session removed; guest cannot join expired session; highlight rejected for expired session
- [x] 10.4 Limits: too many guests rejected; too many active sessions rejected; oversized message rejected; rate-limit exceeded errors/closes; too many invalid messages closes/errors
- [x] 10.5 (Optional) Origin: disallowed web origin rejected; extension origin accepted

## 11. Extension config + token

- [x] 11.1 Update `src/shared/config.ts` to read `VITE_BACKEND_WS_URL` (default `ws://localhost:8000/ws`) and `VITE_ACCESS_TOKEN`, and export a pure `buildBackendUrl(baseUrl, token)` that appends `token` while preserving existing query params
- [x] 11.2 Add `vite-env.d.ts` typings for the new env vars
- [x] 11.3 Use `buildBackendUrl(...)` in `serviceWorker.ts` for the connection URL; ensure the token is NOT persisted to `chrome.storage.local`
- [x] 11.4 Add a local untracked `.env` example note (gitignore already covers `.env.*`)

## 12. Extension manifest + docs

- [x] 12.1 Add the production `wss://<heroku-domain>/*` host permission; confirm no `<all_urls>`, SudokuPad-only content script, and otherwise narrow permissions
- [x] 12.2 Update extension README: `VITE_BACKEND_WS_URL`/`VITE_ACCESS_TOKEN` setup, that the zip contains the invite token, and token-rotation guidance

## 13. Extension tests/checks

- [x] 13.1 Test `buildBackendUrl`: appends token correctly, preserves existing query params, returns base URL unchanged when no token
- [x] 13.2 Assert the default dev URL remains `ws://localhost:8000/ws`
- [x] 13.3 Add a check/test that the manifest does not contain `<all_urls>` and the content script matches only `https://sudokupad.app/*`

## 14. Verify

- [x] 14.1 Run backend tests (and mypy/ruff) — all green
- [x] 14.2 Run extension typecheck/lint/build and unit tests — all green
- [x] 14.3 Document the Heroku config vars and one-dyno deployment in the README(s)
