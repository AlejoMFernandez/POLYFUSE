/* ============================================================
   POLYFUSE · Static content — tiers, maps, modes.
   ============================================================ */

import type { MapDef, ModeDef, Tier } from './types';

/** Highest tier: the circle (the "goal", like 2048's 2048 tile). */
export const MAX_LEVEL = 10;
export const GOAL_LEVEL = 10;

/** level -> tier. sides = level + 3 up to the dodecagon (12), then circle. */
export const TIERS: Tier[] = [
  { level: 0, sides: 3, name: 'Triángulo', colorVar: '--tier-0' },
  { level: 1, sides: 4, name: 'Cuadrado', colorVar: '--tier-1' },
  { level: 2, sides: 5, name: 'Pentágono', colorVar: '--tier-2' },
  { level: 3, sides: 6, name: 'Hexágono', colorVar: '--tier-3' },
  { level: 4, sides: 7, name: 'Heptágono', colorVar: '--tier-4' },
  { level: 5, sides: 8, name: 'Octágono', colorVar: '--tier-5' },
  { level: 6, sides: 9, name: 'Eneágono', colorVar: '--tier-6' },
  { level: 7, sides: 10, name: 'Decágono', colorVar: '--tier-7' },
  { level: 8, sides: 11, name: 'Endecágono', colorVar: '--tier-8' },
  { level: 9, sides: 12, name: 'Dodecágono', colorVar: '--tier-9' },
  { level: 10, sides: Infinity, name: 'Círculo', colorVar: '--tier-10' },
];

export function tier(level: number): Tier {
  return TIERS[Math.min(level, MAX_LEVEL)];
}

/** Score awarded when a merge produces `newLevel`. Grows ~exponentially. */
export function mergeScore(newLevel: number): number {
  return Math.round(3 * Math.pow(2, newLevel));
}

/* ---------- Maps ---------- */

/** Build a blocked-index list from a visual mask ('.' = play, '#' = wall). */
function mask(rows: string[]): { cols: number; rows: number; blocked: number[] } {
  const grid = rows.map((r) => r.replace(/\s+/g, ''));
  const cols = grid[0].length;
  const blocked: number[] = [];
  grid.forEach((row, r) => {
    for (let c = 0; c < cols; c++) {
      if (row[c] === '#') blocked.push(r * cols + c);
    }
  });
  return { cols, rows: grid.length, blocked };
}

export const MAPS: MapDef[] = [
  {
    id: 'classic',
    name: 'Clásico',
    desc: 'El tablero 4×4 de siempre. Ajustado y estratégico.',
    cols: 4,
    rows: 4,
    blocked: [],
  },
  {
    id: 'wide',
    name: 'Amplio',
    desc: 'Un 5×5 con aire. Partidas más largas, fusiones más fáciles.',
    cols: 5,
    rows: 5,
    blocked: [],
  },
  {
    id: 'vast',
    name: 'Vasto',
    desc: 'Un 6×6 enorme. Espacio para construir polígonos altos.',
    cols: 6,
    rows: 6,
    blocked: [],
  },
  {
    id: 'diamond',
    name: 'Diamante',
    desc: 'Esquinas selladas: un rombo de 24 celdas que cambia el flujo.',
    ...mask([
      '# # . . # #',
      '# . . . . #',
      '. . . . . .',
      '. . . . . .',
      '# . . . . #',
      '# # . . # #',
    ]),
  },
];

export function mapById(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}

/* ---------- Modes ---------- */

export const MODES: ModeDef[] = [
  {
    id: 'classic',
    name: 'Clásico',
    desc: 'Fusioná hasta quedarte sin movimientos. Perseguí tu mejor marca.',
    timeLimit: null,
    allowUndo: false,
    endless: false,
    seeded: false,
    spawnSquareChance: 0.1,
  },
  {
    id: 'timeattack',
    name: 'Contrarreloj',
    desc: '120 segundos. Sumá todo el puntaje que puedas antes del cero.',
    timeLimit: 120,
    allowUndo: false,
    endless: false,
    seeded: false,
    spawnSquareChance: 0.18,
  },
  {
    id: 'zen',
    name: 'Zen',
    desc: 'Sin reloj, sin perder, deshacés cuando quieras. Sólo fluir.',
    timeLimit: null,
    allowUndo: true,
    endless: true,
    seeded: false,
    spawnSquareChance: 0.12,
  },
  {
    id: 'daily',
    name: 'Diario',
    desc: 'La misma secuencia para todos, hoy. Una tirada por día.',
    timeLimit: null,
    allowUndo: false,
    endless: false,
    seeded: true,
    spawnSquareChance: 0.1,
  },
];

export function modeById(id: string): ModeDef {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}
