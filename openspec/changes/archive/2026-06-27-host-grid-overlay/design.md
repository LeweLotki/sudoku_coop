## Context

`extension-core-connection` wired the full message path: a guest's `cell:highlight` reaches the backend, is broadcast to the host, and the host's background service worker forwards it to the SudokuPad content script as `HOST_RECEIVED_HIGHLIGHT`. Today `content.ts` only logs that message; `gridDetector.ts` and `overlay.ts` are placeholder stubs. This change implements the content-script side so the host page visibly highlights the guest-selected cell.

The content script runs only on `https://sudokupad.app/*` (per `manifest.json`). It uses Chrome `chrome.*` APIs, TypeScript, Vite 6, and the existing Vitest setup. Shared validation already exists (`src/shared/validation.ts`: `isValidIndex`, `validateCoordinate`, range constants 1–9) and is reused rather than duplicated.

Observed SudokuPad DOM (from a real puzzle page):

```
#board.board (inline transform: translate(-50%,-50%) scale(...); left/top/width/height)
  .grid
    .cells
      .row
        .cell[row="0"][col="0"] ... .cell[row="8"][col="8"]   // 0-based attributes
    svg#svgrenderer.boardsvg (width/height in px; viewBox includes negative margins for outside clues)
```

Two important facts drive the design: (1) SudokuPad renders one real DOM `.cell` element per cell with 0-based `row`/`col` attributes, and (2) the board is rendered via a CSS `transform: scale(...)`, so any math on the container must use rendered geometry (`getBoundingClientRect()`), never raw CSS `width`/`height` or SVG `viewBox` units.

## Goals / Non-Goals

**Goals:**
- Detect the visible 9×9 SudokuPad board and return clean `GridBounds`.
- Map a 1-based `{ row, column }` to a screen-space cell rectangle.
- Draw a clearly visible, non-interactive highlight overlay above the board.
- Keep SudokuPad fully usable (`pointer-events: none`, no internal-state access).
- Reposition the active highlight on resize / scroll / zoom / layout changes.
- Validate coordinates and fail gracefully with useful `[Sudoku Coop]` logs.
- Keep coordinate math and scoring as pure, unit-tested functions.

**Non-Goals:**
- Backend, guest modal, session protocol, auth, Redis, database changes.
- Sudoku solving, writing digits, or any read/write of SudokuPad internal JS state.
- Non-9×9 puzzles; full manual calibration (a tiny placeholder hook is acceptable).
- Multi-cell / persistent highlight history (single latest highlight only).

## Decisions

### Two-tier grid detection: precise cells first, geometric fallback second
`detectGridBounds()` tries strategies in order and returns the first acceptable `GridBounds`:
1. **Precise (preferred):** query `.cells` and the union of `.cell[row][col]` elements. If a full/near-full 9×9 set of visible cells is present, compute bounds from the union of their rects. This is the most accurate and naturally accounts for the CSS `scale()` transform. The detector can also expose the exact target cell's rect via `.cell[row="r-1"][col="c-1"]` for pixel-perfect highlighting.
2. **Geometric fallback:** scan candidate elements (`svg#svgrenderer`, `canvas`, `.board`/`.grid`, generic square-ish visible blocks), measure with `getBoundingClientRect()`, score them, and pick the best.

`GridBounds` carries a `source` string (e.g. `"cells"`, `"svgrenderer"`, `"square-candidate"`) for diagnostics.

- Rationale: SudokuPad currently exposes real cell elements, giving exact placement for free; but those class/attribute names are not guaranteed stable, so the geometric fallback keeps detection working if they change.
- Alternative considered: hardcoding `svg#svgrenderer` only — rejected as too fragile and it requires subtracting the SVG's negative-margin clue padding from the viewBox, which is error-prone.

### Candidate scoring as a pure function
The geometric fallback's selection is a pure `scoreCandidate(rect, viewport)` (plus a `pickBestCandidate(rects)`): reward large area and aspect ratio near 1.0, require width/height above a minimum (~250px), penalize/reject `body`/`html`/full-viewport-sized elements and tiny controls.
- Rationale: pure functions are directly unit-testable (square > rectangle, tiny rejected, body rejected) without a DOM.

### Coordinate math is pure and transform-agnostic
`cellRectFromBounds(bounds, row, column, gridSize = 9)` returns `{ left, top, width, height }`:
```
cellWidth  = bounds.width  / gridSize
cellHeight = bounds.height / gridSize
left = bounds.left + (column - 1) * cellWidth
top  = bounds.top  + (row    - 1) * cellHeight
```
`row`/`column` are 1-based: (1,1) → top-left, (9,9) → bottom-right. Because `bounds` come from `getBoundingClientRect()`, the math already reflects the rendered (scaled) size.
- Rationale: simple, testable, and matches the protocol's 1-based convention. The protocol's 1-based `{row,column}` maps to SudokuPad's 0-based attributes as `row-1`/`col-1` when using the precise path.

### Overlay: single root under `document.body`, viewport-fixed positioning
`overlay.ts` lazily creates one overlay root (idempotent — never duplicates) and a single highlight child. Styles are applied directly via JS (or one injected `<style>`), not Tailwind, so they don't depend on the page bundle: `position: fixed`, high `z-index` (`2147483647`), `pointer-events: none`, ~3px solid cyan/blue border, translucent fill, soft glow, small radius, opacity transition, and an auto-clear timer (~2–3s).
- Rationale: `position: fixed` pairs naturally with `getBoundingClientRect()` (viewport coords) and avoids scroll-offset math. `pointer-events: none` guarantees SudokuPad stays clickable. A single reused root avoids leaks and duplicate elements.
- Alternative considered: `position: absolute` with `scrollX/scrollY` offsets — rejected as more error-prone; fixed positioning is simpler given we reposition on scroll anyway.
- API: `createOverlayRoot()`, `removeOverlayRoot()`, `highlightCell(bounds, row, column, gridSize?)`, `clearHighlight()`.

### Why a DOM overlay instead of touching SudokuPad internals
We draw our own sibling element rather than calling SudokuPad APIs, simulating selections, or mutating its state/SVG. This keeps the puzzle's solve state untouched, avoids fragile coupling to private app internals, and guarantees we can never corrupt the user's progress. The overlay is purely visual.

### Reposition handling, debounced
`content.ts` keeps `lastHighlight: { row, column, sessionId?, timestamp? } | null`. While a highlight is visible, `resize` and `scroll` (passive/capture) — and optionally a `ResizeObserver` on the detected grid and a `MutationObserver` for late app rendering — trigger a debounced (~50–150ms) re-detect + reposition. A shared pure `debounce(fn, ms)` helper is unit-tested. Listeners are cleaned up when the highlight clears.
- Rationale: keeps the highlight aligned through zoom/resize/scroll without expensive DOM scans on every event.

### Graceful failure & diagnostics
Invalid coordinates (outside 1–9 or non-integer, via `isValidIndex`) are logged and dropped — never thrown, never rendered. If detection fails after a valid highlight, log a single helpful `[Sudoku Coop]` warning and skip rendering. Logs use a consistent prefix and cover: init, grid detected (source + bounds), highlight received, highlight rendered, detection failed. Noise is kept low.

### Optional debug helper
Behind a dev-only guard, expose `window.__sudokuCoopDebugHighlight = (row, column) => …` that runs the same detect+render path for manual testing, documented in the README. It is clearly marked dev-only and never required for normal operation.

## Risks / Trade-offs

- [SudokuPad changes `.cell`/`.cells`/`#svgrenderer` names] → Two-tier detection: precise path is best-effort, geometric fallback keeps it working; `source` is logged for debugging.
- [CSS `transform: scale()` on `.board` skews naive math] → Always measure via `getBoundingClientRect()` (rendered geometry); never use CSS/viewBox units.
- [SVG `viewBox` includes negative-margin padding for outside clues] → Prefer `.cells`/`.cell` union (excludes outside clue area) over the raw SVG box; if falling back to the SVG, accept minor edge imprecision for the MVP.
- [High-frequency scroll/resize events] → Debounce (~50–150ms) and only recompute while a highlight is active.
- [Overlay z-index/stacking conflicts] → Max int `z-index` + `position: fixed` on a body-level root; `pointer-events: none` prevents interaction capture.
- [Grid not yet rendered when highlight arrives (late app load)] → Detection returns null → log warning; optional `MutationObserver` lets a subsequent event succeed. No crash.
- [Non-9×9 puzzles] → Out of scope; `gridSize` defaults to 9 but is a parameter so the math is future-ready.
- [Memory/listener leaks] → Single reused overlay root; add listeners on first highlight, remove on clear/`removeOverlayRoot`.

## Open Questions

- Should the highlight auto-clear on a timer only, or also clear when the host clicks elsewhere? Defaulting to timer-only (~2.5s) for MVP simplicity.
- Should detection results be cached briefly between rapid highlights? Defaulting to re-detect per highlight (cheap enough) and only debouncing reposition events.
