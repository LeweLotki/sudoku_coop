# Sudoku Coop (browser extension)

Manifest V3 browser extension for real-time SudokuPad coordination.

The extension's **core connection layer** (`extension-core-connection`) provides
the popup UI, role selection, a background WebSocket client, and message passing
between popup, background service worker, and content script. The
**host grid overlay** (`host-grid-overlay`) builds on it: the SudokuPad content
script detects the on-page grid and draws a visible highlight over a selected
cell. The **guest grid click** (`guest-grid-click-highlight`) closes the loop:
instead of typing coordinates, the guest clicks directly on their own SudokuPad
grid. The content script converts the click to a 1-based `{ row, column }` and
the background forwards the existing `cell:highlight` event to the host.

> **Known limitations:**
>
> - Only **9×9** Sudoku grids are supported.
> - The highlight is purely visual: the extension draws its own DOM overlay and
>   never reads or modifies SudokuPad's internal state (no digit-writing, no
>   move simulation).
> - **Same-puzzle assumption:** the host and guest are expected to open the same
>   SudokuPad puzzle URL. If they open different puzzles, the clicked coordinate
>   is still sent and highlighted, but it may refer to a different puzzle
>   context. There is no automatic puzzle-URL matching.
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

The backend connection lives in a single place (`src/shared/config.ts`) and is
driven by build-time Vite env variables, so a production build can target
`wss://` without code changes. Create an untracked `.env` (or `.env.production`)
in `extension/` — `.env.*` is already gitignored, so **never commit a real
token**:

```bash
# extension/.env  (local development — both optional)
VITE_BACKEND_WS_URL=ws://localhost:8000/ws
VITE_ACCESS_TOKEN=change-me-local-dev-token

# extension/.env.production  (production build)
VITE_BACKEND_WS_URL=wss://your-app.herokuapp.com/ws
VITE_ACCESS_TOKEN=<the-invite-token>
```

- `VITE_BACKEND_WS_URL` defaults to `ws://localhost:8000/ws` when unset.
- `VITE_ACCESS_TOKEN` is appended to the WebSocket URL as `?token=...` by
  `buildBackendUrl()`. It is **bundled into the built extension** and is also
  never written to `chrome.storage.local`.

> **Invite token, not a secret.** The token only keeps random internet users off
> the backend. Anyone with the zip can read it. If the zip is shared publicly or
> leaks, **rotate the backend `ACCESS_TOKEN` (Heroku config var) and rebuild +
> redistribute the extension** with the new `VITE_ACCESS_TOKEN`.

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

The extension expects the FastAPI backend on `ws://localhost:8000/ws` (with a
matching `token` if `ACCESS_TOKEN` is configured there):

```bash
cd ../backend
uv run uvicorn sudoku_coop_api.main:app --reload
```

See `backend/README.md` for full backend commands. The backend keeps sessions
in-memory, so production must run on **exactly one Heroku web dyno**.

## Manual test scenario (host + guest)

You need two extension instances (e.g. two browser profiles/windows), or two
popups talking to the same backend.

1. Start the backend (see above).
2. Build and load the extension as unpacked in each profile.
3. Open the **same** SudokuPad puzzle in both, e.g.
   `https://sudokupad.app/BLLGjtrb4P`.
4. **Host:** open the popup → select **Host** → click **Create Session** →
   note the displayed session code.
5. **Guest:** open the popup → select **Guest** → enter the session code →
   click **Join** → confirm the joined status and the "click a cell" instruction.
6. **Guest:** close or ignore the popup and click row 3, column 5 directly on the
   real SudokuPad grid.
7. **Verify on the host's SudokuPad page:**
   - the guest's own page still behaves normally (the click is not blocked),
   - a cyan highlight appears over row 3, column 5 and fades after ~2.5s,
   - the highlight does **not** block clicking SudokuPad cells (pointer-through),
   - the page console logs `[Sudoku Coop]` messages (guest click, grid detected,
     highlight received, highlight rendered).

### Additional checks

- Guest clicks the top-left cell → host highlights row 1, column 1; guest clicks
  the bottom-right cell → host highlights row 9, column 9.
- Guest clicks **outside** the grid → nothing is sent or highlighted.
- **Host** clicking their own grid does **not** send a highlight (only a
  connected guest's clicks are forwarded).
- A **disconnected** guest clicking the grid does **not** send a highlight.
- Resize the window or scroll, then click again → the highlight stays aligned.

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
