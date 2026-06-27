"""Integration tests for the /ws access-token and Origin gate."""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from sudoku_coop_api.core.config import settings
from sudoku_coop_api.main import app

client = TestClient(app)


@pytest.fixture
def access_token() -> Iterator[str]:
    """Configure a required access token for the duration of a test."""
    original = settings.access_token
    settings.access_token = "test-secret-token"
    try:
        yield settings.access_token
    finally:
        settings.access_token = original


def test_connection_without_token_is_rejected(access_token: str) -> None:
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws"):
            pass


def test_connection_with_invalid_token_is_rejected(access_token: str) -> None:
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws?token=wrong"):
            pass


def test_connection_with_valid_token_is_accepted(access_token: str) -> None:
    with client.websocket_connect(f"/ws?token={access_token}") as conn:
        conn.send_json({"type": "session:create", "role": "host"})
        created = conn.receive_json()
        assert created["type"] == "session:created"


def test_disallowed_origin_is_rejected() -> None:
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws", headers={"origin": "https://evil.example"}):
            pass


def test_extension_origin_is_accepted() -> None:
    with client.websocket_connect(
        "/ws", headers={"origin": "chrome-extension://abcdefghijklmnop"}
    ) as conn:
        conn.send_json({"type": "session:create", "role": "host"})
        created = conn.receive_json()
        assert created["type"] == "session:created"
