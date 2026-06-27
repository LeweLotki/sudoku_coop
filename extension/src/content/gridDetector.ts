// SudokuPad grid detection.
//
// Strategy (see openspec change `host-grid-overlay`):
//   1. Precise path — SudokuPad renders one real DOM `.cell[row][col]` element
//      per cell (0-based attributes) inside `.cells`. When a full/near-full 9x9
//      set is present and visible, derive bounds from the union of their rects.
//      This is exact and naturally accounts for the board's CSS `scale()`.
//   2. Geometric fallback — scan candidate elements (`svg#svgrenderer`, canvas,
//      `.board`/`.grid`, square-ish blocks), measure with getBoundingClientRect()
//      and pick the best-scoring square candidate.
//
// All measurements use rendered geometry (getBoundingClientRect), never CSS or
// SVG viewBox units. We never read or mutate SudokuPad's internal JS state.

import {
  DEFAULT_GRID_SIZE,
  type GridBounds,
  type GridCell,
  type Rect,
  cellFromPoint,
  gridBoundsFromRect,
  pickBestCandidate,
  unionRect,
} from "./geometry";

const LOG_PREFIX = "[Sudoku Coop]";

/** True when an element is rendered with a non-zero box and not display:none. */
function isVisible(rect: Rect): boolean {
  return rect.width > 0 && rect.height > 0;
}

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/**
 * Precise detection from SudokuPad's per-cell elements.
 *
 * Returns null if the cell grid is absent or too incomplete to trust.
 */
function detectFromCells(gridSize: number): GridBounds | null {
  const cells = Array.from(
    document.querySelectorAll<HTMLElement>(".cells .cell[row][col]"),
  );
  if (cells.length === 0) return null;

  const expected = gridSize * gridSize;
  const rects: Rect[] = [];
  for (const cell of cells) {
    const r = rectOf(cell);
    if (isVisible(r)) rects.push(r);
  }

  // Require most of the grid to be present & visible before trusting this path.
  if (rects.length < expected * 0.8) return null;

  const union = unionRect(rects);
  if (!union || !isVisible(union)) return null;

  return gridBoundsFromRect(union, "cells");
}

/** Collect plausible board candidates for the geometric fallback. */
function collectCandidates(): Array<{ rect: Rect; ref: Element }> {
  const selectors = [
    "svg#svgrenderer",
    ".board .grid",
    "#board",
    ".board",
    "canvas",
    "[role='grid']",
  ];

  const seen = new Set<Element>();
  const candidates: Array<{ rect: Rect; ref: Element }> = [];

  for (const selector of selectors) {
    for (const el of Array.from(document.querySelectorAll(selector))) {
      if (seen.has(el)) continue;
      seen.add(el);
      const rect = rectOf(el);
      if (isVisible(rect)) candidates.push({ rect, ref: el });
    }
  }

  return candidates;
}

/** Geometric fallback: pick the best square-ish visible candidate. */
function detectFromCandidates(): GridBounds | null {
  const candidates = collectCandidates();
  if (candidates.length === 0) return null;

  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const best = pickBestCandidate(candidates, viewport);
  if (!best) return null;

  const source =
    best.ref.id === "svgrenderer"
      ? "svgrenderer"
      : (best.ref.tagName.toLowerCase() === "canvas"
        ? "canvas"
        : "square-candidate");

  return gridBoundsFromRect(best.rect, source);
}

/**
 * Detect the visible SudokuPad board. Tries the precise per-cell path first,
 * then the geometric fallback. Returns null when nothing acceptable is found.
 */
export function detectGridBounds(
  gridSize: number = DEFAULT_GRID_SIZE,
): GridBounds | null {
  return detectFromCells(gridSize) ?? detectFromCandidates();
}

/**
 * When the precise cell path is available, return the exact rect for a 1-based
 * cell. This gives pixel-perfect placement independent of the union math.
 * Returns null when the specific cell element is not found/visible.
 */
export function getCellRect(row: number, column: number): Rect | null {
  // SudokuPad cell attributes are 0-based.
  const el = document.querySelector<HTMLElement>(
    `.cells .cell[row="${row - 1}"][col="${column - 1}"]`,
  );
  if (!el) return null;
  const rect = rectOf(el);
  return isVisible(rect) ? rect : null;
}

/**
 * Map a viewport click point to the 1-based { row, column } it falls in, by
 * detecting the current grid bounds. Returns null when no grid is detected or
 * the point is outside the grid. Read-only: never touches SudokuPad state.
 */
export function cellFromClientPoint(
  clientX: number,
  clientY: number,
  gridSize: number = DEFAULT_GRID_SIZE,
): GridCell | null {
  const bounds = detectGridBounds(gridSize);
  if (!bounds) return null;
  return cellFromPoint(bounds, clientX, clientY, gridSize);
}

/** Log a concise summary of a successful detection. */
export function logDetected(bounds: GridBounds): void {
  console.log(
    `${LOG_PREFIX} Grid detected (source: ${bounds.source}) ` +
      `${Math.round(bounds.width)}x${Math.round(bounds.height)} ` +
      `at (${Math.round(bounds.left)}, ${Math.round(bounds.top)}).`,
  );
}
