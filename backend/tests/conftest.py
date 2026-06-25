"""Shared test helpers."""

from __future__ import annotations

from typing import Any


class FakeConnection:
    """Records JSON messages sent to it, standing in for a WebSocket."""

    def __init__(self) -> None:
        self.sent: list[Any] = []

    async def send_json(self, data: Any) -> None:
        self.sent.append(data)
