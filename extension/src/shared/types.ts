// Shared TypeScript types (placeholder).
//
// Conceptual types mirroring the future backend contract. Concrete event payload
// interfaces are defined in a future change (scaffolding only for now).

export type Role = "host" | "guest";

export interface CellCoordinate {
  /** 1-9 for the MVP. */
  row: number;
  /** 1-9 for the MVP. */
  column: number;
}

// TODO: add typed message interfaces (SessionCreate, SessionJoin, CellHighlight, ...).
