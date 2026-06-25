## Why

We want to build a browser extension that lets two users coordinate in real time on a SudokuPad puzzle, where a guest sends a `(row, column)` and the host's SudokuPad page highlights that cell. Before any functional code is written, we need a clean, reproducible monorepo with backend and extension scaffolding so future implementation work can start from a well-defined foundation.

## What Changes

- Establish a monorepo layout with `backend/` (FastAPI + uv) and `extension/` (Manifest V3 + Vite + React + TypeScript + Tailwind).
- Scaffold the FastAPI backend project managed by `uv`: `pyproject.toml`, dependency declarations (FastAPI, uvicorn, pydantic; dev: pytest, ruff, optional mypy), directory structure, `.env.example`, README, and placeholder modules with TODO docstrings only.
- Scaffold the browser extension project: Vite + React + TS + Tailwind config, Manifest V3 file, popup/content/background/shared directory structure, and placeholder components/files only.
- Add root-level docs and config: root `README.md`, `.gitignore`, `.editorconfig`.
- Document the future WebSocket event contract, validation rules, overlay design, and grid-detection strategy as design/specs without implementing them.
- **Non-goal / scope restriction**: No functional app logic. No real WebSocket handling, no session logic, no UI behavior, no grid detection, no overlay rendering, no Docker, no Redis, no database, no authentication. Only scaffolding, configuration, and placeholder files.

## Capabilities

### New Capabilities
- `project-scaffolding`: Defines the required monorepo structure, backend (uv/FastAPI) and extension (Vite/React/TS/Tailwind/MV3) scaffolds, tooling configuration, placeholder files, and the explicit no-functional-logic constraints for this change.
- `realtime-coordination`: Captures the future product behavior and contract (host/guest roles, WebSocket events, validation rules, overlay-based highlighting, grid-detection strategy) as documented requirements that are out of scope to implement now but guide the scaffold.

### Modified Capabilities
<!-- None. This is a greenfield repository with no existing specs. -->

## Impact

- New directories/files: `backend/`, `extension/`, root `README.md`, `.gitignore`, `.editorconfig`.
- New tooling dependencies (declared, not necessarily exercised): `uv`, FastAPI, uvicorn, pydantic, pytest, ruff, optional mypy; Node-based Vite, React, TypeScript, Tailwind, PostCSS.
- No runtime services, persistence, or external infrastructure introduced.
- Affects developer onboarding and future implementation entry points; no end-user functionality yet.
