## Why

The extension already moves a guest's `cell:highlight` through the backend to the host's content script, but the content script only logs the coordinate (`host-grid-overlay` TODOs left by `extension-core-connection`). The host can't actually *see* what the guest selected. This change makes the host's SudokuPad page visibly highlight the guest-selected cell, completing the core collaborative loop.

## What Changes

- Implement real SudokuPad grid detection in `extension/src/content/gridDetector.ts`: locate the visible 9×9 board and return a clean `GridBounds` object, with a precise per-cell path (read SudokuPad's `.cell[row][col]` elements when present) and a robust geometric fallback (largest square-ish visible candidate: `canvas` / `svg#svgrenderer` / board container) that avoids selecting `body`/`html` or tiny controls.
- Implement DOM overlay rendering in `extension/src/content/overlay.ts`: a single injected overlay root under `document.body` with a highlight element positioned from grid bounds, styled directly (no Tailwind dependency), `pointer-events: none`, very high `z-index`, and a short fade/auto-clear.
- Replace the placeholder handler in `extension/src/content/content.ts` with real behavior: validate row/column (1–9), detect/reuse grid bounds, render the highlight, remember the last highlight, and reposition it on resize/scroll/layout changes (debounced). Fail gracefully with helpful `[Sudoku Coop]` logs when the grid can't be detected.
- Add pure, unit-testable coordinate math (cell rectangle from `GridBounds` + 1-based row/column) and grid-candidate scoring helpers; add a small debounce helper.
- Optionally expose a development-only `window.__sudokuCoopDebugHighlight(row, column)` helper for manual testing.
- Update `extension/README.md` with the host/guest manual test flow, the debug helper, and known limitations (9×9 only).
- **Non-goal / scope restriction**: No backend changes, no guest modal polish, no new session protocol, no auth/Redis/database, no Sudoku solving, no writing digits into SudokuPad, and no reading or mutating SudokuPad's internal JavaScript state. No new broad browser permissions.

## Capabilities

### New Capabilities
- `host-grid-overlay`: Host-side SudokuPad grid detection and visual overlay — detecting the on-page 9×9 grid bounds, mapping a 1-based `{ row, column }` to a screen-space cell rectangle, drawing a non-interactive (`pointer-events: none`) highlight overlay above the board, fading/clearing it, repositioning it on resize/scroll/layout changes, validating coordinates, and failing gracefully with useful diagnostics.

### Modified Capabilities
<!-- None. The `extension-connection` highlight-forwarding contract and the backend `realtime-coordination` requirements are unchanged; this change only fulfills the content-script side that `extension-connection` left as a placeholder. -->

## Impact

- Extension content-script modules: `src/content/gridDetector.ts` (real detection), `src/content/overlay.ts` (real rendering), `src/content/content.ts` (real handler + reposition listeners). Consumes the existing `HOST_RECEIVED_HIGHLIGHT` message and `validateCoordinate`/`isValidIndex` from `src/shared/validation.ts`.
- New pure helpers (cell-rectangle math, candidate scoring, debounce) with Vitest unit tests, reusing the existing Vitest setup.
- `extension/README.md` updated with manual test flow and limitations.
- No backend, manifest-permission, Redis, database, or auth changes. No modification of SudokuPad internals.
