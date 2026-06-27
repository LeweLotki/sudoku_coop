import { describe, expect, it } from "vitest";
import {
  type GridBounds,
  type Rect,
  cellFromPoint,
  cellRectFromBounds,
  pickBestCandidate,
  scoreCandidate,
  unionRect,
} from "./geometry";

function bounds900(): GridBounds {
  return {
    left: 0,
    top: 0,
    width: 900,
    height: 900,
    right: 900,
    bottom: 900,
    source: "test",
  };
}

describe("cellRectFromBounds", () => {
  it("maps row 1, column 1 to the top-left cell", () => {
    expect(cellRectFromBounds(bounds900(), 1, 1)).toEqual({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
    });
  });

  it("maps row 9, column 9 to the bottom-right cell", () => {
    expect(cellRectFromBounds(bounds900(), 9, 9)).toEqual({
      left: 800,
      top: 800,
      width: 100,
      height: 100,
    });
  });

  it("maps row 5, column 5 to the center cell", () => {
    expect(cellRectFromBounds(bounds900(), 5, 5)).toEqual({
      left: 400,
      top: 400,
      width: 100,
      height: 100,
    });
  });

  it("respects a non-default grid origin offset", () => {
    const offset: GridBounds = {
      left: 50,
      top: 30,
      width: 900,
      height: 900,
      right: 950,
      bottom: 930,
      source: "test",
    };
    expect(cellRectFromBounds(offset, 1, 1)).toEqual({
      left: 50,
      top: 30,
      width: 100,
      height: 100,
    });
  });
});

describe("cellFromPoint", () => {
  it("maps a click in the top-left cell to row 1, column 1", () => {
    expect(cellFromPoint(bounds900(), 10, 10)).toEqual({ row: 1, column: 1 });
  });

  it("maps a click in the bottom-right cell to row 9, column 9", () => {
    expect(cellFromPoint(bounds900(), 890, 890)).toEqual({ row: 9, column: 9 });
  });

  it("maps a click at the grid center to row 5, column 5", () => {
    expect(cellFromPoint(bounds900(), 450, 450)).toEqual({ row: 5, column: 5 });
  });

  it("is the inverse of cellRectFromBounds for cell centers", () => {
    const bounds = bounds900();
    const rect = cellRectFromBounds(bounds, 7, 2);
    const point = cellFromPoint(
      bounds,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    expect(point).toEqual({ row: 7, column: 2 });
  });

  it("returns null for points outside the grid bounds", () => {
    const bounds = bounds900();
    expect(cellFromPoint(bounds, -1, 10)).toBeNull();
    expect(cellFromPoint(bounds, 10, -1)).toBeNull();
    expect(cellFromPoint(bounds, 900, 10)).toBeNull();
    expect(cellFromPoint(bounds, 10, 900)).toBeNull();
    expect(cellFromPoint(bounds, 5000, 5000)).toBeNull();
  });

  it("respects a grid origin offset", () => {
    const offset: GridBounds = {
      left: 50,
      top: 30,
      width: 900,
      height: 900,
      right: 950,
      bottom: 930,
      source: "test",
    };
    expect(cellFromPoint(offset, 60, 40)).toEqual({ row: 1, column: 1 });
    expect(cellFromPoint(offset, 40, 40)).toBeNull(); // left of the grid
  });
});

describe("scoreCandidate", () => {
  const viewport = { width: 1440, height: 900 };

  it("scores a large square higher than a rectangle of similar area", () => {
    const square: Rect = { left: 100, top: 100, width: 600, height: 600 };
    const rectangle: Rect = { left: 100, top: 100, width: 800, height: 450 };
    expect(scoreCandidate(square, viewport)).toBeGreaterThan(
      scoreCandidate(rectangle, viewport),
    );
  });

  it("rejects tiny candidates", () => {
    const tiny: Rect = { left: 0, top: 0, width: 40, height: 40 };
    expect(scoreCandidate(tiny, viewport)).toBeLessThanOrEqual(0);
  });

  it("rejects a full-viewport (body-sized) element", () => {
    const body: Rect = { left: 0, top: 0, width: 1440, height: 900 };
    expect(scoreCandidate(body, viewport)).toBeLessThanOrEqual(0);
  });

  it("rejects strongly non-square elements", () => {
    const wide: Rect = { left: 0, top: 0, width: 900, height: 300 };
    expect(scoreCandidate(wide, viewport)).toBeLessThanOrEqual(0);
  });
});

describe("pickBestCandidate", () => {
  const viewport = { width: 1440, height: 900 };

  it("returns the best-scoring square candidate", () => {
    const best = pickBestCandidate(
      [
        { rect: { left: 0, top: 0, width: 300, height: 300 }, ref: "small" },
        { rect: { left: 0, top: 0, width: 650, height: 650 }, ref: "big" },
        { rect: { left: 0, top: 0, width: 40, height: 40 }, ref: "tiny" },
      ],
      viewport,
    );
    expect(best?.ref).toBe("big");
  });

  it("returns null when nothing is acceptable", () => {
    const best = pickBestCandidate(
      [{ rect: { left: 0, top: 0, width: 10, height: 10 }, ref: "tiny" }],
      viewport,
    );
    expect(best).toBeNull();
  });
});

describe("unionRect", () => {
  it("returns null for an empty list", () => {
    expect(unionRect([])).toBeNull();
  });

  it("computes the bounding box of several rects", () => {
    const union = unionRect([
      { left: 10, top: 10, width: 20, height: 20 },
      { left: 50, top: 60, width: 30, height: 40 },
    ]);
    expect(union).toEqual({ left: 10, top: 10, width: 70, height: 90 });
  });
});
