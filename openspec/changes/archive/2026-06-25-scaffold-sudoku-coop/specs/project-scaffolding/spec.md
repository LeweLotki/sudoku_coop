## ADDED Requirements

### Requirement: Monorepo Structure
The repository SHALL be organized as a monorepo containing a `backend/` directory and an `extension/` directory, plus root-level documentation and configuration.

#### Scenario: Top-level layout exists
- **WHEN** the repository is inspected after scaffolding
- **THEN** a `backend/` directory and an `extension/` directory exist at the repository root
- **AND** a root `README.md`, `.gitignore`, and `.editorconfig` exist

#### Scenario: Unrelated files preserved
- **WHEN** scaffolding is applied to a repository that already contains files
- **THEN** existing unrelated files MUST NOT be overwritten or deleted

### Requirement: Backend uv/FastAPI Scaffold
The backend SHALL be a `uv`-managed Python project using FastAPI, with dependencies declared in `pyproject.toml` and the documented module structure present as placeholders.

#### Scenario: pyproject declares dependencies
- **WHEN** `backend/pyproject.toml` is inspected
- **THEN** it declares runtime dependencies including FastAPI and uvicorn (and pydantic for future schemas)
- **AND** it declares dev dependencies including pytest and ruff (mypy optional)

#### Scenario: Backend directory structure exists
- **WHEN** the `backend/` directory is inspected
- **THEN** the package `src/sudoku_coop_api/` exists with `__init__.py` and `main.py`
- **AND** the subpackages `core/` (with `config.py`), `websocket/` (with `connection_manager.py`, `events.py`), `sessions/` (with `models.py`, `service.py`), and `api/` (with `health.py`) exist, each with `__init__.py`
- **AND** a `tests/` directory exists with `__init__.py` and `test_placeholder.py`
- **AND** `.env.example` and a backend `README.md` exist

#### Scenario: Backend contains placeholders only
- **WHEN** backend module files are inspected
- **THEN** they contain only placeholder content such as TODO comments or docstrings
- **AND** no functional WebSocket, session, database, or Redis logic is present

### Requirement: Extension Vite/React/TS/Tailwind Scaffold
The extension SHALL be initialized with Vite, React, TypeScript, and Tailwind CSS, include a Manifest V3 manifest, and contain the documented directory structure as placeholders.

#### Scenario: Extension tooling configured
- **WHEN** the `extension/` directory is inspected
- **THEN** `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.js`, `postcss.config.js`, and `index.html` exist

#### Scenario: Extension source structure exists
- **WHEN** the `extension/src/` directory is inspected
- **THEN** `popup/` contains `Popup.tsx`, `HostPanel.tsx`, `GuestPanel.tsx`, and `popup.css`
- **AND** `content/` contains `content.ts`, `gridDetector.ts`, and `overlay.ts`
- **AND** `background/` contains `serviceWorker.ts`
- **AND** `shared/` contains `messages.ts` and `types.ts`

#### Scenario: Manifest V3 placeholder exists
- **WHEN** `extension/manifest.json` is inspected
- **THEN** it declares `manifest_version` 3
- **AND** it restricts host permissions and content script matches to `https://sudokupad.app/*`
- **AND** it requests only minimal permissions (`storage`, `tabs`, and `activeTab` if needed)
- **AND** it configures a background service worker and the popup

#### Scenario: Extension contains placeholders only
- **WHEN** extension component and script files are inspected
- **THEN** they contain only placeholder content
- **AND** no functional UI behavior, WebSocket logic, grid detection, or overlay rendering is implemented

### Requirement: Root Documentation and Configuration
The repository SHALL include root-level documentation and configuration explaining the project and standardizing the development environment.

#### Scenario: Root files present and informative
- **WHEN** the repository root is inspected
- **THEN** `README.md` explains the project concept and how it will be developed later
- **AND** `.gitignore` ignores Python, uv, Node, Vite, extension build, editor, and cache artifacts
- **AND** `.editorconfig` defines editor formatting defaults

#### Scenario: Infrastructure excluded from this change
- **WHEN** the scaffolding is reviewed
- **THEN** no Docker, Redis, or database configuration is added

### Requirement: No Functional Logic in Scaffold
This change SHALL NOT implement functional application behavior; only scaffolding, configuration, and placeholder files are produced.

#### Scenario: Acceptance review confirms no business logic
- **WHEN** the completed scaffold is reviewed against the acceptance criteria
- **THEN** no real business logic, Sudoku solving logic, or SudokuPad internal state modification exists
- **AND** all app behavior remains documented as future work
