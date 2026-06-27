"""Tests for session code generation."""

from __future__ import annotations

import asyncio

from sudoku_coop_api.sessions.service import SessionService
from tests.conftest import FakeConnection

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def test_code_has_expected_length_and_alphabet() -> None:
    service = SessionService(code_length=4, alphabet=ALPHABET)
    session = asyncio.run(service.create_session(FakeConnection()))

    assert len(session.session_id) == 4
    assert all(char in ALPHABET for char in session.session_id)


def test_code_uses_configured_length() -> None:
    service = SessionService(code_length=6, alphabet=ALPHABET)
    session = asyncio.run(service.create_session(FakeConnection()))

    assert len(session.session_id) == 6


def test_default_code_is_eight_characters_from_alphabet() -> None:
    # No explicit length: falls back to the configured default (8).
    service = SessionService()
    session = asyncio.run(service.create_session(FakeConnection()))

    assert len(session.session_id) == 8
    assert all(char in ALPHABET for char in session.session_id)


def test_unique_code_retries_on_collision() -> None:
    # The factory yields a duplicate first, forcing a deterministic retry.
    codes = iter(["AAAA", "AAAA", "BBBB"])
    service = SessionService(code_factory=lambda: next(codes))

    async def scenario() -> tuple[str, str]:
        first = await service.create_session(FakeConnection())
        second = await service.create_session(FakeConnection())
        return first.session_id, second.session_id

    first_id, second_id = asyncio.run(scenario())

    assert first_id == "AAAA"
    assert second_id == "BBBB"
    assert first_id != second_id
