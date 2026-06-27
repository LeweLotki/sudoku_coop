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
ws://localhost:8000/ws?token=<ACCESS_TOKEN>      # local development
wss://<your-app>.herokuapp.com/ws?token=<TOKEN>  # production
```

Every connection is gated **before** any application message is processed:

- the `token` query parameter must equal the configured `ACCESS_TOKEN`
  (compared in constant time; the token is never logged), and
- the `Origin` header must be the extension (`chrome-extension://…`), absent
  (non-browser clients), or listed in `ALLOWED_WS_ORIGINS`.

Rejected connections are closed with application close code `4401`. In
development an empty `ACCESS_TOKEN` leaves the gate open for convenience; any
non-`development` `ENVIRONMENT` with an empty `ACCESS_TOKEN` fails to start.

### Event protocol

**Host creates a session**

```json
// client -> server
{ "type": "session:create", "role": "host" }
// server -> host
{ "type": "session:created", "sessionId": "AB12" }
```

Session codes are uppercase and exclude ambiguous characters (no `O/0`,
`I/1`). Default length is 8 (configurable via `SESSION_CODE_LENGTH`). Sessions
expire after `SESSION_TTL_SECONDS` of inactivity; expired sessions are removed
lazily and join/highlight attempts against them return
`{ "type": "session:error", "message": "Session expired" }`.

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

Settings load from the environment and an optional `.env` file (see
`.env.example`). **Do not commit your real `.env`.**

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_NAME` | `sudoku-coop-api` | App title |
| `ENVIRONMENT` | `development` | Non-`development` requires `ACCESS_TOKEN` |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated CORS origins (HTTP) |
| `ACCESS_TOKEN` | _(empty)_ | Invite token required on `/ws` (never logged) |
| `ALLOWED_WS_ORIGINS` | _(empty)_ | Extra allowed WebSocket origins (CSWSH defense) |
| `SESSION_CODE_LENGTH` | `8` | Session code length |
| `SESSION_TTL_SECONDS` | `7200` | Session inactivity TTL (lazy cleanup) |
| `MAX_MESSAGES_PER_10_SECONDS` | `30` | Per-connection message rate |
| `MAX_INVALID_MESSAGES_PER_CONNECTION` | `10` | Invalid messages before close |
| `MAX_MESSAGE_BYTES` | `2048` | Max inbound message size |
| `MAX_ACTIVE_SESSIONS` | `50` | Global active-session cap |
| `MAX_GUESTS_PER_SESSION` | `5` | Guests per session cap |

### Security model

The access token is an **invite token, not a true secret**: it keeps random
internet users off the endpoint, and it ends up bundled into the distributed
extension zip (readable by anyone with the zip). Treat it accordingly — serve
production over `wss://` and **rotate the Heroku `ACCESS_TOKEN` (and rebuild the
extension) if the zip leaks**. Security-relevant events are logged at a high
level only; the token value and full raw message bodies are never logged.

### Heroku deployment (one dyno)

Sessions live entirely in-memory in a single process, so deploy with **exactly
one web dyno** — running multiple dynos would split sessions across processes
and break joins. Set the config vars above (notably a long random `ACCESS_TOKEN`)
and do not enable autoscaling.

## Manual test scenario

```bash
uv run uvicorn sudoku_coop_api.main:app --reload
```

1. Connect a host client to `ws://localhost:8000/ws?token=<ACCESS_TOKEN>` and send
   `{ "type": "session:create", "role": "host" }`; note the returned `sessionId`.
   (A missing/incorrect token is rejected with close code `4401`.)
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
│       ├── main.py                    # FastAPI app: CORS, /health, /ws (token+origin gate)
│       ├── core/config.py             # settings
│       ├── core/security.py           # token / origin validation helpers
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
