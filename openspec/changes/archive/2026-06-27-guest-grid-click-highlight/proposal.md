## Why

The guest currently highlights cells by typing a row and column into a popup form and clicking Send Highlight, which is slow and disconnected from the puzzle they are looking at. Both host and guest already load the same SudokuPad page, so the guest should be able to click directly on their own grid and have the matching cell highlight for the host. This completes the MVP coordination loop.

## What Changes

- Add guest-side grid click detection to the SudokuPad content script: a passive `click` listener that converts the click position into a 1-based `{ row, column }` using the existing grid bounds, ignoring clicks outside the grid.
- Add a shared internal message `GRID_CELL_CLICKED` sent from the content script to the background service worker for any valid in-grid click (the content script does not decide role/connection).
- Background handles `GRID_CELL_CLICKED`: it validates that the current role is `guest`, the connection is `connected`, a `sessionId` exists, and the coordinate is 1–9, and only then sends the existing `cell:highlight` backend event. Host clicks and disconnected/unauthenticated clicks are ignored safely.
- **BREAKING** Remove the manual guest highlight form from the popup: row input, column input, and the Send Highlight button. After joining, the Guest panel instead shows connection status and instructs the user to click a cell on the SudokuPad grid.
- The content script does not call `preventDefault`/`stopPropagation`, does not simulate clicks, and does not modify SudokuPad state; SudokuPad stays fully interactive.
- Optional lightweight guest-side feedback (console log, or a brief local highlight reusing existing overlay logic) and a README update describing the new flow.
- No backend protocol change: the existing `cell:highlight` event and broadcast behavior are reused as-is.

## Capabilities

### New Capabilities
- `guest-grid-click`: Guest-side detection of SudokuPad grid clicks, conversion of click coordinates to 1-based `{ row, column }`, the `GRID_CELL_CLICKED` internal message, and background validation that forwards a `cell:highlight` to the backend only for a connected guest.

### Modified Capabilities
- `extension-connection`: Removes the manual Guest Highlight Test-Send requirement and updates the Guest panel so it no longer contains row/column inputs or a Send button, showing connected click-the-grid instructions instead.

## Impact

- Extension content script: `extension/src/content/content.ts`, `extension/src/content/gridDetector.ts` (reuse/expose click-to-cell helper), optionally `extension/src/content/overlay.ts`.
- Extension shared types/messages: `extension/src/shared/messages.ts`, `extension/src/shared/types.ts`.
- Extension background: `extension/src/background/serviceWorker.ts`.
- Extension popup: `extension/src/popup/GuestPanel.tsx`, `extension/src/popup/Popup.tsx`.
- Docs: `extension/README.md`.
- Backend: no changes (existing `cell:highlight` protocol reused).
