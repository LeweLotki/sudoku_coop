# Sudoku Coop (browser extension)

Manifest V3 browser extension for real-time SudokuPad coordination.

The extension's **core connection layer** (`extension-core-connection`) provides
the popup UI, role selection, a background WebSocket client, and message passing
between popup, background service worker, and content script. The
**host grid overlay** (`host-grid-overlay`) builds on it: the SudokuPad content
script now detects the on-page grid and draws a visible highlight over the cell a
guest selects.

> **Known limitations:**
>
> - Only **9×9** Sudoku grids are supported.
> - The highlight is purely visual: the extension draws its own DOM overlay and
>   never reads or modifies SudokuPad's internal state (no digit-writing, no
>   move simulation).
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
7. **Verify on the host's SudokuPad page:**
   - a cyan highlight appears over row 3, column 5 and fades after ~2.5s,
   - the highlight does **not** block clicking SudokuPad cells (pointer-through),
   - the page console logs `[Sudoku Coop]` messages (grid detected, highlight
     received, highlight rendered).

### Additional checks

- Send row `1` / column `1` → top-left cell highlights; row `9` / column `9` →
  bottom-right cell highlights.
- Resize the window or scroll, then send another highlight → it stays aligned.
- Send an out-of-range value (e.g. row `10`) → the host logs a warning and draws
  nothing.

### Debug helper (manual testing without a guest)

The content script exposes a development helper on the SudokuPad page. Open the
page console and run:

```js
__sudokuCoopDebugHighlight(3, 5); // row, column (1-based, 1–9)
```

It runs the same detect-and-render path used for real highlight events, so you
can verify the overlay without a second profile. It is read-only with respect to
SudokuPad and is intended for manual testing only.

## Project layout

```
extension/
├── manifest.json        # source manifest (paths rewritten at build time)
├── index.html
├── vite.config.ts       # multi-pass build (popup / background / content)
├── scripts/postbuild.mjs
└── src/
    ├── popup/      # Popup, HostPanel, GuestPanel, api.ts
    ├── content/    # content.ts (overlay orchestration), gridDetector.ts,
    │               #   overlay.ts, geometry.ts (pure math), debounce.ts
    ├── background/ # serviceWorker.ts (WebSocket client + coordination)
    └── shared/     # config.ts, types.ts, messages.ts, validation.ts, parseBackendMessage.ts
```
