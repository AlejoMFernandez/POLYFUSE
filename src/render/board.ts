/* ============================================================
   POLYFUSE · Board view. Pure SVG, GSAP-animated.
   Owns one <svg> sized to the map. Tiles are <g> groups translated
   to cell centres; shapes are drawn around the group origin so scale
   pops stay centred.
   ============================================================ */

import gsap from 'gsap';
import { svg } from '../lib/dom';
import { tier } from '../engine/content';
import type { Game } from '../engine/game';
import type { MoveResult } from '../engine/types';
import { tierPath } from './polygon';

const CELL = 100;
const GAP = 14;
const PAD = 16;
const R = CELL * 0.45;

interface BoardOpts {
  reduced: boolean;
  showSides: boolean;
}

export class BoardView {
  readonly el: SVGSVGElement;
  private tilesLayer: SVGGElement;
  private nodes = new Map<number, SVGGElement>();
  private game: Game;
  private reduced: boolean;
  private showSides: boolean;

  constructor(game: Game, opts: BoardOpts) {
    this.game = game;
    this.reduced = opts.reduced;
    this.showSides = opts.showSides;

    const w = PAD * 2 + game.cols * CELL + (game.cols - 1) * GAP;
    const h = PAD * 2 + game.rows * CELL + (game.rows - 1) * GAP;

    this.el = svg('svg', {
      viewBox: `0 0 ${w} ${h}`,
      class: 'board',
      role: 'grid',
      'aria-label': 'Tablero de juego',
    });

    // cell wells
    const wells = svg('g', { class: 'board-wells' });
    for (let r = 0; r < game.rows; r++) {
      for (let c = 0; c < game.cols; c++) {
        if (game.blocked[game.idx(r, c)]) continue;
        const x = PAD + c * (CELL + GAP);
        const y = PAD + r * (CELL + GAP);
        wells.appendChild(
          svg('rect', {
            x,
            y,
            width: CELL,
            height: CELL,
            rx: 15,
            ry: 15,
            class: 'board-well',
          }),
        );
      }
    }
    this.el.appendChild(wells);

    this.tilesLayer = svg('g', { class: 'board-tiles' });
    this.el.appendChild(this.tilesLayer);
  }

  private center(r: number, c: number): { x: number; y: number } {
    return {
      x: PAD + c * (CELL + GAP) + CELL / 2,
      y: PAD + r * (CELL + GAP) + CELL / 2,
    };
  }

  setShowSides(v: boolean): void {
    this.showSides = v;
    for (const node of this.nodes.values()) {
      const num = node.querySelector<SVGTextElement>('.tile-num');
      if (num) num.style.opacity = v ? '1' : '0';
    }
  }

  setReduced(v: boolean): void {
    this.reduced = v;
  }

  /** Rebuild every tile instantly from current game state. */
  fullRender(): void {
    for (const node of this.nodes.values()) node.remove();
    this.nodes.clear();
    for (const tile of this.game.tiles.values()) {
      const node = this.makeTile(tile.id, tile.level, tile.r, tile.c);
      this.tilesLayer.appendChild(node);
      gsap.set(node, { scale: 1, opacity: 1 });
    }
  }

  private makeTile(id: number, level: number, r: number, c: number): SVGGElement {
    const g = svg('g', { class: 'tile' }) as SVGGElement;
    g.dataset.id = String(id);
    const shape = svg('path', { class: 'tile-shape', d: '' });
    const num = svg('text', {
      class: 'tile-num',
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      x: 0,
      y: 2,
    });
    g.appendChild(shape);
    g.appendChild(num);
    const { x, y } = this.center(r, c);
    gsap.set(g, { x, y });
    this.applyLevel(g, level);
    this.nodes.set(id, g);
    return g;
  }

  /** Set a tile group's shape, colour, glow and numeral for a level. */
  private applyLevel(g: SVGGElement, level: number): void {
    const t = tier(level);
    const shape = g.querySelector<SVGPathElement | SVGCircleElement>('.tile-shape');
    const num = g.querySelector<SVGTextElement>('.tile-num');
    if (!shape || !num) return;

    // swap to circle for the goal tier, polygon otherwise
    const wantCircle = !isFinite(t.sides);
    const isCircle = shape.tagName.toLowerCase() === 'circle';
    let shapeEl = shape;
    if (wantCircle !== isCircle) {
      const replacement = svg(wantCircle ? 'circle' : 'path', { class: 'tile-shape' });
      shape.replaceWith(replacement);
      shapeEl = replacement as SVGPathElement | SVGCircleElement;
    }
    if (wantCircle) {
      shapeEl.setAttribute('cx', '0');
      shapeEl.setAttribute('cy', '0');
      shapeEl.setAttribute('r', String(R * 0.94));
    } else {
      shapeEl.setAttribute('d', tierPath(t.sides, 0, 0, R));
    }

    const color = `var(${t.colorVar})`;
    shapeEl.style.fill = color;
    const glow = 24 + level * 4;
    g.style.filter = `drop-shadow(0 2px ${6 + level}px color-mix(in oklab, ${color} ${glow}%, transparent))`;

    // numeral: light ink on dark low tiers, dark ink on bright high tiers
    num.textContent = isFinite(t.sides) ? String(t.sides) : '∞';
    num.style.fill = level <= 4 ? 'oklch(0.97 0.01 274)' : 'oklch(0.20 0.03 280)';
    num.style.opacity = this.showSides ? '1' : '0';
    g.setAttribute('aria-label', t.name);
  }

  /** Animate a resolved move. Resolves when motion settles. */
  applyMove(res: MoveResult): Promise<void> {
    const slide = this.reduced ? 0 : 0.13;
    const pop = this.reduced ? 0 : 0.17;
    const spawn = this.reduced ? 0 : 0.2;
    const tl = gsap.timeline();

    for (const m of res.moves) {
      const node = this.nodes.get(m.tile.id);
      if (!node) continue;
      const { x, y } = this.center(m.to.r, m.to.c);
      tl.to(node, { x, y, duration: slide, ease: 'power3.out' }, 0);
    }

    for (const mg of res.merges) {
      const consumed = this.nodes.get(mg.consumedId);
      const survivor = this.nodes.get(mg.into.id);
      const { x, y } = this.center(mg.to.r, mg.to.c);
      if (consumed) {
        tl.to(consumed, { x, y, duration: slide, ease: 'power3.out' }, 0);
        tl.call(
          () => {
            consumed.remove();
            this.nodes.delete(mg.consumedId);
          },
          undefined,
          slide,
        );
      }
      if (survivor) {
        tl.call(() => this.applyLevel(survivor, mg.newLevel), undefined, slide);
        tl.fromTo(
          survivor,
          { scale: 1 },
          { scale: 1.14, duration: pop / 2, ease: 'power2.out', yoyo: true, repeat: 1 },
          slide,
        );
      }
    }

    if (res.spawned) {
      const node = this.makeTile(res.spawned.id, res.spawned.level, res.spawned.r, res.spawned.c);
      this.tilesLayer.appendChild(node);
      gsap.set(node, { scale: 0, opacity: 0 });
      tl.to(node, { scale: 1, opacity: 1, duration: spawn, ease: 'back.out(1.7)' }, slide * 0.5);
    }

    if (res.relievedIds?.length) {
      for (const id of res.relievedIds) {
        const node = this.nodes.get(id);
        if (!node) continue;
        tl.to(
          node,
          {
            scale: 0,
            opacity: 0,
            duration: pop,
            ease: 'power2.in',
            onComplete: () => {
              node.remove();
              this.nodes.delete(id);
            },
          },
          slide,
        );
      }
    }

    return new Promise((resolve) => {
      let settled = false;
      let watchdog: number | undefined;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        if (watchdog !== undefined) clearTimeout(watchdog);
        resolve();
      };
      if (tl.totalDuration() === 0) {
        tl.progress(1, false);
        finish();
        return;
      }
      tl.eventCallback('onComplete', finish);
      // Safety net: requestAnimationFrame is paused while a tab is hidden,
      // which freezes the GSAP timeline and would leave the input lock stuck.
      // setTimeout still fires when hidden — force the timeline to its end so
      // the board reaches its final state and the game never soft-locks.
      watchdog = window.setTimeout(() => {
        tl.progress(1, false);
        finish();
      }, tl.totalDuration() * 1000 + 200);
    });
  }

  /** Celebration when the circle (goal) is first reached. */
  pulseGoal(level: number): void {
    if (this.reduced) return;
    for (const node of this.nodes.values()) {
      if (node.getAttribute('aria-label') === tier(level).name) {
        gsap.fromTo(
          node,
          { scale: 1 },
          { scale: 1.25, duration: 0.4, ease: 'power2.out', yoyo: true, repeat: 1 },
        );
      }
    }
  }

  destroy(): void {
    gsap.killTweensOf([...this.nodes.values()]);
    this.el.remove();
  }
}
