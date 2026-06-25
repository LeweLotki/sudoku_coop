## Context

The `realtime-coordination` capability was documented during scaffolding, but the FastAPI backend exists only as placeholder modules. This change implements the backend real-time session layer: a single WebSocket endpoint that lets a host create a session, guests join it, and validated highlight coordinates be routed to the host. State is in-memory only; the extension/UI and SudokuPad integration come later. The backend must remain ignorant of SudokuPad internals and browser specifics — it only validates and routes JSON events.

## Goals / Non-Goals

**Goals:**
- Expose `GET /health` → `{ "status": "ok" }`.
- Expose a single WebSocket endpoint `/ws`; clients self-identify via JSON events.
- Implement the event protocol: `session:create`, `session:join`, `cell:highlight` (+ optional `cell:highlight:sent`), `session:error`, and `session:closed`.
- Store sessions in memory with safe concurrent access.
- Clean up sessions/guests deterministically on disconnect.
- Validate coordinates (`row`/`column` integers 1–9) before broadcasting.
- Provide pytest coverage and document run/test/lint commands.

**Non-Goals:**
- No extension popup, content script, host overlay, guest modal, or grid detection.
- No Redis, database, or any persistence.
- No authentication/authorization.
- No production scaling concerns beyond clean in-memory state.

## Decisions

### Single `/ws` endpoint with role-by-event
All clients connect to `/ws` and declare their role in the first JSON message (`session:create` for host, `session:join` for guest). 
- Rationale: keeps the surface minimal and matches the documented contract; the connection's role is derived from the event it sends rather than the URL.
- Alternative considered: separate `/ws/host` and `/ws/guest` routes — rejected as unnecessary surface area for an MVP and divergent from the contract.

### In-memory session registry behind a service + lock
A `SessionService` owns a `dict[str, Session]` registry. All mutations (create, join, remove host/guest, lookup-and-broadcast) go through the service, which guards registry mutations with a single `asyncio.Lock`.
- Rationale: avoids unsafe shared mutable state without over-engineering; a single coarse lock is sufficient for MVP traffic.
- Alternative considered: per-session locks or lock-free structures — rejected as premature optimization.

### Session model holds live WebSocket references
`Session` stores: `session_id`, `host` connection, a `set`/`dict` of `guest` connections, `created_at`, and `last_activity_at`. A small `Role` enum distinguishes host/guest.
- Rationale: the backend routes events to live connections; no serialization or persistence is needed.

### Session code generation
Codes are uppercase alphanumeric, default length 4, drawn from an alphabet that excludes ambiguous characters (no `O/0`, `I/1`). Generation retries on collision against the active registry to guarantee uniqueness; code length is configurable in `core/config.py`.
- Rationale: short, human-readable, low-collision for the active-session scale of an MVP. Collision handling is deterministically testable by seeding/mocking the generator.

### Events module as the protocol boundary
`websocket/events.py` defines event-type string constants, lightweight parsing/validation helpers, and response/error builder functions (optionally pydantic models for inbound payloads).
- Rationale: centralizes the JSON contract so event names stay stable and validation is consistent. Keep it lean — no premature abstraction.

### ConnectionManager mediates socket I/O; service owns state
`websocket/connection_manager.py` accepts the WebSocket, reads/parses messages in a loop, dispatches by `type` to the `SessionService`, sends responses/errors, and performs disconnect cleanup. The service contains no socket-receive logic.
- Rationale: separation of concerns — transport vs. domain state — without layering a repository or extra abstractions.

### Error handling
All anticipated failures produce `{ "type": "session:error", "message": "<human message>" }` and never leak internal exception traces. Unexpected exceptions are caught at the connection loop boundary and converted to a generic error message.

### Testing approach
- Service-level and code-generation unit tests are mandatory (synchronous, fast).
- WebSocket flow tested via FastAPI/Starlette `TestClient` WebSocket support if it works cleanly in this setup (may require adding `httpx` as a dev dependency via `uv`); otherwise leave a clear TODO for integration WebSocket tests but still ship service-level coverage.

## Risks / Trade-offs

- [In-memory only → all sessions lost on restart] → Acceptable for MVP; documented as intentional. Persistence is an explicit non-goal.
- [Single coarse `asyncio.Lock` could serialize unrelated session mutations] → Negligible at MVP scale; revisit only if profiling shows contention.
- [WebSocket TestClient friction may add a dev dependency] → Gate behind a check; fall back to service-level tests + TODO if integration tests are too heavy.
- [Session code collisions as active sessions grow] → Retry-on-collision plus configurable length mitigates; alphabet choice trades a slightly smaller space for readability.
- [Clients may send malformed/unauthorized events] → Strict validation in `events.py` and role checks in the service; respond with `session:error` rather than crashing the connection.

## Open Questions

- Should `cell:highlight:sent` acknowledgment be always-on or opt-in? Defaulting to always-on for simpler client logic unless it proves noisy.
- Should host disconnect proactively close guest sockets after sending `session:closed`, or leave them open? Defaulting to sending `session:closed` and leaving guest sockets for the client to close.
