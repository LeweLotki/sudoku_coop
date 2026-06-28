# extension-connection Specification

## Purpose
TBD - created by archiving change extension-core-connection. Update Purpose after archive.
## Requirements
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

#### Scenario: Role locked while in an active session
- **WHEN** the user is in an active session (role set with a session code, or connecting/connected)
- **THEN** the popup SHALL disable (grey out) the role button for the other role
- **AND** hovering over the disabled role button SHALL show a hint such as "Leave current session to change role."
- **AND** the user SHALL only be able to change role after closing or leaving the current session

### Requirement: Host Create-Session Flow
The extension SHALL let a host create a session by opening or reusing a single WebSocket connection to the backend and exchanging the create/created events.

#### Scenario: Host creates a session
- **WHEN** the host clicks Create Session in the popup
- **THEN** the background service worker SHALL open or reuse a WebSocket to the configured backend URL
- **AND** it SHALL send `{ "type": "session:create", "role": "host" }`
- **AND** upon receiving `{ "type": "session:created", "sessionId": "<code>" }` it SHALL set role to host and store the session code
- **AND** the popup SHALL display the returned session code

#### Scenario: Host copies the session code
- **WHEN** a session code is displayed in the Host panel
- **THEN** the popup SHALL show a copy button with a copy icon to the right of the code
- **AND** clicking it SHALL copy the session code to the clipboard without requiring the user to manually select the text
- **AND** the button SHALL give brief visual feedback that the code was copied

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
The extension SHALL define the backend WebSocket URL in a single shared configuration location, sourced from a build-time environment variable (`VITE_BACKEND_WS_URL`) so production builds can use `wss://`, and defaulting to `ws://localhost:8000/ws` for local development.

#### Scenario: Backend URL sourced from config
- **WHEN** the background opens a WebSocket connection
- **THEN** it SHALL use the URL produced by the shared config builder

#### Scenario: Production wss URL configured
- **WHEN** `VITE_BACKEND_WS_URL` is set to a `wss://...` value at build time
- **THEN** the shared config SHALL use that value as the base backend URL

#### Scenario: Default development URL
- **WHEN** `VITE_BACKEND_WS_URL` is not set
- **THEN** the shared config SHALL default to `ws://localhost:8000/ws`

### Requirement: Minimal Manifest Permissions
The extension manifest SHALL declare Manifest V3 wiring (popup, background service worker, content script on `https://sudokupad.app/*`) with minimal permissions, SHALL NOT request `<all_urls>` or other broad host permissions, and SHALL include only the host permissions needed to reach the backend (production `wss://` domain and, for local development, `ws://localhost:8000/*`).

#### Scenario: Minimal permissions declared
- **WHEN** the manifest is reviewed
- **THEN** it SHALL request only the permissions needed (such as `storage`, `tabs`, `scripting`, and `activeTab` if required)
- **AND** it SHALL NOT request `<all_urls>` or other unnecessary broad permissions

#### Scenario: Content script targets SudokuPad only
- **WHEN** the manifest content scripts are reviewed
- **THEN** the only `matches` pattern SHALL be `https://sudokupad.app/*`

#### Scenario: Backend host permissions only
- **WHEN** the manifest host permissions are reviewed
- **THEN** they SHALL include `https://sudokupad.app/*` and the backend endpoint(s) (production `wss://` domain and optionally `ws://localhost:8000/*`)
- **AND** they SHALL NOT include broad or unrelated origins

### Requirement: Access Token Appended To WebSocket URL
The extension SHALL append the configured access token to the backend WebSocket URL as a `token` query parameter when opening a connection, preserving any existing query parameters, and SHALL NOT persist the token to `chrome.storage.local`.

#### Scenario: Token appended to the connection URL
- **WHEN** the background opens a WebSocket and an access token is configured
- **THEN** the connection URL SHALL include `?token=<token>` (or `&token=<token>` if the base URL already has a query string)

#### Scenario: No token configured
- **WHEN** no access token is configured (local development without a token)
- **THEN** the URL builder SHALL return the base URL unchanged

#### Scenario: Token is not persisted
- **WHEN** extension state is persisted to `chrome.storage.local`
- **THEN** it SHALL NOT include the access token

