## 1. Inspect Existing Flow

- [x] 1.1 Review `src/content/content.ts` placeholder handler, `src/content/gridDetector.ts` / `src/content/overlay.ts` stubs, and the `HOST_RECEIVED_HIGHLIGHT` message + payload shape in `src/shared/messages.ts`
- [x] 1.2 Review `src/shared/validation.ts` (`isValidIndex`, `validateCoordinate`, 1–9 constants) and the existing Vitest setup to reuse them
- [x] 1.3 Confirm SudokuPad DOM assumptions against the captured example (`.cells > .row > .cell[row][col]` 0-based, `svg#svgrenderer.boardsvg`, `.board` with CSS `transform: scale()`)

## 2. Types & Pure Coordinate Math

- [x] 2.1 Define `GridBounds` (`left`, `top`, `width`, `height`, `right`, `bottom`, `source`) and a cell-rect type in the content module
- [x] 2.2 Implement pure `cellRectFromBounds(bounds, row, column, gridSize = 9)` using 1-based row/column mapping
- [x] 2.3 Implement a pure `debounce(fn, ms)` helper

## 3. Grid Detection (`gridDetector.ts`)

- [x] 3.1 Implement the precise path: read `.cells` / `.cell[row][col]` and compute `GridBounds` from the union of visible cell rects (and expose exact target-cell lookup), measuring via `getBoundingClientRect()`
- [x] 3.2 Implement the geometric fallback: gather candidates (`svg#svgrenderer`, `canvas`, `.board`/`.grid`, square-ish visible blocks)
- [x] 3.3 Implement pure `scoreCandidate(rect, viewport)` / `pickBestCandidate(rects)` (reward large + ~1.0 aspect ratio; require min ~250px; reject body/html/full-viewport and tiny controls)
- [x] 3.4 Implement `detectGridBounds(): GridBounds | null` that tries precise then fallback and sets `source`; return null when nothing acceptable is found

## 4. Overlay Rendering (`overlay.ts`)

- [x] 4.1 Implement idempotent `createOverlayRoot()` under `document.body` (never duplicate) and `removeOverlayRoot()`
- [x] 4.2 Implement `highlightCell(bounds, row, column, gridSize?)` positioning a single reused highlight element via `cellRectFromBounds` using `position: fixed`
- [x] 4.3 Apply direct styles (no Tailwind): high `z-index` (`2147483647`), `pointer-events: none`, ~3px cyan/blue border, translucent fill, glow, small radius, opacity transition
- [x] 4.4 Implement `clearHighlight()` plus a short auto-clear/fade timer (~2–3s)

## 5. Content Script Integration (`content.ts`)

- [x] 5.1 Initialize the overlay system on load and keep the existing runtime message listener + `CONTENT_SCRIPT_READY` signal
- [x] 5.2 On `HOST_RECEIVED_HIGHLIGHT`: validate row/column via shared validation; on invalid, log a warning and do not render/throw
- [x] 5.3 On valid input: detect grid bounds, render the highlight, and store `lastHighlight` (`row`, `column`, `sessionId?`, `timestamp?`)
- [x] 5.4 Register debounced (~50–150ms) `resize` and `scroll` (passive/capture) listeners that re-detect + reposition while a highlight is active; optionally add `ResizeObserver`/`MutationObserver`; clean up on clear
- [x] 5.5 Log helpful `[Sudoku Coop]` diagnostics (init, grid detected w/ source+bounds, highlight received, highlight rendered, detection failed) without excessive noise

## 6. Optional Debug Helper

- [x] 6.1 Behind a dev-only guard, expose `window.__sudokuCoopDebugHighlight(row, column)` running the same detect-and-render path

## 7. Tests

- [x] 7.1 Unit test `cellRectFromBounds` (900×900: (1,1) top-left, (9,9) bottom-right, (5,5) center 100×100)
- [x] 7.2 Unit test coordinate validation (1 and 9 valid; 0, 10, and non-integer invalid)
- [x] 7.3 Unit test candidate scoring (square large > rectangular; tiny rejected; body/full-viewport rejected/deprioritized)
- [x] 7.4 Unit test `debounce` behavior

## 8. Documentation & Verification

- [x] 8.1 Update `extension/README.md` with the host/guest manual test flow, the optional debug helper, and the 9×9-only limitation
- [x] 8.2 Run typecheck and `vite build`; resolve errors
- [x] 8.3 Run lint if configured; resolve issues
- [ ] 8.4 Manually verify: host create → guest join → send row 3 col 5 → host highlights the cell; check (1,1)/(9,9) corners, resize/scroll realignment, invalid coordinate ignored, and that SudokuPad stays clickable _(in-browser; see README)_
