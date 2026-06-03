/* ============================================================
   POLYFUSE · Persistence (localStorage, namespaced + resilient).
   ============================================================ */

const NS = 'polyfuse.v1';

export type MotionPref = 'system' | 'on' | 'off';

export interface Settings {
  sound: boolean;
  motion: MotionPref;
  /** show the side-count numeral on each tile (accessibility / clarity). */
  showSides: boolean;
}

export interface DailyResult {
  date: string;
  score: number;
  won: boolean;
  moves: number;
}

interface Store {
  settings: Settings;
  best: Record<string, number>; // `${mode}:${map}` -> score
  bestLevel: Record<string, number>; // `${mode}:${map}` -> highest tier reached
  daily: Record<string, DailyResult>; // dateKey -> result
}

const DEFAULTS: Store = {
  settings: { sound: true, motion: 'system', showSides: true },
  best: {},
  bestLevel: {},
  daily: {},
};

function read(): Store {
  try {
    const raw = localStorage.getItem(NS);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      settings: { ...DEFAULTS.settings, ...parsed.settings },
      best: { ...parsed.best },
      bestLevel: { ...parsed.bestLevel },
      daily: { ...parsed.daily },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(NS, JSON.stringify(store));
  } catch {
    /* storage unavailable (private mode / quota) — game still runs */
  }
}

let cache = read();

export function getSettings(): Settings {
  return { ...cache.settings };
}

export function saveSettings(patch: Partial<Settings>): Settings {
  cache.settings = { ...cache.settings, ...patch };
  write(cache);
  return getSettings();
}

const key = (mode: string, map: string): string => `${mode}:${map}`;

export function getBest(mode: string, map: string): number {
  return cache.best[key(mode, map)] ?? 0;
}

export function getBestLevel(mode: string, map: string): number {
  return cache.bestLevel[key(mode, map)] ?? 0;
}

/** Record a finished run; returns true if it set a new best score. */
export function recordRun(mode: string, map: string, score: number, level: number): boolean {
  const k = key(mode, map);
  const prev = cache.best[k] ?? 0;
  const isBest = score > prev;
  if (isBest) cache.best[k] = score;
  if (level > (cache.bestLevel[k] ?? 0)) cache.bestLevel[k] = level;
  write(cache);
  return isBest;
}

export function getDaily(date: string): DailyResult | null {
  return cache.daily[date] ?? null;
}

export function setDaily(result: DailyResult): void {
  cache.daily[result.date] = result;
  write(cache);
}

export function resetAll(): void {
  const keepSound = cache.settings;
  cache = structuredClone(DEFAULTS);
  cache.settings = keepSound;
  write(cache);
}
