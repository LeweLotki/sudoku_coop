I want to create the next OpenSpec change for this project: `guest-grid-click-highlight`.

Context:

This project is a browser extension + FastAPI backend for coordinating SudokuPad sessions.

Previous changes should already be done and working:

1. `scaffolding`

   * Created monorepo structure.
   * Created FastAPI backend with uv.
   * Created browser extension with Manifest V3, React, TypeScript, Vite, Tailwind.

2. `backend-realtime-sessions`

   * Implemented FastAPI WebSocket backend.
   * Host can create a session.
   * Guest can join a session.
   * Guest can send a `cell:highlight` event.
   * Backend broadcasts the event to the host.

3. `extension-core-connection`

   * Implemented extension popup state.
   * Implemented host/guest mode.
   * Implemented WebSocket client connection.
   * Implemented popup/background/content-script messaging.
   * Host can receive `cell:highlight` events.
   * Background forwards highlight events to the SudokuPad content script.

4. `host-grid-overlay`

   * Implemented SudokuPad grid detection.
   * Implemented overlay injection.
   * Implemented cell highlight rendering.
   * Implemented resize/scroll handling.
   * Host browser can visibly highlight cells on SudokuPad.

Current working behavior:

The guest currently uses a popup form with row and column inputs. They enter row/column manually, then click send. That sends a `cell:highlight` event to the host, and the host highlights the matching cell.

New goal:

Remove the manual guest row/column form.

Instead, both host and guest open the same SudokuPad puzzle page.

The guest should click directly on their own visible SudokuPad grid. When the guest clicks a cell, the extension should calculate the clicked row/column from the guest’s SudokuPad grid and automatically send that coordinate to the host. The host should then highlight the same cell on their own SudokuPad page.

This should finish the MVP feature set, excluding the separate final testing/polish step.

Important product behavior:

Host flow:

1. Host opens SudokuPad puzzle page.
2. Host opens extension popup.
3. Host selects Host mode.
4. Host creates a session.
5. Host shares session code with guest.
6. Host waits on the SudokuPad page.
7. When guest clicks a cell, host sees that cell highlighted.

Guest flow:

1. Guest opens the same SudokuPad puzzle page.
2. Guest opens extension popup.
3. Guest selects Guest mode.
4. Guest enters session code.
5. Guest joins session.
6. Guest closes or ignores popup.
7. Guest clicks directly on their SudokuPad grid.
8. The clicked cell is sent to host.
9. Host sees matching cell highlighted.

Important regression requirement:

Remove the current guest row/column input form from the popup.

The guest popup should no longer contain:

* row input
* column input
* manual Send Highlight button

Instead, after joining a session, the guest popup should explain:

"You are connected. Click a cell on the SudokuPad grid to highlight it for the host."

Or similar.

Scope:

Implement:

* guest-side grid click detection in the SudokuPad content script
* conversion from click coordinates to `{ row, column }`
* message from content script to background service worker when guest clicks a cell
* background validation of guest state before sending
* background sends existing `cell:highlight` event to backend
* popup UI regression: remove manual row/column guest form
* guest popup connected instructions
* safe behavior when guest clicks outside the grid
* safe behavior when guest is not connected
* optional visual feedback on guest side if simple, for example brief local highlight or console log
* README update

Do not implement:

* backend redesign
* new database
* Redis
* authentication
* Sudoku solving
* writing digits into SudokuPad
* modifying SudokuPad internal state
* a modal grid
* manual row/column form
* final full test/polish suite
* complicated multi-puzzle verification

Backend protocol:

Prefer reusing the existing backend event:

{
"type": "cell:highlight",
"sessionId": "AB12",
"row": 3,
"column": 5
}

Do not change the backend protocol unless absolutely necessary.

The backend already knows how to broadcast this event to the host. This change should mostly be extension-side.

If backend changes are avoidable, do not modify backend code.

Content script behavior:

The content script already has grid detection and host overlay logic from `host-grid-overlay`.

Extend content script so it can also act on the guest side:

* listen for click or pointer events on the SudokuPad page
* detect whether the click occurred inside the detected Sudoku grid bounds
* calculate row/column from click position
* send an internal extension message to background service worker
* do not prevent the normal SudokuPad click
* do not block SudokuPad interaction
* do not modify SudokuPad state
* do not simulate clicks
* do not write numbers

Use `pointer-events` or click listener carefully.

Recommended event:

* use `click` or `pointerdown`
* prefer `click` if it is less intrusive
* listener should be passive if possible
* do not call `preventDefault`
* do not call `stopPropagation`

Coordinate mapping:

Use the same 9x9 logic as host overlay:

gridSize = 9

relativeX = event.clientX - gridBounds.left
relativeY = event.clientY - gridBounds.top

column = Math.floor(relativeX / (gridBounds.width / 9)) + 1
row = Math.floor(relativeY / (gridBounds.height / 9)) + 1

Clamp or validate:

* row must be 1–9
* column must be 1–9
* if outside grid, ignore click

Important:

* row/column are 1-based
* row 1 / column 1 means top-left cell
* row 9 / column 9 means bottom-right cell

Content script should not decide by itself whether the user is a guest if that state belongs to background.

Possible architecture options:

Option A, preferred:

* Content script sends `GRID_CELL_CLICKED` to background for any valid Sudoku grid click.
* Background checks whether extension state is:

  * role === "guest"
  * connectionStatus === "connected"
  * sessionId exists
* If valid, background sends `cell:highlight` to backend.
* If invalid, background ignores or responds with a safe reason.

Option B:

* Background pushes current role/session state to content script.
* Content script only sends clicks when it knows it is a connected guest.

Prefer Option A because it keeps session/connection authority in background service worker.

Internal extension message:

Add a shared message type, for example:

{
"type": "GRID_CELL_CLICKED",
"payload": {
"row": 3,
"column": 5,
"source": "sudokupad-content-script"
}
}

Background service worker should handle this message.

Background behavior:

When background receives `GRID_CELL_CLICKED`:

1. Check current extension state.
2. If role is not `guest`, ignore or return a harmless response.
3. If not connected, ignore or return an error.
4. If sessionId missing, ignore or return an error.
5. Validate row/column 1–9.
6. Send backend event:

{
"type": "cell:highlight",
"sessionId": currentSessionId,
"row": row,
"column": column
}

7. Optionally update state with last sent row/column.
8. Optionally notify popup if open.

Do not send clicks to backend when user is Host.

Do not send clicks to backend when user has not joined a session.

Do not send clicks from non-SudokuPad pages.

Guest popup regression:

Update guest panel.

Before:

* session code input
* Join Session button
* row input
* column input
* Send Highlight button

After:

* session code input
* Join Session button
* connection/session status
* after connected:

  * display instruction text:
    "Connected as guest. Click a cell on the SudokuPad grid to highlight it for the host."
  * optional current session code
  * optional disconnect button
  * no row/column form

Host popup can remain mostly unchanged.

Popup should still show errors from backend/background.

Popup should still let guest join session.

Popup should not need to remain open while guest clicks cells.

State considerations:

Ensure content-script click messages still reach background when popup is closed.

The guest clicking flow must not depend on popup being open.

The background service worker owns the WebSocket connection. If Manifest V3 service worker lifetime causes issues, keep the implementation consistent with the existing connection architecture already working in the project.

If current architecture already has a working WebSocket connection while popup/background/content communicate, preserve it and make minimal targeted changes.

Guest-side local visual feedback:

Optional, if simple:

* guest can briefly see a local highlight on their own clicked cell using the same overlay function
* this is not required for MVP
* do not spend much complexity here

If local feedback is implemented:

* it should not interfere with host overlay
* it should use the same visual-only overlay logic
* it should not block SudokuPad interaction

If not implemented:

* console log is enough:
  "[Sudoku Coop] Guest clicked row 3, column 5"

Same puzzle assumption:

For MVP, assume host and guest manually open the same SudokuPad puzzle URL.

Do not implement strict puzzle URL matching unless it is trivial.

Optionally include the current page URL in internal messages or logs for debugging, but do not require backend changes.

Known limitation to document:

* The extension assumes both users are looking at the same SudokuPad puzzle.
* If they open different puzzles, the coordinate will still be sent and highlighted, but it may refer to a different puzzle context.

Files likely involved:

extension/src/content/content.ts

* add grid click listener
* use existing grid detector
* calculate row/column
* send message to background

extension/src/content/gridDetector.ts

* reuse existing detector
* possibly expose helper for point-inside-grid or click-to-cell conversion if not already present

extension/src/content/overlay.ts

* usually no major changes required
* optional local guest feedback only if simple

extension/src/shared/messages.ts

* add `GRID_CELL_CLICKED`
* add payload type

extension/src/shared/types.ts

* add/reuse row/column/cell types
* add helper types if needed

extension/src/background/serviceWorker.ts

* handle `GRID_CELL_CLICKED`
* validate guest state
* send backend `cell:highlight`

extension/src/popup/GuestPanel.tsx

* remove row/column inputs
* remove manual send button
* show connected instructions

extension/src/popup/Popup.tsx

* update state handling if needed

extension/README.md

* update manual usage flow

Testing:

This change excludes final full test/polish pass, but add small targeted tests if the project already has an easy test setup.

Good lightweight tests:

* click point to cell conversion:

  * top-left maps to row 1, column 1
  * bottom-right maps to row 9, column 9
  * center maps to row 5, column 5
  * outside grid returns null
* background ignores grid clicks when role is host
* background ignores grid clicks when guest is not connected
* background accepts valid guest click when connected

If adding these tests would require significant new setup, keep the code structured so these helpers are testable later and document manual verification.

Manual test scenario:

1. Start backend:

cd backend
uv run uvicorn sudoku_coop_api.main:app --reload

2. Build/reload extension.

3. Open the same SudokuPad puzzle in two browser profiles/windows:

https://sudokupad.app/BLLGjtrb4P

4. In host browser:

   * open extension popup
   * select Host
   * create session
   * copy session code

5. In guest browser:

   * open extension popup
   * select Guest
   * enter session code
   * join session
   * verify popup says connected and instructs user to click SudokuPad grid

6. In guest browser:

   * click row 3, column 5 directly on the real SudokuPad grid

7. Expected result:

   * guest page still behaves normally
   * background sends `cell:highlight`
   * host receives event
   * host page highlights row 3, column 5

8. Try:

   * row 1, column 1
   * row 9, column 9
   * clicks outside the grid
   * host clicking cells should not send highlight events
   * guest disconnected clicking cells should not send highlight events

OpenSpec requirements:

Create or update the OpenSpec change for `guest-grid-click-highlight`.

The OpenSpec proposal should include:

1. `proposal.md`

   * Explain that this change replaces manual row/column guest input with direct SudokuPad grid clicking.
   * State that both users are expected to open the same SudokuPad puzzle.
   * State that clicked guest cells are converted to row/column and sent through the existing backend event.
   * State that backend changes should be avoided.
   * State that no modal grid is being implemented.

2. `design.md`

   * Explain content script click listener.
   * Explain click-to-cell coordinate calculation.
   * Explain background state validation before sending.
   * Explain popup UI regression/removal of row/column form.
   * Explain that guest clicks do not block or modify SudokuPad.
   * Explain same-puzzle assumption.
   * Explain limitations and failure modes.

3. `tasks.md`

   * inspect current extension message flow
   * add shared message type for grid cell clicks
   * implement click-to-cell helper
   * add content script click listener
   * send grid click messages to background
   * handle grid click messages in background
   * validate guest connected state before sending
   * remove guest row/column form from popup
   * update guest connected instructions
   * update README manual flow
   * run build/typecheck/lint verification
   * manually verify host/guest flow

Acceptance criteria:

* Guest popup no longer shows row input.
* Guest popup no longer shows column input.
* Guest popup no longer shows manual Send Highlight button.
* Guest can still join a host session.
* Guest popup tells user to click the SudokuPad grid after joining.
* Guest can click a real SudokuPad cell.
* Content script converts the click to row/column.
* Background receives the clicked row/column.
* Background sends existing `cell:highlight` backend event only if current role is guest and session is connected.
* Host receives the event.
* Host overlay highlights the matching cell.
* Clicking outside the grid does nothing.
* Host clicking their grid does not send guest highlight events.
* Guest clicking while disconnected does not send highlight events.
* SudokuPad remains normally interactive.
* No backend protocol change is required.
* No modal grid is implemented.
* No SudokuPad internal state is modified.
* Existing host overlay continues to work.

Quality requirements:

* Keep implementation simple.
* Reuse existing grid detection and coordinate math where possible.
* Avoid duplicate DOM scanning logic.
* Avoid blocking native SudokuPad events.
* Avoid broad permissions.
* Avoid adding unnecessary dependencies.
* Keep TypeScript types clear.
* Keep background as the authority for session/role state.
* Make popup UI simpler, not more complex.
* Preserve existing working WebSocket/session behavior.

Please now create the OpenSpec proposal for `guest-grid-click-highlight` and implement the direct guest SudokuPad grid click behavior according to this specification.
