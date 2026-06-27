## Context

The extension already has a working coordination loop: a host creates a session, a guest joins, and the guest sends a `cell:highlight` event that the backend broadcasts to the host, whose content script renders a visible overlay (`host-grid-overlay`). The guest currently produces that event from a manual row/column form in the popup.

The content script already detects the SudokuPad 9×9 grid bounds via `getBoundingClientRect()` and maps a 1-based `{ row, column }` to a screen rectangle for the host overlay. This change reuses that same geometry in reverse — converting a click point back to a cell — so the guest can click their own grid instead of typing coordinates. The background service worker already owns the single WebSocket connection and the role/session state.

Constraints: do not change the backend protocol; do not block or modify SudokuPad; keep permissions minimal; reuse existing grid detection and coordinate math; keep background as the authority for role/session state.

## Goals / Non-Goals

**Goals:**
- Let a connected guest click their SudokuPad grid and have the matching cell highlight on the host.
- Reuse existing grid detection and 9×9 coordinate math (no duplicate DOM scanning).
- Keep session/role authority in the background; the content script reports raw clicks only.
- Remove the manual guest row/column form and replace it with connected instructions.
- Preserve the existing WebSocket/session/host-overlay behavior unchanged.

**Non-Goals:**
- Backend redesign, new database, Redis, or auth.
- Strict puzzle URL matching, multi-puzzle verification, or a modal grid.
- Writing digits or simulating clicks into SudokuPad.
- Final full test/polish pass.

## Decisions

### Decision: Content script reports clicks; background decides (Option A)
The content script attaches a passive `click` listener and, for clicks inside the grid bounds, sends `GRID_CELL_CLICKED` with `{ row, column, source }`. The background checks role/connection/sessionId and validity, then sends `cell:highlight`.

- Rationale: keeps the single source of truth for session/role state in the background service worker, matching the existing architecture. The content script stays stateless about connection and works even when the popup is closed.
- Alternative (Option B): push role/session state into the content script so it only sends when it knows it is a connected guest. Rejected — it duplicates/synchronizes authoritative state into the content script and adds race conditions for little benefit.

### Decision: Reuse grid detection, add a pure click-to-cell helper
Add a pure function (in/near `gridDetector.ts`) that takes a click point and `GridBounds` and returns `{ row, column }` or null, using the same `gridSize = 9` math as the host overlay:

```
relativeX = clientX - bounds.left
relativeY = clientY - bounds.top
column = floor(relativeX / (bounds.width / 9)) + 1
row    = floor(relativeY / (bounds.height / 9)) + 1
```

It returns null when the point is outside bounds or the computed row/column falls outside 1–9. This mirrors the existing cell-mapping function and is easy to unit test.

- Rationale: avoids duplicate DOM scanning; one detector, math reused in both directions.
- Alternative: re-derive bounds on every click with a fresh full scan. Rejected as wasteful; reuse cached/detected bounds, re-detecting only as needed (consistent with existing throttled detection).

### Decision: Use `click`, passive, no preventDefault/stopPropagation
Listen for `click` (less intrusive than `pointerdown`) on `document`, passive where supported, and never call `preventDefault`/`stopPropagation`. SudokuPad receives the event normally.

- Rationale: the requirement is to observe, not intercept. SudokuPad must stay fully interactive and its internal state untouched.

### Decision: Shared message + types
Add `GRID_CELL_CLICKED` to `shared/messages.ts` and reuse/extend row/column/cell types in `shared/types.ts`. The background extends its existing internal message handler with a `GRID_CELL_CLICKED` case.

### Decision: Popup regression
`GuestPanel.tsx` drops the row input, column input, and Send Highlight button. After connected, it shows the instruction text and optionally the session code / disconnect. `Popup.tsx` updates only as needed for the simplified panel. Errors and join flow remain.

### Decision: Optional guest feedback = console log (default)
At minimum, log `[Sudoku Coop] Guest clicked row <r>, column <c>`. A brief local highlight reusing the existing non-interactive overlay is optional and only if trivial; it must not interfere with the host overlay.

## Risks / Trade-offs

- [Guest and host open different puzzles] → Coordinates are still sent and highlighted but may not correspond to the same puzzle context. Mitigation: document as a known limitation; optionally include page URL in logs. No backend change.
- [Click listener intercepts/breaks SudokuPad input] → Mitigation: passive listener, never call preventDefault/stopPropagation, never simulate clicks; verify SudokuPad input still works manually.
- [Service worker lifetime in MV3 drops the WebSocket] → Mitigation: keep the existing connection architecture; make minimal targeted changes only; the click flow relies on the same connection the project already uses.
- [Off-by-one / edge clicks on grid border] → Mitigation: clamp/validate to 1–9 and return null outside bounds; cover with top-left, bottom-right, center, and outside unit tests.
- [Stale grid bounds after resize/scroll] → Mitigation: reuse existing detection/repositioning logic so bounds stay current.

## Migration Plan

1. Add shared `GRID_CELL_CLICKED` message/types.
2. Add the pure click-to-cell helper and unit tests (if the test setup is easy).
3. Add the passive content-script click listener that sends `GRID_CELL_CLICKED`.
4. Handle `GRID_CELL_CLICKED` in the background with guest/connected/sessionId/coordinate validation, forwarding `cell:highlight`.
5. Remove the guest row/column form and add connected instructions in the popup.
6. Update README and run build/typecheck/lint.

Rollback: revert the extension changes; backend is untouched, so the previous manual-form flow returns without protocol concerns.

## Open Questions

- None blocking. Whether to ship the optional local guest highlight can be decided during implementation based on effort (default: console log only).
