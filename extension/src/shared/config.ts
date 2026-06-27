// Single source of truth for backend connection configuration.
//
// Keep all backend URLs here so they are not duplicated across the popup,
// background service worker, and content script.

/** Default FastAPI WebSocket endpoint for local development. */
export const DEFAULT_BACKEND_WS_URL = "ws://localhost:8000/ws";

/** URL pattern used to find SudokuPad tabs that can render highlights. */
export const SUDOKUPAD_URL_PATTERN = "https://sudokupad.app/*";
