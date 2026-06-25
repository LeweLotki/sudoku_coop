## Why

The scaffold change documented the real-time coordination contract but left the backend as placeholder modules with TODO docstrings. We now need a working FastAPI WebSocket backend so a host can create a session, a guest can join it, and validated `(row, column)` highlight events are routed to the host. This is the first functional layer and unblocks later extension/UI integration.

## What Changes

- Implement a `GET /health` endpoint returning `{ "status": "ok" }`.
- Implement a single WebSocket endpoint `/ws` where clients identify their role via JSON events (no per-role URLs).
- Implement the JSON event protocol:
  - `session:create` (host) → `session:created` with a short, unique, human-readable session code.
  - `session:join` (guest) → `session:joined`.
  - `cell:highlight` (guest) → broadcast `cell:highlight` (with server `timestamp`) to the session host, plus optional `cell:highlight:sent` acknowledgment to the guest.
  - `session:error` for all failure cases (invalid JSON, missing/unsupported type, missing/unknown `sessionId`, out-of-range row/column, unauthorized actions, malformed payloads).
- Implement in-memory session storage (session code, host connection, guest connections, timestamps) guarded against unsafe concurrent mutation with `asyncio.Lock`.
- Implement disconnect handling: host disconnect removes the session and notifies guests with `session:closed`; guest disconnect removes only that guest.
- Validate highlight coordinates: `row` and `column` MUST be integers from 1 to 9 inclusive.
- Add backend tests (session code generation, session service behavior, coordinate validation, and WebSocket flow where practical) and update `backend/README.md` with run/test/lint commands.
- **Non-goal / scope restriction**: No extension popup, content script, host overlay, guest modal, or SudokuPad grid detection. No Redis, no database, no persistence, no authentication.

## Capabilities

### New Capabilities
<!-- None. Backend behavior falls under the existing realtime-coordination capability. -->

### Modified Capabilities
- `realtime-coordination`: Refine the backend WebSocket protocol requirements — add the `/ws` single-endpoint and `GET /health` requirements, the standardized `session:error` event with its error cases, the optional `cell:highlight:sent` acknowledgment, and the `session:closed` notification to guests on host disconnect. (Frontend overlay/grid-detection requirements are unchanged and out of scope here.)

## Impact

- Backend modules implemented (currently placeholders): `main.py`, `core/config.py`, `api/health.py`, `websocket/events.py`, `websocket/connection_manager.py`, `sessions/models.py`, `sessions/service.py`.
- New tests under `backend/tests/`; possible dev dependency for WebSocket TestClient (`httpx`) added via `uv` if not already resolved.
- Existing dependencies (FastAPI, `uvicorn[standard]`, pydantic, pytest, ruff) are already declared; only missing dev deps added with `uv`.
- No new runtime infrastructure (no Redis, DB, auth). Extension code remains unimplemented.
