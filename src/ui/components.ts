/* ============================================================
   POLYFUSE · Reusable UI atoms.
   ============================================================ */

import { tier } from '../engine/content';
import type { MapDef } from '../engine/types';
import { el, svg } from '../lib/dom';
import { tierPath } from '../render/polygon';

export const ICONS: Record<string, string> = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  play: '<path d="M8 5.4v13.2l11-6.6z" fill="currentColor" stroke="none"/>',
  modes: '<circle cx="7" cy="7" r="3.2"/><rect x="14" y="4" width="6.2" height="6.2" rx="1.6"/><path d="M4 14.4h6.2v6.2H4z"/><path d="M14 17.5h6"/><path d="M17 14.5v6"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-2"/>',
  restart: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v5h-5"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  sound: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.8 5.2a9 9 0 0 1 0 13.6"/>',
  mute: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>',
  trophy: '<path d="M8 21h8M12 17.5V21M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6.5H4V8a3 3 0 0 0 3 3M17 6.5h3V8a3 3 0 0 1-3 3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16.5v-5M12 8h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>',
};

export function iconSvg(name: string, size = 22): SVGSVGElement {
  const node = svg('svg', {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.7,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  });
  node.innerHTML = ICONS[name] ?? '';
  return node;
}

type BtnVariant = 'primary' | 'ghost' | 'subtle' | 'danger';

export function btn(opts: {
  label: string;
  onClick: () => void;
  variant?: BtnVariant;
  icon?: string;
  full?: boolean;
  ariaLabel?: string;
}): HTMLButtonElement {
  const b = el('button', {
    class: `btn btn--${opts.variant ?? 'primary'}${opts.full ? ' btn--full' : ''}`,
    on: { click: opts.onClick },
    attrs: opts.ariaLabel ? { 'aria-label': opts.ariaLabel } : {},
  });
  if (opts.icon) b.appendChild(iconSvg(opts.icon, 20));
  b.appendChild(el('span', { text: opts.label }));
  return b;
}

export function iconBtn(opts: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}): HTMLButtonElement {
  const b = el('button', {
    class: 'icon-btn',
    attrs: { 'aria-label': opts.label, title: opts.label },
    on: { click: opts.onClick },
  });
  if (opts.disabled) b.setAttribute('disabled', 'true');
  b.appendChild(iconSvg(opts.icon, 20));
  return b;
}

/** A small standalone polygon preview for a tier level. */
export function miniShape(level: number, size = 44): SVGSVGElement {
  const t = tier(level);
  const node = svg('svg', {
    viewBox: '-50 -50 100 100',
    width: size,
    height: size,
    class: 'mini-shape',
    'aria-hidden': 'true',
  });
  const r = 40;
  let shape: SVGElement;
  if (isFinite(t.sides)) {
    shape = svg('path', { d: tierPath(t.sides, 0, 0, r) });
  } else {
    shape = svg('circle', { cx: 0, cy: 0, r: r * 0.96 });
  }
  shape.setAttribute('fill', `var(${t.colorVar})`);
  node.appendChild(shape);
  return node;
}

/** A tiny schematic of a map's playable cells. */
export function mapPreview(map: MapDef, px = 78): SVGSVGElement {
  const gap = 1.2;
  const unit = 10;
  const w = map.cols * unit + (map.cols - 1) * gap;
  const h = map.rows * unit + (map.rows - 1) * gap;
  const node = svg('svg', {
    viewBox: `0 0 ${w} ${h}`,
    width: px,
    height: px * (h / w),
    class: 'map-preview',
    'aria-hidden': 'true',
  });
  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const blocked = map.blocked.includes(r * map.cols + c);
      if (blocked) continue;
      node.appendChild(
        svg('rect', {
          x: c * (unit + gap),
          y: r * (unit + gap),
          width: unit,
          height: unit,
          rx: 2,
          class: 'map-preview-cell',
        }),
      );
    }
  }
  return node;
}

export function topbar(opts: {
  onBack: () => void;
  title: string;
  right?: HTMLElement[];
}): HTMLElement {
  const right = el('div', { class: 'topbar-right' }, ...(opts.right ?? []));
  return el(
    'header',
    { class: 'topbar' },
    iconBtn({ icon: 'back', label: 'Volver', onClick: opts.onBack }),
    el('h2', { class: 'topbar-title', text: opts.title }),
    right,
  );
}
