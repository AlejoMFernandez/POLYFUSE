/* ============================================================
   POLYFUSE · Regular polygon geometry.
   Flat-bottom orientation (shapes sit grounded), rounded corners
   for a soft, premium-geometric read. Circle for the goal tier.
   ============================================================ */

interface Pt {
  x: number;
  y: number;
}

/** Vertices of a regular n-gon, flat-bottom, centered at (cx,cy). */
export function polygonVertices(n: number, cx: number, cy: number, r: number): Pt[] {
  const pts: Pt[] = [];
  const start = (90 - 180 / n) * (Math.PI / 180);
  const step = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    const a = start + i * step;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function sub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y };
}
function norm(v: Pt): Pt {
  const m = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / m, y: v.y / m };
}
function fmt(p: Pt): string {
  return `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
}

/**
 * Rounded regular-polygon path. `round` is the fraction (0..1) of the
 * available corner cut to apply.
 */
export function roundedPolygonPath(
  n: number,
  cx: number,
  cy: number,
  r: number,
  round = 0.16,
): string {
  const pts = polygonVertices(n, cx, cy, r);
  const edge = 2 * r * Math.sin(Math.PI / n);
  const cr = Math.min(round * r, 0.42 * edge);

  const before: Pt[] = [];
  const after: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const cur = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const din = norm(sub(cur, prev));
    const dout = norm(sub(next, cur));
    before.push({ x: cur.x - din.x * cr, y: cur.y - din.y * cr });
    after.push({ x: cur.x + dout.x * cr, y: cur.y + dout.y * cr });
  }

  let d = `M ${fmt(before[0])}`;
  for (let i = 0; i < n; i++) {
    d += ` Q ${fmt(pts[i])} ${fmt(after[i])}`;
    d += ` L ${fmt(before[(i + 1) % n])}`;
  }
  return d + ' Z';
}

/**
 * Shape path for a tier. For finite `sides` returns a rounded polygon;
 * the caller renders a <circle> when sides === Infinity.
 */
export function tierPath(sides: number, cx: number, cy: number, r: number): string {
  return roundedPolygonPath(sides, cx, cy, r);
}
