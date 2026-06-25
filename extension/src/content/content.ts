// Content script entry (placeholder).
//
// Runs only on https://sudokupad.app/* (see manifest.json). In a future change it
// will:
//   - detect the Sudoku grid bounds (see gridDetector.ts)
//   - inject a non-interactive overlay (see overlay.ts)
//   - listen for `cell:highlight` events and draw the highlight
//   - recalculate bounds on resize
//
// It must NOT block SudokuPad clicks, modify puzzle values, or depend on
// SudokuPad internal app state. No functional behavior yet (scaffolding only).

export {};

// TODO: initialize grid detection + overlay and subscribe to highlight events.
