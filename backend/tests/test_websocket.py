"""Integration tests for the /ws WebSocket endpoint via FastAPI TestClient."""

from __future__ import annotations

from fastapi.testclient import TestClient

from sudoku_coop_api.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_host_create_guest_join_and_highlight_flow() -> None:
    with (
        client.websocket_connect("/ws") as host,
        client.websocket_connect("/ws") as guest,
    ):
        host.send_json({"type": "session:create", "role": "host"})
        created = host.receive_json()
        assert created["type"] == "session:created"
        session_id = created["sessionId"]

        guest.send_json({"type": "session:join", "role": "guest", "sessionId": session_id})
        joined = guest.receive_json()
        assert joined == {
            "type": "session:joined",
            "ok": True,
            "sessionId": session_id,
        }

        guest.send_json({"type": "cell:highlight", "sessionId": session_id, "row": 3, "column": 5})

        broadcast = host.receive_json()
        assert broadcast["type"] == "cell:highlight"
        assert broadcast["sessionId"] == session_id
        assert broadcast["row"] == 3
        assert broadcast["column"] == 5
        assert isinstance(broadcast["timestamp"], int)

        ack = guest.receive_json()
        assert ack == {
            "type": "cell:highlight:sent",
            "ok": True,
            "sessionId": session_id,
            "row": 3,
            "column": 5,
        }


def test_join_missing_session_returns_error() -> None:
    with client.websocket_connect("/ws") as guest:
        guest.send_json({"type": "session:join", "role": "guest", "sessionId": "ZZZZ"})
        error = guest.receive_json()
        assert error["type"] == "session:error"
        assert error["message"] == "Session not found"


def test_out_of_range_highlight_returns_error() -> None:
    with (
        client.websocket_connect("/ws") as host,
        client.websocket_connect("/ws") as guest,
    ):
        host.send_json({"type": "session:create", "role": "host"})
        session_id = host.receive_json()["sessionId"]

        guest.send_json({"type": "session:join", "role": "guest", "sessionId": session_id})
        guest.receive_json()

        guest.send_json({"type": "cell:highlight", "sessionId": session_id, "row": 0, "column": 5})
        error = guest.receive_json()
        assert error["type"] == "session:error"
        assert error["message"] == "row out of range"


def test_unsupported_event_returns_error() -> None:
    with client.websocket_connect("/ws") as conn:
        conn.send_json({"type": "bogus:event"})
        error = conn.receive_json()
        assert error["type"] == "session:error"
        assert error["message"] == "Unsupported event type"
