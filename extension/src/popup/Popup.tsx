import { useEffect, useState } from "react";
import { EXT_MESSAGE } from "../shared/messages";
import type { ConnectionStatus, ExtensionState, Role } from "../shared/types";
import { DEFAULT_BACKEND_WS_URL } from "../shared/config";
import * as api from "./api";
import { GuestPanel } from "./GuestPanel";
import { HostPanel } from "./HostPanel";

const INITIAL_STATE: ExtensionState = {
  role: null,
  connectionStatus: "idle",
  sessionId: null,
  error: null,
  backendUrl: DEFAULT_BACKEND_WS_URL,
};

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  idle: "Idle",
  connecting: "Connecting…",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Error",
};

const STATUS_DOT: Record<ConnectionStatus, string> = {
  idle: "bg-gray-400",
  connecting: "bg-amber-400",
  connected: "bg-green-500",
  disconnected: "bg-gray-400",
  error: "bg-red-500",
};

export function Popup() {
  const [state, setState] = useState<ExtensionState>(INITIAL_STATE);

  useEffect(() => {
    let active = true;

    api.getExtensionState().then((current) => {
      if (active && current) setState(current);
    });

    const listener = (message: unknown) => {
      if (
        message &&
        typeof message === "object" &&
        (message as { type?: unknown }).type ===
          EXT_MESSAGE.EXTENSION_STATE_UPDATED
      ) {
        setState((message as { state: ExtensionState }).state);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      active = false;
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  const selectRole = async (role: Role) => {
    const next = await api.setRole(role);
    if (next) setState(next);
  };

  const inSession =
    state.role !== null &&
    (state.sessionId !== null ||
      state.connectionStatus === "connecting" ||
      state.connectionStatus === "connected");

  const hostLocked = inSession && state.role === "guest";
  const guestLocked = inSession && state.role === "host";
  const lockHint = "Leave current session to change role.";

  return (
    <div className="p-4 text-sm">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">Sudoku Coop</h1>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span
            className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[state.connectionStatus]}`}
            aria-hidden
          />
          {STATUS_LABEL[state.connectionStatus]}
        </span>
      </header>

      <div className="mb-4 flex gap-2" role="group" aria-label="Select role">
        <span className="flex-1" title={hostLocked ? lockHint : undefined}>
          <button
            type="button"
            className={`w-full rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50 ${
              state.role === "host"
                ? "border-blue-500 bg-blue-50 font-medium"
                : ""
            }`}
            aria-pressed={state.role === "host"}
            disabled={hostLocked}
            title={hostLocked ? lockHint : undefined}
            onClick={() => void selectRole("host")}
          >
            Host
          </button>
        </span>
        <span className="flex-1" title={guestLocked ? lockHint : undefined}>
          <button
            type="button"
            className={`w-full rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50 ${
              state.role === "guest"
                ? "border-blue-500 bg-blue-50 font-medium"
                : ""
            }`}
            aria-pressed={state.role === "guest"}
            disabled={guestLocked}
            title={guestLocked ? lockHint : undefined}
            onClick={() => void selectRole("guest")}
          >
            Guest
          </button>
        </span>
      </div>

      {state.error ? (
        <p
          className="mb-3 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {state.role === "host" ? (
        <HostPanel state={state} onState={setState} />
      ) : state.role === "guest" ? (
        <GuestPanel state={state} onState={setState} />
      ) : (
        <p className="text-gray-500">Select Host or Guest to get started.</p>
      )}
    </div>
  );
}
