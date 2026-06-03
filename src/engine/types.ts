/* ============================================================
   POLYFUSE · Core types
   ============================================================ */

export type Direction = 'up' | 'down' | 'left' | 'right';

/** A polygon tier. level 0 = triangle (3 sides) ... level 10 = circle. */
export interface Tier {
  level: number;
  /** Number of sides; Infinity for the circle goal tier. */
  sides: number;
  name: string;
  /** CSS custom property holding the tier color. */
  colorVar: string;
}

export interface Tile {
  id: number;
  level: number;
  /** row / column of the cell it currently occupies. */
  r: number;
  c: number;
  /** transient flags used during a single move resolution. */
  justSpawned?: boolean;
  justMerged?: boolean;
}

export interface MoveTrace {
  tile: Tile;
  from: { r: number; c: number };
  to: { r: number; c: number };
}

export interface MergeTrace {
  /** the tile that survives (now level+1). */
  into: Tile;
  /** the tile that slid in and is consumed. */
  consumedId: number;
  from: { r: number; c: number };
  to: { r: number; c: number };
  newLevel: number;
}

export interface MoveResult {
  moved: boolean;
  moves: MoveTrace[];
  merges: MergeTrace[];
  spawned: Tile | null;
  scoreGained: number;
  reachedGoal: boolean;
  /** zen-mode relief: tile ids auto-removed when the board got stuck. */
  relievedIds?: number[];
}

export interface MapDef {
  id: string;
  name: string;
  desc: string;
  cols: number;
  rows: number;
  /** flat indices (r*cols + c) that are walls / not playable. */
  blocked: number[];
}

export interface ModeDef {
  id: string;
  name: string;
  desc: string;
  /** seconds, or null for untimed. */
  timeLimit: number | null;
  /** unlimited undo allowed (zen). */
  allowUndo: boolean;
  /** never lose — auto-relieve when stuck (zen). */
  endless: boolean;
  /** deterministic spawns seeded from the date (daily). */
  seeded: boolean;
  /** probability a spawn is a square (level 1) instead of a triangle (level 0). */
  spawnSquareChance: number;
}
