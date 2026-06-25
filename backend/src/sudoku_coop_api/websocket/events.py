"""WebSocket event type constants and schemas (placeholder).

TODO: Define typed event schemas in a future change. The conceptual contract:

  Client -> Server:
    - session:create  { type, role: "host" }
    - session:join    { type, role: "guest", sessionId }
    - cell:highlight  { type, sessionId, row, column }

  Server -> Client:
    - session:created { type, sessionId }
    - session:joined  { type, ok, sessionId }
    - cell:highlight  { type, sessionId, row, column, timestamp }
    - session:error   { type, message }

Validation (future): sessionId required for guest actions; row/column integers
in [1, 9] for the 9x9 MVP. No functional behavior yet (scaffolding only).
"""

# TODO: event type constants and pydantic models.
