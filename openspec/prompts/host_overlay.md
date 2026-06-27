I want to create the fourth OpenSpec change for this project: `host-grid-overlay`.

Context:

This project is a browser extension + FastAPI backend for coordinating SudokuPad sessions.

Previous changes should already be done:

1. `scaffolding`

   * Created monorepo structure.
   * Created FastAPI backend with uv.
   * Created browser extension with Manifest V3, React, TypeScript, Vite, Tailwind.

2. `backend-realtime-sessions`

   * Implemented FastAPI WebSocket backend.
   * Host can create a session.
   * Guest can join a session.
   * Guest can send a `cell:highlight` event.
   * Backend broadcasts the event to the host.

3. `extension-core-connection`

   * Implemented extension popup state.
   * Implemented host/guest mode.
   * Implemented WebSocket client connection.
   * Implemented popup/background/content-script messaging.
   * Host can receive `cell:highlight` events.
   * Background forwards highlight events to the SudokuPad content script.
   * Content script currently only logs or handles a placeholder highlight event.

The current goal:

Implement the host-side SudokuPad content script behavior:

* detect the Sudoku grid on the page
* inject a visual overlay above the grid
* render a highlighted cell from row/column coordinates
* handle resize/layout changes
* keep SudokuPad itself fully usable
* avoid modifying SudokuPad internal state

This change should make the host browser visibly highlight the cell selected by the guest.

Important scope:

This change is content-script focused.

Implement:

* SudokuPad grid detection
* overlay root injection
* highlight rectangle rendering
* mapping `{ row, column }` to screen coordinates
* resize handling
* scroll/layout handling
* mutation handling if useful
* graceful failure if grid cannot be detected
* useful console/debug messages
* optional lightweight debug helper for manual testing

Do not implement:

* backend changes
* guest modal polish
* new session protocol
* authentication
* Redis
* database
* Sudoku solving
* writing digits into SudokuPad
* modifying SudokuPad internal app state
* manual grid calibration unless it is very small and clearly isolated as future-ready placeholder
* complicated support for non-9x9 puzzles

For MVP, assume a 9x9 Sudoku grid.

Core design decision:

Do not interact with SudokuPad’s internal JavaScript state.

Do not simulate SudokuPad moves.

Do not write numbers into the puzzle.

Do not depend heavily on unstable SudokuPad internal class names.

The extension should draw its own DOM overlay above the visible Sudoku grid.

The overlay should be visual only and should not block user interactions with SudokuPad.

Use:

pointer-events: none

The overlay/highlight should be appended from the content script into the page DOM, preferably under `document.body`, and positioned using viewport/page coordinates derived from `getBoundingClientRect()`.

Expected event received by content script:

The previous extension step should already forward a message to the content script similar to:

{
"type": "HOST_RECEIVED_HIGHLIGHT",
"payload": {
"row": 3,
"column": 5,
"sessionId": "AB12",
"timestamp": 1782390000000
}
}

This change should replace the placeholder logging behavior with real visual rendering.

When this message arrives:

1. Validate row and column.
2. Detect or reuse detected grid bounds.
3. Calculate the target cell rectangle.
4. Render a highlight over the matching cell.
5. Fade or remove the highlight after a short time.
6. Keep the page interactive.

Coordinate mapping:

For 9x9 grid:

cellWidth = gridWidth / 9
cellHeight = gridHeight / 9

left = gridLeft + (column - 1) * cellWidth
top = gridTop + (row - 1) * cellHeight

Use row/column as 1-based values.

So:

row = 1, column = 1 means top-left cell.
row = 9, column = 9 means bottom-right cell.

Grid detection:

Implement a robust but simple detector in:

extension/src/content/gridDetector.ts

Suggested approach:

1. Search visible candidate elements on the page.
2. Candidate types should include:

   * canvas
   * svg
   * elements with role/grid-like structure if present
   * square-ish visible elements that look like the main puzzle board
3. Use `getBoundingClientRect()` to measure candidates.
4. Filter candidates:

   * visible
   * width > reasonable minimum, for example 250px
   * height > reasonable minimum, for example 250px
   * width/height ratio close to 1.0
   * located inside viewport or near visible area
5. Prefer the largest square-ish candidate that is likely the Sudoku board.
6. Avoid selecting the whole page/body/root container.
7. Avoid selecting tiny controls/buttons.
8. Return a clean `GridBounds` object.

Suggested type:

type GridBounds = {
left: number;
top: number;
width: number;
height: number;
right: number;
bottom: number;
source: string;
};

Use viewport coordinates from `getBoundingClientRect()` and convert to document coordinates only if required by the overlay positioning strategy.

Overlay rendering:

Implement overlay behavior in:

extension/src/content/overlay.ts

Responsibilities:

* create overlay root if it does not exist
* create/update highlight element
* position highlight element over selected cell
* apply CSS styles directly or through an injected style element
* support fade/removal
* keep `pointer-events: none`
* keep a very high z-index
* avoid creating duplicate overlay roots repeatedly
* expose clear functions

Possible functions:

createOverlayRoot(): HTMLElement
removeOverlayRoot(): void
highlightCell(bounds: GridBounds, row: number, column: number, gridSize?: number): void
clearHighlight(): void

Highlight styling:

The highlight should be clearly visible but not annoying.

Suggested style:

* position: absolute or fixed depending on chosen coordinate system
* border: 3px solid
* semi-transparent background
* box-shadow/glow
* border-radius small, maybe 4px
* pointer-events: none
* z-index: very high, for example 2147483647
* transition opacity/transform
* fade after 2–3 seconds

Example visual intent:

* cyan/blue outline
* transparent blue fill
* slight glow
* maybe short pulse animation

Do not use Tailwind classes inside the content-script overlay unless the extension build already guarantees those styles are injected into the page. Prefer direct styles or an injected `<style>` element inside the content script.

Resize and layout handling:

The SudokuPad layout may change because of:

* window resize
* browser zoom
* device pixel ratio
* scrolling
* SudokuPad UI changes
* orientation changes
* delayed app loading

Implement handling for:

* `resize`
* `scroll`, preferably capture phase or passive listener
* optional `ResizeObserver`
* optional `MutationObserver` to detect SudokuPad loading/re-rendering

Behavior:

* If a highlight is active and page layout changes, recalculate grid bounds and reposition the highlight.
* Do not run expensive DOM scans on every tiny event without throttling/debouncing.
* Use a small debounce/throttle, for example 50–150 ms.
* If grid cannot be detected after receiving a highlight event, log a helpful warning and optionally show a non-blocking debug message only if already appropriate for the project.

Content script integration:

Update:

extension/src/content/content.ts

It should:

* initialize the overlay system
* register runtime message listener
* handle `HOST_RECEIVED_HIGHLIGHT`
* call grid detection
* call overlay rendering
* remember the last highlight so it can be repositioned on resize
* fail gracefully if detection fails
* keep existing message-passing behavior intact

Suggested internal state:

type LastHighlight = {
row: number;
column: number;
sessionId?: string;
timestamp?: number;
} | null;

When a resize/layout event occurs:

* if `lastHighlight` exists and highlight is still visible, re-detect bounds and reposition

Validation:

Implement or reuse validation for:

* row integer 1–9
* column integer 1–9

If invalid:

* log warning
* do not render
* do not throw

Debugging:

Add useful console logs with a consistent prefix, for example:

[Sudoku Coop]

Examples:

* content script initialized
* grid detected with source and bounds
* highlight received row/column
* highlight rendered
* grid detection failed

Avoid excessive noisy logs.

Optional debug helper:

If useful, expose a small development-only helper on `window`, for example:

window.__sudokuCoopDebugHighlight = (row, column) => { ... }

Only do this if it does not conflict with project conventions and is clearly marked as a development helper. If implemented, document it in the extension README.

Testing:

Add tests where practical.

Recommended testable pure functions:

* row/column validation
* cell rectangle calculation
* candidate scoring logic for grid detection if implemented as pure functions
* debounce helper if implemented

At minimum, test:

1. Cell rectangle calculation:

   * 9x9 grid 900x900
   * row 1, col 1 returns top-left cell
   * row 9, col 9 returns bottom-right cell
   * row 5, col 5 returns center cell

2. Validation:

   * row/column 1 valid
   * row/column 9 valid
   * 0 invalid
   * 10 invalid
   * non-integer invalid

3. Grid candidate scoring:

   * square visible large candidate scores higher than rectangular candidate
   * tiny candidate rejected
   * body/html rejected or deprioritized

If browser DOM tests are not already configured, do not over-engineer testing. Prefer pure-function tests.

Build/verification:

After implementation, verify:

* TypeScript build passes
* Vite build passes
* lint passes if configured
* existing extension behavior still works
* backend does not need to be changed

Manual test scenario:

1. Start backend:

cd backend
uv run uvicorn sudoku_coop_api.main:app --reload

2. Build/load extension according to existing README.

3. Open SudokuPad page:

https://sudokupad.app/BLLGjtrb4P

4. Open extension popup on host.

5. Select Host.

6. Create session.

7. Open another browser/profile with the extension as guest.

8. Join the session.

9. Send row 3, column 5.

Expected result:

* Host SudokuPad page visibly highlights row 3, column 5.
* Highlight appears above the Sudoku grid.
* Highlight does not block normal SudokuPad clicks.
* Highlight fades or clears after a short time.
* Console logs are useful if something fails.

Additional manual tests:

* Send row 1, column 1.

  * Top-left cell should highlight.

* Send row 9, column 9.

  * Bottom-right cell should highlight.

* Resize browser window and send another highlight.

  * Highlight should still align.

* Scroll page if possible and send another highlight.

  * Highlight should still align.

* Refresh SudokuPad and reconnect host if necessary.

  * Highlight should still work after normal extension/backend flow.

* Try invalid row/column from guest if guest UI allows it.

  * Host should not render invalid highlight.

OpenSpec requirements:

Create or update the OpenSpec change for `host-grid-overlay`.

The OpenSpec proposal should include:

1. `proposal.md`

   * Explain that this change implements host-side SudokuPad grid detection and visual overlay.
   * State that it consumes highlight events already forwarded by the extension background script.
   * State that it does not modify SudokuPad internals.
   * State that it does not implement guest modal polish or backend changes.

2. `design.md`

   * Explain content script architecture.
   * Explain grid detection strategy.
   * Explain overlay positioning strategy.
   * Explain row/column to cell mapping.
   * Explain resize/scroll handling.
   * Explain failure modes.
   * Explain why this overlay-based approach is safer than interacting with SudokuPad internals.
   * Explain MVP limitation: 9x9 only.

3. `tasks.md`

   * inspect existing content script/message flow
   * define grid bounds and cell rectangle types
   * implement grid detection
   * implement overlay root and highlight rendering
   * connect content script message handler to overlay
   * add resize/scroll/layout reposition handling
   * add validation and error handling
   * add pure-function tests where practical
   * update extension README
   * run build/typecheck/lint verification
   * perform manual host/guest test

Acceptance criteria:

* Content script receives `HOST_RECEIVED_HIGHLIGHT` events.
* Content script validates row/column.
* Grid detector can find the visible SudokuPad grid on a normal SudokuPad puzzle page.
* Overlay root is injected safely.
* Highlight appears over the correct 9x9 cell.
* Row 1 / column 1 maps to top-left.
* Row 9 / column 9 maps to bottom-right.
* Highlight uses `pointer-events: none`.
* Highlight does not prevent normal SudokuPad interaction.
* Highlight is visually clear.
* Highlight fades or clears after a short time.
* Highlight remains reasonably aligned after resize/scroll.
* Existing host/guest WebSocket flow still works.
* No backend behavior is changed.
* No SudokuPad internal state is modified.
* No Sudoku solving or digit-writing behavior is added.
* Extension README documents the manual test flow and known limitations.

Quality requirements:

* Keep the implementation simple.
* Prefer pure functions for coordinate math.
* Avoid fragile SudokuPad class-name dependencies.
* Avoid broad page manipulation.
* Avoid repeated duplicate overlay elements.
* Avoid expensive DOM scans in tight loops.
* Use clear TypeScript types.
* Keep content script behavior isolated to SudokuPad pages.
* Do not add unnecessary dependencies unless clearly justified.
* Do not request new broad browser permissions.

Please now create the OpenSpec proposal for `host-grid-overlay` and implement the SudokuPad host grid overlay according to this specification.
