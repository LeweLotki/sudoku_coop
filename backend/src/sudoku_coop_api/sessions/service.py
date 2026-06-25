"""In-memory session registry and coordination logic.

All session state lives in a single process-local registry guarded by an
``asyncio.Lock``. There is no database, Redis, or persistence: this is an MVP
and sessions are intentionally ephemeral.
"""

from __future__ import annotations

import asyncio
import secrets
import time
from collections.abc import Callable

from sudoku_coop_api.core.config import settings
from sudoku_coop_api.sessions.models import Connection, Session
from sudoku_coop_api.websocket import events
from sudoku_coop_api.websocket.events import EventError

# Upper bound on attempts to find a non-colliding session code before giving up.
_MAX_CODE_ATTEMPTS = 1000


def _now_ms() -> int:
    return int(time.time() * 1000)


class SessionService:
    """Owns the active-session registry and routes validated events."""

    def __init__(
        self,
        *,
        code_length: int | None = None,
        alphabet: str | None = None,
        code_factory: Callable[[], str] | None = None,
    ) -> None:
        self._sessions: dict[str, Session] = {}
        self._lock = asyncio.Lock()
        self._code_length = code_length or settings.session_code_length
        self._alphabet = alphabet or settings.session_code_alphabet
        self._code_factory = code_factory or self._default_code_factory

    # --- Session code generation ---

    def _default_code_factory(self) -> str:
        return "".join(secrets.choice(self._alphabet) for _ in range(self._code_length))

    def _generate_unique_code(self) -> str:
        for _ in range(_MAX_CODE_ATTEMPTS):
            code = self._code_factory()
            if code not in self._sessions:
                return code
        raise RuntimeError("Unable to generate a unique session code")

    # --- Lookups ---

    def get_session(self, session_id: str) -> Session | None:
        return self._sessions.get(session_id)

    @property
    def active_session_ids(self) -> list[str]:
        return list(self._sessions.keys())

    # --- Mutations ---

    async def create_session(self, host: Connection) -> Session:
        """Register a new session for ``host`` and return it."""
        async with self._lock:
            code = self._generate_unique_code()
            now = _now_ms()
            session = Session(
                session_id=code,
                host=host,
                created_at=now,
                last_activity_at=now,
            )
            self._sessions[code] = session
            return session

    async def join_session(self, session_id: str, guest: Connection) -> Session:
        """Add ``guest`` to an existing session, or raise ``EventError``."""
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                raise EventError("Session not found")
            session.guests.add(guest)
            session.last_activity_at = _now_ms()
            return session

    async def broadcast_highlight(
        self, session_id: str, guest: Connection, row: int, column: int
    ) -> int:
        """Send a validated highlight to the session host and return its timestamp.

        Raises ``EventError`` if the session is missing or the guest has not joined.
        """
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                raise EventError("Session not found")
            if guest not in session.guests:
                raise EventError("Guest attempted to send highlight before joining")
            host = session.host
            timestamp = _now_ms()
            session.last_activity_at = timestamp

        # Send outside the lock to avoid holding it across network I/O.
        await host.send_json(events.highlight_broadcast(session_id, row, column, timestamp))
        return timestamp

    async def remove_guest(self, session_id: str, guest: Connection) -> None:
        """Remove a single guest, keeping the session alive for the host."""
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return
            session.guests.discard(guest)
            session.last_activity_at = _now_ms()

    async def close_session(self, session_id: str) -> Session | None:
        """Remove a session (host disconnect) and notify guests best-effort."""
        async with self._lock:
            session = self._sessions.pop(session_id, None)
            if session is None:
                return None
            guests = list(session.guests)

        message = events.session_closed(session_id)
        for guest in guests:
            try:
                await guest.send_json(message)
            except Exception:
                # Guest may already be gone; closing is best-effort.
                pass
        return session
