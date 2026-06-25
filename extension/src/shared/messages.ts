// Shared message/event names (placeholder).
//
// These mirror the backend WebSocket contract conceptually. The real typed
// payloads are defined in a future change; see
// openspec/changes/scaffold-sudoku-coop/specs/realtime-coordination/spec.md.

export const EVENT = {
  SESSION_CREATE: "session:create",
  SESSION_CREATED: "session:created",
  SESSION_JOIN: "session:join",
  SESSION_JOINED: "session:joined",
  CELL_HIGHLIGHT: "cell:highlight",
  SESSION_ERROR: "session:error",
} as const;

export type EventType = (typeof EVENT)[keyof typeof EVENT];

// TODO: define typed message payloads for each event.
