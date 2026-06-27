"""Tests for session expiration (lazy TTL cleanup)."""

from __future__ import annotations

import asyncio

import pytest

from sudoku_coop_api.sessions.service import SessionService
from sudoku_coop_api.websocket import events
from sudoku_coop_api.websocket.events import EventError
from tests.conftest import FakeConnection

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _service() -> SessionService:
    return SessionService(code_length=8, alphabet=ALPHABET, ttl_seconds=3600)


def _expire(service: SessionService, session_id: str) -> None:
    """Force a session to look idle for well beyond the TTL."""
    session = service.get_session(session_id)
    assert session is not None
    session.last_activity_at -= 3600 * 1000 * 2


def test_expired_session_is_removed_on_next_operation() -> None:
    service = _service()

    async def scenario() -> str:
        session = await service.create_session(FakeConnection())
        _expire(service, session.session_id)
        # Creating another session triggers lazy cleanup of the expired one.
        await service.create_session(FakeConnection())
        return session.session_id

    expired_id = asyncio.run(scenario())
    assert service.get_session(expired_id) is None


def test_guest_cannot_join_expired_session() -> None:
    service = _service()

    async def scenario() -> None:
        session = await service.create_session(FakeConnection())
        _expire(service, session.session_id)
        await service.join_session(session.session_id, FakeConnection())

    with pytest.raises(EventError) as exc:
        asyncio.run(scenario())
    assert exc.value.message == events.ERROR_SESSION_EXPIRED


def test_highlight_rejected_for_expired_session() -> None:
    service = _service()

    async def scenario() -> None:
        session = await service.create_session(FakeConnection())
        guest = FakeConnection()
        await service.join_session(session.session_id, guest)
        _expire(service, session.session_id)
        await service.broadcast_highlight(session.session_id, guest, 3, 5)

    with pytest.raises(EventError) as exc:
        asyncio.run(scenario())
    assert exc.value.message == events.ERROR_SESSION_EXPIRED
