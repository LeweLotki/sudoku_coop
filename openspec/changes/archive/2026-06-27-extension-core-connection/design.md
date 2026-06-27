## Context

The backend WebSocket protocol is implemented and the extension exists only as MV3 scaffolding (placeholder popup, background service worker, and content script with TODOs). The current scaffold uses Chrome `chrome.*` APIs (`@types/chrome` is a dev dependency; no `webextension-polyfill`), React 18 + TypeScript, Vite 6, and Tailwind 3. This change wires the extension together so events can flow popup → background → backend and backend → background → content script. The backend remains the source of truth for the wire protocol; the extension must mirror it without changing it. Visible overlay and grid detection are deliberately deferred to later changes.

## Goals / Non-Goals

**Goals:**
- Make the extension capable of connecting to the backend and moving events through the popup/background/content architecture.
- Centralize configuration (backend URL), shared types, and event/message string literals.
- Implement host create-session and guest join + test-send flows from the popup.
- Use the background service worker as the single coordination layer and WebSocket owner.
- Forward host highlight events to the content script as a placeholder (log + stub handler).
- Display connection status and errors; persist lightweight state.
- Keep permissions minimal; ensure typecheck/build/lint pass.

**Non-Goals:**
- Real SudokuPad grid detection, visible overlay rendering, coordinate-modal polish, manual calibration.
- Sudoku solving or writing digits into SudokuPad / mutating its internal state.
- Backend logic changes, Redis, database, authentication.
- Robust reconnection/backoff (left for `end-to-end-polish`).

## Decisions

### Background service worker as the single coordination layer
The popup and content script never talk to the backend directly. The popup sends command messages (`chrome.runtime.sendMessage`) to the background, which owns the WebSocket and the authoritative `ExtensionState`. Backend events arrive at the background, which updates state, pushes updates to an open popup, and forwards highlights to the content script.
- Rationale: a service worker is the only component with a stable lifecycle across popup open/close; centralizing the socket avoids duplicate connections and split state.
- Alternative considered: opening the WebSocket from the popup — rejected because the popup is destroyed when closed, which would drop the connection and lose host highlight delivery.

### Authoritative state in the background, popup is a thin view
`ExtensionState` (`role`, `connectionStatus`, `sessionId`, `error`, `backendUrl`) lives in the background. The popup fetches it via `GET_EXTENSION_STATE` on mount and updates on `EXTENSION_STATE_UPDATED` broadcasts. The popup holds only ephemeral form input (typed code/row/column) and validation messages.
- Rationale: keeps a single source of truth and avoids state drift between an ephemeral popup and the persistent worker.
- Alternative considered: a state library (Redux/Zustand) — rejected; plain React state + message passing is sufficient and the prompt forbids unneeded state libraries.

### Shared modules centralize the contract
`src/shared/config.ts` exports `DEFAULT_BACKEND_WS_URL`. `src/shared/messages.ts` holds backend event-type constants and internal extension message-type constants. `src/shared/types.ts` holds `ExtensionRole`, `ConnectionStatus`, `ExtensionState`, backend event payload types, and internal message types.
- Rationale: avoids duplicated string literals across popup/background/content and gives one place to evolve the protocol; extends the existing `EVENT`/types placeholders already present.

### Internal message taxonomy
Popup → background: `HOST_CREATE_SESSION`, `GUEST_JOIN_SESSION`, `GUEST_SEND_HIGHLIGHT`, `GET_EXTENSION_STATE`, `DISCONNECT`, `SET_ROLE`. Background → popup: `EXTENSION_STATE_UPDATED` plus direct responses to requests. Background → content: `HOST_RECEIVED_HIGHLIGHT`. Content → background (optional): `CONTENT_SCRIPT_READY`, `SUDOKUPAD_TAB_DETECTED`.
- Rationale: a small, explicit command/event vocabulary keeps routing in the background straightforward and testable.

### WebSocket lifecycle (intentionally minimal)
If no socket exists, create one to the configured URL; if open, reuse it; if connecting, defer the pending action until `onopen`. On `onclose`, set status `disconnected`; on `onerror`, set status `error`. `session:error` sets `state.error`. `session:created` sets role host + sessionId; `session:joined` sets role guest + sessionId.
- Rationale: satisfies the flows without premature reconnection logic. Reconnection/backoff is an explicit non-goal here.
- Alternative considered: full auto-reconnect with queue — deferred to `end-to-end-polish`.

### Defensive backend parsing
All incoming socket messages are JSON-parsed inside try/catch and dispatched by `type`; unknown or malformed messages are ignored/recorded without throwing so the worker never crashes.
- Rationale: the prompt requires graceful handling of malformed messages and unexpected events.

### Highlight forwarding target selection
On `cell:highlight`, the background prefers the active tab if it matches `https://sudokupad.app/*`; otherwise it queries tabs by that URL and sends to the first match. If none exist, it records an error/status without crashing.
- Rationale: simple, deterministic MVP targeting; multi-tab fan-out is unnecessary now.

### Content script stays a placeholder
`content.ts` registers a `chrome.runtime.onMessage` listener, handles `HOST_RECEIVED_HIGHLIGHT` by logging the coordinate and calling `handleHighlightMessage(row, column)`, with a TODO pointing at `host-grid-overlay`. `gridDetector.ts`/`overlay.ts` remain placeholder modules.
- Rationale: proves the messaging path end-to-end while keeping real rendering out of scope.

### Storage
Persist `role`, `sessionId`, and `backendUrl` to `chrome.storage.local`; restore on worker startup. No tokens or secrets are stored (there is no auth).
- Rationale: lightweight continuity without sensitive data.

### Testing approach
Extract pure helpers — coordinate validation (1–9 integers), backend-message parsing, and any state reducer/helpers — so they are unit-testable without Chrome APIs. Add Vitest only if it integrates cleanly with the existing Vite setup; otherwise keep helpers pure and rely on typecheck/build. Chrome API surfaces are not unit-tested directly.
- Rationale: maximizes test value while honoring "don't over-test Chrome APIs."

### Manifest review
Keep MV3 with popup, module service worker, and the SudokuPad content script. Keep `storage`, `tabs`, and `activeTab`. Add `ws://localhost:8000/*` / `http://localhost:8000/*` host permissions only if the browser environment actually requires them for the WebSocket; avoid `<all_urls>`.

## Risks / Trade-offs

- [Service worker may be evicted, dropping the WebSocket and in-memory state] → Persist key state to `chrome.storage.local` and restore on startup; full reconnection is deferred to `end-to-end-polish`.
- [No reconnection logic this change] → Accepted and documented; status simply shows `disconnected` and the user can retry.
- [Action issued while socket is still connecting] → Defer the single pending action until `onopen`; keep it simple (no general queue).
- [Highlight arrives with no SudokuPad tab open] → Record error/status, do not crash; documented limitation.
- [Vite/MV3 content-script bundling quirks] → Verify the build output loads as an unpacked extension; document the load-unpacked steps in the README.
- [Adding Vitest could expand tooling scope] → Add only if clean; otherwise ship pure helpers + typecheck/build/lint as the verification floor.

## Open Questions

- Should `SET_ROLE` persist immediately or only after a successful create/join? Defaulting to persisting role on selection for a smoother popup reopen experience.
- Should the popup auto-fetch state via polling or only on `EXTENSION_STATE_UPDATED` broadcasts? Defaulting to fetch-on-mount plus broadcast-driven updates (no polling).
