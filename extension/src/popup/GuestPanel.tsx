import { useState } from "react";
import type { ExtensionState } from "../shared/types";
import { normalizeSessionCode } from "../shared/validation";
import * as api from "./api";

interface GuestPanelProps {
  state: ExtensionState;
  onState: (state: ExtensionState) => void;
}

export function GuestPanel({ state, onState }: GuestPanelProps) {
  const [codeInput, setCodeInput] = useState(state.sessionId ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isJoined =
    state.sessionId !== null && state.connectionStatus === "connected";

  const join = async () => {
    const code = normalizeSessionCode(codeInput);
    if (!code) {
      setValidationError("Enter a session code to join.");
      return;
    }
    setValidationError(null);
    setBusy(true);
    const next = await api.guestJoinSession(code);
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
      <h2 className="mb-2 font-medium">Guest</h2>

      <label className="mb-1 block text-xs text-gray-500" htmlFor="session-code">
        Session code
      </label>
      <div className="mb-3 flex gap-2">
        <input
          id="session-code"
          type="text"
          className="w-full rounded border px-2 py-1 font-mono uppercase"
          placeholder="AB12"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          disabled={isJoined}
        />
        {isJoined ? (
          <button
            type="button"
            className="rounded border px-3 py-1 disabled:opacity-50"
            onClick={() => void disconnect()}
            disabled={busy}
          >
            Leave
          </button>
        ) : (
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
            onClick={() => void join()}
            disabled={busy}
          >
            Join
          </button>
        )}
      </div>

      {isJoined ? (
        <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          <p className="mb-1">
            Joined session{" "}
            <span className="font-mono font-semibold">{state.sessionId}</span>.
          </p>
          <p>
            Connected as guest. Click a cell on the SudokuPad grid to highlight
            it for the host.
          </p>
        </div>
      ) : null}

      {validationError ? (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {validationError}
        </p>
      ) : null}
    </section>
  );
}
