# realtime-coordination Specification

## Purpose
TBD - created by archiving change scaffold-sudoku-coop. Update Purpose after archive.
## Requirements
### Requirement: Host Session Creation
The system SHALL allow a host to create a coordination session and receive a short, human-readable session code.

#### Scenario: Host creates a session
- **WHEN** a host client sends `{ "type": "session:create", "role": "host" }`
- **THEN** the server SHALL respond with `{ "type": "session:created", "sessionId": "<code>" }`
- **AND** the session code SHALL be 4 to 6 uppercase alphanumeric characters

#### Scenario: One active host per session
- **WHEN** a session already has an active host
- **THEN** the session SHALL NOT accept a second host

### Requirement: Guest Session Join
The system SHALL allow one or more guests to join an existing session using its session code.

#### Scenario: Guest joins an existing session
- **WHEN** a guest sends `{ "type": "session:join", "role": "guest", "sessionId": "AB12" }` for an existing session
- **THEN** the server SHALL respond with `{ "type": "session:joined", "ok": true, "sessionId": "AB12" }`

#### Scenario: Guest joins a non-existent session
- **WHEN** a guest attempts to join a session that does not exist
- **THEN** the server SHALL respond with `{ "type": "session:error", "message": "Session not found" }`

#### Scenario: Multiple guests per session
- **WHEN** multiple guests join the same session
- **THEN** the system SHALL allow all of them to participate

### Requirement: Guest Highlight Coordinate
The system SHALL accept a highlight coordinate from a guest and broadcast it to the session's host.

#### Scenario: Guest sends a valid coordinate
- **WHEN** a guest sends `{ "type": "cell:highlight", "sessionId": "AB12", "row": 3, "column": 5 }`
- **THEN** the server SHALL broadcast `{ "type": "cell:highlight", "sessionId": "AB12", "row": 3, "column": 5, "timestamp": <epoch_ms> }` to the host

#### Scenario: Coordinate validation
- **WHEN** a guest sends a highlight coordinate
- **THEN** `sessionId` MUST be present, and `row` and `column` MUST be integers between 1 and 9 inclusive
- **AND** an invalid coordinate SHALL result in a `session:error` response

### Requirement: Connection Lifecycle Management
The system SHALL manage session lifecycle based on WebSocket connection state without persistent storage.

#### Scenario: Host disconnects
- **WHEN** the host of a session disconnects
- **THEN** the session SHALL be removed

#### Scenario: Guest disconnects
- **WHEN** a guest disconnects
- **THEN** that guest SHALL be removed from the session and other participants are unaffected

#### Scenario: No persistence
- **WHEN** sessions are stored
- **THEN** they SHALL be kept only in memory with no database or Redis backing

### Requirement: Overlay-Based Cell Highlighting
The host content script SHALL highlight the target cell by drawing its own visual overlay above the SudokuPad grid, without modifying SudokuPad internal state.

#### Scenario: Highlight rendered on host page
- **WHEN** the host content script receives a `cell:highlight` event for a 9x9 grid
- **THEN** it SHALL draw an overlay rectangle at the mapped `(row, column)` position
- **AND** the overlay SHALL use `position: absolute`, a high z-index, `pointer-events: none`, a transparent colored background, and a visible border/glow

#### Scenario: Highlight fade and replacement
- **WHEN** a new highlight arrives
- **THEN** it MAY replace the previous highlight
- **AND** a highlight SHALL fade after a few seconds

#### Scenario: Non-interference with SudokuPad
- **WHEN** the overlay is active
- **THEN** it SHALL NOT block SudokuPad clicks, modify puzzle values, or depend on SudokuPad internal app state

### Requirement: Grid Bounds Detection
The host content script SHALL determine the grid bounds robustly using the visible grid geometry rather than unstable internal class names.

#### Scenario: Bounding-box detection
- **WHEN** the content script needs to map `(row, column)` to screen coordinates
- **THEN** it SHALL prefer the visible grid/canvas/SVG bounding box via `getBoundingClientRect()`
- **AND** it SHALL recalculate bounds on window resize

#### Scenario: Manual calibration fallback
- **WHEN** automatic grid detection is unreliable
- **THEN** the system MAY allow the host to manually calibrate by clicking the top-left and bottom-right corners of the grid

