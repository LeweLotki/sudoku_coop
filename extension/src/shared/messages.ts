// Centralized message/event string literals.
//
// Two distinct vocabularies live here:
//   1. BACKEND_EVENT  — JSON `type` values exchanged with the FastAPI backend.
//   2. EXT_MESSAGE    — internal extension messages (popup ↔ background ↔ content).
//
// Keep every literal here so it is defined exactly once.

import type {
  CellCoordinate,
  ExtensionState,
  Role,
} from "./types";

// --- Backend WebSocket event types --------------------------------------------

export const BACKEND_EVENT = {
  SESSION_CREATE: "session:create",
  SESSION_CREATED: "session:created",
  SESSION_JOIN: "session:join",
  SESSION_JOINED: "session:joined",
  CELL_HIGHLIGHT: "cell:highlight",
  CELL_HIGHLIGHT_SENT: "cell:highlight:sent",
  SESSION_ERROR: "session:error",
  SESSION_CLOSED: "session:closed",
} as const;

export type BackendEventType =
  (typeof BACKEND_EVENT)[keyof typeof BACKEND_EVENT];

/** Backwards-compatible alias for the earlier scaffold `EVENT` export. */
export const EVENT = BACKEND_EVENT;

// --- Internal extension message types -----------------------------------------

export const EXT_MESSAGE = {
  // Popup → background (commands / requests)
  SET_ROLE: "SET_ROLE",
  HOST_CREATE_SESSION: "HOST_CREATE_SESSION",
  GUEST_JOIN_SESSION: "GUEST_JOIN_SESSION",
  GUEST_SEND_HIGHLIGHT: "GUEST_SEND_HIGHLIGHT",
  GET_EXTENSION_STATE: "GET_EXTENSION_STATE",
  DISCONNECT: "DISCONNECT",
  // Background → popup
  EXTENSION_STATE_UPDATED: "EXTENSION_STATE_UPDATED",
  // Background → content
  HOST_RECEIVED_HIGHLIGHT: "HOST_RECEIVED_HIGHLIGHT",
  // Content → background (optional)
  CONTENT_SCRIPT_READY: "CONTENT_SCRIPT_READY",
  SUDOKUPAD_TAB_DETECTED: "SUDOKUPAD_TAB_DETECTED",
} as const;

export type ExtMessageType = (typeof EXT_MESSAGE)[keyof typeof EXT_MESSAGE];

// --- Popup → background message payloads ---------------------------------------

export interface SetRoleMessage {
  type: typeof EXT_MESSAGE.SET_ROLE;
  role: Role;
}

export interface HostCreateSessionMessage {
  type: typeof EXT_MESSAGE.HOST_CREATE_SESSION;
}

export interface GuestJoinSessionMessage {
  type: typeof EXT_MESSAGE.GUEST_JOIN_SESSION;
  sessionId: string;
}

export interface GuestSendHighlightMessage {
  type: typeof EXT_MESSAGE.GUEST_SEND_HIGHLIGHT;
  row: number;
  column: number;
}

export interface GetExtensionStateMessage {
  type: typeof EXT_MESSAGE.GET_EXTENSION_STATE;
}

export interface DisconnectMessage {
  type: typeof EXT_MESSAGE.DISCONNECT;
}

export type PopupToBackgroundMessage =
  | SetRoleMessage
  | HostCreateSessionMessage
  | GuestJoinSessionMessage
  | GuestSendHighlightMessage
  | GetExtensionStateMessage
  | DisconnectMessage;

// --- Background → popup messages ----------------------------------------------

export interface ExtensionStateUpdatedMessage {
  type: typeof EXT_MESSAGE.EXTENSION_STATE_UPDATED;
  state: ExtensionState;
}

/** Standard response to popup request messages. */
export interface ExtensionStateResponse {
  state: ExtensionState;
}

// --- Background → content messages --------------------------------------------

export interface HostReceivedHighlightMessage {
  type: typeof EXT_MESSAGE.HOST_RECEIVED_HIGHLIGHT;
  payload: CellCoordinate & {
    sessionId: string;
    timestamp: number;
  };
}

// --- Content → background messages --------------------------------------------

export interface ContentScriptReadyMessage {
  type: typeof EXT_MESSAGE.CONTENT_SCRIPT_READY;
}
