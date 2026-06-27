"""WebSocket event protocol: type constants, parsing/validation, and builders.

This module is the single source of truth for the JSON event contract so event
names stay stable and validation is consistent. It is deliberately lightweight;
no premature abstraction.
"""

from __future__ import annotations

import json
from typing import Any

# --- Inbound (client -> server) event types ---
SESSION_CREATE = "session:create"
SESSION_JOIN = "session:join"
CELL_HIGHLIGHT = "cell:highlight"

# --- Outbound (server -> client) event types ---
SESSION_CREATED = "session:created"
SESSION_JOINED = "session:joined"
CELL_HIGHLIGHT_SENT = "cell:highlight:sent"
SESSION_ERROR = "session:error"
SESSION_CLOSED = "session:closed"

# 9x9 grid bounds for the MVP (inclusive).
MIN_INDEX = 1
MAX_INDEX = 9

# --- Standard error messages (surfaced via session:error) ---
ERROR_SESSION_EXPIRED = "Session expired"
ERROR_MESSAGE_TOO_LARGE = "Message too large"
ERROR_RATE_LIMIT = "Rate limit exceeded"
ERROR_TOO_MANY_INVALID = "Too many invalid messages"
ERROR_SESSION_FULL = "Session is full"
ERROR_TOO_MANY_SESSIONS = "Too many active sessions"


class EventError(Exception):
    """Raised for anticipated protocol failures.

    The ``message`` is safe to surface to clients via a ``session:error`` event.
    """

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def parse_message(raw: str) -> dict[str, Any]:
    """Parse a raw text frame into a JSON object with a ``type`` field."""
    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, TypeError) as exc:
        raise EventError("Invalid JSON") from exc

    if not isinstance(payload, dict):
        raise EventError("Malformed payload")

    if not payload.get("type"):
        raise EventError("Missing type")

    return payload


def require_session_id(payload: dict[str, Any]) -> str:
    """Return a non-empty ``sessionId`` or raise an ``EventError``."""
    session_id = payload.get("sessionId")
    if not isinstance(session_id, str) or not session_id:
        raise EventError("Missing sessionId")
    return session_id


def _validate_index(value: Any, name: str) -> int:
    # bool is a subclass of int, so reject it explicitly.
    if not isinstance(value, int) or isinstance(value, bool):
        raise EventError(f"{name} must be an integer")
    if value < MIN_INDEX or value > MAX_INDEX:
        raise EventError(f"{name} out of range")
    return value


def validate_coordinate(payload: dict[str, Any]) -> tuple[int, int]:
    """Validate and return ``(row, column)`` from a highlight payload."""
    row = _validate_index(payload.get("row"), "row")
    column = _validate_index(payload.get("column"), "column")
    return row, column


# --- Outbound builders ---


def session_created(session_id: str) -> dict[str, Any]:
    return {"type": SESSION_CREATED, "sessionId": session_id}


def session_joined(session_id: str) -> dict[str, Any]:
    return {"type": SESSION_JOINED, "ok": True, "sessionId": session_id}


def highlight_broadcast(session_id: str, row: int, column: int, timestamp: int) -> dict[str, Any]:
    return {
        "type": CELL_HIGHLIGHT,
        "sessionId": session_id,
        "row": row,
        "column": column,
        "timestamp": timestamp,
    }


def highlight_ack(session_id: str, row: int, column: int) -> dict[str, Any]:
    return {
        "type": CELL_HIGHLIGHT_SENT,
        "ok": True,
        "sessionId": session_id,
        "row": row,
        "column": column,
    }


def session_error(message: str) -> dict[str, Any]:
    return {"type": SESSION_ERROR, "message": message}


def session_closed(session_id: str) -> dict[str, Any]:
    return {"type": SESSION_CLOSED, "sessionId": session_id}
