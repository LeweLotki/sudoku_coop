"""In-memory session registry (placeholder).

TODO: Implement in a future change. Responsibilities:
  - generate short, human-readable session codes (4-6 uppercase alphanumeric)
  - create a session for a host and return its code
  - look up sessions for guests joining/highlighting
  - remove a session when its host disconnects
  - remove a guest when that guest disconnects

Storage is in-memory only for the MVP: no database, no Redis. No functional
behavior is implemented yet (scaffolding only).
"""

# TODO: class SessionService: ...
