import { useState } from "react";
import type { ExtensionState } from "../shared/types";
import * as api from "./api";

interface HostPanelProps {
  state: ExtensionState;
  onState: (state: ExtensionState) => void;
}

export function HostPanel({ state, onState }: HostPanelProps) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const isConnected =
    state.connectionStatus === "connected" || state.sessionId !== null;

  const copyCode = async () => {
    if (!state.sessionId) return;
    try {
      await navigator.clipboard.writeText(state.sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

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
          <div className="flex items-center gap-2">
            <p className="font-mono text-lg font-semibold tracking-widest">
              {state.sessionId}
            </p>
            <button
              type="button"
              className="rounded border p-1 text-gray-600 hover:bg-gray-100"
              onClick={() => void copyCode()}
              title={copied ? "Copied!" : "Copy code"}
              aria-label="Copy session code"
            >
              {copied ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M13.5 4.5 6 12 2.5 8.5" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                  <path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" />
                </svg>
              )}
            </button>
          </div>
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
