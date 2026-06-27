"""Tests for capacity limits (service) and per-connection limits (WebSocket)."""

from __future__ import annotations

import asyncio
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from sudoku_coop_api.core.config import settings
from sudoku_coop_api.main import app
from sudoku_coop_api.sessions.service import SessionService
from sudoku_coop_api.websocket import events
from sudoku_coop_api.websocket.events import EventError
from tests.conftest import FakeConnection

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

client = TestClient(app)


# --- Service-level capacity limits ------------------------------------------


def test_too_many_active_sessions_rejected() -> None:
    service = SessionService(code_length=8, alphabet=ALPHABET, max_active_sessions=2)

    async def scenario() -> None:
        await service.create_session(FakeConnection())
        await service.create_session(FakeConnection())
        await service.create_session(FakeConnection())

    with pytest.raises(EventError) as exc:
        asyncio.run(scenario())
    assert exc.value.message == events.ERROR_TOO_MANY_SESSIONS


def test_too_many_guests_rejected() -> None:
    service = SessionService(code_length=8, alphabet=ALPHABET, max_guests_per_session=1)

    async def scenario() -> None:
        session = await service.create_session(FakeConnection())
        await service.join_session(session.session_id, FakeConnection())
        await service.join_session(session.session_id, FakeConnection())

    with pytest.raises(EventError) as exc:
        asyncio.run(scenario())
    assert exc.value.message == events.ERROR_SESSION_FULL


# --- WebSocket-level per-connection limits ----------------------------------


@pytest.fixture
def small_limits() -> Iterator[None]:
    """Shrink the limits so they are easy to trip in a test."""
    original = (
        settings.max_message_bytes,
        settings.max_messages_per_10_seconds,
        settings.max_invalid_messages_per_connection,
    )
    settings.max_message_bytes = 64
    settings.max_messages_per_10_seconds = 1000
    settings.max_invalid_messages_per_connection = 1000
    try:
        yield
    finally:
        (
            settings.max_message_bytes,
            settings.max_messages_per_10_seconds,
            settings.max_invalid_messages_per_connection,
        ) = original


def test_oversized_message_rejected(small_limits: None) -> None:
    with client.websocket_connect("/ws") as conn:
        conn.send_json({"type": "session:create", "padding": "x" * 200})
        error = conn.receive_json()
        assert error == events.session_error(events.ERROR_MESSAGE_TOO_LARGE)


def test_rate_limit_exceeded_returns_error() -> None:
    original = settings.max_messages_per_10_seconds
    settings.max_messages_per_10_seconds = 2
    try:
        with client.websocket_connect("/ws") as conn:
            messages = []
            for _ in range(3):
                conn.send_json({"type": "bogus:event"})
                messages.append(conn.receive_json())
        assert any(m == events.session_error(events.ERROR_RATE_LIMIT) for m in messages)
    finally:
        settings.max_messages_per_10_seconds = original


def test_too_many_invalid_messages_closes_connection() -> None:
    original = settings.max_invalid_messages_per_connection
    settings.max_invalid_messages_per_connection = 2
    try:
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("/ws") as conn:
                for _ in range(5):
                    conn.send_json({"type": "bogus:event"})
                    conn.receive_json()
    finally:
        settings.max_invalid_messages_per_connection = original
