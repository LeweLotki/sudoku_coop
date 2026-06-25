"""In-memory session domain models.

These models hold live WebSocket connections and are never persisted. The
``Connection`` protocol keeps the domain decoupled from FastAPI/Starlette so the
service can be unit-tested with simple fakes.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable


class Role(enum.StrEnum):
    HOST = "host"
    GUEST = "guest"


@runtime_checkable
class Connection(Protocol):
    """Minimal interface required of a WebSocket connection."""

    async def send_json(self, data: Any) -> None: ...


@dataclass
class Session:
    """A single coordination session held entirely in memory."""

    session_id: str
    host: Connection
    created_at: float
    last_activity_at: float
    guests: set[Connection] = field(default_factory=set)
