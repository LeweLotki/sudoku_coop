// Pure validation helpers (no Chrome APIs) so they are easy to unit test.

export const MIN_INDEX = 1;
export const MAX_INDEX = 9;

/** True when `value` is an integer in the inclusive 1-9 range. */
export function isValidIndex(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_INDEX &&
    value <= MAX_INDEX
  );
}

export interface CoordinateValidationOk {
  ok: true;
  row: number;
  column: number;
}

export interface CoordinateValidationError {
  ok: false;
  error: string;
}

export type CoordinateValidationResult =
  | CoordinateValidationOk
  | CoordinateValidationError;

/**
 * Validate raw row/column input (which may arrive as strings from inputs).
 * Returns the parsed integers on success or a human-readable error.
 */
export function validateCoordinate(
  rawRow: unknown,
  rawColumn: unknown,
): CoordinateValidationResult {
  const row = toInteger(rawRow);
  const column = toInteger(rawColumn);

  if (!isValidIndex(row) || !isValidIndex(column)) {
    return {
      ok: false,
      error: `Row and column must be whole numbers from ${MIN_INDEX} to ${MAX_INDEX}.`,
    };
  }

  return { ok: true, row, column };
}

/** Normalize a session code; returns null when empty/blank. */
export function normalizeSessionCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

/** Coerce string/number input into a number (or NaN) without throwing. */
function toInteger(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return Number.NaN;
    return Number(trimmed);
  }
  return Number.NaN;
}
