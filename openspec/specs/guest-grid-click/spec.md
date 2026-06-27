# guest-grid-click Specification

## Purpose
TBD - created by archiving change guest-grid-click-highlight. Update Purpose after archive.
## Requirements
### Requirement: Guest Grid Click Detection
The content script SHALL listen for click events on the SudokuPad page and, for clicks that fall inside the detected grid bounds, compute the corresponding 1-based `{ row, column }` for a 9×9 grid. The listener SHALL be passive and SHALL NOT call `preventDefault` or `stopPropagation`, simulate clicks, write digits, or modify SudokuPad internal state.

#### Scenario: Click inside the grid is detected
- **WHEN** the user clicks a point inside the detected SudokuPad grid bounds
- **THEN** the content script SHALL compute a 1-based `{ row, column }` from the click position
- **AND** it SHALL send a `GRID_CELL_CLICKED` message to the background service worker

#### Scenario: Native SudokuPad interaction preserved
- **WHEN** the user clicks anywhere on the SudokuPad page
- **THEN** the content script SHALL NOT call `preventDefault` or `stopPropagation`
- **AND** SudokuPad SHALL receive and handle the click normally
- **AND** the content script SHALL NOT mutate SudokuPad state, simulate moves, or write digits

#### Scenario: Click outside the grid is ignored
- **WHEN** the user clicks a point outside the detected grid bounds (or no grid can be detected)
- **THEN** the content script SHALL NOT send a `GRID_CELL_CLICKED` message
- **AND** it SHALL NOT throw

### Requirement: Click-to-Cell Coordinate Mapping
The system SHALL provide a pure function that maps a screen-space click point and grid bounds to a 1-based `{ row, column }` for a 9×9 grid, returning a null/empty result when the point is outside the grid.

#### Scenario: Top-left cell
- **WHEN** mapping a click near the top-left corner of the grid bounds
- **THEN** the function SHALL return `{ row: 1, column: 1 }`

#### Scenario: Bottom-right cell
- **WHEN** mapping a click near the bottom-right corner of the grid bounds
- **THEN** the function SHALL return `{ row: 9, column: 9 }`

#### Scenario: Center cell
- **WHEN** mapping a click at the center of a 900×900 grid
- **THEN** the function SHALL return `{ row: 5, column: 5 }`

#### Scenario: Outside grid returns null
- **WHEN** mapping a click point that lies outside the grid bounds
- **THEN** the function SHALL return null (or an equivalent empty result)

### Requirement: Grid Click Internal Message
The extension SHALL define a shared `GRID_CELL_CLICKED` internal message type carrying the computed coordinate so the content script can notify the background service worker without deciding role or connection state itself.

#### Scenario: Message shape
- **WHEN** the content script reports an in-grid click
- **THEN** it SHALL send `{ "type": "GRID_CELL_CLICKED", "payload": { "row": <r>, "column": <c>, "source": "sudokupad-content-script" } }`
- **AND** the message type and payload SHALL be defined in the shared messages/types modules

### Requirement: Background Guest-Click Validation and Forwarding
The background service worker SHALL handle `GRID_CELL_CLICKED` messages and SHALL forward a `cell:highlight` event to the backend only when the current role is `guest`, the connection status is `connected`, a `sessionId` exists, and the coordinate is an integer from 1 to 9. Otherwise it SHALL ignore the message safely.

#### Scenario: Connected guest click is forwarded
- **WHEN** the background receives a `GRID_CELL_CLICKED` with a valid 1–9 coordinate, the role is `guest`, the status is `connected`, and a `sessionId` exists
- **THEN** it SHALL send `{ "type": "cell:highlight", "sessionId": "<code>", "row": <r>, "column": <c> }` over the WebSocket

#### Scenario: Host click is ignored
- **WHEN** the background receives a `GRID_CELL_CLICKED` while the role is `host`
- **THEN** it SHALL NOT send a `cell:highlight` event
- **AND** it SHALL NOT throw

#### Scenario: Disconnected guest click is ignored
- **WHEN** the background receives a `GRID_CELL_CLICKED` while the role is `guest` but the status is not `connected` or no `sessionId` exists
- **THEN** it SHALL NOT send a `cell:highlight` event
- **AND** it SHALL NOT throw

#### Scenario: Invalid coordinate is ignored
- **WHEN** the background receives a `GRID_CELL_CLICKED` with a row or column outside 1–9 or non-integer
- **THEN** it SHALL NOT send a `cell:highlight` event

### Requirement: Popup-Independent Guest Click Flow
The guest grid click flow SHALL function while the popup is closed, relying on the background service worker as the owner of the WebSocket connection and session/role state.

#### Scenario: Clicks work with popup closed
- **WHEN** a connected guest has closed the popup and clicks a grid cell
- **THEN** the content script SHALL still send `GRID_CELL_CLICKED` to the background
- **AND** the background SHALL still forward a valid `cell:highlight` to the backend

### Requirement: Optional Guest-Side Feedback
The content script MAY provide lightweight local feedback for a guest's own click and SHALL at minimum log the detected coordinate with the `[Sudoku Coop]` prefix. Any local visual feedback SHALL reuse the existing non-interactive overlay logic and SHALL NOT block SudokuPad interaction or interfere with the host overlay.

#### Scenario: Coordinate logged
- **WHEN** a guest clicks an in-grid cell
- **THEN** the content script SHALL log a message such as `[Sudoku Coop] Guest clicked row <r>, column <c>`

#### Scenario: Optional local highlight is non-interactive
- **WHEN** local visual feedback is rendered for the guest's own click
- **THEN** it SHALL use the existing `pointer-events: none` overlay logic
- **AND** it SHALL NOT block SudokuPad interaction
