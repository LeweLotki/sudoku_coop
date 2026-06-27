## MODIFIED Requirements

### Requirement: Role Selection
The extension popup SHALL allow the user to choose between Host and Guest mode, and SHALL show the panel appropriate to the selected role.

#### Scenario: User selects Host mode
- **WHEN** the user opens the popup and selects Host
- **THEN** the popup SHALL display the Host panel with a Create Session control
- **AND** the selected role SHALL be recorded in extension state

#### Scenario: User selects Guest mode
- **WHEN** the user opens the popup and selects Guest
- **THEN** the popup SHALL display the Guest panel with a session code input and a Join Session control
- **AND** the Guest panel SHALL NOT contain row, column, or manual Send Highlight controls
- **AND** the selected role SHALL be recorded in extension state

### Requirement: Guest Join-Session Flow
The extension SHALL let a guest join an existing session using a session code by opening or reusing a single WebSocket connection to the backend.

#### Scenario: Guest joins a session
- **WHEN** the guest enters a session code and clicks Join Session
- **THEN** the background service worker SHALL open or reuse a WebSocket to the configured backend URL
- **AND** it SHALL send `{ "type": "session:join", "role": "guest", "sessionId": "<code>" }`
- **AND** upon receiving `{ "type": "session:joined", "ok": true, "sessionId": "<code>" }` it SHALL set role to guest and store the session code
- **AND** the popup SHALL display a joined/connected status

#### Scenario: Join requires a session code
- **WHEN** the guest clicks Join Session with an empty session code
- **THEN** the popup SHALL show a validation error
- **AND** SHALL NOT send a `session:join` event

#### Scenario: Connected guest sees grid-click instructions
- **WHEN** the guest is joined/connected to a session
- **THEN** the Guest panel SHALL display instruction text directing the user to click a cell on the SudokuPad grid (e.g. "Connected as guest. Click a cell on the SudokuPad grid to highlight it for the host.")
- **AND** the panel SHALL NOT require the popup to remain open for clicks to be sent

## REMOVED Requirements

### Requirement: Guest Highlight Test-Send
**Reason**: The manual row/column highlight form is replaced by direct SudokuPad grid clicking (see the `guest-grid-click` capability). The guest no longer enters coordinates in the popup.
**Migration**: After joining a session, the guest clicks directly on the SudokuPad grid; the content script computes the coordinate and the background sends the existing `cell:highlight` event. No popup form is involved.
