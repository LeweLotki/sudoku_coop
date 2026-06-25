## Context

This is a greenfield repository. The product goal is a browser extension that lets a guest highlight a `(row, column)` cell on a host's open SudokuPad puzzle in real time, coordinated through a FastAPI WebSocket backend. This change establishes the project scaffolding only: directory structure, tooling configuration, dependency declarations, and placeholder files. No functional behavior is implemented.

The future architecture flow is:

```
Guest popup → WebSocket → FastAPI backend → broadcast to host WebSocket → host content script → overlay drawn on SudokuPad page
```

Constraints for this change: no functional logic, no Docker, no Redis, no database, no authentication. Backend uses Python + FastAPI managed by `uv`. Extension uses Manifest V3 + Vite + React + TypeScript + Tailwind.

## Goals / Non-Goals

**Goals:**
- Reproducible monorepo with `backend/` and `extension/` plus root docs/config.
- Backend initialized with `uv` and a complete `pyproject.toml` (runtime + dev dependencies declared).
- Backend directory structure with placeholder modules carrying TODO docstrings only.
- Extension initialized with Vite + React + TS + Tailwind, with Manifest V3 and placeholder components.
- Document the future WebSocket event contract, validation rules, overlay design, and grid-detection strategy so later implementation has a clear target.

**Non-Goals (explicitly out of scope for this change):**
- Implementing WebSocket handling, the connection manager, or session registry logic.
- Implementing popup UI behavior, mode switching, or form validation.
- Implementing grid detection or overlay rendering.
- Adding Docker, Redis, a database, or authentication.
- Writing tests beyond a trivial placeholder.
- Modifying or simulating SudokuPad internal game state.

## Decisions

### Decision: Monorepo with `backend/` and `extension/`
Keep backend and extension in one repository for atomic changes to the shared event contract. Each subproject owns its own toolchain and lockfile.
- Alternatives considered: separate repos (rejected — harder to keep the event contract in sync during early development).

### Decision: FastAPI + `uv` for the backend
`uv` provides fast, reproducible Python environments and lockfiles. FastAPI ships first-class WebSocket support via Starlette, so no extra WebSocket library is needed beyond `uvicorn` for serving. `pydantic` is declared for future schema validation.
- Alternatives considered: Node.js backend (rejected per requirements); plain `pip`/`venv` (rejected — `uv` is faster and lockfile-based); a dedicated WebSocket lib (unnecessary with FastAPI/Starlette).

### Decision: In-memory session storage (future), no persistence
MVP coordination is ephemeral. Sessions live only while connections are open; host disconnect removes the session. This avoids Redis/database complexity.
- Alternatives considered: Redis (deferred), SQL database (rejected for MVP).

### Decision: Manifest V3 extension built with Vite + React + TS + Tailwind
Vite gives fast builds and a clean multi-entry setup for popup/content/background. React + TS for maintainable UI; Tailwind for styling. Content script restricted to `https://sudokupad.app/*`; minimal permissions (`storage`, `tabs`, `activeTab`).
- Alternatives considered: plain JS/no framework (rejected — harder to scale UI); CRA/webpack (rejected — slower, heavier than Vite).

### Decision: Overlay-based highlighting, no SudokuPad internals
The future content script draws its own absolutely-positioned, `pointer-events: none`, high-z-index overlay above the grid, mapping `(row, column)` to a rectangle via the grid's bounding box (`getBoundingClientRect()`). It must not read or mutate SudokuPad internal state or depend on unstable internal class names.
- Alternatives considered: hooking SudokuPad internals (rejected — brittle, violates core design decision).

### Decision: Grid-detection strategy via bounding box, with future manual calibration fallback
Prefer the visible grid/canvas/SVG bounding box for robustness against DOM changes. A later fallback lets the host click top-left and bottom-right corners to calibrate. This is documented now, implemented later.

### Decision: Placeholder-only files for this change
All backend modules and extension components are placeholders with TODO docstrings/comments. The repository must build/install configs without exercising functional code paths.

## Risks / Trade-offs

- [Grid bounds detection is the biggest technical risk] → Document a bounding-box-first strategy plus a manual-calibration fallback; keep detection isolated in `gridDetector.ts` so it can evolve without touching overlay logic.
- [SudokuPad DOM/class names may change] → Avoid depending on internal class names; rely on geometry (`getBoundingClientRect()`) and an overlay that never mutates puzzle state.
- [Scaffold drifting from future requirements] → Encode the event contract and validation rules as specs now so implementation has a stable target.
- [Tooling availability (`uv`, Node) on the dev machine] → Verification tasks check tool presence; `uv` install documented if missing.
- [Over-scaffolding / accidentally adding logic] → Strict non-goals; placeholders only; reviewed against acceptance criteria.

## Migration Plan

Not applicable — greenfield scaffolding with no existing system to migrate. Rollback is simply removing the newly added directories/files.

## Open Questions

- Extension package manager: `npm` vs `pnpm` (default to `npm` unless a `pnpm` preference is set).
- Whether `mypy` is included now or deferred (include only if it configures cleanly without friction).
- Exact session code format within the 4–6 uppercase alphanumeric range (decided during implementation).
