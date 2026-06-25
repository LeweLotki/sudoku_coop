"""Tests for highlight coordinate validation."""

from __future__ import annotations

import pytest

from sudoku_coop_api.websocket.events import EventError, validate_coordinate


@pytest.mark.parametrize(
    ("row", "column"),
    [(1, 1), (9, 9), (1, 9), (9, 1), (5, 5)],
)
def test_valid_coordinates(row: int, column: int) -> None:
    assert validate_coordinate({"row": row, "column": column}) == (row, column)


@pytest.mark.parametrize(
    ("row", "column"),
    [
        (0, 5),
        (10, 5),
        (5, 0),
        (5, 10),
    ],
)
def test_out_of_range_coordinates(row: int, column: int) -> None:
    with pytest.raises(EventError):
        validate_coordinate({"row": row, "column": column})


@pytest.mark.parametrize(
    ("row", "column"),
    [
        ("3", 5),
        (3, "5"),
        (3.0, 5),
        (3, 5.0),
        (True, 5),
        (3, False),
        (None, 5),
    ],
)
def test_non_integer_coordinates(row: object, column: object) -> None:
    with pytest.raises(EventError):
        validate_coordinate({"row": row, "column": column})


def test_missing_coordinates() -> None:
    with pytest.raises(EventError):
        validate_coordinate({})
