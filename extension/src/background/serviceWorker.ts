// Background service worker — the extension's coordination layer.
//
// Responsibilities:
//   - own the single WebSocket connection to the FastAPI backend
//   - own the authoritative ExtensionState
//   - route popup commands (create/join/highlight/disconnect)
//   - parse backend events defensively and update state
//   - persist lightweight state to chrome.storage.local (no secrets)
//   - forward host `cell:highlight` events to a SudokuPad content script
//
// Reconnection/backoff is intentionally out of scope for this change.

import { DEFAULT_BACKEND_WS_URL, SUDOKUPAD_URL_PATTERN } from "../shared/config";
import {
  BACKEND_EVENT,
  EXT_MESSAGE,
  type ExtensionStateResponse,
  type HostReceivedHighlightMessage,
  type PopupToBackgroundMessage,
} from "../shared/messages";
import { parseBackendMessage } from "../shared/parseBackendMessage";
import type {
  ExtensionState,
  InboundBackendEvent,
  OutboundBackendEvent,
} from "../shared/types";

const STORAGE_KEY = "sudokuCoopState";

let state: ExtensionState = {
  role: null,
  connectionStatus: "idle",
  sessionId: null,
  error: null,
  backendUrl: DEFAULT_BACKEND_WS_URL,
};

let socket: WebSocket | null = null;
/** Single action deferred until the socket finishes connecting. */
let pendingAction: (() => void) | null = null;

// --- State helpers ------------------------------------------------------------

function setState(patch: Partial<ExtensionState>): void {
  state = { ...state, ...patch };
  void persistState();
  broadcastState();
}

function broadcastState(): void {
  chrome.runtime
    .sendMessage({ type: EXT_MESSAGE.EXTENSION_STATE_UPDATED, state })
    .catch(() => {
      // No popup is listening; safe to ignore.
    });
}

async function persistState(): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        role: state.role,
        sessionId: state.sessionId,
        backendUrl: state.backendUrl,
      },
    });
  } catch {
    // Storage failures must not crash the worker.
  }
}

async function restoreState(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const saved = stored[STORAGE_KEY] as
      | Pick<ExtensionState, "role" | "sessionId" | "backendUrl">
      | undefined;
    if (saved) {
      state = {
        ...state,
        role: saved.role ?? null,
        sessionId: saved.sessionId ?? null,
        backendUrl: saved.backendUrl ?? DEFAULT_BACKEND_WS_URL,
      };
    }
  } catch {
    // Ignore restore failures and keep defaults.
  }
}

// --- WebSocket lifecycle ------------------------------------------------------

function ensureSocket(onReady: () => void): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    onReady();
    return;
  }

  if (socket && socket.readyState === WebSocket.CONNECTING) {
    // Defer a single pending action until the connection opens.
    pendingAction = onReady;
    return;
  }

  pendingAction = onReady;
  setState({ connectionStatus: "connecting", error: null });

  try {
    socket = new WebSocket(state.backendUrl);
  } catch {
    setState({ connectionStatus: "error", error: "Failed to open connection." });
    pendingAction = null;
    return;
  }

  socket.onopen = () => {
    setState({ connectionStatus: "connected", error: null });
    const action = pendingAction;
    pendingAction = null;
    action?.();
  };

  socket.onmessage = (event) => {
    handleBackendMessage(event.data);
  };

  socket.onerror = () => {
    setState({ connectionStatus: "error", error: "Connection error." });
  };

  socket.onclose = () => {
    socket = null;
    pendingAction = null;
    setState({ connectionStatus: "disconnected" });
  };
}

function sendToBackend(event: OutboundBackendEvent): void {
  ensureSocket(() => {
    try {
      socket?.send(JSON.stringify(event));
    } catch {
      setState({ error: "Failed to send message to backend." });
    }
  });
}

function disconnect(): void {
  pendingAction = null;
  if (socket) {
    try {
      socket.close();
    } catch {
      // Ignore close failures.
    }
    socket = null;
  }
  setState({
    connectionStatus: "disconnected",
    sessionId: null,
    error: null,
  });
}

// --- Inbound backend events ---------------------------------------------------

function handleBackendMessage(raw: unknown): void {
  const event = parseBackendMessage(raw);
  if (!event) {
    // Malformed or unknown message: ignore without crashing.
    return;
  }
  dispatchBackendEvent(event);
}

function dispatchBackendEvent(event: InboundBackendEvent): void {
  switch (event.type) {
    case BACKEND_EVENT.SESSION_CREATED:
      setState({
        role: "host",
        sessionId: event.sessionId,
        connectionStatus: "connected",
        error: null,
      });
      break;

    case BACKEND_EVENT.SESSION_JOINED:
      setState({
        role: "guest",
        sessionId: event.sessionId,
        connectionStatus: "connected",
        error: null,
      });
      break;

    case BACKEND_EVENT.CELL_HIGHLIGHT:
      // Host side: forward the highlight to a SudokuPad content script.
      void forwardHighlight({
        row: event.row,
        column: event.column,
        sessionId: event.sessionId,
        timestamp: event.timestamp ?? Date.now(),
      });
      break;

    case BACKEND_EVENT.CELL_HIGHLIGHT_SENT:
      // Guest acknowledgment: clear any prior error.
      setState({ error: null });
      break;

    case BACKEND_EVENT.SESSION_ERROR:
      setState({ connectionStatus: "error", error: event.message });
      break;

    case BACKEND_EVENT.SESSION_CLOSED:
      setState({
        sessionId: null,
        connectionStatus: "disconnected",
        error: "Session closed by host.",
      });
      break;
  }
}

// --- Highlight forwarding to the content script -------------------------------

async function forwardHighlight(
  payload: HostReceivedHighlightMessage["payload"],
): Promise<void> {
  const message: HostReceivedHighlightMessage = {
    type: EXT_MESSAGE.HOST_RECEIVED_HIGHLIGHT,
    payload,
  };

  const tabId = await findSudokuPadTabId();
  if (tabId === null) {
    setState({ error: "No SudokuPad tab found to display the highlight." });
    return;
  }

  try {
    await chrome.tabs.sendMessage(tabId, message);
    setState({ error: null });
    return;
  } catch {
    // The content script may not be running in this tab — typically because the
    // page was opened before the extension loaded, or the extension was reloaded
    // (which invalidates the previously injected content script). Inject it
    // on demand and retry once before giving up.
  }

  const injected = await injectContentScript(tabId);
  if (!injected) {
    setState({
      error: "Could not load the overlay on the SudokuPad tab. Reload the page.",
    });
    return;
  }

  try {
    await chrome.tabs.sendMessage(tabId, message);
    setState({ error: null });
  } catch {
    setState({
      error:
        "Could not deliver highlight to the SudokuPad tab. Reload the page.",
    });
  }
}

/** Inject the built content script into a tab on demand. Returns success. */
async function injectContentScript(tabId: number): Promise<boolean> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    return true;
  } catch {
    return false;
  }
}

async function findSudokuPadTabId(): Promise<number | null> {
  // Prefer the active tab if it is a SudokuPad page.
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (activeTab?.id != null && isSudokuPadUrl(activeTab.url)) {
      return activeTab.id;
    }
  } catch {
    // Fall through to the broader query.
  }

  try {
    const tabs = await chrome.tabs.query({ url: SUDOKUPAD_URL_PATTERN });
    const match = tabs.find((tab) => tab.id != null);
    return match?.id ?? null;
  } catch {
    return null;
  }
}

function isSudokuPadUrl(url: string | undefined): boolean {
  return typeof url === "string" && url.startsWith("https://sudokupad.app/");
}

// --- Popup command routing ----------------------------------------------------

function handlePopupMessage(
  message: PopupToBackgroundMessage,
  sendResponse: (response: ExtensionStateResponse) => void,
): boolean {
  switch (message.type) {
    case EXT_MESSAGE.GET_EXTENSION_STATE:
      sendResponse({ state });
      return false;

    case EXT_MESSAGE.SET_ROLE:
      setState({ role: message.role, error: null });
      sendResponse({ state });
      return false;

    case EXT_MESSAGE.HOST_CREATE_SESSION:
      sendToBackend({ type: BACKEND_EVENT.SESSION_CREATE, role: "host" });
      sendResponse({ state });
      return false;

    case EXT_MESSAGE.GUEST_JOIN_SESSION:
      setState({ role: "guest", sessionId: message.sessionId });
      sendToBackend({
        type: BACKEND_EVENT.SESSION_JOIN,
        role: "guest",
        sessionId: message.sessionId,
      });
      sendResponse({ state });
      return false;

    case EXT_MESSAGE.GUEST_SEND_HIGHLIGHT: {
      if (!state.sessionId) {
        setState({ error: "Join a session before sending a highlight." });
        sendResponse({ state });
        return false;
      }
      sendToBackend({
        type: BACKEND_EVENT.CELL_HIGHLIGHT,
        sessionId: state.sessionId,
        row: message.row,
        column: message.column,
      });
      sendResponse({ state });
      return false;
    }

    case EXT_MESSAGE.DISCONNECT:
      disconnect();
      sendResponse({ state });
      return false;

    default:
      sendResponse({ state });
      return false;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Only handle popup→background command messages here.
  if (!message || typeof message.type !== "string") return false;
  if (!(message.type in REVERSE_POPUP_TYPES)) return false;
  return handlePopupMessage(
    message as PopupToBackgroundMessage,
    sendResponse as (response: ExtensionStateResponse) => void,
  );
});

// Set of popup→background message types this listener should handle.
const REVERSE_POPUP_TYPES: Record<string, true> = {
  [EXT_MESSAGE.GET_EXTENSION_STATE]: true,
  [EXT_MESSAGE.SET_ROLE]: true,
  [EXT_MESSAGE.HOST_CREATE_SESSION]: true,
  [EXT_MESSAGE.GUEST_JOIN_SESSION]: true,
  [EXT_MESSAGE.GUEST_SEND_HIGHLIGHT]: true,
  [EXT_MESSAGE.DISCONNECT]: true,
};

// Restore persisted state on worker startup.
void restoreState();
