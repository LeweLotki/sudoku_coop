import { describe, expect, it } from "vitest";
import {
  buildBackendUrl,
  DEFAULT_BACKEND_WS_URL,
} from "./config";

describe("DEFAULT_BACKEND_WS_URL", () => {
  it("remains the local development default", () => {
    expect(DEFAULT_BACKEND_WS_URL).toBe("ws://localhost:8000/ws");
  });
});

describe("buildBackendUrl", () => {
  it("appends the token as a query parameter", () => {
    expect(buildBackendUrl("wss://example.com/ws", "abc123")).toBe(
      "wss://example.com/ws?token=abc123",
    );
  });

  it("preserves existing query parameters with &", () => {
    expect(buildBackendUrl("wss://example.com/ws?foo=1", "abc123")).toBe(
      "wss://example.com/ws?foo=1&token=abc123",
    );
  });

  it("url-encodes token values", () => {
    expect(buildBackendUrl("ws://localhost:8000/ws", "a b/c+d")).toBe(
      "ws://localhost:8000/ws?token=a%20b%2Fc%2Bd",
    );
  });

  it("keeps a trailing hash fragment after the token", () => {
    expect(buildBackendUrl("wss://example.com/ws#frag", "abc")).toBe(
      "wss://example.com/ws?token=abc#frag",
    );
  });

  it("returns the base URL unchanged when no token is provided", () => {
    expect(buildBackendUrl("ws://localhost:8000/ws", "")).toBe(
      "ws://localhost:8000/ws",
    );
  });
});
