// Content script entry — runs only on https://sudokupad.app/* (see manifest.json).
//
// Receives host highlight events forwarded by the background service worker and
// renders a visual overlay above the SudokuPad grid. It never reads or mutates
// SudokuPad's internal JavaScript state — it only draws its own DOM overlay.

import { EXT_MESSAGE, type HostReceivedHighlightMessage } from "../shared/messages";
import { isValidIndex } from "../shared/validation";
import { debounce } from "./debounce";
import { detectGridBounds, getCellRect, logDetected } from "./gridDetector";
import {
  createOverlayRoot,
  highlightCell,
  isHighlightVisible,
} from "./overlay";

const LOG_PREFIX = "[Sudoku Coop]";
const REPOSITION_DEBOUNCE_MS = 100;

interface LastHighlight {
  row: number;
  column: number;
  sessionId?: string;
  timestamp?: number;
}

let lastHighlight: LastHighlight | null = null;

/**
 * Detect the grid and render a highlight for a 1-based row/column.
 * Returns true when a highlight was rendered.
 */
function renderHighlight(row: number, column: number): boolean {
  const bounds = detectGridBounds();
  if (!bounds) {
    console.warn(
      `${LOG_PREFIX} Could not detect the SudokuPad grid; skipping highlight ` +
        `for row ${row}, column ${column}.`,
    );
    return false;
  }

  logDetected(bounds);

  // Prefer SudokuPad's real cell element for pixel-perfect placement; fall back
  // to computed coordinates from the detected bounds.
  const exactRect = getCellRect(row, column);
  highlightCell(bounds, row, column, undefined, exactRect);
  console.log(`${LOG_PREFIX} Highlight rendered for row ${row}, column ${column}.`);
  return true;
}

/** Handle a validated/raw highlight request from a forwarded event. */
function handleHighlight(highlight: LastHighlight): void {
  const { row, column } = highlight;

  if (!isValidIndex(row) || !isValidIndex(column)) {
    console.warn(
      `${LOG_PREFIX} Ignoring invalid highlight (row ${row}, column ${column}); ` +
        `expected integers 1-9.`,
    );
    return;
  }

  if (renderHighlight(row, column)) {
    lastHighlight = highlight;
  }
}

// Reposition the active highlight when the layout shifts. Debounced so rapid
// scroll/resize bursts don't trigger repeated DOM scans.
const reposition = debounce(() => {
  if (!lastHighlight || !isHighlightVisible()) return;
  renderHighlight(lastHighlight.row, lastHighlight.column);
}, REPOSITION_DEBOUNCE_MS);

function registerLayoutListeners(): void {
  window.addEventListener("resize", reposition, { passive: true });
  window.addEventListener("scroll", reposition, { passive: true, capture: true });
}

function init(): void {
  createOverlayRoot();
  registerLayoutListeners();
  exposeDebugHelper();
  console.log(`${LOG_PREFIX} Content script initialized on SudokuPad.`);
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
  console.log(
    `${LOG_PREFIX} Highlight received: row ${payload.row}, column ${payload.column}.`,
  );
  handleHighlight({
    row: payload.row,
    column: payload.column,
    sessionId: payload.sessionId,
    timestamp: payload.timestamp,
  });
});

/**
 * Development helper for manual testing without a guest. Lets you trigger a
 * highlight from the page console, e.g. `__sudokuCoopDebugHighlight(3, 5)`.
 * Harmless and read-only with respect to SudokuPad; documented in the README.
 */
function exposeDebugHelper(): void {
  (window as unknown as Record<string, unknown>).__sudokuCoopDebugHighlight = (
    row: number,
    column: number,
  ): void => {
    handleHighlight({ row, column });
  };
}

init();

// Let the background know a SudokuPad tab is ready to receive highlights.
chrome.runtime
  .sendMessage({ type: EXT_MESSAGE.CONTENT_SCRIPT_READY })
  .catch(() => {
    // Background may not be listening for this optional signal; ignore.
  });
