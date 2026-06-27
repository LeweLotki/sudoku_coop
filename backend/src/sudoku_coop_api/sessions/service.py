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
        ttl_seconds: int | None = None,
        max_active_sessions: int | None = None,
        max_guests_per_session: int | None = None,
    ) -> None:
        self._sessions: dict[str, Session] = {}
        self._lock = asyncio.Lock()
        self._code_length = code_length or settings.session_code_length
        self._alphabet = alphabet or settings.session_code_alphabet
        self._code_factory = code_factory or self._default_code_factory
        self._ttl_seconds = ttl_seconds if ttl_seconds is not None else settings.session_ttl_seconds
        self._max_active_sessions = (
            max_active_sessions if max_active_sessions is not None else settings.max_active_sessions
        )
        self._max_guests_per_session = (
            max_guests_per_session
            if max_guests_per_session is not None
            else settings.max_guests_per_session
        )

    # --- Session code generation ---

    def _default_code_factory(self) -> str:
        return "".join(secrets.choice(self._alphabet) for _ in range(self._code_length))

    def _generate_unique_code(self) -> str:
        for _ in range(_MAX_CODE_ATTEMPTS):
            code = self._code_factory()
            if code not in self._sessions:
                return code
        raise RuntimeError("Unable to generate a unique session code")

    # --- Expiration (lazy cleanup) ---

    def _purge_expired(self) -> None:
        """Drop sessions idle for longer than the configured TTL.

        Must be called while holding ``self._lock``. A TTL of 0 or less disables
        expiration entirely.
        """
        if self._ttl_seconds <= 0:
            return
        cutoff = _now_ms() - self._ttl_seconds * 1000
        expired = [
            code for code, session in self._sessions.items() if session.last_activity_at < cutoff
        ]
        for code in expired:
            self._sessions.pop(code, None)

    def _is_expired(self, session_id: str) -> bool:
        """Report whether ``session_id`` exists but is past its TTL.

        Must be called while holding ``self._lock`` and before ``_purge_expired``
        so callers can return a precise "expired" error instead of "not found".
        """
        if self._ttl_seconds <= 0:
            return False
        session = self._sessions.get(session_id)
        if session is None:
            return False
        return session.last_activity_at < _now_ms() - self._ttl_seconds * 1000

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
            self._purge_expired()
            if len(self._sessions) >= self._max_active_sessions:
                raise EventError(events.ERROR_TOO_MANY_SESSIONS)
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
            expired = self._is_expired(session_id)
            self._purge_expired()
            session = self._sessions.get(session_id)
            if session is None:
                raise EventError(events.ERROR_SESSION_EXPIRED if expired else "Session not found")
            if len(session.guests) >= self._max_guests_per_session:
                raise EventError(events.ERROR_SESSION_FULL)
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
            expired = self._is_expired(session_id)
            self._purge_expired()
            session = self._sessions.get(session_id)
            if session is None:
                raise EventError(events.ERROR_SESSION_EXPIRED if expired else "Session not found")
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
