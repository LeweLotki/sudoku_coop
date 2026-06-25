I want to scaffold a new project for a browser extension that works with SudokuPad.

Project goal:

Build a browser extension/plugin for SudokuPad pages such as:

https://sudokupad.app/BLLGjtrb4P

SudokuPad usually displays a 9x9 Sudoku grid. The extension should allow two users to coordinate in real time:

1. Host mode:

   * The host opens a SudokuPad puzzle in their browser.
   * The host opens the extension popup.
   * The host creates a session.
   * The extension receives a short session code.
   * The host keeps the SudokuPad tab open.
   * When a guest sends a row and column, the host’s SudokuPad page highlights that cell visually.

2. Guest mode:

   * The guest opens the extension popup.
   * The guest selects guest mode.
   * The guest enters the host’s session code.
   * The guest enters two numbers: row and column.
   * The guest clicks a button to send the coordinate.
   * The selected cell is highlighted on the host browser.

Important scope restriction:

Do not implement the actual application logic yet. This task is only for proposing and preparing scaffolding/environment. The goal is to create a clean project structure, dependency setup, placeholder files, configuration files, and OpenSpec proposal/tasks/design documents. Avoid writing real functional code for the app at this stage, except minimal placeholder files required by tooling.

Use FastAPI for the backend, not Node.js.

Use `uv` for Python environment and dependency management.

Do not use Redis for now. Use in-memory session storage in the future implementation.

Recommended stack:

Backend:

* Python
* FastAPI
* WebSockets through FastAPI
* uv for dependency management
* pydantic for schemas if needed later
* pytest for future tests
* ruff for linting/formatting
* mypy optional, but prepare config if it fits cleanly
* no database
* no Redis
* no authentication for MVP
* with Docker for the first scaffold

Extension/frontend:

* Browser extension using Manifest V3
* TypeScript
* React for popup UI
* Vite
* Tailwind CSS
* content script injected only on `https://sudokupad.app/*`
* background service worker
* no real implementation yet, only scaffold and placeholder files

Core design decision:

Do not try to modify SudokuPad internal game state. Do not simulate SudokuPad moves. Do not depend on SudokuPad internal app logic.

The extension should eventually inject its own visual overlay above the Sudoku grid and map guest coordinates `(row, column)` to a visual highlighted rectangle.

For MVP assume 9x9 grid only.

The future implementation should draw an overlay using DOM elements with:

* `position: absolute`
* high z-index
* `pointer-events: none`
* transparent colored background
* border / glow
* highlight should fade after a few seconds
* latest highlight can replace the previous one

The biggest technical risk is detecting the Sudoku grid bounds. The future implementation should prefer robust grid detection using the visible grid/canvas/SVG bounding box and `getBoundingClientRect()`. It should not depend heavily on unstable internal SudokuPad class names. A later fallback may include manual calibration where the host clicks the top-left and bottom-right corners of the grid.

Architecture:

Guest extension popup
→ sends row/column to backend over WebSocket
→ FastAPI backend receives coordinate
→ backend broadcasts to the host WebSocket connection in the matching session
→ host content script receives highlight event
→ host content script draws overlay on SudokuPad page

Project should be organized as a monorepo.

Suggested root structure:

sudoku-coop/
├── backend/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── README.md
│   ├── .env.example
│   ├── src/
│   │   └── sudoku_coop_api/
│   │       ├── **init**.py
│   │       ├── main.py
│   │       ├── core/
│   │       │   ├── **init**.py
│   │       │   └── config.py
│   │       ├── websocket/
│   │       │   ├── **init**.py
│   │       │   ├── connection_manager.py
│   │       │   └── events.py
│   │       ├── sessions/
│   │       │   ├── **init**.py
│   │       │   ├── models.py
│   │       │   └── service.py
│   │       └── api/
│   │           ├── **init**.py
│   │           └── health.py
│   └── tests/
│       ├── **init**.py
│       └── test_placeholder.py
│
├── extension/
│   ├── package.json
│   ├── package-lock.json or pnpm-lock.yaml depending on chosen package manager
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── manifest.json
│   ├── README.md
│   └── src/
│       ├── popup/
│       │   ├── Popup.tsx
│       │   ├── HostPanel.tsx
│       │   ├── GuestPanel.tsx
│       │   └── popup.css
│       ├── content/
│       │   ├── content.ts
│       │   ├── gridDetector.ts
│       │   └── overlay.ts
│       ├── background/
│       │   └── serviceWorker.ts
│       └── shared/
│           ├── messages.ts
│           └── types.ts
│
├── specs/
│   └── scaffolding/
│       ├── proposal.md
│       ├── design.md
│       └── tasks.md
│
├── .gitignore
├── README.md
└── .editorconfig

If OpenSpec already has a different expected directory layout, follow the local OpenSpec conventions instead of inventing a conflicting structure. However, still preserve all product and architecture requirements above.

Backend future WebSocket event specification:

The future backend should support these conceptual events. Do not implement them now beyond placeholders / docs.

1. Host creates session

Client sends:

{
"type": "session:create",
"role": "host"
}

Server responds:

{
"type": "session:created",
"sessionId": "AB12"
}

2. Guest joins session

Client sends:

{
"type": "session:join",
"role": "guest",
"sessionId": "AB12"
}

Server responds:

{
"type": "session:joined",
"ok": true,
"sessionId": "AB12"
}

3. Guest sends highlight coordinate

Client sends:

{
"type": "cell:highlight",
"sessionId": "AB12",
"row": 3,
"column": 5"
}

Server broadcasts to the host:

{
"type": "cell:highlight",
"sessionId": "AB12",
"row": 3,
"column": 5,
"timestamp": 1782390000000
}

4. Error response

{
"type": "session:error",
"message": "Session not found"
}

Validation rules for future implementation:

* sessionId is required for guest actions
* row must be integer
* column must be integer
* row must be between 1 and 9 for MVP
* column must be between 1 and 9 for MVP
* one active host per session
* multiple guests may join a session
* if host disconnects, the session should be removed
* if guest disconnects, remove guest from the session
* session codes should be short and human-readable, for example 4 to 6 uppercase alphanumeric characters
* no persistent storage in MVP

Backend planned files:

`main.py`

* future FastAPI app entrypoint
* should eventually include CORS config, health router, websocket router
* for now use minimal placeholder only if needed

`core/config.py`

* future settings for environment variables
* example values:

  * APP_NAME
  * ENVIRONMENT
  * ALLOWED_ORIGINS
  * SESSION_CODE_LENGTH

`websocket/connection_manager.py`

* future manager for active WebSocket connections
* should eventually track host and guest sockets per session

`websocket/events.py`

* future event type constants / typed schemas

`sessions/models.py`

* future dataclasses or pydantic models for Session, HostConnection, GuestConnection

`sessions/service.py`

* future in-memory session registry

`api/health.py`

* future simple health endpoint

Extension future behavior:

Popup:

* user can switch between Host and Guest modes
* HostPanel should eventually show:

  * Create session button
  * Session code
  * Connection status
  * Host status warning if current tab is not SudokuPad
* GuestPanel should eventually show:

  * Session code input
  * Row input
  * Column input
  * Highlight/send button
  * Validation errors
  * Connection status

Content script:

* should run only on `https://sudokupad.app/*`
* should eventually detect the Sudoku grid
* should eventually inject an overlay
* should listen for highlight events
* should draw highlight at selected row/column
* should recalculate bounds on resize
* should not block SudokuPad clicks
* should not modify puzzle values
* should not depend on SudokuPad internal app state

Background service worker:

* should eventually coordinate extension-level WebSocket connection/state if needed
* can relay messages between popup and content script
* can store current mode/sessionId in extension storage if needed later

Shared types:

* define future TypeScript message/event interfaces
* mirror backend event names conceptually

Manifest requirements:

* Manifest V3
* host permissions for `https://sudokupad.app/*`
* permissions should be minimal:

  * storage
  * tabs
  * activeTab if needed
* content script matched only against SudokuPad URLs
* background service worker configured
* popup configured

Scaffolding instructions:

1. Inspect the current repository first.

   * Check whether this is an empty repository or an existing project.
   * Do not overwrite unrelated user files.
   * If files already exist, propose safe changes.

2. Check required tools:

   * python
   * uv
   * node
   * npm, pnpm, or yarn
   * git

3. If `uv` is missing, install it using the official recommended method for the current OS.

   * Prefer a safe install flow.
   * After installing, verify `uv --version`.

4. Backend setup:

   * Create `backend/`.
   * Initialize a uv-managed Python project.
   * Use pyproject.toml.
   * Add FastAPI dependencies.
   * Add websocket-related dependencies only if needed by FastAPI/uvicorn.
   * Add uvicorn for running local development server.
   * Add dev dependencies:

     * pytest
     * ruff
     * optionally mypy if clean
   * Create the backend directory structure listed above.
   * Add placeholder files with TODO comments/docstrings only.
   * Add `.env.example`.
   * Add backend README with setup commands.
   * Do not implement real WebSocket logic yet.
   * Do not implement session logic yet.
   * Do not add Redis.
   * Do not add database.

5. Extension setup:

   * Create `extension/`.
   * Initialize a Vite React TypeScript app or equivalent minimal extension-focused Vite setup.
   * Add Tailwind CSS.
   * Prepare extension folder structure listed above.
   * Add placeholder components/files.
   * Add Manifest V3 file.
   * Do not implement real UI logic yet.
   * Do not implement real WebSocket logic yet.
   * Do not implement grid detection yet.
   * Do not inject functional overlay yet.
   * Placeholder files are acceptable.

6. Root setup:

   * Add root README explaining the project concept.
   * Add root `.gitignore` for Python, uv, Node, Vite, extension builds, editor files, caches.
   * Add `.editorconfig`.
   * Do not add Docker yet.
   * Do not add Redis.
   * Do not add database.

7. OpenSpec:

   * Create or update an OpenSpec proposal for this scaffolding change.
   * Include:

     * proposal.md
     * design.md
     * tasks.md
   * The proposal should clearly say this change only scaffolds the environment and does not implement functional app behavior yet.
   * The tasks should be divided into backend scaffold, extension scaffold, root docs/config, verification.
   * The design should describe the future architecture but mark future implementation parts as out of scope for this scaffolding change.

Acceptance criteria for this scaffolding proposal:

* Repository has a clear monorepo layout with `backend/` and `extension/`.
* Backend is initialized with uv.
* Backend dependencies are represented in `pyproject.toml`.
* Backend folder structure exists.
* Extension is initialized with Vite + React + TypeScript + Tailwind.
* Extension folder structure exists.
* Manifest V3 placeholder exists.
* OpenSpec proposal/tasks/design exist.
* README files explain how the project will be developed later.
* No real business logic is implemented yet.
* No Redis is added.
* No database is added.
* No Sudoku solving logic is added.
* No SudokuPad internal state modification is attempted.
* The future design remains overlay-based.

Expected future MVP after later implementation:

* Host creates session.
* Guest joins session.
* Guest sends row and column.
* Host browser highlights the matching cell on SudokuPad.
* 9x9 grid only.
* In-memory sessions.
* No login.
* No persistence.
* No database.
* No Redis.

Please now produce an OpenSpec proposal for this scaffolding change and prepare the project environment/filesystem accordingly, but avoid implementing the actual functional code.
