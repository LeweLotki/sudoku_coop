I want to create the second OpenSpec change for this project: `backend-realtime-sessions`.

Context:

This project is a browser extension + FastAPI backend for coordinating SudokuPad sessions.

The first scaffolding step should already have created a monorepo with roughly this structure:

sudoku-coop/
├── backend/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── README.md
│   ├── .env.example
│   ├── src/
│   │   └── sudoku_coop_api/
│   │       ├── **init**.py
│   │       ├── main.py
│   │       ├── core/
│   │       │   ├── **init**.py
│   │       │   └── config.py
│   │       ├── websocket/
│   │       │   ├── **init**.py
│   │       │   ├── connection_manager.py
│   │       │   └── events.py
│   │       ├── sessions/
│   │       │   ├── **init**.py
│   │       │   ├── models.py
│   │       │   └── service.py
│   │       └── api/
│   │           ├── **init**.py
│   │           └── health.py
│   └── tests/
│       ├── **init**.py
│       └── test_placeholder.py
│
├── extension/
│   └── ...
│
├── specs/
│   └── ...
│
└── README.md

Your task now is to propose and, where appropriate for the OpenSpec workflow, implement the backend real-time session system.

Important scope:

This change is backend-focused.

Do not implement SudokuPad grid detection.
Do not implement the browser extension popup.
Do not implement the host overlay.
Do not implement the guest modal.
Do not add Redis.
Do not add a database.
Do not add authentication.
Do not modify SudokuPad or frontend logic.

The goal of this change is to implement the FastAPI WebSocket backend that will later allow:

* host creates a session
* guest joins a session
* guest sends row/column
* backend validates event
* backend broadcasts highlight event to the host of that session
* sessions are kept in memory only

Use FastAPI WebSockets.

Use `uv` for dependency management.

Before changing files:

1. Inspect the repository.
2. Confirm the existing backend structure.
3. Check `pyproject.toml`.
4. Check whether FastAPI, uvicorn, pytest, ruff, and related dependencies are already present.
5. Add only missing backend dependencies with `uv`.
6. Preserve existing project conventions.
7. Do not overwrite unrelated files.

Backend runtime behavior:

Expose a WebSocket endpoint.

Preferred endpoint:

/ws

All clients connect to the same endpoint and then identify themselves using JSON events.

The backend should accept JSON messages with a `type` field.

Core event protocol:

1. Host creates a session

Client sends:

{
"type": "session:create",
"role": "host"
}

Server responds to host:

{
"type": "session:created",
"sessionId": "AB12"
}

Rules:

* Only a host can create a session.
* Session ID should be short and human-readable.
* Use uppercase alphanumeric codes.
* Default length: 4 characters.
* Avoid ambiguous characters if easy, for example avoid O/0 and I/1.
* Session IDs should be unique among active sessions.

2. Guest joins a session

Client sends:

{
"type": "session:join",
"role": "guest",
"sessionId": "AB12"
}

Server responds to guest:

{
"type": "session:joined",
"ok": true,
"sessionId": "AB12"
}

Rules:

* Session must exist.
* Session must have active host.
* Multiple guests may join the same session.
* A guest connection should be tracked under the session.

3. Guest sends a highlight coordinate

Client sends:

{
"type": "cell:highlight",
"sessionId": "AB12",
"row": 3,
"column": 5
}

Server sends to the host of that session:

{
"type": "cell:highlight",
"sessionId": "AB12",
"row": 3,
"column": 5,
"timestamp": 1782390000000
}

Server may also acknowledge the guest:

{
"type": "cell:highlight:sent",
"ok": true,
"sessionId": "AB12",
"row": 3,
"column": 5
}

Rules:

* Only guests should normally send highlight events.
* For MVP, row must be an integer from 1 to 9.
* For MVP, column must be an integer from 1 to 9.
* Backend should validate row and column before broadcasting.
* Backend should not know anything about SudokuPad internals.
* Backend should not care about browser tabs.
* Backend only routes validated events.

4. Error event

When something goes wrong, server responds with:

{
"type": "session:error",
"message": "Session not found"
}

Possible errors:

* invalid JSON
* missing type
* unsupported event type
* missing sessionId
* session not found
* host already disconnected
* row out of range
* column out of range
* guest attempted to send highlight before joining
* host attempted unsupported guest-only action
* malformed payload

Session behavior:

Use in-memory session storage.

No Redis.
No database.
No persistence.

A session should contain at least:

* session ID
* host WebSocket connection
* set/list/dict of guest WebSocket connections
* creation timestamp
* optional last activity timestamp

Disconnect behavior:

* If host disconnects:

  * remove the entire session
  * notify guests if possible with a `session:closed` event
  * cleanup all references

* If guest disconnects:

  * remove only that guest from the session
  * keep session alive if host is still connected

Concurrency:

This is an MVP, but avoid obviously unsafe shared mutable state.

If needed, use `asyncio.Lock` around session registry mutations.

Code structure:

Use the existing structure if available. Suggested responsibilities:

`src/sudoku_coop_api/main.py`

* create FastAPI app
* include health router
* include websocket route/router
* configure basic CORS if already planned in config
* expose app object for uvicorn

`src/sudoku_coop_api/core/config.py`

* app settings
* session code length
* allowed origins if needed
* environment name
* websocket constants if appropriate

`src/sudoku_coop_api/api/health.py`

* GET `/health`
* returns simple status payload:
  {
  "status": "ok"
  }

`src/sudoku_coop_api/websocket/events.py`

* event type constants
* payload parsing helpers
* pydantic models if useful
* response builder helpers if useful
* do not over-engineer

`src/sudoku_coop_api/websocket/connection_manager.py`

* WebSocket connection manager
* accepts WebSocket connections
* reads messages
* routes event types to session service
* sends responses/errors
* handles disconnect cleanup

`src/sudoku_coop_api/sessions/models.py`

* session model
* connected client model if useful
* role enum if useful
* in-memory representation only

`src/sudoku_coop_api/sessions/service.py`

* session creation
* joining session
* validating guest membership
* broadcasting highlight event to host
* removing sessions
* removing guests
* looking up active sessions
* generating session codes

Testing requirements:

Add backend tests.

Use pytest.

At minimum, add tests for:

1. Session code generation:

   * code has expected length
   * code is uppercase/alphanumeric or chosen alphabet
   * generated session IDs do not collide in simple repeated generation test, or collision handling is tested deterministically

2. Session service:

   * host can create a session
   * guest can join existing session
   * guest cannot join missing session
   * removing host removes session
   * removing guest keeps session

3. Validation:

   * row 1 and column 1 valid
   * row 9 and column 9 valid
   * row 0 invalid
   * row 10 invalid
   * column 0 invalid
   * column 10 invalid
   * non-integer row/column invalid

4. WebSocket behavior if practical:

   * host connects and creates session
   * guest connects and joins session
   * guest sends highlight
   * host receives highlight event

If full WebSocket tests are too heavy for this change, include at least service-level tests and leave a clear TODO for integration WebSocket tests. But prefer adding WebSocket tests if FastAPI TestClient supports it cleanly in the current setup.

Quality requirements:

* Code should be typed where reasonable.
* Use clear function names.
* Avoid global spaghetti.
* Keep backend implementation simple.
* No premature abstractions.
* No database-like repository layer.
* No Redis adapter.
* No authentication.
* No production scaling concerns beyond clean in-memory state.
* Use meaningful error messages.
* Avoid leaking internal exception traces into WebSocket messages.
* Keep JSON event names stable.

Development commands should be documented in `backend/README.md`, for example:

* install dependencies with uv
* run dev server
* run tests
* run ruff
* format code if configured

Example commands may look like:

uv sync
uv run uvicorn sudoku_coop_api.main:app --reload
uv run pytest
uv run ruff check .
uv run ruff format .

Only use commands that match the actual project configuration.

OpenSpec requirements:

Create or update the OpenSpec change for `backend-realtime-sessions`.

The OpenSpec proposal should include:

1. `proposal.md`

   * Explain that this change implements the backend real-time session layer.
   * State that it does not implement extension UI, content script grid detection, or SudokuPad overlay.
   * State that sessions are in-memory only.

2. `design.md`

   * Explain architecture:

     * FastAPI app
     * WebSocket endpoint `/ws`
     * in-memory session service
     * connection manager
     * JSON event protocol
   * Explain session lifecycle.
   * Explain disconnect handling.
   * Explain validation rules.
   * Explain why Redis/database are intentionally excluded for MVP.
   * Explain that frontend/extension will integrate later.

3. `tasks.md`

   * Backend dependency check/update
   * Health endpoint
   * Event constants/schemas
   * Session models/service
   * WebSocket connection manager
   * WebSocket route registration
   * Tests
   * README updates
   * Verification commands

Acceptance criteria:

* Backend exposes `GET /health`.
* Backend exposes WebSocket endpoint `/ws`.
* Host can create a session through WebSocket event `session:create`.
* Backend returns a short session code.
* Guest can join existing session through WebSocket event `session:join`.
* Backend rejects join for missing session.
* Guest can send `cell:highlight` with valid row/column.
* Backend broadcasts `cell:highlight` to the host.
* Backend rejects row/column outside 1–9.
* Backend removes session when host disconnects.
* Backend removes guest when guest disconnects.
* No Redis is used.
* No database is used.
* No authentication is added.
* Tests cover core session behavior.
* Backend README explains how to run and test.
* Existing extension code is not functionally implemented in this change.

Manual test scenario:

1. Start backend:

uv run uvicorn sudoku_coop_api.main:app --reload

2. Connect host WebSocket client to:

ws://localhost:8000/ws

3. Host sends:

{
"type": "session:create",
"role": "host"
}

4. Host receives:

{
"type": "session:created",
"sessionId": "AB12"
}

5. Connect guest WebSocket client to:

ws://localhost:8000/ws

6. Guest sends:

{
"type": "session:join",
"role": "guest",
"sessionId": "AB12"
}

7. Guest receives:

{
"type": "session:joined",
"ok": true,
"sessionId": "AB12"
}

8. Guest sends:

{
"type": "cell:highlight",
"sessionId": "AB12",
"row": 3,
"column": 5
}

9. Host receives:

{
"type": "cell:highlight",
"sessionId": "AB12",
"row": 3,
"column": 5,
"timestamp": 1782390000000
}

Timestamp value does not need to match the example.

Please now create the OpenSpec proposal for `backend-realtime-sessions` and implement the backend real-time session layer according to this specification, while keeping the change focused and avoiding frontend/extension implementation.
