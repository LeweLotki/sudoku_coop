## ADDED Requirements

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

## MODIFIED Requirements

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
