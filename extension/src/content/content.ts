// Content script entry — runs only on https://sudokupad.app/* (see manifest.json).
//
// In this change it only proves the messaging path end-to-end: it receives
// forwarded host highlight events and logs them. Real grid detection and overlay
// rendering are implemented in the later `host-grid-overlay` change.

import { EXT_MESSAGE, type HostReceivedHighlightMessage } from "../shared/messages";

/**
 * Placeholder highlight handler.
 *
 * TODO(host-grid-overlay): replace this with real grid-bounds detection
 * (gridDetector.ts) and overlay rendering (overlay.ts).
 */
function handleHighlightMessage(row: number, column: number): void {
  console.log(
    `[Sudoku Coop] Received highlight for row ${row}, column ${column} ` +
      `(overlay rendering arrives in host-grid-overlay).`,
  );
}

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (
    !message ||
    typeof message !== "object" ||
    (message as { type?: unknown }).type !== EXT_MESSAGE.HOST_RECEIVED_HIGHLIGHT
  ) {
    return;
  }

  const { payload } = message as HostReceivedHighlightMessage;
  handleHighlightMessage(payload.row, payload.column);
});

// Let the background know a SudokuPad tab is ready to receive highlights.
chrome.runtime
  .sendMessage({ type: EXT_MESSAGE.CONTENT_SCRIPT_READY })
  .catch(() => {
    // Background may not be listening for this optional signal; ignore.
  });
