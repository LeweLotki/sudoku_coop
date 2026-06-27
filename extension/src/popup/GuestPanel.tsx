import { useState } from "react";
import type { ExtensionState } from "../shared/types";
import { normalizeSessionCode, validateCoordinate } from "../shared/validation";
import * as api from "./api";

interface GuestPanelProps {
  state: ExtensionState;
  onState: (state: ExtensionState) => void;
}

export function GuestPanel({ state, onState }: GuestPanelProps) {
  const [codeInput, setCodeInput] = useState(state.sessionId ?? "");
  const [rowInput, setRowInput] = useState("");
  const [columnInput, setColumnInput] = useState("");
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

  const sendHighlight = async () => {
    const result = validateCoordinate(rowInput, columnInput);
    if (!result.ok) {
      setValidationError(result.error);
      return;
    }
    setValidationError(null);
    setBusy(true);
    const next = await api.guestSendHighlight(result.row, result.column);
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
        <p className="mb-3 text-xs text-green-700">
          Joined session{" "}
          <span className="font-mono font-semibold">{state.sessionId}</span>.
        </p>
      ) : null}

      <fieldset className="mb-3" disabled={!isJoined}>
        <legend className="mb-1 text-xs text-gray-500">
          Send a highlight (row &amp; column, 1–9)
        </legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={9}
            className="w-16 rounded border px-2 py-1 disabled:opacity-50"
            placeholder="Row"
            aria-label="Row"
            value={rowInput}
            onChange={(e) => setRowInput(e.target.value)}
          />
          <input
            type="number"
            min={1}
            max={9}
            className="w-16 rounded border px-2 py-1 disabled:opacity-50"
            placeholder="Col"
            aria-label="Column"
            value={columnInput}
            onChange={(e) => setColumnInput(e.target.value)}
          />
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
            onClick={() => void sendHighlight()}
            disabled={busy || !isJoined}
          >
            Send Highlight
          </button>
        </div>
      </fieldset>

      {validationError ? (
        <p className="text-xs text-red-700" role="alert">
          {validationError}
        </p>
      ) : null}
    </section>
  );
}
