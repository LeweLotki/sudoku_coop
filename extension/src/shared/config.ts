// Single source of truth for backend connection configuration.
//
// Keep all backend URLs here so they are not duplicated across the popup,
// background service worker, and content script. The base URL and access token
// are sourced from build-time Vite env variables so a production build can
// point at `wss://...` without code changes:
//
//   VITE_BACKEND_WS_URL=wss://your-app.herokuapp.com/ws
//   VITE_ACCESS_TOKEN=<invite-token>
//
// The access token is an invite token, not a true secret: it is bundled into
// the built extension. It is never persisted to chrome.storage.local.

/** Default FastAPI WebSocket endpoint for local development. */
export const DEFAULT_BACKEND_WS_URL = "ws://localhost:8000/ws";

/** URL pattern used to find SudokuPad tabs that can render highlights. */
export const SUDOKUPAD_URL_PATTERN = "https://sudokupad.app/*";

/** Base backend WebSocket URL (production `wss://` when configured at build). */
export const BACKEND_WS_URL: string =
  import.meta.env.VITE_BACKEND_WS_URL || DEFAULT_BACKEND_WS_URL;

/** Invite-style access token appended to the WebSocket URL (may be empty). */
export const ACCESS_TOKEN: string = import.meta.env.VITE_ACCESS_TOKEN || "";

/**
 * Append the access token to a backend WebSocket URL as a `token` query
 * parameter, preserving any existing query parameters. Returns the base URL
 * unchanged when no token is provided.
 */
export function buildBackendUrl(
  baseUrl: string = BACKEND_WS_URL,
  token: string = ACCESS_TOKEN,
): string {
  if (!token) return baseUrl;

  // Use a forgiving manual approach so non-standard schemes (ws/wss) and
  // relative-looking values are handled consistently across environments.
  const [withoutHash, hash = ""] = splitOnce(baseUrl, "#");
  const separator = withoutHash.includes("?") ? "&" : "?";
  const query = `token=${encodeURIComponent(token)}`;
  const hashPart = hash ? `#${hash}` : "";
  return `${withoutHash}${separator}${query}${hashPart}`;
}

function splitOnce(value: string, delimiter: string): [string, string?] {
  const index = value.indexOf(delimiter);
  if (index === -1) return [value];
  return [value.slice(0, index), value.slice(index + delimiter.length)];
}
