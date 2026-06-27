// Thin wrappers around chrome.runtime messaging for the popup.
//
// The popup never talks to the backend directly; it only sends command messages
// to the background service worker and reads the returned ExtensionState.

import {
  EXT_MESSAGE,
  type ExtensionStateResponse,
  type PopupToBackgroundMessage,
} from "../shared/messages";
import type { ExtensionState, Role } from "../shared/types";

async function send(
  message: PopupToBackgroundMessage,
): Promise<ExtensionState | null> {
  try {
    const response = (await chrome.runtime.sendMessage(message)) as
      | ExtensionStateResponse
      | undefined;
    return response?.state ?? null;
  } catch {
    return null;
  }
}

export function getExtensionState(): Promise<ExtensionState | null> {
  return send({ type: EXT_MESSAGE.GET_EXTENSION_STATE });
}

export function setRole(role: Role): Promise<ExtensionState | null> {
  return send({ type: EXT_MESSAGE.SET_ROLE, role });
}

export function hostCreateSession(): Promise<ExtensionState | null> {
  return send({ type: EXT_MESSAGE.HOST_CREATE_SESSION });
}

export function guestJoinSession(
  sessionId: string,
): Promise<ExtensionState | null> {
  return send({ type: EXT_MESSAGE.GUEST_JOIN_SESSION, sessionId });
}

export function disconnect(): Promise<ExtensionState | null> {
  return send({ type: EXT_MESSAGE.DISCONNECT });
}
