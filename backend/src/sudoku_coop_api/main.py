"""FastAPI application entrypoint.

Wires up CORS, the health router, and the WebSocket endpoint backed by the
in-memory session service. Sessions are kept in memory only; there is no
database or Redis. Access to ``/ws`` is gated by an invite-style access token
and an Origin allowlist (see ``core/security``).
"""

import logging

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from sudoku_coop_api.api.health import router as health_router
from sudoku_coop_api.core.config import settings
from sudoku_coop_api.core.security import (
    WS_CLOSE_UNAUTHORIZED,
    origin_is_allowed,
    token_is_valid,
)
from sudoku_coop_api.sessions.service import SessionService
from sudoku_coop_api.websocket.connection_manager import ConnectionManager

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(health_router)

session_service = SessionService()
connection_manager = ConnectionManager(session_service)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    # Gate the connection before accepting it: reject (without ever processing an
    # application message) when the Origin is disallowed or the token is missing
    # or invalid. The token value is never logged.
    origin = websocket.headers.get("origin")
    if not origin_is_allowed(origin, settings.allowed_ws_origins):
        logger.warning("Rejected WebSocket connection: disallowed origin %r", origin)
        await websocket.close(code=WS_CLOSE_UNAUTHORIZED)
        return

    token = websocket.query_params.get("token")
    if not token_is_valid(token, settings.access_token):
        logger.warning("Rejected WebSocket connection: invalid access token")
        await websocket.close(code=WS_CLOSE_UNAUTHORIZED)
        return

    await connection_manager.handle(websocket)
