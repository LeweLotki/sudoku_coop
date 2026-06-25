## ADDED Requirements

### Requirement: Backend Health Check
The backend SHALL expose an HTTP health endpoint for liveness checks.

#### Scenario: Health endpoint returns ok
- **WHEN** a client sends `GET /health`
- **THEN** the server SHALL respond with HTTP 200 and body `{ "status": "ok" }`

### Requirement: Single WebSocket Endpoint
The backend SHALL expose a single WebSocket endpoint `/ws` where all clients connect and identify their role through JSON events rather than separate URLs.

#### Scenario: Client connects and identifies as host
- **WHEN** a client connects to `/ws` and sends `{ "type": "session:create", "role": "host" }`
- **THEN** the server SHALL treat that connection as the session host

#### Scenario: Client connects and identifies as guest
- **WHEN** a client connects to `/ws` and sends `{ "type": "session:join", "role": "guest", "sessionId": "AB12" }` for an existing session
- **THEN** the server SHALL treat that connection as a guest of that session

### Requirement: Standardized Error Responses
The backend SHALL respond with a standardized error event for all anticipated failures and SHALL NOT leak internal exception traces to clients.

#### Scenario: Error event shape
- **WHEN** the server rejects or fails to process a client message
- **THEN** it SHALL respond with `{ "type": "session:error", "message": "<human-readable message>" }`

#### Scenario: Invalid or malformed input
- **WHEN** a client sends invalid JSON, a message missing `type`, an unsupported event type, a message missing a required `sessionId`, or an otherwise malformed payload
- **THEN** the server SHALL respond with a `session:error` describing the problem

#### Scenario: Unauthorized action for role
- **WHEN** a guest sends a highlight before joining a session, or a host attempts a guest-only action
- **THEN** the server SHALL respond with a `session:error` and SHALL NOT broadcast the event

### Requirement: Highlight Acknowledgment
The backend SHALL acknowledge a successfully routed highlight coordinate back to the sending guest.

#### Scenario: Guest receives acknowledgment
- **WHEN** a guest's `cell:highlight` passes validation and is broadcast to the host
- **THEN** the server SHALL send the guest `{ "type": "cell:highlight:sent", "ok": true, "sessionId": "AB12", "row": 3, "column": 5 }`

## MODIFIED Requirements

### Requirement: Connection Lifecycle Management
The system SHALL manage session lifecycle based on WebSocket connection state without persistent storage, and SHALL notify guests when their session ends.

#### Scenario: Host disconnects
- **WHEN** the host of a session disconnects
- **THEN** the session SHALL be removed and all references cleaned up
- **AND** the server SHALL, where possible, notify each connected guest with `{ "type": "session:closed", "sessionId": "<code>" }`

#### Scenario: Guest disconnects
- **WHEN** a guest disconnects
- **THEN** that guest SHALL be removed from the session and other participants are unaffected
- **AND** the session SHALL remain alive while the host is still connected

#### Scenario: No persistence
- **WHEN** sessions are stored
- **THEN** they SHALL be kept only in memory with no database or Redis backing
