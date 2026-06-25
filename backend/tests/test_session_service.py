"""Tests for the in-memory session service behavior."""

from __future__ import annotations

import asyncio

import pytest

from sudoku_coop_api.sessions.service import SessionService
from sudoku_coop_api.websocket import events
from sudoku_coop_api.websocket.events import EventError
from tests.conftest import FakeConnection

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _service() -> SessionService:
    return SessionService(code_length=4, alphabet=ALPHABET)


def test_host_can_create_session() -> None:
    service = _service()
    host = FakeConnection()

    session = asyncio.run(service.create_session(host))

    assert session.host is host
    assert service.get_session(session.session_id) is session


def test_guest_can_join_existing_session() -> None:
    service = _service()
    host = FakeConnection()
    guest = FakeConnection()

    async def scenario() -> None:
        session = await service.create_session(host)
        joined = await service.join_session(session.session_id, guest)
        assert guest in joined.guests

    asyncio.run(scenario())


def test_guest_cannot_join_missing_session() -> None:
    service = _service()

    with pytest.raises(EventError):
        asyncio.run(service.join_session("ZZZZ", FakeConnection()))


def test_removing_host_removes_session_and_notifies_guests() -> None:
    service = _service()
    host = FakeConnection()
    guest = FakeConnection()

    async def scenario() -> str:
        session = await service.create_session(host)
        await service.join_session(session.session_id, guest)
        await service.close_session(session.session_id)
        return session.session_id

    session_id = asyncio.run(scenario())

    assert service.get_session(session_id) is None
    assert guest.sent == [events.session_closed(session_id)]


def test_removing_guest_keeps_session() -> None:
    service = _service()
    host = FakeConnection()
    guest = FakeConnection()

    async def scenario() -> str:
        session = await service.create_session(host)
        await service.join_session(session.session_id, guest)
        await service.remove_guest(session.session_id, guest)
        return session.session_id

    session_id = asyncio.run(scenario())

    session = service.get_session(session_id)
    assert session is not None
    assert guest not in session.guests


def test_broadcast_highlight_sends_to_host() -> None:
    service = _service()
    host = FakeConnection()
    guest = FakeConnection()

    async def scenario() -> str:
        session = await service.create_session(host)
        await service.join_session(session.session_id, guest)
        await service.broadcast_highlight(session.session_id, guest, 3, 5)
        return session.session_id

    session_id = asyncio.run(scenario())

    assert len(host.sent) == 1
    message = host.sent[0]
    assert message["type"] == events.CELL_HIGHLIGHT
    assert message["sessionId"] == session_id
    assert message["row"] == 3
    assert message["column"] == 5
    assert isinstance(message["timestamp"], int)


def test_broadcast_highlight_rejects_non_member_guest() -> None:
    service = _service()
    host = FakeConnection()
    stranger = FakeConnection()

    async def scenario() -> None:
        session = await service.create_session(host)
        await service.broadcast_highlight(session.session_id, stranger, 1, 1)

    with pytest.raises(EventError):
        asyncio.run(scenario())
