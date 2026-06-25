# Sudoku Coop

A browser extension + backend that let two people coordinate on a
[SudokuPad](https://sudokupad.app/) puzzle in real time. A **guest** sends a
`(row, column)` and the **host's** SudokuPad page highlights that cell with a
visual overlay.

> Status: **scaffold only.** This repository currently contains project structure,
> tooling configuration, and placeholder files. No functional application behavior
> is implemented yet. See the OpenSpec change
> [`scaffold-sudoku-coop`](openspec/changes/scaffold-sudoku-coop/) for the
> proposal, design, specs, and task list.

## Concept

```
Guest popup
  → sends row/column to backend over WebSocket
  → FastAPI backend receives the coordinate
  → backend broadcasts to the host WebSocket in the matching session
  → host content script receives the highlight event
  → host content script draws an overlay on the SudokuPad page
```

Key design decisions for the future implementation:

- Do **not** modify or simulate SudokuPad internal game state.
- The extension draws its **own** overlay above the grid (absolute positioning,
  high z-index, `pointer-events: none`, transparent background, border/glow,
  fades after a few seconds).
- Grid bounds are detected robustly via the visible grid bounding box
  (`getBoundingClientRect()`), not unstable internal class names, with a future
  manual-calibration fallback.
- MVP assumes a **9x9** grid, in-memory sessions, no login, no persistence, no
  database, no Redis.

## Repository layout (monorepo)

```
sudokuExtension/
├── backend/      # FastAPI backend (uv-managed) — scaffold/placeholders
├── extension/    # MV3 browser extension (Vite + React + TS + Tailwind) — scaffold/placeholders
├── openspec/     # OpenSpec proposals, specs, and change tracking
├── README.md
├── .gitignore
└── .editorconfig
```

## Getting started

- **Backend**: see [`backend/README.md`](backend/README.md) (`uv sync --extra dev`).
- **Extension**: see [`extension/README.md`](extension/README.md) (`npm install`).

## How this will be developed

Work is tracked as OpenSpec changes under `openspec/`. The current scaffolding
change documents the future WebSocket event contract, validation rules, and
overlay/grid-detection strategy as specs that later implementation work will
fulfill. Functional code (WebSocket handling, session management, popup UI, grid
detection, overlay rendering) is intentionally deferred to subsequent changes.
