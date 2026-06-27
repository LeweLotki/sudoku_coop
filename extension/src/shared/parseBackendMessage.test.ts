import { describe, expect, it } from "vitest";
import { parseBackendMessage } from "./parseBackendMessage";

describe("parseBackendMessage", () => {
  it("parses a known session:created event", () => {
    const raw = JSON.stringify({ type: "session:created", sessionId: "AB12" });
    expect(parseBackendMessage(raw)).toEqual({
      type: "session:created",
      sessionId: "AB12",
    });
  });

  it("parses a cell:highlight event with timestamp", () => {
    const raw = JSON.stringify({
      type: "cell:highlight",
      sessionId: "AB12",
      row: 3,
      column: 5,
      timestamp: 1782390000000,
    });
    const parsed = parseBackendMessage(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("cell:highlight");
  });

  it("returns null for invalid JSON", () => {
    expect(parseBackendMessage("{not json")).toBeNull();
  });

  it("returns null for unknown event types", () => {
    expect(parseBackendMessage(JSON.stringify({ type: "mystery" }))).toBeNull();
  });

  it("returns null for missing type or non-object payloads", () => {
    expect(parseBackendMessage(JSON.stringify({ foo: "bar" }))).toBeNull();
    expect(parseBackendMessage(JSON.stringify(42))).toBeNull();
    expect(parseBackendMessage(JSON.stringify(null))).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(parseBackendMessage(123)).toBeNull();
    expect(parseBackendMessage(undefined)).toBeNull();
  });
});
