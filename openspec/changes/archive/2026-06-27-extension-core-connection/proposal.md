## Why

The backend (`backend-realtime-sessions`) exposes a working WebSocket protocol, but the browser extension is still placeholder scaffolding with no behavior. We need the extension's core connection layer so a host can create a session and a guest can join and send highlight coordinates that actually reach the backend and flow back to the host page. This is the first functional extension layer and unblocks the later visual changes (`host-grid-overlay`, guest modal polish, `end-to-end-polish`).

## What Changes

- Add a single config location for the backend WebSocket URL (`extension/src/shared/config.ts`, e.g. `DEFAULT_BACKEND_WS_URL = "ws://localhost:8000/ws"`).
- Define shared TypeScript types for the extension state model (`role`, `connectionStatus`, `sessionId`, `error`, `backendUrl`), backend event payloads, and internal extension messages (popup↔background↔content), centralizing all event string literals.
- Implement the React popup: title, connection status, Host/Guest role selector, `HostPanel` (Create Session, session code display, Disconnect), and `GuestPanel` (session code input, Join Session, row/column inputs with 1–9 validation, Send Highlight).
- Implement the background service worker as the coordination layer: owns the WebSocket instance, connects/reuses on host-create or guest-join, sends backend events, parses backend JSON safely, maintains and persists extension state to `chrome.storage.local`, responds to popup messages, and forwards `cell:highlight` to the active SudokuPad content script.
- Implement the content script placeholder handler for `HOST_RECEIVED_HIGHLIGHT`: log the coordinate and call a placeholder `handleHighlightMessage(row, column)` with TODOs for the later overlay change.
- Review `extension/manifest.json` (MV3) for popup, background service worker, content script on `https://sudokupad.app/*`, and minimal permissions (`storage`, `tabs`, `activeTab`); add localhost host permissions only if required by the environment.
- Add validation/parsing helper functions and unit tests where practical (row/column validation, event-type/parsing helpers, state helpers); ensure typecheck/build/lint pass.
- Update `extension/README.md` with install/build/load-unpacked steps, backend URL/command, local host/guest test scenario, and the known limitation that the content script only logs highlights in this change.
- **Non-goal / scope restriction**: No real grid detection, no visible overlay rendering, no final guest modal/coordinate polish, no manual calibration, no Sudoku solving, no writing into SudokuPad. No backend code changes (docs only if strictly needed), no Redis, no database, no auth.

## Capabilities

### New Capabilities
- `extension-connection`: The browser extension's core connection architecture — popup UI state and role selection, the background service worker WebSocket client, popup↔background↔content message passing, host create-session and guest join/test-send flows, connection status and error display, lightweight `chrome.storage.local` state, and placeholder forwarding of host highlight events to the content script.

### Modified Capabilities
<!-- None. The backend `realtime-coordination` requirements (including overlay/grid-detection) are unchanged and out of scope here. -->

## Impact

- Extension modules implemented (currently placeholders): `src/shared/config.ts` (new), `src/shared/types.ts`, `src/shared/messages.ts`, `src/popup/Popup.tsx`, `src/popup/HostPanel.tsx`, `src/popup/GuestPanel.tsx`, `src/background/serviceWorker.ts`, `src/content/content.ts` (placeholder handler), and possibly `src/content/gridDetector.ts` / `src/content/overlay.ts` left as placeholders.
- `extension/manifest.json` reviewed/updated for MV3 wiring and minimal permissions.
- Possible new dev dependency: Vitest (added only if it fits cleanly) for the validation/parsing/state helper tests; otherwise tests are limited to pure helpers.
- `extension/README.md` updated with local dev and manual test instructions.
- No backend, Redis, database, or auth changes.
