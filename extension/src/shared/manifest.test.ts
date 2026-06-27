import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Manifest = {
  permissions?: string[];
  host_permissions?: string[];
  content_scripts?: { matches?: string[] }[];
};

const manifest = JSON.parse(
  readFileSync(new URL("../../manifest.json", import.meta.url), "utf8"),
) as Manifest;

describe("manifest permissions", () => {
  it("does not request <all_urls> anywhere", () => {
    const all = [
      ...(manifest.permissions ?? []),
      ...(manifest.host_permissions ?? []),
    ];
    expect(all).not.toContain("<all_urls>");
    expect(all.some((p) => p.includes("*://*/*"))).toBe(false);
  });

  it("only injects content scripts on SudokuPad", () => {
    const matches = (manifest.content_scripts ?? []).flatMap(
      (entry) => entry.matches ?? [],
    );
    expect(matches).toEqual(["https://sudokupad.app/*"]);
  });

  it("keeps host permissions narrow (no broad web access)", () => {
    for (const perm of manifest.host_permissions ?? []) {
      expect(perm).not.toBe("<all_urls>");
      // Each host permission targets a specific known host, not a wildcard host.
      expect(perm.startsWith("*://")).toBe(false);
    }
  });
});
