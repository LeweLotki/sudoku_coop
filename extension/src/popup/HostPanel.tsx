import { useState } from "react";
import type { ExtensionState } from "../shared/types";
import * as api from "./api";

interface HostPanelProps {
  state: ExtensionState;
  onState: (state: ExtensionState) => void;
}

export function HostPanel({ state, onState }: HostPanelProps) {
  const [busy, setBusy] = useState(false);

  const isConnected =
    state.connectionStatus === "connected" || state.sessionId !== null;

  const createSession = async () => {
    setBusy(true);
    const next = await api.hostCreateSession();
    if (next) onState(next);
    setBusy(false);
  };

  const disconnect = async () => {
    setBusy(true);
    const next = await api.disconnect();
    if (next) onState(next);
    setBusy(false);
  };

  return (
    <section>
      <h2 className="mb-2 font-medium">Host</h2>

      {state.sessionId ? (
        <div className="mb-3">
          <p className="text-xs text-gray-500">Session code</p>
          <p className="font-mono text-lg font-semibold tracking-widest">
            {state.sessionId}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Share this code with a guest to let them join.
          </p>
        </div>
      ) : (
        <p className="mb-3 text-gray-500">
          Create a session to get a code you can share with a guest.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
          onClick={() => void createSession()}
          disabled={busy || state.sessionId !== null}
        >
          Create Session
        </button>

        {isConnected ? (
          <button
            type="button"
            className="rounded border px-3 py-1 disabled:opacity-50"
            onClick={() => void disconnect()}
            disabled={busy}
          >
            Disconnect
          </button>
        ) : null}
      </div>
    </section>
  );
}
