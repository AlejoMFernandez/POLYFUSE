/* ============================================================
   POLYFUSE · Core engine. Framework-agnostic, deterministic.

   Board is a flat (cols*rows) array of (Tile | null). Blocked cells
   are walls: tiles never enter them and they split a row/column into
   independent merge segments. A move compacts each segment toward the
   travel direction, merging equal-level neighbours at most once.
   ============================================================ */

import { GOAL_LEVEL, MAX_LEVEL, mergeScore } from './content';
import { hashSeed, makeRng, todayKey, type RNG } from './rng';
import type { Direction, MapDef, ModeDef, MoveResult, Tile } from './types';

interface Snapshot {
  cells: (number | null)[]; // tile id per cell
  tiles: Array<{ id: number; level: number; r: number; c: number }>;
  score: number;
  moves: number;
  won: boolean;
  over: boolean;
  nextId: number;
}

const HISTORY_CAP = 60;

export class Game {
  readonly cols: number;
  readonly rows: number;
  readonly blocked: boolean[];
  readonly mode: ModeDef;
  readonly map: MapDef;

  cells: (Tile | null)[];
  tiles = new Map<number, Tile>();
  score = 0;
  best = 0;
  moves = 0;
  won = false;
  over = false;

  private rng: RNG;
  private nextId = 1;
  private history: Snapshot[] = [];

  constructor(mode: ModeDef, map: MapDef, best = 0) {
    this.mode = mode;
    this.map = map;
    this.cols = map.cols;
    this.rows = map.rows;
    this.best = best;

    const size = this.cols * this.rows;
    this.blocked = new Array(size).fill(false);
    for (const idx of map.blocked) this.blocked[idx] = true;
    this.cells = new Array(size).fill(null);

    const seed = mode.seeded
      ? hashSeed(`polyfuse·${todayKey()}·${map.id}`)
      : (Math.floor(Math.random() * 0xffffffff) >>> 0);
    this.rng = makeRng(seed);

    this.spawn(2);
  }

  /* ---------- geometry helpers ---------- */

  idx(r: number, c: number): number {
    return r * this.cols + c;
  }
  isPlayable(idx: number): boolean {
    return idx >= 0 && idx < this.cells.length && !this.blocked[idx];
  }
  playableCount(): number {
    return this.cells.length - this.map.blocked.length;
  }

  emptyCells(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.cells.length; i++) {
      if (!this.blocked[i] && this.cells[i] === null) out.push(i);
    }
    return out;
  }

  /* ---------- spawning ---------- */

  spawn(count = 1): Tile[] {
    const created: Tile[] = [];
    for (let n = 0; n < count; n++) {
      const empty = this.emptyCells();
      if (empty.length === 0) break;
      const idx = empty[this.rng.int(empty.length)];
      const level = this.rng.next() < this.mode.spawnSquareChance ? 1 : 0;
      const tile: Tile = {
        id: this.nextId++,
        level,
        r: Math.floor(idx / this.cols),
        c: idx % this.cols,
        justSpawned: true,
      };
      this.cells[idx] = tile;
      this.tiles.set(tile.id, tile);
      created.push(tile);
    }
    return created;
  }

  /* ---------- movement ---------- */

  /** Ordered cell indices per line, front (wall side) first. */
  private lines(dir: Direction): number[][] {
    const lines: number[][] = [];
    if (dir === 'left' || dir === 'right') {
      for (let r = 0; r < this.rows; r++) {
        const line: number[] = [];
        for (let c = 0; c < this.cols; c++) line.push(this.idx(r, c));
        if (dir === 'right') line.reverse();
        lines.push(line);
      }
    } else {
      for (let c = 0; c < this.cols; c++) {
        const line: number[] = [];
        for (let r = 0; r < this.rows; r++) line.push(this.idx(r, c));
        if (dir === 'down') line.reverse();
        lines.push(line);
      }
    }
    return lines;
  }

  move(dir: Direction): MoveResult {
    if (this.over) return emptyResult();
    const snap = this.snapshot();

    const result: MoveResult = {
      moved: false,
      moves: [],
      merges: [],
      spawned: null,
      scoreGained: 0,
      reachedGoal: false,
    };

    for (const line of this.lines(dir)) {
      // split line into wall-bounded segments
      const segments: number[][] = [];
      let seg: number[] = [];
      for (const idx of line) {
        if (this.blocked[idx]) {
          if (seg.length) segments.push(seg);
          seg = [];
        } else seg.push(idx);
      }
      if (seg.length) segments.push(seg);

      for (const segment of segments) {
        this.resolveSegment(segment, result);
      }
    }

    if (result.moved) {
      this.score += result.scoreGained;
      this.best = Math.max(this.best, this.score);
      this.moves += 1;
      if (result.reachedGoal) this.won = true;

      const [spawned] = this.spawn(1);
      result.spawned = spawned ?? null;

      // commit snapshot to history for undo
      this.history.push(snap);
      if (this.history.length > HISTORY_CAP) this.history.shift();

      // zen never loses: relieve when stuck
      if (this.isStuck()) {
        if (this.mode.endless) {
          result.relievedIds = this.relieve();
        } else {
          this.over = true;
        }
      }
    }
    return result;
  }

  private resolveSegment(segment: number[], result: MoveResult): void {
    const entries: Array<{ tile: Tile; oldR: number; oldC: number }> = [];
    for (const idx of segment) {
      const t = this.cells[idx];
      if (t) entries.push({ tile: t, oldR: t.r, oldC: t.c });
    }
    // clear the segment before re-placing
    for (const idx of segment) this.cells[idx] = null;

    // build merged plan
    const slots: Array<{
      survivor: { tile: Tile; oldR: number; oldC: number };
      consumed: { tile: Tile; oldR: number; oldC: number } | null;
    }> = [];
    for (const e of entries) {
      const top = slots[slots.length - 1];
      if (
        top &&
        top.consumed === null &&
        top.survivor.tile.level === e.tile.level &&
        e.tile.level < MAX_LEVEL
      ) {
        top.consumed = e;
      } else {
        slots.push({ survivor: e, consumed: null });
      }
    }

    slots.forEach((slot, i) => {
      const idx = segment[i];
      const newR = Math.floor(idx / this.cols);
      const newC = idx % this.cols;
      const s = slot.survivor.tile;

      if (slot.consumed) {
        s.level += 1;
        s.justMerged = true;
        result.scoreGained += mergeScore(s.level);
        if (s.level >= GOAL_LEVEL && !this.won) result.reachedGoal = true;
      }

      if (slot.survivor.oldR !== newR || slot.survivor.oldC !== newC) {
        result.moved = true;
        result.moves.push({
          tile: s,
          from: { r: slot.survivor.oldR, c: slot.survivor.oldC },
          to: { r: newR, c: newC },
        });
      }

      if (slot.consumed) {
        const co = slot.consumed;
        result.moved = true;
        result.merges.push({
          into: s,
          consumedId: co.tile.id,
          from: { r: co.oldR, c: co.oldC },
          to: { r: newR, c: newC },
          newLevel: s.level,
        });
        this.tiles.delete(co.tile.id);
      }

      s.r = newR;
      s.c = newC;
      this.cells[idx] = s;
    });
  }

  /* ---------- state checks ---------- */

  isStuck(): boolean {
    if (this.emptyCells().length > 0) return false;
    // any orthogonally-adjacent equal-level pair (no wall between) can merge
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const t = this.cells[this.idx(r, c)];
        if (!t) continue;
        if (c + 1 < this.cols) {
          const right = this.cells[this.idx(r, c + 1)];
          if (right && right.level === t.level && t.level < MAX_LEVEL) return false;
        }
        if (r + 1 < this.rows) {
          const down = this.cells[this.idx(r + 1, c)];
          if (down && down.level === t.level && t.level < MAX_LEVEL) return false;
        }
      }
    }
    return true;
  }

  /** Zen relief: remove every tile of the lowest present tier. */
  private relieve(): number[] {
    let min = Infinity;
    for (const t of this.tiles.values()) min = Math.min(min, t.level);
    if (!isFinite(min)) return [];
    const removed: number[] = [];
    for (const t of [...this.tiles.values()]) {
      if (t.level === min) {
        this.cells[this.idx(t.r, t.c)] = null;
        this.tiles.delete(t.id);
        removed.push(t.id);
      }
    }
    return removed;
  }

  /* ---------- undo ---------- */

  canUndo(): boolean {
    return this.history.length > 0;
  }

  undo(): boolean {
    const snap = this.history.pop();
    if (!snap) return false;
    this.restore(snap);
    return true;
  }

  private snapshot(): Snapshot {
    return {
      cells: this.cells.map((t) => (t ? t.id : null)),
      tiles: [...this.tiles.values()].map((t) => ({ id: t.id, level: t.level, r: t.r, c: t.c })),
      score: this.score,
      moves: this.moves,
      won: this.won,
      over: this.over,
      nextId: this.nextId,
    };
  }

  private restore(snap: Snapshot): void {
    this.tiles.clear();
    const byId = new Map<number, Tile>();
    for (const t of snap.tiles) {
      const tile: Tile = { id: t.id, level: t.level, r: t.r, c: t.c };
      byId.set(t.id, tile);
      this.tiles.set(t.id, tile);
    }
    this.cells = snap.cells.map((id) => (id == null ? null : byId.get(id) ?? null));
    this.score = snap.score;
    this.moves = snap.moves;
    this.won = snap.won;
    this.over = snap.over;
    this.nextId = snap.nextId;
  }
}

function emptyResult(): MoveResult {
  return { moved: false, moves: [], merges: [], spawned: null, scoreGained: 0, reachedGoal: false };
}
