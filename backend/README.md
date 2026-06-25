# sudoku-coop-api (backend)

FastAPI backend for real-time SudokuPad coordination.

> Status: **scaffold only**. No functional WebSocket, session, database, or Redis
> logic is implemented yet. Files contain placeholders/TODOs for a future change.

## Tech stack

- Python 3.12+
- [FastAPI](https://fastapi.tiangolo.com/) (WebSockets via Starlette — no extra lib)
- [uvicorn](https://www.uvicorn.org/) for the dev server
- [pydantic](https://docs.pydantic.dev/) for future schemas
- Tooling: [uv](https://docs.astral.sh/uv/), pytest, ruff, mypy (optional)

## Setup

This project uses [`uv`](https://docs.astral.sh/uv/) for environment and dependency
management.

```bash
# Install/sync dependencies (including dev tools)
uv sync --extra dev
```

## Common commands

```bash
# Run the development server (once main.py exposes an app in a future change)
uv run uvicorn sudoku_coop_api.main:app --reload

# Lint / format
uv run ruff check .
uv run ruff format .

# Type-check (optional)
uv run mypy

# Tests
uv run pytest
```

## Project layout

```
backend/
├── pyproject.toml
├── .env.example
├── src/
│   └── sudoku_coop_api/
│       ├── main.py              # FastAPI entrypoint (placeholder)
│       ├── core/config.py       # settings (placeholder)
│       ├── websocket/
│       │   ├── connection_manager.py  # connection tracking (placeholder)
│       │   └── events.py              # event schemas (placeholder)
│       ├── sessions/
│       │   ├── models.py        # session models (placeholder)
│       │   └── service.py       # in-memory registry (placeholder)
│       └── api/health.py        # health endpoint (placeholder)
└── tests/
    └── test_placeholder.py
```

## Future WebSocket contract (not implemented yet)

See `openspec/changes/scaffold-sudoku-coop/specs/realtime-coordination/spec.md` for
the planned `session:create`, `session:join`, `cell:highlight`, and `session:error`
events, validation rules, and connection lifecycle behavior.
