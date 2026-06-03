/* ============================================================
   POLYFUSE · Settings.
   ============================================================ */

import { sfx } from '../../audio/sfx';
import { resetAll, type MotionPref } from '../../engine/storage';
import { el } from '../../lib/dom';
import type { AppCtx, Screen } from '../app';
import { topbar } from '../components';

function settingRow(title: string, desc: string, control: HTMLElement): HTMLElement {
  return el(
    'div',
    { class: 'setting-row' },
    el(
      'div',
      { class: 'setting-text' },
      el('span', { class: 'setting-title', text: title }),
      el('span', { class: 'setting-desc', text: desc }),
    ),
    control,
  );
}

function toggle(checked: boolean, onChange: (v: boolean) => void): HTMLButtonElement {
  const sw = el('button', {
    class: 'switch',
    attrs: { role: 'switch', 'aria-checked': String(checked) },
  });
  sw.appendChild(el('span', { class: 'switch-thumb' }));
  sw.addEventListener('click', () => {
    const next = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(next));
    sfx.play('click');
    onChange(next);
  });
  return sw;
}

function segmented<T extends string>(
  options: { value: T; label: string }[],
  current: T,
  onChange: (v: T) => void,
): HTMLElement {
  const group = el('div', { class: 'segmented', attrs: { role: 'group' } });
  const buttons: HTMLButtonElement[] = [];
  for (const opt of options) {
    const b = el('button', {
      class: `seg${opt.value === current ? ' is-active' : ''}`,
      text: opt.label,
      attrs: { 'aria-pressed': String(opt.value === current) },
    });
    b.addEventListener('click', () => {
      buttons.forEach((x) => {
        x.classList.remove('is-active');
        x.setAttribute('aria-pressed', 'false');
      });
      b.classList.add('is-active');
      b.setAttribute('aria-pressed', 'true');
      sfx.play('click');
      onChange(opt.value);
    });
    buttons.push(b);
    group.appendChild(b);
  }
  return group;
}

export function createSettingsScreen(app: AppCtx): Screen {
  const s = app.settings;

  const resetBtn = el('button', { class: 'btn btn--danger', text: 'Borrar datos' });
  let armed = false;
  resetBtn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      resetBtn.textContent = '¿Seguro? Tocá de nuevo';
      sfx.play('back');
      setTimeout(() => {
        armed = false;
        resetBtn.textContent = 'Borrar datos';
      }, 2600);
      return;
    }
    resetAll();
    sfx.play('over');
    resetBtn.textContent = 'Listo, datos borrados';
    resetBtn.setAttribute('disabled', 'true');
  });

  const el_ = el(
    'section',
    { class: 'subscreen' },
    topbar({ onBack: () => { sfx.play('back'); app.nav.home(); }, title: 'Ajustes' }),
    el(
      'div',
      { class: 'settings-list' },
      settingRow(
        'Sonido',
        'Tonos suaves al fusionar y navegar.',
        toggle(s.sound, (v) => app.patchSettings({ sound: v })),
      ),
      settingRow(
        'Mostrar lados',
        'Número de lados sobre cada polígono.',
        toggle(s.showSides, (v) => app.patchSettings({ showSides: v })),
      ),
      settingRow(
        'Movimiento',
        'Animaciones. “Sistema” respeta tus preferencias de accesibilidad.',
        segmented<MotionPref>(
          [
            { value: 'system', label: 'Sistema' },
            { value: 'on', label: 'Activado' },
            { value: 'off', label: 'Reducido' },
          ],
          s.motion,
          (v) => app.patchSettings({ motion: v }),
        ),
      ),
    ),
    el(
      'div',
      { class: 'settings-danger' },
      el('p', {
        class: 'setting-desc',
        text: 'Reinicia récords, modo diario y preferencias en este navegador.',
      }),
      resetBtn,
    ),
    el('p', { class: 'credits', text: 'POLYFUSE · hecho con SVG, GSAP y Howler.' }),
  );

  return { el: el_ };
}
