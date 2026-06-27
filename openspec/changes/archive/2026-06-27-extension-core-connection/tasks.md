## 1. Inspect Scaffold & Configuration

- [x] 1.1 Review existing extension scaffold (`manifest.json`, `package.json`, `vite.config.ts`, popup/background/content placeholders, `src/shared/*`) and confirm Chrome `chrome.*` API convention
- [x] 1.2 Review `extension/manifest.json` (MV3): popup, module background service worker, content script on `https://sudokupad.app/*`, permissions `storage`/`tabs`/`activeTab`; add `ws://localhost:8000/*` / `http://localhost:8000/*` host permissions only if required; avoid broad permissions
- [x] 1.3 Create `src/shared/config.ts` exporting `DEFAULT_BACKEND_WS_URL = "ws://localhost:8000/ws"`

## 2. Shared Types & Message Constants

- [x] 2.1 Extend `src/shared/types.ts` with `ExtensionRole`, `ConnectionStatus`, and `ExtensionState` (`role`, `connectionStatus`, `sessionId`, `error`, `backendUrl`)
- [x] 2.2 Add backend event payload types in `src/shared/types.ts` (session create/created, join/joined, cell:highlight, cell:highlight:sent, session:error, session:closed)
- [x] 2.3 Extend `src/shared/messages.ts` with backend event-type constants and internal extension message-type constants (popup↔background↔content), centralizing all string literals

## 3. Popup UI

- [x] 3.1 Implement `Popup.tsx`: app title, connection status display, error area, Host/Guest role selector; fetch state on mount via `GET_EXTENSION_STATE` and subscribe to `EXTENSION_STATE_UPDATED`
- [x] 3.2 Implement `HostPanel.tsx`: Create Session button, session code display, Disconnect button when connected
- [x] 3.3 Implement `GuestPanel.tsx`: session code input, Join Session button, row/column inputs, Send Highlight button (disabled when not joined/connected), validation error area
- [x] 3.4 Wire popup actions to background via `chrome.runtime.sendMessage` (`SET_ROLE`, `HOST_CREATE_SESSION`, `GUEST_JOIN_SESSION`, `GUEST_SEND_HIGHLIGHT`, `DISCONNECT`)

## 4. Validation & Parsing Helpers

- [x] 4.1 Add a pure coordinate validation helper (row/column integers 1–9; session code required for join)
- [x] 4.2 Add a pure backend-message parsing helper that safely parses JSON and narrows by `type`

## 5. Background Service Worker

- [x] 5.1 Implement `ExtensionState` ownership and a `chrome.runtime.onMessage` router for popup commands
- [x] 5.2 Implement WebSocket lifecycle: create if none, reuse if open, defer single pending action while connecting; handle `onopen`/`onclose`/`onerror` and update `connectionStatus`
- [x] 5.3 Send backend events (`session:create`, `session:join`, `cell:highlight`) based on popup commands
- [x] 5.4 Parse backend messages defensively; handle `session:created` (role host + sessionId), `session:joined` (role guest + sessionId), `cell:highlight:sent`, `session:error` (set error), `session:closed`; ignore malformed/unknown without crashing
- [x] 5.5 Broadcast `EXTENSION_STATE_UPDATED` to the popup and respond directly to request messages
- [x] 5.6 Persist `role`/`sessionId`/`backendUrl` to `chrome.storage.local` and restore on startup; store no secrets

## 6. Highlight Forwarding & Content Script

- [x] 6.1 On `cell:highlight`, find the target tab (prefer active tab matching `https://sudokupad.app/*`, else query by URL and use first match) and send `HOST_RECEIVED_HIGHLIGHT`; if no tab, set error/status without crashing
- [x] 6.2 Implement `content.ts` listener for `HOST_RECEIVED_HIGHLIGHT`: log row/column, call placeholder `handleHighlightMessage(row, column)`, add TODO referencing `host-grid-overlay`; optionally send `CONTENT_SCRIPT_READY`
- [x] 6.3 Keep `gridDetector.ts` / `overlay.ts` as placeholder modules (no real behavior)

## 7. Tests

- [x] 7.1 Add Vitest only if it integrates cleanly with the existing Vite setup
- [x] 7.2 Unit test coordinate validation (1 and 9 valid; 0 and 10 and non-integer invalid; empty session code rejected)
- [x] 7.3 Unit test backend-message parsing/event-type helpers and any state helpers

## 8. Documentation & Verification

- [x] 8.1 Update `extension/README.md`: install deps, dev build, build, load unpacked in Chrome/Chromium, backend URL + backend run command, local host/guest manual test scenario, and known limitations (content script only logs highlights; real overlay in `host-grid-overlay`)
- [x] 8.2 Run typecheck and `vite build`; resolve errors
- [x] 8.3 Run lint if configured; resolve issues
- [x] 8.4 Manually verify host create → guest join → guest send highlight → host background forwards → content script logs the coordinate over `ws://localhost:8000/ws` _(in-browser step; see `extension/README.md` "Manual test scenario")_
