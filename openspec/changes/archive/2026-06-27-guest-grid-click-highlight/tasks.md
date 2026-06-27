## 1. Inspect current flow

- [x] 1.1 Review the existing extension message flow across `content.ts`, `serviceWorker.ts`, `messages.ts`, and `types.ts` to confirm where to hook in
- [x] 1.2 Confirm the existing grid detection and cell-mapping math in `gridDetector.ts` that can be reused for click-to-cell

## 2. Shared message and types

- [x] 2.1 Add a `GRID_CELL_CLICKED` message type to `extension/src/shared/messages.ts`
- [x] 2.2 Add/reuse the payload and row/column/cell types in `extension/src/shared/types.ts` (`{ row, column, source }`)

## 3. Click-to-cell helper

- [x] 3.1 Add a pure click-to-cell function (point + `GridBounds` → `{ row, column }` or null) reusing the 9×9 math in `extension/src/content/gridDetector.ts`
- [x] 3.2 Return null for points outside the grid bounds or coordinates outside 1–9

## 4. Content script click listener

- [x] 4.1 Add a passive `click` listener in `extension/src/content/content.ts` using the existing detected grid bounds
- [x] 4.2 Convert in-grid clicks to `{ row, column }` and send `GRID_CELL_CLICKED` to the background; ignore out-of-grid clicks
- [x] 4.3 Ensure the listener never calls `preventDefault`/`stopPropagation`, does not simulate clicks, and does not modify SudokuPad state
- [x] 4.4 Log `[Sudoku Coop] Guest clicked row <r>, column <c>` (optional brief local highlight only if trivial and non-interactive)

## 5. Background handling

- [x] 5.1 Handle `GRID_CELL_CLICKED` in `extension/src/background/serviceWorker.ts`
- [x] 5.2 Validate role is `guest`, status is `connected`, `sessionId` exists, and coordinate is integer 1–9; ignore safely otherwise
- [x] 5.3 On valid input, send `{ "type": "cell:highlight", "sessionId, row, column }` over the existing WebSocket (no backend protocol change)

## 6. Popup regression

- [x] 6.1 Remove row input, column input, and Send Highlight button from `extension/src/popup/GuestPanel.tsx`
- [x] 6.2 After connected, show instruction text: "Connected as guest. Click a cell on the SudokuPad grid to highlight it for the host." (optionally show session code / disconnect)
- [x] 6.3 Update `extension/src/popup/Popup.tsx` state handling as needed; keep join flow and error display intact

## 7. Docs and verification

- [x] 7.1 Update `extension/README.md` with the new guest grid-click flow and the same-puzzle known limitation
- [x] 7.2 Add lightweight unit tests for click-to-cell (top-left→1,1; bottom-right→9,9; center→5,5; outside→null) and background guest-click validation, only if the test setup is easy; otherwise keep helpers testable
- [x] 7.3 Run build, typecheck, and lint for the extension and fix issues
- [x] 7.4 Manually verify host/guest flow: connected guest click highlights on host; outside-grid, host clicks, and disconnected guest clicks send nothing; SudokuPad stays interactive
