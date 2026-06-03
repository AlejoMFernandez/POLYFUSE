/* ============================================================
   POLYFUSE · Gameplay screen.
   Wires the engine (Game) to the view (BoardView): HUD, keyboard +
   swipe input, per-mode logic (timer, undo, daily lock) and the
   win / game-over overlays.
   ============================================================ */

import gsap from 'gsap';
import { sfx } from '../../audio/sfx';
import { GOAL_LEVEL, tier } from '../../engine/content';
import { Game } from '../../engine/game';
import { todayKey } from '../../engine/rng';
import {
  getBest,
  getDaily,
  recordRun,
  setDaily,
  type DailyResult,
} from '../../engine/storage';
import type { Direction } from '../../engine/types';
import { el } from '../../lib/dom';
import { BoardView } from '../../render/board';
import type { AppCtx, Screen } from '../app';
import { btn, iconBtn, iconSvg, miniShape, topbar } from '../components';

const KEYMAP: Record<string, Direction> = {
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function highestLevel(game: Game): number {
  let max = 0;
  for (const t of game.tiles.values()) max = Math.max(max, t.level);
  return max;
}

function statBlock(label: string): { root: HTMLElement; value: HTMLElement } {
  const value = el('span', { class: 'stat-value', text: '0' });
  const root = el(
    'div',
    { class: 'stat' },
    el('span', { class: 'stat-label', text: label }),
    value,
  );
  return { root, value };
}

export function createGameScreen(app: AppCtx): Screen {
  const mode = app.mode();
  const map = app.map();

  // Daily is one run per day — if today's is already recorded, lock it.
  if (mode.seeded) {
    const done = getDaily(todayKey());
    if (done) return dailyLockedScreen(app, done);
  }

  /* ---------- mutable run state (rebuilt on restart) ---------- */
  let game = new Game(mode, map, getBest(mode.id, map.id));
  let board = new BoardView(game, { reduced: app.reduced(), showSides: app.settings.showSides });
  let busy = false;
  let goalShown = false;
  let firstMoveDone = false;
  let remaining = mode.timeLimit ?? 0;
  let timerId: number | undefined;

  /* ---------- HUD ---------- */
  const scoreStat = statBlock('Puntaje');
  const bestStat = statBlock('Mejor');
  const thirdStat = statBlock(mode.timeLimit ? 'Tiempo' : 'Jugadas');
  bestStat.value.textContent = game.best.toLocaleString('es');

  const hud = el('div', { class: 'hud' }, scoreStat.root, bestStat.root, thirdStat.root);

  /* ---------- board mount + hint + overlay ---------- */
  const boardHost = el('div', { class: 'board-host' });
  boardHost.appendChild(board.el);

  const hint = el(
    'p',
    { class: 'game-hint' },
    'Deslizá o usá las flechas para fusionar.',
  );

  const overlay = el('div', { class: 'game-overlay', attrs: { hidden: 'true' } });
  const stage = el('div', { class: 'game-stage' }, boardHost, overlay);

  /* ---------- topbar actions ---------- */
  const undoBtn = mode.allowUndo
    ? iconBtn({ icon: 'undo', label: 'Deshacer', onClick: () => doUndo() })
    : null;
  const restartBtn = iconBtn({ icon: 'restart', label: 'Reiniciar', onClick: () => reset() });
  const rightActions = [undoBtn, restartBtn].filter((x): x is HTMLButtonElement => x !== null);

  const contextLine = el(
    'div',
    { class: 'game-context' },
    el('span', { text: mode.name }),
    el('span', { class: 'game-context-dot', text: '·' }),
    el('span', { text: map.name }),
    el('span', { class: 'game-context-dot', text: '·' }),
    el('span', { class: 'game-context-goal' }, 'meta ', miniShape(GOAL_LEVEL, 16)),
  );

  const el_ = el(
    'section',
    { class: 'game' },
    topbar({
      onBack: () => { sfx.play('back'); app.nav.home(); },
      title: mode.name,
      right: rightActions,
    }),
    contextLine,
    hud,
    stage,
    hint,
  );

  /* ---------- HUD sync ---------- */
  function updateHud(): void {
    scoreStat.value.textContent = game.score.toLocaleString('es');
    bestStat.value.textContent = game.best.toLocaleString('es');
    thirdStat.value.textContent = mode.timeLimit ? fmtTime(remaining) : String(game.moves);
    if (remaining <= 10 && mode.timeLimit) thirdStat.root.classList.add('is-urgent');
    if (undoBtn) undoBtn.toggleAttribute('disabled', !game.canUndo() || busy);
  }

  /* ---------- timer (contrarreloj) ---------- */
  function startTimer(): void {
    if (!mode.timeLimit || timerId) return;
    timerId = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = 0;
        updateHud();
        stopTimer();
        game.over = true;
        endRun('time');
      } else {
        updateHud();
      }
    }, 1000);
  }
  function stopTimer(): void {
    if (timerId !== undefined) {
      clearInterval(timerId);
      timerId = undefined;
    }
  }

  /* ---------- core actions ---------- */
  async function doMove(dir: Direction): Promise<void> {
    if (busy || game.over) return;
    const res = game.move(dir);
    if (!res.moved) return;

    busy = true;
    if (!firstMoveDone) {
      firstMoveDone = true;
      hideHint();
      startTimer();
    }
    if (res.merges.length) {
      const top = res.merges.reduce((m, x) => Math.max(m, x.newLevel), 0);
      sfx.merge(top);
    }
    updateHud();

    await board.applyMove(res);
    busy = false;
    updateHud();

    if (res.reachedGoal && !goalShown) {
      goalShown = true;
      board.pulseGoal(GOAL_LEVEL);
      sfx.play('win');
      showWin();
      return;
    }
    if (game.over) endRun('stuck');
  }

  function doUndo(): void {
    if (busy || !mode.allowUndo || game.over) return;
    if (!game.canUndo()) return;
    game.undo();
    sfx.play('undo');
    board.fullRender();
    updateHud();
  }

  function endRun(cause: 'stuck' | 'time'): void {
    stopTimer();
    const level = Math.max(highestLevel(game), game.won ? GOAL_LEVEL : 0);
    const isBest = recordRun(mode.id, map.id, game.score, level);
    if (mode.seeded) {
      setDaily({ date: todayKey(), score: game.score, won: game.won, moves: game.moves });
    }
    sfx.play(isBest && game.score > 0 ? 'newbest' : 'over');
    showGameOver(cause, isBest);
  }

  function reset(): void {
    stopTimer();
    sfx.play('click');
    board.destroy();
    busy = false;
    goalShown = false;
    firstMoveDone = false;
    remaining = mode.timeLimit ?? 0;
    game = new Game(mode, map, getBest(mode.id, map.id));
    board = new BoardView(game, { reduced: app.reduced(), showSides: app.settings.showSides });
    boardHost.appendChild(board.el);
    board.fullRender();
    closeOverlay();
    thirdStat.root.classList.remove('is-urgent');
    showHint();
    updateHud();
    if (!app.reduced()) {
      gsap.from(board.el.querySelectorAll('.tile'), {
        scale: 0,
        opacity: 0,
        transformOrigin: '50% 50%',
        duration: 0.4,
        ease: 'back.out(1.7)',
        stagger: 0.05,
      });
    }
  }

  /* ---------- hint ---------- */
  function hideHint(): void {
    if (app.reduced()) { hint.style.display = 'none'; return; }
    gsap.to(hint, { opacity: 0, duration: 0.3, onComplete: () => (hint.style.display = 'none') });
  }
  function showHint(): void {
    hint.style.display = '';
    gsap.set(hint, { opacity: 1 });
  }

  /* ---------- overlays ---------- */
  function openOverlay(card: HTMLElement): void {
    overlay.replaceChildren(card);
    overlay.removeAttribute('hidden');
    if (app.reduced()) return;
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
    gsap.fromTo(
      card,
      { scale: 0.92, y: 10 },
      { scale: 1, y: 0, duration: 0.4, ease: 'power3.out' },
    );
  }
  function closeOverlay(): void {
    overlay.setAttribute('hidden', 'true');
    overlay.replaceChildren();
  }

  function showWin(): void {
    const card = el(
      'div',
      { class: 'overlay-card overlay-card--win' },
      el('div', { class: 'overlay-shape' }, miniShape(GOAL_LEVEL, 84)),
      el('h2', { class: 'overlay-title', text: '¡Llegaste al círculo!' }),
      el('p', {
        class: 'overlay-sub',
        text: 'Fusionaste hasta el infinito. Seguí sumando puntos o empezá de nuevo.',
      }),
      el(
        'div',
        { class: 'overlay-actions' },
        btn({ label: 'Seguir jugando', variant: 'primary', onClick: () => { sfx.play('click'); closeOverlay(); } }),
        btn({ label: 'Nuevo juego', variant: 'ghost', onClick: () => reset() }),
      ),
    );
    openOverlay(card);
  }

  function showGameOver(cause: 'stuck' | 'time', isBest: boolean): void {
    const level = highestLevel(game);
    const title = cause === 'time' ? '¡Se acabó el tiempo!' : 'Sin movimientos';
    const card = el(
      'div',
      { class: 'overlay-card' },
      el('div', { class: 'overlay-shape' }, miniShape(level, 72)),
      el('h2', { class: 'overlay-title', text: title }),
      isBest && game.score > 0
        ? el('p', { class: 'overlay-badge' }, iconSvg('trophy', 16), el('span', { text: '¡Nuevo récord!' }))
        : null,
      el(
        'div',
        { class: 'overlay-stats' },
        overlayStat('Puntaje', game.score.toLocaleString('es')),
        overlayStat('Mejor', game.best.toLocaleString('es')),
        overlayStat('Mejor forma', tier(level).name),
      ),
      el(
        'div',
        { class: 'overlay-actions' },
        btn({ label: 'Jugar de nuevo', variant: 'primary', onClick: () => reset() }),
        btn({ label: 'Inicio', variant: 'ghost', onClick: () => { sfx.play('back'); app.nav.home(); } }),
      ),
    );
    openOverlay(card);
  }

  /* ---------- input listeners ---------- */
  function onKey(e: KeyboardEvent): void {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const dir = KEYMAP[k];
    if (dir) {
      e.preventDefault();
      void doMove(dir);
      return;
    }
    if ((k === 'z' || k === 'u') && mode.allowUndo) {
      e.preventDefault();
      doUndo();
    }
  }

  let sx = 0;
  let sy = 0;
  let tracking = false;
  function onPointerDown(e: PointerEvent): void {
    tracking = true;
    sx = e.clientX;
    sy = e.clientY;
  }
  function onPointerUp(e: PointerEvent): void {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < 24) return;
    if (ax > ay) void doMove(dx > 0 ? 'right' : 'left');
    else void doMove(dy > 0 ? 'down' : 'up');
  }

  window.addEventListener('keydown', onKey);
  boardHost.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  board.fullRender();
  updateHud();

  return {
    el: el_,
    onEnter() {
      if (app.reduced()) return;
      gsap.from(board.el.querySelectorAll('.tile'), {
        scale: 0,
        opacity: 0,
        transformOrigin: '50% 50%',
        duration: 0.45,
        ease: 'back.out(1.7)',
        stagger: 0.06,
        delay: 0.1,
      });
    },
    destroy() {
      stopTimer();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerup', onPointerUp);
      board.destroy();
    },
  };
}

function overlayStat(label: string, value: string): HTMLElement {
  return el(
    'div',
    { class: 'overlay-stat' },
    el('span', { class: 'overlay-stat-label', text: label }),
    el('span', { class: 'overlay-stat-value', text: value }),
  );
}

/* ---------- daily already-played lock ---------- */
function dailyLockedScreen(app: AppCtx, done: DailyResult): Screen {
  const el_ = el(
    'section',
    { class: 'subscreen' },
    topbar({ onBack: () => { sfx.play('back'); app.nav.home(); }, title: 'Diario' }),
    el(
      'div',
      { class: 'daily-locked' },
      el('div', { class: 'daily-locked-mark', attrs: { 'aria-hidden': 'true' } }, iconSvg('calendar', 40)),
      el('h2', { class: 'overlay-title', text: 'Ya jugaste el diario de hoy' }),
      el('p', {
        class: 'overlay-sub',
        text: done.won
          ? 'Resolviste la tirada de hoy. Volvé mañana para una nueva.'
          : 'Tu tirada de hoy quedó registrada. Volvé mañana para una nueva.',
      }),
      el(
        'div',
        { class: 'overlay-stats' },
        overlayStat('Puntaje', done.score.toLocaleString('es')),
        overlayStat('Jugadas', String(done.moves)),
        overlayStat('Círculo', done.won ? 'Sí' : 'No'),
      ),
      el(
        'div',
        { class: 'overlay-actions' },
        btn({ label: 'Inicio', variant: 'primary', onClick: () => { sfx.play('back'); app.nav.home(); } }),
        btn({ label: 'Cambiar modo', variant: 'ghost', onClick: () => { sfx.play('click'); app.nav.modes(); } }),
      ),
    ),
  );
  return { el: el_ };
}
