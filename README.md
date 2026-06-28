# Sudoku Coop

A Manifest V3 browser extension plus a FastAPI backend that let two(or more) people
coordinate on a [SudokuPad](https://sudokupad.app/) puzzle in real time. A
**guest** clicks a cell on their own SudokuPad grid and the **host's** SudokuPad
page highlights that same `(row, column)` cell with a visual overlay.

> Status: **implemented.** The end-to-end flow works — backend sessions, the
> extension connection layer, the host grid overlay, and guest grid-click
> highlighting are all in place, along with production hardening (access token,
> origin allowlist, rate/size limits, capacity caps, and session expiration).

## How it works

```
Guest clicks a cell on their SudokuPad grid
  → content script maps the click to a 1-based (row, column)
  → background service worker forwards a cell:highlight over WebSocket
  → FastAPI backend validates and routes it to the matching session's host
  → host background service worker forwards it to the SudokuPad content script
  → host content script draws an overlay over that cell (and fades it out)
```

The guest never types coordinates: the popup is only used to create/join a
session. Once connected, clicking the grid is enough, and it works even with the
popup closed (the background service worker owns the WebSocket and session
state).

## Key design decisions

- The extension **never** modifies or simulates SudokuPad internal game state.
  It draws its **own** overlay above the grid (`position: absolute`, high
  z-index, `pointer-events: none`, translucent fill with a glow, fades after
  ~2.5s).
- The guest click listener is **passive**: it never calls `preventDefault`/
  `stopPropagation`, so SudokuPad handles the click normally.
- Grid bounds are detected via the visible grid bounding box
  (`getBoundingClientRect()`), not unstable internal class names, and are
  recalculated (debounced) on resize/scroll so the overlay stays aligned.
- Sessions are **in-memory only** — no login, no persistence, no database, no
  Redis. Production therefore runs on **exactly one** web dyno.
- The MVP assumes a **9×9** grid.

## Known limitations

- Only **9×9** grids are supported.
- The highlight is purely visual (no digit writing, no move simulation).
- **Same-puzzle assumption:** host and guest should open the same SudokuPad URL.
  Different puzzles still highlight the clicked coordinate, but the context may
  differ — there is no automatic puzzle-URL matching.
- No automatic WebSocket reconnection yet.

## Repository layout (monorepo)

```
sudokuExtension/
├── backend/      # FastAPI backend (uv-managed) — WebSocket sessions + routing
├── extension/    # MV3 browser extension (Vite + React + TS + Tailwind)
├── openspec/     # OpenSpec proposals, specs, and change tracking
├── README.md
├── .gitignore
└── .editorconfig
```

## Getting started

1. **Backend** — see [`backend/README.md`](backend/README.md):

```bash
cd backend
uv sync --extra dev
uv run uvicorn sudoku_coop_api.main:app --reload
```

2. **Extension** — see [`extension/README.md`](extension/README.md):

```bash
cd extension
npm install
npm run build   # produces a loadable extension in dist/
```

Then load `extension/dist/` as an unpacked extension at `chrome://extensions`
(enable Developer mode → Load unpacked). For a full host + guest walkthrough,
see the manual test scenario in [`extension/README.md`](extension/README.md).

## Security model (short version)

The backend is gated by an **invite-style access token** (a `token` query
parameter on `/ws`) plus a WebSocket `Origin` allowlist. The token keeps random
internet users off the endpoint.

## How this is developed

Work is tracked as OpenSpec changes under `openspec/`. The current behavior is
the cumulative result of these (now archived) changes:

- `scaffold-sudoku-coop` — project structure and tooling
- `backend-realtime-sessions` — WebSocket sessions, routing, validation
- `extension-core-connection` — popup, role selection, background WS client
- `host-grid-overlay` — SudokuPad grid detection and visible highlight overlay
- `guest-grid-click-highlight` — guest clicks the grid instead of typing coords
- `production-hardening` — access token, origin allowlist, limits, expiration

The current specs live under [`openspec/specs/`](openspec/specs/).
```