## ADDED Requirements

### Requirement: Role Selection
The extension popup SHALL allow the user to choose between Host and Guest mode, and SHALL show the panel appropriate to the selected role.

#### Scenario: User selects Host mode
- **WHEN** the user opens the popup and selects Host
- **THEN** the popup SHALL display the Host panel with a Create Session control
- **AND** the selected role SHALL be recorded in extension state

#### Scenario: User selects Guest mode
- **WHEN** the user opens the popup and selects Guest
- **THEN** the popup SHALL display the Guest panel with session code, row, and column inputs
- **AND** the selected role SHALL be recorded in extension state

### Requirement: Host Create-Session Flow
The extension SHALL let a host create a session by opening or reusing a single WebSocket connection to the backend and exchanging the create/created events.

#### Scenario: Host creates a session
- **WHEN** the host clicks Create Session in the popup
- **THEN** the background service worker SHALL open or reuse a WebSocket to the configured backend URL
- **AND** it SHALL send `{ "type": "session:create", "role": "host" }`
- **AND** upon receiving `{ "type": "session:created", "sessionId": "<code>" }` it SHALL set role to host and store the session code
- **AND** the popup SHALL display the returned session code

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

### Requirement: Guest Highlight Test-Send
The extension SHALL let a connected guest send a row/column highlight event to the backend, validating the coordinate before sending.

#### Scenario: Guest sends a valid coordinate
- **WHEN** a joined guest enters a row and column from 1 to 9 and clicks Send Highlight
- **THEN** the background service worker SHALL send `{ "type": "cell:highlight", "sessionId": "<code>", "row": <row>, "column": <column> }` over the WebSocket

#### Scenario: Coordinate validation in the popup
- **WHEN** the guest enters a row or column that is not an integer from 1 to 9
- **THEN** the popup SHALL show a validation error
- **AND** SHALL NOT send a `cell:highlight` event

#### Scenario: Send disabled when not connected
- **WHEN** the guest is not joined/connected to a session
- **THEN** the Send Highlight control SHALL be disabled

### Requirement: Background Coordination Layer
The background service worker SHALL be the single owner of the WebSocket connection and extension state, and SHALL mediate all communication between the popup, the backend, and the content script.

#### Scenario: Single connection reused
- **WHEN** a connection action is requested and a WebSocket is already open
- **THEN** the background SHALL reuse the existing connection rather than opening a new one

#### Scenario: Connection closes
- **WHEN** the WebSocket closes
- **THEN** the background SHALL set the connection status to disconnected

#### Scenario: Popup requests current state
- **WHEN** the popup sends a `GET_EXTENSION_STATE` message
- **THEN** the background SHALL respond with the current role, connection status, session code, error, and backend URL

#### Scenario: Backend error event
- **WHEN** the background receives `{ "type": "session:error", "message": "<msg>" }`
- **THEN** it SHALL update the extension state error with the message
- **AND** the popup SHALL display the error

### Requirement: Robust Backend Message Parsing
The background service worker SHALL parse backend messages defensively and SHALL NOT crash on malformed or unexpected input.

#### Scenario: Malformed backend message
- **WHEN** the background receives a message that is not valid JSON or is missing a known `type`
- **THEN** it SHALL ignore or record the error without throwing
- **AND** the WebSocket and extension SHALL remain operational

### Requirement: Highlight Forwarding to Content Script
When the host's background service worker receives a `cell:highlight` event, it SHALL forward the coordinate to a SudokuPad content script via internal extension messaging.

#### Scenario: Forward to active SudokuPad tab
- **WHEN** the background receives `{ "type": "cell:highlight", "sessionId": "<code>", "row": <r>, "column": <c>, "timestamp": <ts> }`
- **THEN** it SHALL send `{ "type": "HOST_RECEIVED_HIGHLIGHT", "payload": { "row": <r>, "column": <c>, "sessionId": "<code>", "timestamp": <ts> } }` to a tab matching `https://sudokupad.app/*`, preferring the active tab

#### Scenario: No SudokuPad tab available
- **WHEN** the background receives a highlight event but no SudokuPad tab exists
- **THEN** it SHALL update state/error without crashing
- **AND** the WebSocket connection SHALL remain open

### Requirement: Content Script Placeholder Handler
The content script SHALL handle forwarded highlight messages by logging the coordinate, without implementing real grid detection or visible overlay in this change.

#### Scenario: Content script logs a forwarded highlight
- **WHEN** the content script receives a `HOST_RECEIVED_HIGHLIGHT` message
- **THEN** it SHALL log the received row and column
- **AND** it SHALL call a placeholder handler (e.g. `handleHighlightMessage(row, column)`)
- **AND** it SHALL NOT draw a visible overlay or detect the real grid

### Requirement: Connection Status and Error Display
The popup SHALL display the current backend connection status and any error message.

#### Scenario: Status reflects connection lifecycle
- **WHEN** the connection status is one of idle, connecting, connected, disconnected, or error
- **THEN** the popup SHALL display the corresponding status to the user

#### Scenario: Error message shown
- **WHEN** the extension state contains an error message
- **THEN** the popup SHALL display it in an error area

### Requirement: Lightweight State Persistence
The extension SHALL persist lightweight, non-sensitive state to `chrome.storage.local` so it can be restored, and SHALL NOT store any authentication tokens.

#### Scenario: State persisted on change
- **WHEN** the role, session code, or backend URL changes
- **THEN** the background SHALL persist these values to `chrome.storage.local`

#### Scenario: No sensitive data stored
- **WHEN** state is persisted
- **THEN** it SHALL NOT include any authentication tokens or secrets

### Requirement: Single Backend URL Configuration
The extension SHALL define the backend WebSocket URL in a single shared configuration location rather than hardcoding it across modules.

#### Scenario: Backend URL sourced from config
- **WHEN** the background opens a WebSocket connection
- **THEN** it SHALL use the URL from the shared config (defaulting to `ws://localhost:8000/ws`)

### Requirement: Minimal Manifest Permissions
The extension manifest SHALL declare Manifest V3 wiring (popup, background service worker, content script on `https://sudokupad.app/*`) with minimal permissions and SHALL NOT request broad host permissions.

#### Scenario: Minimal permissions declared
- **WHEN** the manifest is reviewed
- **THEN** it SHALL request only the permissions needed (such as `storage`, `tabs`, and `activeTab` if required)
- **AND** it SHALL NOT request `<all_urls>` or other unnecessary broad permissions
