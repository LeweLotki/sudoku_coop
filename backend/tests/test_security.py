"""Unit tests for the WebSocket connection-gate helpers."""

from __future__ import annotations

from sudoku_coop_api.core.security import origin_is_allowed, token_is_valid


class TestTokenIsValid:
    def test_correct_token_accepted(self) -> None:
        assert token_is_valid("secret", "secret") is True

    def test_wrong_token_rejected(self) -> None:
        assert token_is_valid("nope", "secret") is False

    def test_missing_token_rejected_when_expected(self) -> None:
        assert token_is_valid(None, "secret") is False
        assert token_is_valid("", "secret") is False

    def test_gate_open_when_no_token_configured(self) -> None:
        # Development convenience: an empty expected token accepts anything.
        assert token_is_valid(None, "") is True
        assert token_is_valid("whatever", "") is True


class TestOriginIsAllowed:
    def test_missing_origin_allowed(self) -> None:
        assert origin_is_allowed(None, []) is True

    def test_extension_origin_allowed(self) -> None:
        assert origin_is_allowed("chrome-extension://abcdef", []) is True

    def test_disallowed_web_origin_rejected(self) -> None:
        assert origin_is_allowed("https://evil.example", []) is False

    def test_allowlisted_origin_allowed(self) -> None:
        assert origin_is_allowed("https://good.example", ["https://good.example"]) is True
