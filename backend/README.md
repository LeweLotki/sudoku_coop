# sudoku-coop-api (backend)

FastAPI backend for real-time SudokuPad coordination.

A host creates a session, guests join with the session code, and validated
`(row, column)` highlight events are routed over WebSockets to the host. Sessions
are kept **in memory only** — there is no database, Redis, or authentication.

## Tech stack

- Python 3.12+
- [FastAPI](https://fastapi.tiangolo.com/) (WebSockets via Starlette)
- [uvicorn](https://www.uvicorn.org/) for the dev server
- [pydantic](https://docs.pydantic.dev/) / pydantic-settings for config
- Tooling: [uv](https://docs.astral.sh/uv/), pytest, ruff, mypy (optional), httpx (tests)

## Setup

This project uses [`uv`](https://docs.astral.sh/uv/) for environment and dependency
management.

```bash
# Install/sync dependencies (including dev tools)
uv sync --extra dev
```

## Common commands

```bash
# Run the development server
uv run uvicorn sudoku_coop_api.main:app --reload

# Run tests
uv run pytest

# Lint / format
uv run ruff check .
uv run ruff format .

# Type-check (optional)
uv run mypy
```

## HTTP endpoints

- `GET /health` → `{ "status": "ok" }`

## WebSocket endpoint

All clients connect to a single endpoint and identify their role via JSON events:

```
ws://localhost:8000/ws
```

### Event protocol

**Host creates a session**

```json
// client -> server
{ "type": "session:create", "role": "host" }
// server -> host
{ "type": "session:created", "sessionId": "AB12" }
```

Session codes are short, uppercase, and exclude ambiguous characters (no `O/0`,
`I/1`). Default length is 4 (configurable via `SESSION_CODE_LENGTH`).

**Guest joins a session**

```json
// client -> server
{ "type": "session:join", "role": "guest", "sessionId": "AB12" }
// server -> guest
{ "type": "session:joined", "ok": true, "sessionId": "AB12" }
```

**Guest sends a highlight coordinate** (`row`/`column` must be integers 1–9)

```json
// client -> server
{ "type": "cell:highlight", "sessionId": "AB12", "row": 3, "column": 5 }
// server -> host
{ "type": "cell:highlight", "sessionId": "AB12", "row": 3, "column": 5, "timestamp": 1782390000000 }
// server -> guest (acknowledgment)
{ "type": "cell:highlight:sent", "ok": true, "sessionId": "AB12", "row": 3, "column": 5 }
```

**Errors**

```json
{ "type": "session:error", "message": "Session not found" }
```

**Session lifecycle**

- Host disconnect removes the session and notifies guests with
  `{ "type": "session:closed", "sessionId": "AB12" }`.
- Guest disconnect removes only that guest; the session stays alive.

## Configuration

Settings load from the environment and an optional `.env` file (see `.env.example`):

- `APP_NAME`
- `ENVIRONMENT`
- `ALLOWED_ORIGINS` (comma-separated CORS origins)
- `SESSION_CODE_LENGTH` (default `4`)

## Manual test scenario

```bash
uv run uvicorn sudoku_coop_api.main:app --reload
```

1. Connect a host client to `ws://localhost:8000/ws` and send
   `{ "type": "session:create", "role": "host" }`; note the returned `sessionId`.
2. Connect a guest client to the same URL and send
   `{ "type": "session:join", "role": "guest", "sessionId": "<code>" }`.
3. From the guest, send
   `{ "type": "cell:highlight", "sessionId": "<code>", "row": 3, "column": 5 }`.
4. The host receives a `cell:highlight` event (with a server `timestamp`).

## Project layout

```
backend/
├── pyproject.toml
├── .env.example
├── src/
│   └── sudoku_coop_api/
│       ├── main.py                    # FastAPI app: CORS, /health, /ws
│       ├── core/config.py             # settings
│       ├── websocket/
│       │   ├── connection_manager.py  # per-connection lifecycle + dispatch
│       │   └── events.py              # event constants, parsing, builders
│       ├── sessions/
│       │   ├── models.py              # Role, Session, Connection protocol
│       │   └── service.py             # in-memory registry + routing
│       └── api/health.py              # health endpoint
└── tests/
    ├── conftest.py
    ├── test_session_codes.py
    ├── test_session_service.py
    ├── test_validation.py
    └── test_websocket.py
```
