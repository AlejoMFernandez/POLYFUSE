/* ============================================================
   POLYFUSE · Home screen.
   ============================================================ */

import gsap from 'gsap';
import { sfx } from '../../audio/sfx';
import { MAX_LEVEL } from '../../engine/content';
import { getBest } from '../../engine/storage';
import { el } from '../../lib/dom';
import type { AppCtx, Screen } from '../app';
import { btn, iconSvg, miniShape } from '../components';

export function createHomeScreen(app: AppCtx): Screen {
  const strip = el('div', { class: 'poly-strip', attrs: { 'aria-hidden': 'true' } });
  for (let lvl = 0; lvl <= MAX_LEVEL; lvl++) {
    strip.appendChild(el('div', { class: 'poly-strip-item' }, miniShape(lvl, 34)));
  }

  const best = getBest(app.modeId, app.mapId);

  const go = (fn: () => void) => () => {
    sfx.play('click');
    fn();
  };

  const footer = el(
    'button',
    {
      class: 'home-chip',
      attrs: { 'aria-label': 'Cambiar modo y mapa' },
      on: { click: go(app.nav.modes) },
    },
    el('span', { class: 'home-chip-mode', text: app.mode().name }),
    el('span', { class: 'home-chip-dot', text: '·' }),
    el('span', { text: app.map().name }),
    best > 0 &&
      el(
        'span',
        { class: 'home-chip-best' },
        iconSvg('trophy', 14),
        el('span', { text: best.toLocaleString('es') }),
      ),
  );

  const el_ = el(
    'section',
    { class: 'home' },
    el(
      'div',
      { class: 'home-hero' },
      el('h1', { class: 'wordmark', text: 'POLYFUSE' }),
      el('p', {
        class: 'tagline',
        text: 'Fusioná polígonos, sumá lados, llegá al círculo.',
      }),
    ),
    strip,
    el(
      'div',
      { class: 'home-actions' },
      btn({ label: 'Jugar', icon: 'play', variant: 'primary', full: true, onClick: go(app.nav.play) }),
      el(
        'div',
        { class: 'home-grid' },
        btn({ label: 'Modos', icon: 'modes', variant: 'ghost', onClick: go(app.nav.modes) }),
        btn({ label: 'Mapas', icon: 'grid', variant: 'ghost', onClick: go(app.nav.maps) }),
        btn({ label: 'Ajustes', icon: 'sliders', variant: 'ghost', onClick: go(app.nav.settings) }),
        btn({ label: 'Cómo jugar', icon: 'info', variant: 'ghost', onClick: go(app.nav.help) }),
      ),
    ),
    footer,
  );

  return {
    el: el_,
    onEnter() {
      if (app.reduced()) return;
      gsap.from(strip.querySelectorAll('.poly-strip-item'), {
        opacity: 0,
        y: 10,
        scale: 0.7,
        duration: 0.5,
        ease: 'back.out(1.7)',
        stagger: 0.045,
        delay: 0.15,
      });
      gsap.from('.wordmark', { opacity: 0, y: 16, duration: 0.6, ease: 'power3.out' });
    },
  };
}
