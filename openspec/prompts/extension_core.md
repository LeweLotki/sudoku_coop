I want to create the third OpenSpec change for this project: `extension-core-connection`.

Context:

This project is a browser extension + FastAPI backend for coordinating SudokuPad sessions.

The backend should already have been implemented in the previous change `backend-realtime-sessions`.

The backend exposes a FastAPI WebSocket endpoint:

ws://localhost:8000/ws

The backend supports these conceptual events:

Host creates session:

{
"type": "session:create",
"role": "host"
}

Server responds:

{
"type": "session:created",
"sessionId": "AB12"
}

Guest joins session:

{
"type": "session:join",
"role": "guest",
"sessionId": "AB12"
}

Server responds:

{
"type": "session:joined",
"ok": true,
"sessionId": "AB12"
}

Guest sends highlight coordinate:

{
"type": "cell:highlight",
"sessionId": "AB12",
"row": 3,
"column": 5
}

Server broadcasts to host:

{
"type": "cell:highlight",
"sessionId": "AB12",
"row": 3,
"column": 5,
"timestamp": 1782390000000
}

Server may acknowledge guest:

{
"type": "cell:highlight:sent",
"ok": true,
"sessionId": "AB12",
"row": 3,
"column": 5
}

Server error event:

{
"type": "session:error",
"message": "Session not found"
}

The first scaffolding step should already have created a monorepo with roughly this structure:

sudoku-coop/
├── backend/
│   └── ...
├── extension/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── manifest.json
│   ├── README.md
│   └── src/
│       ├── popup/
│       │   ├── Popup.tsx
│       │   ├── HostPanel.tsx
│       │   ├── GuestPanel.tsx
│       │   └── popup.css
│       ├── content/
│       │   ├── content.ts
│       │   ├── gridDetector.ts
│       │   └── overlay.ts
│       ├── background/
│       │   └── serviceWorker.ts
│       └── shared/
│           ├── messages.ts
│           └── types.ts
├── specs/
│   └── ...
└── README.md

Your task now is to propose and implement the extension core connection layer.

Important scope:

This change is extension-focused.

Implement:

* extension popup state
* host/guest mode selection
* WebSocket client connection to the FastAPI backend
* host create-session flow from the popup
* guest join-session flow from the popup
* basic guest test-send flow for row/column, enough to test backend communication
* message passing between popup, background service worker, and content script
* basic connection status display
* basic error display
* extension storage for current role/session state if useful
* TypeScript shared event/message types

Do not implement:

* real SudokuPad grid detection
* real overlay rendering
* final coordinate modal polish
* final guest UI design
* manual grid calibration
* Sudoku solving
* writing digits into SudokuPad
* modifying SudokuPad internal state
* backend logic
* Redis
* database
* authentication

The goal of this change is to make the extension capable of connecting to the backend and moving events through the extension architecture.

The host should be able to:

1. Open the extension popup.
2. Select Host mode.
3. Click Create Session.
4. The extension opens or reuses a WebSocket connection to the backend.
5. The extension sends `session:create`.
6. The extension receives `session:created`.
7. The popup displays the session code.
8. The background/content layer is prepared to receive future `cell:highlight` events.

The guest should be able to:

1. Open the extension popup.
2. Select Guest mode.
3. Enter a session code.
4. Click Join Session.
5. The extension opens or reuses a WebSocket connection to the backend.
6. The extension sends `session:join`.
7. The extension receives `session:joined`.
8. The popup displays connected/joined status.
9. The guest can send a basic row/column test event through the popup.
10. The backend sends the event to the host connection.

In this change, when the host receives a `cell:highlight` event, the content script does not need to render the final highlight yet. It can:

* log the event to console
* dispatch a placeholder message internally
* optionally call a placeholder function like `handleIncomingHighlight(row, column)`
* keep TODO comments for the later `host-grid-overlay` change

Architecture requirement:

Use the background service worker as the main extension coordination layer.

Preferred data flow:

Popup UI
→ `chrome.runtime.sendMessage`
→ Background service worker
→ WebSocket connection to FastAPI backend

Backend WebSocket event
→ Background service worker
→ active popup state update if popup is open
→ content script message if the current tab is a SudokuPad page

The content script should receive host highlight events through extension messaging.

Content script should not directly implement real overlay behavior yet.

The popup should not directly manipulate SudokuPad DOM.

The popup should not own critical app logic beyond UI state and sending commands to the background service worker.

If the existing scaffold uses `browser.*` APIs or `webextension-polyfill`, follow that convention. Otherwise use Chrome-compatible `chrome.*` APIs.

Manifest requirements:

Review `extension/manifest.json`.

Make sure it supports:

* Manifest V3
* popup
* background service worker
* content script for `https://sudokupad.app/*`
* minimal permissions

Expected permissions:

* storage
* tabs
* activeTab if needed

Expected host permissions:

* https://sudokupad.app/*
* ws://localhost:8000/* if needed by the browser extension environment
* http://localhost:8000/* if needed for development

Do not request broad permissions like `<all_urls>` unless absolutely necessary. Avoid unnecessary permissions.

Configuration:

The backend WebSocket URL should not be hardcoded everywhere.

Create a single config location, for example:

extension/src/shared/config.ts

It can export:

export const DEFAULT_BACKEND_WS_URL = "ws://localhost:8000/ws";

If a better project convention already exists, use it.

State model:

Define a simple extension state model.

Example:

type ExtensionRole = "host" | "guest" | null;

type ConnectionStatus =
| "idle"
| "connecting"
| "connected"
| "disconnected"
| "error";

type ExtensionState = {
role: ExtensionRole;
connectionStatus: ConnectionStatus;
sessionId: string | null;
error: string | null;
backendUrl: string;
};

The exact implementation may differ, but keep the state simple.

Shared message types:

Create shared TypeScript types for internal extension messages.

Examples:

Popup to background:

* `HOST_CREATE_SESSION`
* `GUEST_JOIN_SESSION`
* `GUEST_SEND_HIGHLIGHT`
* `GET_EXTENSION_STATE`
* `DISCONNECT`
* `SET_ROLE`

Background to popup:

* `EXTENSION_STATE_UPDATED`
* direct response to request messages

Background to content:

* `HOST_RECEIVED_HIGHLIGHT`

Content to background:

* optional `CONTENT_SCRIPT_READY`
* optional `SUDOKUPAD_TAB_DETECTED`

Backend event types:

* `session:create`
* `session:created`
* `session:join`
* `session:joined`
* `cell:highlight`
* `cell:highlight:sent`
* `session:error`
* `session:closed`

Implement these as TypeScript types or constants in shared files.

Popup UI requirements:

Implement a functional but simple popup.

Use React + TypeScript.

Use Tailwind CSS if already configured.

Popup should include:

* app title, for example "Sudoku Coop"
* backend connection status
* role selector:

  * Host
  * Guest
* Host panel:

  * Create Session button
  * Session code display
  * Disconnect button if connected
  * basic error message area
* Guest panel:

  * Session code input
  * Join Session button
  * row input
  * column input
  * Send Highlight button
  * validation for basic row/column input
  * basic error message area

For this change, the guest row/column UI can be simple. The final polished guest coordinate modal will be handled in a later change.

Validation in popup:

* session code required for joining
* row must be integer 1–9
* column must be integer 1–9
* disable send button when not joined/connected
* show error message for invalid input

Background service worker requirements:

The background service worker should:

* manage a WebSocket instance
* connect to backend when host creates session or guest joins session
* send backend events
* parse backend JSON messages
* update internal extension state
* persist useful state to `chrome.storage.local` if appropriate
* respond to popup messages
* forward `cell:highlight` messages to SudokuPad content scripts
* handle WebSocket open/close/error
* handle malformed backend messages gracefully
* avoid crashing on unexpected events

Connection behavior:

* if no WebSocket exists, create one
* if WebSocket is already open, reuse it
* if WebSocket is connecting, wait or queue a simple action if clean
* if WebSocket closes, set status to disconnected
* if backend returns `session:error`, update state error
* if host session is created, set role=host and sessionId
* if guest session is joined, set role=guest and sessionId

Do not over-engineer reconnection yet. Basic reconnect can be left for `end-to-end-polish`.

Forwarding highlight events:

When background receives backend event:

{
"type": "cell:highlight",
"sessionId": "...",
"row": 3,
"column": 5,
"timestamp": 1782390000000
}

It should send an internal message to the active SudokuPad tab/content script:

{
"type": "HOST_RECEIVED_HIGHLIGHT",
"payload": {
"row": 3,
"column": 5,
"sessionId": "...",
"timestamp": 1782390000000
}
}

How to find target tab:

* Prefer the currently active tab if it matches `https://sudokupad.app/*`.
* If not active, query tabs matching SudokuPad URL.
* Send to the first matching tab for MVP.
* If no SudokuPad tab exists, update error/status in state but do not crash.

Content script requirements:

`content.ts` should:

* register a runtime message listener
* handle `HOST_RECEIVED_HIGHLIGHT`
* log the received row/column clearly
* call a placeholder function like `handleHighlightMessage(row, column)`
* contain TODO indicating that real overlay drawing will be implemented in `host-grid-overlay`

Do not implement real grid detection here.

`gridDetector.ts` and `overlay.ts` can remain placeholder modules or expose placeholder functions if useful, but do not implement final behavior yet.

Storage:

Use `chrome.storage.local` for lightweight state if useful:

* role
* sessionId
* backendUrl

Do not store sensitive data.
There is no auth token.

Testing:

Add tests where practical for extension logic.

If the project already has Vitest, use it.
If not, consider adding Vitest only if it fits cleanly.

Useful tests:

* row/column validation
* event type helpers
* state reducer/helper functions if implemented
* backend event parsing helpers if implemented

Do not spend too much effort testing Chrome APIs directly unless the scaffold already supports it.

At minimum:

* ensure TypeScript builds
* ensure Vite build passes
* ensure linting passes if configured

Development documentation:

Update `extension/README.md`.

Document:

* install dependencies
* run development build
* build extension
* load unpacked extension in Chrome/Chromium
* expected backend URL
* expected backend command from backend README
* how to test host/guest locally
* known limitation: content script only logs highlight event in this change
* known limitation: real SudokuPad overlay is implemented in later change

Manual test scenario:

1. Start backend:

cd backend
uv run uvicorn sudoku_coop_api.main:app --reload

2. Build or run extension dev flow according to project setup.

3. Load extension into Chrome/Chromium as unpacked extension.

4. Open SudokuPad page:

https://sudokupad.app/BLLGjtrb4P

5. Open extension popup.

6. Select Host.

7. Click Create Session.

8. Verify session code appears.

9. In another browser profile/window or another extension instance if available, open extension popup.

10. Select Guest.

11. Enter session code.

12. Click Join Session.

13. Enter row 3 and column 5.

14. Click Send Highlight.

15. Verify:

* guest popup shows sent/success or no error
* host receives backend event
* background forwards event to content script
* SudokuPad page console logs the received coordinate

This change is successful even if no visible cell highlight appears yet. Visible overlay belongs to the next change: `host-grid-overlay`.

OpenSpec requirements:

Create or update the OpenSpec change for `extension-core-connection`.

The OpenSpec proposal should include:

1. `proposal.md`

   * Explain that this change implements the browser extension core connection architecture.
   * State that it connects popup/background/content script with the backend WebSocket.
   * State that it does not implement SudokuPad grid detection or visible overlay yet.
   * State that the final guest modal polish is later.

2. `design.md`

   * Explain extension architecture:

     * React popup
     * background service worker
     * content script
     * shared TypeScript message types
     * WebSocket event flow
   * Explain state model.
   * Explain message passing.
   * Explain how host and guest flows work.
   * Explain how highlight events are forwarded to the content script.
   * Explain why the popup does not directly manipulate SudokuPad DOM.
   * Explain why the content script does not own session creation.
   * Explain limitations of this change.

3. `tasks.md`

   * inspect existing extension scaffold
   * add/update shared config and types
   * implement popup role state
   * implement HostPanel
   * implement GuestPanel
   * implement background WebSocket client
   * implement popup-background messaging
   * implement background-content messaging
   * implement content script placeholder handler
   * add validation helpers
   * add tests if practical
   * update extension README
   * run build/typecheck/lint verification

Acceptance criteria:

* Extension popup builds successfully.
* Popup allows selecting Host or Guest mode.
* Host can click Create Session.
* Background connects to `ws://localhost:8000/ws`.
* Background sends `session:create`.
* Popup displays returned session code.
* Guest can enter session code and join.
* Background sends `session:join`.
* Popup displays joined/connected status.
* Guest can enter row/column and send highlight event.
* Popup validates row/column 1–9.
* Background sends `cell:highlight`.
* Background receives backend messages and updates state.
* Host-side background receives `cell:highlight`.
* Background forwards highlight event to SudokuPad content script.
* Content script logs received highlight event.
* No real grid detection is implemented.
* No real overlay rendering is implemented.
* No backend code is modified except possibly docs if absolutely needed.
* No Redis is added.
* No database is added.
* Extension permissions remain minimal.
* Extension README includes local manual test instructions.

Quality requirements:

* Keep implementation simple.
* Prefer clear TypeScript types.
* Avoid unnecessary state management libraries.
* Do not add Redux/Zustand unless already present and justified.
* Avoid broad browser permissions.
* Avoid duplicated backend event string literals across many files.
* Keep UI functional and simple; visual polish can happen later.
* Do not implement features outside this change.

Please now create the OpenSpec proposal for `extension-core-connection` and implement the extension core connection layer according to this specification.
