## ADDED Requirements

### Requirement: Highlight Event Handling
The host content script SHALL handle forwarded `HOST_RECEIVED_HIGHLIGHT` messages by rendering a visible highlight over the matching grid cell, replacing the previous placeholder logging behavior.

#### Scenario: Valid highlight is rendered
- **WHEN** the content script receives `{ "type": "HOST_RECEIVED_HIGHLIGHT", "payload": { "row": <r>, "column": <c>, "sessionId": "<code>", "timestamp": <ts> } }` with `row` and `column` integers from 1 to 9
- **THEN** it SHALL detect (or reuse) the grid bounds
- **AND** it SHALL render a highlight over the cell at the given 1-based row and column
- **AND** it SHALL remember the highlight as the last highlight so it can be repositioned

#### Scenario: Existing message-passing behavior preserved
- **WHEN** the content script initializes
- **THEN** it SHALL keep its existing runtime message listener and any `CONTENT_SCRIPT_READY` signal intact

### Requirement: Coordinate Validation
The content script SHALL validate the received row and column before rendering and SHALL NOT render or throw for invalid input.

#### Scenario: Out-of-range coordinate rejected
- **WHEN** a highlight arrives with a row or column less than 1 or greater than 9
- **THEN** the content script SHALL log a warning
- **AND** it SHALL NOT render a highlight
- **AND** it SHALL NOT throw

#### Scenario: Non-integer coordinate rejected
- **WHEN** a highlight arrives with a non-integer row or column
- **THEN** the content script SHALL log a warning and SHALL NOT render a highlight

### Requirement: SudokuPad Grid Detection
The content script SHALL detect the visible SudokuPad 9×9 grid on a normal SudokuPad puzzle page and return clean grid bounds, using rendered geometry from `getBoundingClientRect()`.

#### Scenario: Grid detected on a SudokuPad page
- **WHEN** grid detection runs on a page containing a visible SudokuPad board
- **THEN** it SHALL return a `GridBounds` object with `left`, `top`, `width`, `height`, `right`, `bottom`, and a `source` label
- **AND** the bounds SHALL reflect the rendered (scaled) size of the board

#### Scenario: Detection avoids non-grid elements
- **WHEN** grid detection evaluates candidate elements
- **THEN** it SHALL NOT select the page `body`/`html` or full-viewport container
- **AND** it SHALL NOT select tiny controls or buttons
- **AND** it SHALL prefer the largest square-ish visible candidate likely to be the board

#### Scenario: Grid cannot be detected
- **WHEN** a valid highlight arrives but no grid can be detected
- **THEN** the content script SHALL log a helpful warning
- **AND** it SHALL NOT render a highlight and SHALL NOT throw

### Requirement: Cell Coordinate Mapping
The system SHALL map a 1-based `{ row, column }` to a screen-space cell rectangle within the detected grid bounds for a 9×9 grid, via a pure function.

#### Scenario: Top-left cell
- **WHEN** mapping row 1, column 1 against grid bounds
- **THEN** the resulting rectangle SHALL correspond to the top-left cell of the grid

#### Scenario: Bottom-right cell
- **WHEN** mapping row 9, column 9 against grid bounds
- **THEN** the resulting rectangle SHALL correspond to the bottom-right cell of the grid

#### Scenario: Center cell
- **WHEN** mapping row 5, column 5 against a 900×900 grid
- **THEN** the rectangle SHALL be 100×100 positioned at the grid center

### Requirement: Non-Interactive Visual Overlay
The content script SHALL draw its highlight as its own DOM overlay above the visible grid, and the overlay SHALL NOT block interaction with SudokuPad or modify SudokuPad internal state.

#### Scenario: Overlay does not capture pointer events
- **WHEN** the highlight overlay is rendered
- **THEN** it SHALL use `pointer-events: none`
- **AND** clicks and interactions SHALL pass through to SudokuPad normally

#### Scenario: Overlay is layered above the page
- **WHEN** the highlight overlay is rendered
- **THEN** it SHALL be appended into the page DOM (preferably under `document.body`) with a very high `z-index`
- **AND** it SHALL be positioned using coordinates derived from `getBoundingClientRect()`

#### Scenario: SudokuPad internals untouched
- **WHEN** a highlight is rendered
- **THEN** the content script SHALL NOT read or mutate SudokuPad's internal JavaScript state, simulate moves, or write digits into the puzzle

#### Scenario: Single overlay root reused
- **WHEN** multiple highlights are rendered over time
- **THEN** the content script SHALL reuse a single overlay root rather than creating duplicate overlay roots

### Requirement: Highlight Visibility and Fade
The highlight SHALL be clearly visible and SHALL fade or clear after a short time.

#### Scenario: Highlight is visually clear
- **WHEN** a highlight is rendered
- **THEN** it SHALL be visually distinct (e.g. a colored outline with translucent fill and glow) over the target cell

#### Scenario: Highlight clears after a short time
- **WHEN** a highlight has been displayed
- **THEN** it SHALL fade out or be removed after a short interval (about 2–3 seconds)

### Requirement: Layout Change Repositioning
When a highlight is active and the page layout changes, the content script SHALL recalculate grid bounds and reposition the highlight, without performing expensive DOM scans on every event.

#### Scenario: Reposition on resize
- **WHEN** a highlight is active and the window is resized
- **THEN** the content script SHALL re-detect grid bounds and reposition the highlight to remain aligned

#### Scenario: Reposition on scroll
- **WHEN** a highlight is active and the page is scrolled
- **THEN** the content script SHALL reposition the highlight to remain aligned

#### Scenario: Repositioning is throttled
- **WHEN** resize or scroll events fire rapidly
- **THEN** recalculation SHALL be debounced or throttled (about 50–150 ms) rather than running on every event

### Requirement: Diagnostics and Optional Debug Helper
The content script SHALL emit useful, low-noise console diagnostics with a consistent `[Sudoku Coop]` prefix, and MAY expose a development-only highlight helper.

#### Scenario: Useful logs emitted
- **WHEN** the content script initializes, detects the grid, receives a highlight, renders a highlight, or fails to detect the grid
- **THEN** it SHALL log a corresponding message prefixed with `[Sudoku Coop]`
- **AND** it SHALL avoid excessively noisy logging

#### Scenario: Optional debug helper
- **WHEN** the development-only debug helper is enabled
- **THEN** calling `window.__sudokuCoopDebugHighlight(row, column)` SHALL run the same detect-and-render path used for real highlight events
