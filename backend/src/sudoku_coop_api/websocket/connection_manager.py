"""WebSocket connection manager.

Mediates socket I/O for a single connection: accepts it, reads and parses
messages in a loop, dispatches by event ``type`` to the :class:`SessionService`,
sends replies/acknowledgments back to the acting socket, and performs disconnect
cleanup. Domain state lives entirely in the service.

This layer also enforces lightweight, per-connection abuse controls (message
size, message rate, and invalid-message count). These limits are in-memory and
local to a single connection; there is no global or distributed limiter.
"""

from __future__ import annotations

import logging
import time
from collections import deque

from fastapi import WebSocket, WebSocketDisconnect

from sudoku_coop_api.core.config import settings
from sudoku_coop_api.sessions.models import Role
from sudoku_coop_api.sessions.service import SessionService
from sudoku_coop_api.websocket import events
from sudoku_coop_api.websocket.events import (
    EventError,
    parse_message,
    require_session_id,
    validate_coordinate,
)

logger = logging.getLogger(__name__)

# Window for the message-rate limit, matching MAX_MESSAGES_PER_10_SECONDS.
_RATE_WINDOW_SECONDS = 10.0

# Application close code for connections terminated due to abuse.
_WS_CLOSE_POLICY_VIOLATION = 1008


class ConnectionManager:
    """Handles the lifecycle of a single ``/ws`` connection."""

    def __init__(self, service: SessionService) -> None:
        self._service = service

    async def handle(self, websocket: WebSocket) -> None:
        await websocket.accept()
        role: Role | None = None
        session_id: str | None = None

        # Per-connection abuse counters (local to this connection only).
        invalid_count = 0
        recent_messages: deque[float] = deque()

        try:
            while True:
                raw = await websocket.receive_text()

                # --- Message size limit ---
                if len(raw.encode("utf-8")) > settings.max_message_bytes:
                    invalid_count += 1
                    await websocket.send_json(events.session_error(events.ERROR_MESSAGE_TOO_LARGE))
                    if invalid_count > settings.max_invalid_messages_per_connection:
                        await self._close_for_abuse(websocket, events.ERROR_TOO_MANY_INVALID)
                        break
                    continue

                # --- Message rate limit ---
                if self._over_rate_limit(recent_messages):
                    await websocket.send_json(events.session_error(events.ERROR_RATE_LIMIT))
                    continue

                try:
                    role, session_id = await self._dispatch(websocket, raw, role, session_id)
                except EventError as exc:
                    invalid_count += 1
                    await websocket.send_json(events.session_error(exc.message))
                    if invalid_count > settings.max_invalid_messages_per_connection:
                        await self._close_for_abuse(websocket, events.ERROR_TOO_MANY_INVALID)
                        break
                except WebSocketDisconnect:
                    raise
                except Exception:
                    # Never leak internal exception traces to clients.
                    await websocket.send_json(events.session_error("Internal error"))
        except WebSocketDisconnect:
            pass
        finally:
            await self._cleanup(role, session_id, websocket)

    @staticmethod
    def _over_rate_limit(recent_messages: deque[float]) -> bool:
        """Record this message and report whether the rate limit is exceeded."""
        now = time.monotonic()
        recent_messages.append(now)
        cutoff = now - _RATE_WINDOW_SECONDS
        while recent_messages and recent_messages[0] < cutoff:
            recent_messages.popleft()
        return len(recent_messages) > settings.max_messages_per_10_seconds

    async def _close_for_abuse(self, websocket: WebSocket, message: str) -> None:
        """Notify the client and close the connection due to abuse."""
        logger.warning("Closing WebSocket connection: %s", message)
        try:
            await websocket.send_json(events.session_error(message))
        except Exception:
            pass
        try:
            await websocket.close(code=_WS_CLOSE_POLICY_VIOLATION)
        except Exception:
            pass

    async def _dispatch(
        self,
        websocket: WebSocket,
        raw: str,
        role: Role | None,
        session_id: str | None,
    ) -> tuple[Role | None, str | None]:
        payload = parse_message(raw)
        event_type = payload["type"]

        if event_type == events.SESSION_CREATE:
            if role is not None:
                raise EventError("Connection already identified")
            session = await self._service.create_session(websocket)
            await websocket.send_json(events.session_created(session.session_id))
            return Role.HOST, session.session_id

        if event_type == events.SESSION_JOIN:
            if role is not None:
                raise EventError("Connection already identified")
            requested_id = require_session_id(payload)
            session = await self._service.join_session(requested_id, websocket)
            await websocket.send_json(events.session_joined(session.session_id))
            return Role.GUEST, session.session_id

        if event_type == events.CELL_HIGHLIGHT:
            requested_id = require_session_id(payload)
            if role != Role.GUEST or session_id is None:
                raise EventError("Host attempted unsupported guest-only action")
            # Pin the highlight to the session this connection actually joined;
            # ignore a mismatched sessionId supplied in the payload.
            if requested_id != session_id:
                raise EventError("Session mismatch")
            row, column = validate_coordinate(payload)
            await self._service.broadcast_highlight(session_id, websocket, row, column)
            await websocket.send_json(events.highlight_ack(session_id, row, column))
            return role, session_id

        raise EventError("Unsupported event type")

    async def _cleanup(
        self, role: Role | None, session_id: str | None, websocket: WebSocket
    ) -> None:
        if role is None or session_id is None:
            return
        if role == Role.HOST:
            await self._service.close_session(session_id)
        else:
            await self._service.remove_guest(session_id, websocket)
