import { useState } from "react";
import { GuestPanel } from "./GuestPanel";
import { HostPanel } from "./HostPanel";

type Mode = "host" | "guest";

// Placeholder popup shell. Switches between Host and Guest panels.
// TODO: Real connection state, storage, and messaging are out of scope for the
// scaffolding change.
export function Popup() {
  const [mode, setMode] = useState<Mode>("host");

  return (
    <div className="p-4 text-sm">
      <h1 className="mb-3 text-base font-semibold">Sudoku Coop</h1>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          className="rounded border px-3 py-1"
          aria-pressed={mode === "host"}
          onClick={() => setMode("host")}
        >
          Host
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1"
          aria-pressed={mode === "guest"}
          onClick={() => setMode("guest")}
        >
          Guest
        </button>
      </div>

      {mode === "host" ? <HostPanel /> : <GuestPanel />}
    </div>
  );
}
