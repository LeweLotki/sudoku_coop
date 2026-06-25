// Grid bounds detection (placeholder).
//
// Future strategy (out of scope for the scaffolding change):
//   - Prefer the visible grid/canvas/SVG bounding box via getBoundingClientRect()
//   - Avoid depending on unstable SudokuPad internal class names
//   - Recalculate on window resize
//   - Optional fallback: manual calibration where the host clicks the top-left
//     and bottom-right corners of the grid
//
// Assumes a 9x9 grid for the MVP.

export {};

// TODO: export function detectGridBounds(): DOMRect | null { ... }
