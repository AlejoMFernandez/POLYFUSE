/* ============================================================
   POLYFUSE · Map selection.
   ============================================================ */

import gsap from 'gsap';
import { sfx } from '../../audio/sfx';
import { MAPS } from '../../engine/content';
import { el } from '../../lib/dom';
import type { AppCtx, Screen } from '../app';
import { mapPreview, topbar } from '../components';

export function createMapsScreen(app: AppCtx): Screen {
  const grid = el('div', { class: 'map-grid' });

  for (const map of MAPS) {
    const selected = map.id === app.mapId;
    const cells = map.cols * map.rows - map.blocked.length;
    const card = el(
      'button',
      {
        class: `map-card${selected ? ' is-selected' : ''}`,
        attrs: { 'aria-pressed': String(selected) },
        on: {
          click: () => {
            sfx.play('click');
            app.setMap(map.id);
            app.nav.home();
          },
        },
      },
      el('span', { class: 'map-card-preview' }, mapPreview(map, 96)),
      el('span', { class: 'map-card-title', text: map.name }),
      el('span', { class: 'map-card-dims', text: `${map.cols}×${map.rows} · ${cells} celdas` }),
      el('span', { class: 'map-card-desc', text: map.desc }),
    );
    grid.appendChild(card);
  }

  const el_ = el(
    'section',
    { class: 'subscreen' },
    topbar({ onBack: () => { sfx.play('back'); app.nav.home(); }, title: 'Mapas' }),
    grid,
  );

  return {
    el: el_,
    onEnter() {
      if (app.reduced()) return;
      gsap.from(grid.querySelectorAll('.map-card'), {
        opacity: 0,
        y: 16,
        scale: 0.96,
        duration: 0.45,
        ease: 'power3.out',
        stagger: 0.07,
      });
    },
  };
}
