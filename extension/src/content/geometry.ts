// Pure geometry helpers for grid/cell math and candidate scoring.
//
// Nothing here touches the DOM directly, so every function is trivially
// unit-testable. Callers pass in plain rectangles (typically obtained from
// `getBoundingClientRect()`) and receive plain results back.

/** Rendered bounds of the detected Sudoku board, in viewport coordinates. */
export interface GridBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  /** Where the bounds came from, e.g. "cells" | "svgrenderer" | "square-candidate". */
  source: string;
}

/** A single cell rectangle in viewport coordinates. */
export interface CellRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Minimal rectangle shape (compatible with DOMRect). */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Viewport size used when scoring candidates. */
export interface Viewport {
  width: number;
  height: number;
}

export const DEFAULT_GRID_SIZE = 9;

/** Minimum side length (px) for an element to be considered a plausible board. */
export const MIN_BOARD_SIDE = 250;

/**
 * Map a 1-based { row, column } to a cell rectangle within the grid bounds.
 *
 * row=1, column=1 is the top-left cell; row=gridSize, column=gridSize is the
 * bottom-right cell. Bounds are assumed to already reflect rendered (scaled)
 * geometry, so no transform math is needed here.
 */
export function cellRectFromBounds(
  bounds: GridBounds,
  row: number,
  column: number,
  gridSize: number = DEFAULT_GRID_SIZE,
): CellRect {
  const cellWidth = bounds.width / gridSize;
  const cellHeight = bounds.height / gridSize;

  return {
    left: bounds.left + (column - 1) * cellWidth,
    top: bounds.top + (row - 1) * cellHeight,
    width: cellWidth,
    height: cellHeight,
  };
}

/** Build a `GridBounds` from a rectangle plus a `source` label. */
export function gridBoundsFromRect(rect: Rect, source: string): GridBounds {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    source,
  };
}

/**
 * Union of several rectangles into one bounding rectangle. Returns null when
 * given no rectangles. Useful for deriving board bounds from per-cell rects.
 */
export function unionRect(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const r of rects) {
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.left + r.width);
    bottom = Math.max(bottom, r.top + r.height);
  }

  return { left, top, width: right - left, height: bottom - top };
}

/**
 * Score a candidate rectangle as a likely Sudoku board.
 *
 * Returns a number where higher is better, or a non-positive value when the
 * candidate should be rejected outright (too small, or essentially the whole
 * viewport / page container).
 */
export function scoreCandidate(rect: Rect, viewport: Viewport): number {
  const { width, height } = rect;

  // Reject anything too small to be the main board.
  if (width < MIN_BOARD_SIDE || height < MIN_BOARD_SIDE) return -1;

  // Reject full-page / body-sized elements: nearly the whole viewport in either
  // dimension is almost certainly a layout container, not the board.
  const coversWidth = width >= viewport.width * 0.97;
  const coversHeight = height >= viewport.height * 0.97;
  if (coversWidth && coversHeight) return -1;

  // Aspect ratio: 1.0 is a perfect square. Penalize deviation sharply.
  const aspect = width / height;
  const aspectError = Math.abs(1 - aspect);
  if (aspectError > 0.35) return -1;
  const aspectScore = 1 - aspectError; // in (0.65, 1]

  // Area relative to the viewport: bigger (square) boards are preferred, but
  // cap the contribution so a near-fullscreen element can't dominate.
  const viewportArea = Math.max(1, viewport.width * viewport.height);
  const areaRatio = Math.min(1, (width * height) / viewportArea);

  // Weight aspect ratio heavily (squareness is the strongest board signal).
  return aspectScore * 100 + areaRatio * 10;
}

/**
 * Pick the best-scoring candidate from a list. Each entry pairs a rectangle
 * with an opaque `ref` returned alongside its score. Returns null when no
 * candidate is acceptable.
 */
export function pickBestCandidate<T>(
  candidates: Array<{ rect: Rect; ref: T }>,
  viewport: Viewport,
): { rect: Rect; ref: T; score: number } | null {
  let best: { rect: Rect; ref: T; score: number } | null = null;

  for (const candidate of candidates) {
    const score = scoreCandidate(candidate.rect, viewport);
    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { rect: candidate.rect, ref: candidate.ref, score };
    }
  }

  return best;
}
