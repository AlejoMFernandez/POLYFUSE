/* ============================================================
   POLYFUSE · Mode selection.
   ============================================================ */

import gsap from 'gsap';
import { sfx } from '../../audio/sfx';
import { MODES } from '../../engine/content';
import { getBest } from '../../engine/storage';
import { el } from '../../lib/dom';
import type { AppCtx, Screen } from '../app';
import { iconSvg, topbar } from '../components';

const MODE_ICON: Record<string, string> = {
  classic: 'modes',
  timeattack: 'clock',
  zen: 'spark',
  daily: 'calendar',
};

export function createModesScreen(app: AppCtx): Screen {
  const list = el('div', { class: 'select-list' });

  for (const mode of MODES) {
    const selected = mode.id === app.modeId;
    const best = getBest(mode.id, app.mapId);
    const card = el(
      'button',
      {
        class: `select-card${selected ? ' is-selected' : ''}`,
        attrs: { 'aria-pressed': String(selected) },
        on: {
          click: () => {
            sfx.play('click');
            app.setMode(mode.id);
            app.nav.home();
          },
        },
      },
      el('span', { class: 'select-card-icon' }, iconSvg(MODE_ICON[mode.id] ?? 'modes', 22)),
      el(
        'span',
        { class: 'select-card-body' },
        el('span', { class: 'select-card-title', text: mode.name }),
        el('span', { class: 'select-card-desc', text: mode.desc }),
      ),
      best > 0 &&
        el(
          'span',
          { class: 'select-card-meta' },
          iconSvg('trophy', 13),
          el('span', { text: best.toLocaleString('es') }),
        ),
    );
    list.appendChild(card);
  }

  const el_ = el(
    'section',
    { class: 'subscreen' },
    topbar({ onBack: () => { sfx.play('back'); app.nav.home(); }, title: 'Modos de juego' }),
    list,
  );

  return {
    el: el_,
    onEnter() {
      if (app.reduced()) return;
      gsap.from(list.querySelectorAll('.select-card'), {
        opacity: 0,
        y: 14,
        duration: 0.45,
        ease: 'power3.out',
        stagger: 0.06,
      });
    },
  };
}
