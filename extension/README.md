# Sudoku Coop (browser extension)

Manifest V3 browser extension for real-time SudokuPad coordination.

> Status: **scaffold only**. No functional UI behavior, WebSocket logic, grid
> detection, or overlay rendering is implemented yet. Files contain
> placeholders/TODOs for a future change.

## Tech stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- Chrome Manifest V3 (popup + content script + background service worker)

## Setup

```bash
npm install
```

## Common commands

```bash
# Type-check
npm run typecheck

# Build (outputs to dist/)
npm run build

# Dev server (popup UI preview in a normal browser tab)
npm run dev
```

## Loading the extension (after a build)

> The build/manifest pipeline is a scaffold and will be refined in a future change
> (e.g. copying `manifest.json` into `dist/` and bundling each entry). For now this
> documents the intended developer flow.

1. Run `npm run build` to produce `dist/`.
2. Open `chrome://extensions` in a Chromium-based browser.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the build output directory.
5. Open a SudokuPad puzzle (e.g. `https://sudokupad.app/<id>`) and the extension
   popup.

## Project layout

```
extension/
├── manifest.json
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── popup/      # Popup, HostPanel, GuestPanel (placeholders)
    ├── content/    # content.ts, gridDetector.ts, overlay.ts (placeholders)
    ├── background/ # serviceWorker.ts (placeholder)
    └── shared/     # messages.ts, types.ts (event contract mirror)
```

## Future behavior (not implemented yet)

See `openspec/changes/scaffold-sudoku-coop/specs/realtime-coordination/spec.md` for
the planned host/guest flows, overlay-based highlighting, and grid-detection
strategy.
