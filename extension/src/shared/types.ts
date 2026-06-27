// Shared TypeScript types for the extension.
//
// These mirror the backend WebSocket contract and describe the extension's own
// state model. Event/message string literals live in `messages.ts`.

import type { BackendEventType } from "./messages";

export type Role = "host" | "guest";

/** Role selected in the popup; null before the user chooses. */
export type ExtensionRole = Role | null;

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

/** Authoritative state owned by the background service worker. */
export interface ExtensionState {
  role: ExtensionRole;
  connectionStatus: ConnectionStatus;
  sessionId: string | null;
  error: string | null;
  backendUrl: string;
}

export interface CellCoordinate {
  /** 1-9 for the MVP. */
  row: number;
  /** 1-9 for the MVP. */
  column: number;
}

// --- Backend event payloads (over the WebSocket) -------------------------------

/** Host → server: request a new session. */
export interface SessionCreateEvent {
  type: "session:create";
  role: "host";
}

/** Server → host: session created with its code. */
export interface SessionCreatedEvent {
  type: "session:created";
  sessionId: string;
}

/** Guest → server: join an existing session. */
export interface SessionJoinEvent {
  type: "session:join";
  role: "guest";
  sessionId: string;
}

/** Server → guest: join acknowledged. */
export interface SessionJoinedEvent {
  type: "session:joined";
  ok: boolean;
  sessionId: string;
}

/**
 * Guest → server (without timestamp) and server → host (with timestamp).
 * The guest omits `timestamp`; the server adds it when broadcasting.
 */
export interface CellHighlightEvent {
  type: "cell:highlight";
  sessionId: string;
  row: number;
  column: number;
  timestamp?: number;
}

/** Server → guest: highlight was routed to the host. */
export interface CellHighlightSentEvent {
  type: "cell:highlight:sent";
  ok: boolean;
  sessionId: string;
  row: number;
  column: number;
}

/** Server → client: standardized error. */
export interface SessionErrorEvent {
  type: "session:error";
  message: string;
}

/** Server → guest: the host ended the session. */
export interface SessionClosedEvent {
  type: "session:closed";
  sessionId: string;
}

/** Any event the extension may send to the backend. */
export type OutboundBackendEvent =
  | SessionCreateEvent
  | SessionJoinEvent
  | CellHighlightEvent;

/** Any event the backend may send to the extension. */
export type InboundBackendEvent =
  | SessionCreatedEvent
  | SessionJoinedEvent
  | CellHighlightEvent
  | CellHighlightSentEvent
  | SessionErrorEvent
  | SessionClosedEvent;

/** Minimal shape every backend message is expected to have. */
export interface BackendEnvelope {
  type: BackendEventType;
}
