# Sudoku Coop (browser extension)

Manifest V3 browser extension for real-time SudokuPad coordination.

This change (`extension-core-connection`) implements the extension's **core
connection layer**: popup UI, role selection, a background WebSocket client, and
message passing between popup, background service worker, and content script.

> **Known limitations (this change):**
>
> - The content script only **logs** received highlight coordinates to the page
>   console. Real grid detection and a visible overlay arrive in the later
>   `host-grid-overlay` change.
> - The guest row/column UI is intentionally simple; the polished coordinate
>   modal is a later change.
> - There is no automatic reconnection yet (deferred to `end-to-end-polish`).

## Tech stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Vitest](https://vitest.dev/) for unit tests
- Chrome Manifest V3 (popup + content script + background service worker)

## Setup

```bash
npm install
```

## Common commands

```bash
# Type-check
npm run typecheck

# Run unit tests (validation + backend-message parsing helpers)
npm test

# Build a loadable extension into dist/
npm run build

# Dev server (popup UI preview in a normal browser tab; no extension APIs)
npm run dev
```

## Configuration

The backend WebSocket URL lives in a single place:

```ts
// src/shared/config.ts
export const DEFAULT_BACKEND_WS_URL = "ws://localhost:8000/ws";
```

## Build output

`npm run build` runs three Vite passes and a postbuild step, producing a
self-contained, loadable extension in `dist/`:

- `dist/index.html` + `dist/assets/*` — the popup (ES modules)
- `dist/background.js` — the background service worker (module)
- `dist/content.js` — the content script (IIFE; MV3 content scripts cannot use
  ES module imports, so it is bundled standalone)
- `dist/manifest.json` — manifest with paths rewritten to the built files

## Loading the extension

1. Run `npm run build` to produce `dist/`.
2. Open `chrome://extensions` in a Chromium-based browser.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `dist/` directory.
5. After changing code, rebuild and click the reload icon on the extension card.

## Running the backend

The extension expects the FastAPI backend on `ws://localhost:8000/ws`:

```bash
cd ../backend
uv run uvicorn sudoku_coop_api.main:app --reload
```

See `backend/README.md` for full backend commands.

## Manual test scenario (host + guest)

You need two extension instances (e.g. two browser profiles/windows), or two
popups talking to the same backend.

1. Start the backend (see above).
2. Build and load the extension as unpacked in each profile.
3. Open a SudokuPad puzzle, e.g. `https://sudokupad.app/BLLGjtrb4P`.
4. **Host:** open the popup → select **Host** → click **Create Session** →
   note the displayed session code.
5. **Guest:** open the popup → select **Guest** → enter the session code →
   click **Join** → confirm the joined status.
6. **Guest:** enter row `3` and column `5` → click **Send Highlight**.
7. **Verify:**
   - the guest popup shows no error,
   - the host's background forwards the event to the SudokuPad content script,
   - the SudokuPad page console logs `Received highlight for row 3, column 5`.

This change is successful even though no visible cell highlight appears yet —
the visible overlay belongs to the next change (`host-grid-overlay`).

## Project layout

```
extension/
├── manifest.json        # source manifest (paths rewritten at build time)
├── index.html
├── vite.config.ts       # multi-pass build (popup / background / content)
├── scripts/postbuild.mjs
└── src/
    ├── popup/      # Popup, HostPanel, GuestPanel, api.ts
    ├── content/    # content.ts (placeholder handler), gridDetector.ts, overlay.ts
    ├── background/ # serviceWorker.ts (WebSocket client + coordination)
    └── shared/     # config.ts, types.ts, messages.ts, validation.ts, parseBackendMessage.ts
```
