## 1. Environment & Repository Prep

- [x] 1.1 Inspect the repository to confirm it is safe to scaffold (do not overwrite unrelated files)
- [x] 1.2 Verify required tools are available: `python`, `uv`, `node`, a Node package manager (`npm`/`pnpm`/`yarn`), and `git`
- [x] 1.3 If `uv` is missing, install it via the official method for this OS and verify `uv --version`

## 2. Backend Scaffold (uv + FastAPI, placeholders only)

- [x] 2.1 Create `backend/` and initialize a `uv`-managed Python project with `pyproject.toml`
- [x] 2.2 Declare runtime dependencies: FastAPI, uvicorn, pydantic (WebSocket support comes from FastAPI/Starlette — no extra lib)
- [x] 2.3 Declare dev dependencies: pytest, ruff (and mypy only if it configures cleanly); add ruff (and optional mypy) config
- [x] 2.4 Create package `src/sudoku_coop_api/` with `__init__.py` and a placeholder `main.py` (TODO docstring only)
- [x] 2.5 Create `core/` with `__init__.py` and placeholder `config.py` (document APP_NAME, ENVIRONMENT, ALLOWED_ORIGINS, SESSION_CODE_LENGTH)
- [x] 2.6 Create `websocket/` with `__init__.py`, placeholder `connection_manager.py`, and placeholder `events.py`
- [x] 2.7 Create `sessions/` with `__init__.py`, placeholder `models.py`, and placeholder `service.py`
- [x] 2.8 Create `api/` with `__init__.py` and placeholder `health.py`
- [x] 2.9 Create `tests/` with `__init__.py` and a trivial `test_placeholder.py`
- [x] 2.10 Add `backend/.env.example` and `backend/README.md` with setup/run commands
- [x] 2.11 Confirm no WebSocket, session, database, or Redis logic is implemented (placeholders only)

## 3. Extension Scaffold (Vite + React + TS + Tailwind, placeholders only)

- [x] 3.1 Create `extension/` and initialize a minimal Vite + React + TypeScript setup
- [x] 3.2 Add Tailwind CSS with `tailwind.config.js` and `postcss.config.js`
- [x] 3.3 Add `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, and `index.html`
- [x] 3.4 Create `src/popup/` with placeholder `Popup.tsx`, `HostPanel.tsx`, `GuestPanel.tsx`, and `popup.css`
- [x] 3.5 Create `src/content/` with placeholder `content.ts`, `gridDetector.ts`, and `overlay.ts`
- [x] 3.6 Create `src/background/` with placeholder `serviceWorker.ts`
- [x] 3.7 Create `src/shared/` with placeholder `messages.ts` and `types.ts` (mirror backend event names conceptually)
- [x] 3.8 Add Manifest V3 `manifest.json`: host permissions and content-script match for `https://sudokupad.app/*`, minimal permissions (`storage`, `tabs`, `activeTab` if needed), background service worker, and popup
- [x] 3.9 Add `extension/README.md` with build/load instructions
- [x] 3.10 Confirm no UI behavior, WebSocket logic, grid detection, or overlay rendering is implemented (placeholders only)

## 4. Root Docs & Config

- [x] 4.1 Add root `README.md` explaining the project concept and future development plan
- [x] 4.2 Add root `.gitignore` covering Python, uv, Node, Vite, extension builds, editor files, and caches
- [x] 4.3 Add `.editorconfig` with formatting defaults
- [x] 4.4 Confirm no Docker, Redis, or database files are added

## 5. Verification

- [x] 5.1 Confirm monorepo layout matches the spec (`backend/`, `extension/`, root docs/config present)
- [x] 5.2 Verify backend dependency install resolves (e.g., `uv sync`) without errors
- [x] 5.3 Verify extension dependencies install and the Vite build/config loads without errors
- [x] 5.4 Review against acceptance criteria: no business logic, no Sudoku solving, no SudokuPad state modification, no Redis, no database
- [x] 5.5 Confirm the future design remains overlay-based and documented as out of scope for this change
