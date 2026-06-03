/* ============================================================
   POLYFUSE · How to play.
   ============================================================ */

import { sfx } from '../../audio/sfx';
import { GOAL_LEVEL, MAX_LEVEL } from '../../engine/content';
import { el } from '../../lib/dom';
import { miniShape, topbar } from '../components';
import type { AppCtx, Screen } from '../app';

function step(n: number, title: string, body: string, visual?: HTMLElement): HTMLElement {
  return el(
    'li',
    { class: 'help-step' },
    el('span', { class: 'help-step-num', text: String(n) }),
    el(
      'div',
      { class: 'help-step-text' },
      el('h3', { class: 'help-step-title', text: title }),
      el('p', { class: 'help-step-body', text: body }),
      visual,
    ),
  );
}

/** A small "A + A = B" merge illustration. */
function mergeDemo(a: number, b: number): HTMLElement {
  return el(
    'div',
    { class: 'help-demo', attrs: { 'aria-hidden': 'true' } },
    miniShape(a, 40),
    el('span', { class: 'help-demo-op', text: '+' }),
    miniShape(a, 40),
    el('span', { class: 'help-demo-op', text: '=' }),
    miniShape(b, 46),
  );
}

/** The full triangle → circle progression as a wrapping ribbon. */
function ladder(): HTMLElement {
  const row = el('div', { class: 'help-ladder', attrs: { 'aria-hidden': 'true' } });
  for (let lvl = 0; lvl <= MAX_LEVEL; lvl++) {
    row.appendChild(el('span', { class: 'help-ladder-item' }, miniShape(lvl, 30)));
    if (lvl < MAX_LEVEL) row.appendChild(el('span', { class: 'help-ladder-arrow', text: '→' }));
  }
  return row;
}

export function createHelpScreen(app: AppCtx): Screen {
  const el_ = el(
    'section',
    { class: 'subscreen' },
    topbar({ onBack: () => { sfx.play('back'); app.nav.home(); }, title: 'Cómo jugar' }),
    el(
      'div',
      { class: 'help-body' },
      el('p', {
        class: 'help-lead',
        text: 'POLYFUSE es un puzzle de deslizar y fusionar. Combiná polígonos iguales para sumarles un lado, una y otra vez, hasta alcanzar el círculo.',
      }),
      el(
        'ol',
        { class: 'help-steps' },
        step(
          1,
          'Deslizá',
          'Usá las flechas, WASD o deslizá con el dedo. Todas las formas viajan hacia ese lado hasta chocar.',
        ),
        step(
          2,
          'Fusioná iguales',
          'Cuando dos formas idénticas se tocan, se funden en la siguiente: triángulo + triángulo dan un cuadrado.',
          mergeDemo(0, 1),
        ),
        step(
          3,
          'Subí de lado',
          'Cada fusión agrega un lado y vale más puntos. El tablero suma una forma nueva en cada movimiento.',
          ladder(),
        ),
        step(
          4,
          'Llegá al círculo',
          'El círculo es el infinito: la meta. Tras un dodecágono, la última fusión lo desbloquea.',
          el('div', { class: 'help-goal', attrs: { 'aria-hidden': 'true' } }, miniShape(GOAL_LEVEL, 56)),
        ),
      ),
      el('p', {
        class: 'help-tip',
        text: 'Consejo: mantené tus formas grandes en una esquina y construí a su alrededor. Las paredes de algunos mapas parten el tablero: usalas a tu favor.',
      }),
    ),
  );

  return { el: el_ };
}
