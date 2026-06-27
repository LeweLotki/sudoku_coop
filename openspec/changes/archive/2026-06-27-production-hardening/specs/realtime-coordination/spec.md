## ADDED Requirements

### Requirement: WebSocket Access Token Authentication
The backend SHALL require a valid access token on every `/ws` connection before accepting any application-level message, comparing the supplied token against the configured `ACCESS_TOKEN` using a constant-time comparison, and SHALL NOT log the token value.

#### Scenario: Connection without a token is rejected
- **WHEN** a client connects to `/ws` with no `token` query parameter
- **THEN** the server SHALL reject the connection (close with an authentication-related close code)
- **AND** SHALL NOT process any application message from that connection

#### Scenario: Connection with an invalid token is rejected
- **WHEN** a client connects to `/ws?token=<wrong>` where the value does not match `ACCESS_TOKEN`
- **THEN** the server SHALL reject the connection
- **AND** SHALL NOT process any application message from that connection

#### Scenario: Connection with the valid token is accepted
- **WHEN** a client connects to `/ws?token=<ACCESS_TOKEN>` with the configured token
- **THEN** the server SHALL accept the connection and proceed with the normal event protocol

#### Scenario: Token compared in constant time and never logged
- **WHEN** the server validates a supplied token
- **THEN** it SHALL use a constant-time comparison against `ACCESS_TOKEN`
- **AND** SHALL NOT write the token value to logs or error messages

### Requirement: WebSocket Origin Allowlist
The backend SHALL reject WebSocket connections whose `Origin` header is a web page origin not present in the configured allowlist, to mitigate cross-site WebSocket hijacking, while still permitting the extension and non-browser clients.

#### Scenario: Disallowed web origin is rejected
- **WHEN** a client connects to `/ws` with an `Origin` header for an `http(s)` page that is not in the configured allowlist
- **THEN** the server SHALL reject the connection

#### Scenario: Extension origin is allowed
- **WHEN** a client connects with a `chrome-extension://` origin or an origin present in the configured allowlist
- **THEN** the origin check SHALL pass (token validation still applies)

### Requirement: Session Expiration
The backend SHALL expire sessions after a configurable time-to-live (`SESSION_TTL_SECONDS`, default 7200) and SHALL remove expired sessions from the in-memory registry using lazy cleanup before creating a session, joining a session, and processing a highlight.

#### Scenario: Expired session is removed
- **WHEN** a session's age since creation (or last activity) exceeds `SESSION_TTL_SECONDS` and any create/join/highlight operation runs cleanup
- **THEN** the expired session SHALL be removed from the registry

#### Scenario: Guest cannot join an expired session
- **WHEN** a guest attempts to join a session that has expired
- **THEN** the server SHALL respond with `{ "type": "session:error", "message": "Session expired" }`
- **AND** SHALL NOT add the guest

#### Scenario: Highlight cannot be sent to an expired session
- **WHEN** a guest sends `cell:highlight` for a session that has expired
- **THEN** the server SHALL respond with `{ "type": "session:error", "message": "Session expired" }`
- **AND** SHALL NOT broadcast the highlight

### Requirement: Per-Connection Message Limits
The backend SHALL enforce simple in-memory, per-connection limits to prevent accidental spam and basic abuse: a maximum message size, a message rate over a sliding/fixed window, and a maximum number of invalid messages before the connection is closed.

#### Scenario: Oversized message is rejected
- **WHEN** a connection sends a message larger than `MAX_MESSAGE_BYTES`
- **THEN** the server SHALL respond with `{ "type": "session:error", "message": "Message too large" }`
- **AND** SHALL NOT process the message

#### Scenario: Message rate limit exceeded
- **WHEN** a connection exceeds `MAX_MESSAGES_PER_10_SECONDS`
- **THEN** the server SHALL respond with `{ "type": "session:error", "message": "Rate limit exceeded" }` or close the connection
- **AND** SHALL NOT process the offending message

#### Scenario: Too many invalid messages closes the connection
- **WHEN** a connection produces more than `MAX_INVALID_MESSAGES_PER_CONNECTION` invalid messages
- **THEN** the server SHALL respond with `{ "type": "session:error", "message": "Too many invalid messages" }` and SHALL close the connection

### Requirement: Capacity Limits
The backend SHALL cap the number of active sessions (`MAX_ACTIVE_SESSIONS`) and the number of guests per session (`MAX_GUESTS_PER_SESSION`).

#### Scenario: Too many active sessions
- **WHEN** a host attempts to create a session while `MAX_ACTIVE_SESSIONS` sessions are already active
- **THEN** the server SHALL respond with `{ "type": "session:error", "message": "Too many active sessions" }`
- **AND** SHALL NOT create the session

#### Scenario: Session is full
- **WHEN** a guest attempts to join a session that already has `MAX_GUESTS_PER_SESSION` guests
- **THEN** the server SHALL respond with `{ "type": "session:error", "message": "Session is full" }`
- **AND** SHALL NOT add the guest

### Requirement: Highlight Pinned To Joined Session
The backend SHALL only broadcast a guest's highlight to the session that the guest actually joined, ignoring any mismatched `sessionId` supplied in the highlight payload.

#### Scenario: Guest highlights a session it did not join
- **WHEN** a guest that joined session A sends `cell:highlight` with `sessionId` for a different session B
- **THEN** the server SHALL NOT broadcast to session B
- **AND** SHALL respond with a `session:error`

## MODIFIED Requirements

### Requirement: Host Session Creation
The system SHALL allow a host to create a coordination session and receive a session code that is 8 characters by default (configurable via `SESSION_CODE_LENGTH`) drawn from a human-friendly uppercase alphabet, and the code SHALL be unique among active sessions.

#### Scenario: Host creates a session
- **WHEN** a host client sends `{ "type": "session:create", "role": "host" }`
- **THEN** the server SHALL respond with `{ "type": "session:created", "sessionId": "<code>" }`
- **AND** the session code SHALL be `SESSION_CODE_LENGTH` characters (default 8) from the alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`

#### Scenario: Generated code is unique
- **WHEN** a session code is generated
- **THEN** it SHALL not collide with any active session code
- **AND** the server SHALL retry generation on collision until a unique code is found

#### Scenario: One active host per session
- **WHEN** a session already has an active host
- **THEN** the session SHALL NOT accept a second host
