// Highlight overlay rendering.
//
// We draw our own DOM overlay above the SudokuPad board. It is purely visual:
//   - position: fixed (pairs naturally with getBoundingClientRect viewport coords)
//   - pointer-events: none  → SudokuPad stays fully clickable
//   - very high z-index     → sits above the board
//   - a single reused root  → never duplicates, no leaks
// Styles are applied directly in JS so they don't depend on the page's CSS or
// the extension's Tailwind build.

import {
  type CellRect,
  type GridBounds,
  cellRectFromBounds,
} from "./geometry";

const ROOT_ID = "sudoku-coop-overlay-root";
const HIGHLIGHT_ID = "sudoku-coop-highlight";
const Z_INDEX = "2147483647";
const FADE_MS = 2500;

let overlayRoot: HTMLElement | null = null;
let highlightEl: HTMLElement | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;

/** Create (or reuse) the single overlay root under <body>. Idempotent. */
export function createOverlayRoot(): HTMLElement {
  if (overlayRoot && overlayRoot.isConnected) return overlayRoot;

  const existing = document.getElementById(ROOT_ID);
  if (existing instanceof HTMLElement) {
    overlayRoot = existing;
    return overlayRoot;
  }

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.style.position = "fixed";
  root.style.left = "0";
  root.style.top = "0";
  root.style.width = "0";
  root.style.height = "0";
  root.style.margin = "0";
  root.style.padding = "0";
  root.style.border = "0";
  root.style.pointerEvents = "none";
  root.style.zIndex = Z_INDEX;

  document.body.appendChild(root);
  overlayRoot = root;
  return root;
}

/** Remove the overlay root and reset internal state. */
export function removeOverlayRoot(): void {
  clearFadeTimer();
  overlayRoot?.remove();
  overlayRoot = null;
  highlightEl = null;
}

function clearFadeTimer(): void {
  if (fadeTimer !== null) {
    clearTimeout(fadeTimer);
    fadeTimer = null;
  }
}

function ensureHighlightEl(): HTMLElement {
  if (highlightEl && highlightEl.isConnected) return highlightEl;

  const root = createOverlayRoot();
  const el = document.createElement("div");
  el.id = HIGHLIGHT_ID;
  el.style.position = "fixed";
  el.style.boxSizing = "border-box";
  el.style.pointerEvents = "none";
  el.style.zIndex = Z_INDEX;
  el.style.border = "3px solid rgba(34, 211, 238, 0.95)";
  el.style.borderRadius = "4px";
  el.style.background = "rgba(34, 211, 238, 0.22)";
  el.style.boxShadow =
    "0 0 0 2px rgba(8, 145, 178, 0.55), 0 0 16px 4px rgba(34, 211, 238, 0.65)";
  el.style.opacity = "0";
  el.style.transition = "opacity 180ms ease-out";

  root.appendChild(el);
  highlightEl = el;
  return el;
}

/** Position the highlight element over an explicit cell rectangle. */
export function positionHighlight(rect: CellRect): void {
  const el = ensureHighlightEl();
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.top}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;

  // Force a reflow-free fade-in on the next frame so re-positions stay visible.
  clearFadeTimer();
  el.style.opacity = "1";
  fadeTimer = setTimeout(clearHighlight, FADE_MS);
}

/**
 * Highlight a 1-based cell. Prefers `exactRect` (from SudokuPad's real cell
 * element) when provided, otherwise computes the rect from grid bounds.
 */
export function highlightCell(
  bounds: GridBounds,
  row: number,
  column: number,
  gridSize?: number,
  exactRect?: CellRect | null,
): void {
  const rect = exactRect ?? cellRectFromBounds(bounds, row, column, gridSize);
  positionHighlight(rect);
}

/** Fade the highlight out (kept in the DOM for reuse). */
export function clearHighlight(): void {
  clearFadeTimer();
  if (highlightEl) highlightEl.style.opacity = "0";
}

/** True while a highlight is currently visible. */
export function isHighlightVisible(): boolean {
  return highlightEl !== null && highlightEl.style.opacity !== "0";
}
