"""WebSocket connection manager.

Mediates socket I/O for a single connection: accepts it, reads and parses
messages in a loop, dispatches by event ``type`` to the :class:`SessionService`,
sends replies/acknowledgments back to the acting socket, and performs disconnect
cleanup. Domain state lives entirely in the service.
"""

from __future__ import annotations

from fastapi import WebSocket, WebSocketDisconnect

from sudoku_coop_api.sessions.models import Role
from sudoku_coop_api.sessions.service import SessionService
from sudoku_coop_api.websocket import events
from sudoku_coop_api.websocket.events import (
    EventError,
    parse_message,
    require_session_id,
    validate_coordinate,
)


class ConnectionManager:
    """Handles the lifecycle of a single ``/ws`` connection."""

    def __init__(self, service: SessionService) -> None:
        self._service = service

    async def handle(self, websocket: WebSocket) -> None:
        await websocket.accept()
        role: Role | None = None
        session_id: str | None = None
        try:
            while True:
                raw = await websocket.receive_text()
                try:
                    role, session_id = await self._dispatch(websocket, raw, role, session_id)
                except EventError as exc:
                    await websocket.send_json(events.session_error(exc.message))
                except WebSocketDisconnect:
                    raise
                except Exception:
                    # Never leak internal exception traces to clients.
                    await websocket.send_json(events.session_error("Internal error"))
        except WebSocketDisconnect:
            pass
        finally:
            await self._cleanup(role, session_id, websocket)

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
            if role == Role.HOST:
                raise EventError("Host attempted unsupported guest-only action")
            row, column = validate_coordinate(payload)
            await self._service.broadcast_highlight(requested_id, websocket, row, column)
            await websocket.send_json(events.highlight_ack(requested_id, row, column))
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
