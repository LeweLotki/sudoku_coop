"""FastAPI application entrypoint.

Wires up CORS, the health router, and the WebSocket endpoint backed by the
in-memory session service. Sessions are kept in memory only; there is no
database, Redis, or authentication (see the ``backend-realtime-sessions``
change for rationale).
"""

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from sudoku_coop_api.api.health import router as health_router
from sudoku_coop_api.core.config import settings
from sudoku_coop_api.sessions.service import SessionService
from sudoku_coop_api.websocket.connection_manager import ConnectionManager

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)

session_service = SessionService()
connection_manager = ConnectionManager(session_service)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await connection_manager.handle(websocket)
