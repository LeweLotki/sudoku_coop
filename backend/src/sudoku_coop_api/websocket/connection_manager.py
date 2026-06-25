"""WebSocket connection manager (placeholder).

TODO: Implement in a future change. The manager will track active WebSocket
connections per session, distinguishing the single host socket from the (possibly
multiple) guest sockets, and broadcast ``cell:highlight`` events to the host.

Responsibilities (future):
  - register/unregister host and guest connections by sessionId
  - broadcast highlight events to the host of a session
  - clean up sessions when the host disconnects

No functional behavior is implemented yet (scaffolding only).
"""

# TODO: class ConnectionManager: ...
