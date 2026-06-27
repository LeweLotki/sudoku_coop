// Defensive parsing of backend WebSocket messages.
//
// Never throws: malformed JSON or unknown event types return null so the
// background service worker can ignore them without crashing.

import { BACKEND_EVENT, type BackendEventType } from "./messages";
import type { InboundBackendEvent } from "./types";

const KNOWN_TYPES = new Set<string>(Object.values(BACKEND_EVENT));

function isKnownType(value: unknown): value is BackendEventType {
  return typeof value === "string" && KNOWN_TYPES.has(value);
}

/**
 * Parse a raw WebSocket message into a known inbound backend event.
 * Returns null for invalid JSON, non-objects, or unknown/missing `type`.
 */
export function parseBackendMessage(raw: unknown): InboundBackendEvent | null {
  if (typeof raw !== "string") return null;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof data !== "object" || data === null) return null;

  const { type } = data as { type?: unknown };
  if (!isKnownType(type)) return null;

  return data as InboundBackendEvent;
}
