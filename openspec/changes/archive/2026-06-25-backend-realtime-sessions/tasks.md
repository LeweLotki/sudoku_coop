## 1. Dependencies & Configuration

- [x] 1.1 Confirm FastAPI, `uvicorn[standard]`, pydantic, pydantic-settings, pytest, and ruff are present in `backend/pyproject.toml`
- [x] 1.2 Add any missing dev dependency required for WebSocket TestClient (e.g. `httpx`) via `uv add --dev`, then run `uv sync`
- [x] 1.3 Extend `core/config.py` with settings: environment name, allowed CORS origins, session code length (default 4), session code alphabet (uppercase alphanumeric excluding ambiguous `O/0`, `I/1`)

## 2. Health Endpoint

- [x] 2.1 Implement `GET /health` in `api/health.py` returning `{ "status": "ok" }`
- [x] 2.2 Register the health router in `main.py` and configure basic CORS from config

## 3. Event Protocol

- [x] 3.1 Define event-type constants in `websocket/events.py` (`session:create`, `session:created`, `session:join`, `session:joined`, `cell:highlight`, `cell:highlight:sent`, `session:error`, `session:closed`)
- [x] 3.2 Add JSON parsing helpers and inbound payload validation (pydantic models or lightweight validators)
- [x] 3.3 Add response/error builder helpers, including the standardized `session:error` builder

## 4. Session Models & Service

- [x] 4.1 Implement `Role` enum and `Session` model in `sessions/models.py` (session_id, host connection, guest connections, created_at, last_activity_at)
- [x] 4.2 Implement session code generation in `sessions/service.py` (configurable length, chosen alphabet, retry-on-collision for uniqueness)
- [x] 4.3 Implement `SessionService` with an in-memory registry guarded by an `asyncio.Lock`
- [x] 4.4 Implement create session (host only), join session (guest, existing session with active host), and lookup of active sessions
- [x] 4.5 Implement coordinate validation (row/column integers 1–9 inclusive) and broadcast of `cell:highlight` (with server `timestamp`) to the session host
- [x] 4.6 Implement remove-host (removes session) and remove-guest (keeps session) operations

## 5. WebSocket Connection Manager & Route

- [x] 5.1 Implement `ConnectionManager` in `websocket/connection_manager.py` to accept connections, read/parse messages in a loop, and dispatch by `type` to `SessionService`
- [x] 5.2 Send responses/acknowledgments: `session:created`, `session:joined`, `cell:highlight:sent`
- [x] 5.3 Handle all error cases with `session:error` and catch unexpected exceptions without leaking traces
- [x] 5.4 Implement disconnect cleanup: host disconnect removes session and notifies guests with `session:closed`; guest disconnect removes only that guest
- [x] 5.5 Register the `/ws` WebSocket route in `main.py`

## 6. Tests

- [x] 6.1 Test session code generation: expected length, correct alphabet, deterministic collision handling
- [x] 6.2 Test session service: host creates session, guest joins existing, guest cannot join missing session, removing host removes session, removing guest keeps session
- [x] 6.3 Test validation: row/column 1 and 9 valid; row/column 0 and 10 invalid; non-integer invalid
- [x] 6.4 Test WebSocket flow via `TestClient` if practical (host creates, guest joins, guest highlights, host receives `cell:highlight`); otherwise leave a clear TODO for integration WebSocket tests
- [x] 6.5 Replace/remove `tests/test_placeholder.py` as appropriate

## 7. Documentation & Verification

- [x] 7.1 Update `backend/README.md` with commands: `uv sync`, `uv run uvicorn sudoku_coop_api.main:app --reload`, `uv run pytest`, `uv run ruff check .`, `uv run ruff format .`
- [x] 7.2 Run `uv run ruff check .` and `uv run ruff format .` and resolve issues
- [x] 7.3 Run `uv run pytest` and confirm all tests pass
- [x] 7.4 Manually verify the host/guest highlight scenario over `ws://localhost:8000/ws`
