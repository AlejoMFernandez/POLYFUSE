/* ============================================================
   POLYFUSE · App shell — global state, screen router, boot.
   ============================================================ */

import gsap from 'gsap';
import { sfx } from '../audio/sfx';
import { mapById, modeById } from '../engine/content';
import { getSettings, saveSettings, type Settings } from '../engine/storage';
import type { MapDef, ModeDef } from '../engine/types';
import { createGameScreen } from './screens/game';
import { createHelpScreen } from './screens/help';
import { createHomeScreen } from './screens/home';
import { createMapsScreen } from './screens/maps';
import { createModesScreen } from './screens/modes';
import { createSettingsScreen } from './screens/settings';

export interface Screen {
  el: HTMLElement;
  onEnter?(): void;
  destroy?(): void;
}

export interface AppCtx {
  root: HTMLElement;
  settings: Settings;
  modeId: string;
  mapId: string;
  mode(): ModeDef;
  map(): MapDef;
  reduced(): boolean;
  setMode(id: string): void;
  setMap(id: string): void;
  patchSettings(patch: Partial<Settings>): void;
  nav: AppNav;
}

interface AppNav {
  home(): void;
  modes(): void;
  maps(): void;
  settings(): void;
  help(): void;
  play(): void;
}

export class App implements AppCtx {
  root: HTMLElement;
  settings: Settings;
  modeId = 'classic';
  mapId = 'classic';
  private current?: Screen;
  private mql = window.matchMedia('(prefers-reduced-motion: reduce)');

  nav: AppNav = {
    home: () => this.show(createHomeScreen(this)),
    modes: () => this.show(createModesScreen(this)),
    maps: () => this.show(createMapsScreen(this)),
    settings: () => this.show(createSettingsScreen(this)),
    help: () => this.show(createHelpScreen(this)),
    play: () => this.show(createGameScreen(this)),
  };

  constructor(root: HTMLElement) {
    this.root = root;
    this.settings = getSettings();
    sfx.init(this.settings.sound);
  }

  mode(): ModeDef {
    return modeById(this.modeId);
  }
  map(): MapDef {
    return mapById(this.mapId);
  }
  reduced(): boolean {
    if (this.settings.motion === 'on') return false;
    if (this.settings.motion === 'off') return true;
    return this.mql.matches;
  }
  setMode(id: string): void {
    this.modeId = id;
  }
  setMap(id: string): void {
    this.mapId = id;
  }
  patchSettings(patch: Partial<Settings>): void {
    this.settings = saveSettings(patch);
    if ('sound' in patch) sfx.setEnabled(this.settings.sound);
  }

  start(): void {
    this.show(createHomeScreen(this));
  }

  private show(next: Screen): void {
    const prev = this.current;
    next.el.classList.add('screen');
    this.root.appendChild(next.el);

    const reduced = this.reduced();
    const dur = reduced ? 0 : 0.36;

    if (prev) {
      const prevScreen = prev;
      let cleaned = false;
      const cleanup = (): void => {
        if (cleaned) return;
        cleaned = true;
        prevScreen.destroy?.();
        prevScreen.el.remove();
      };
      gsap.to(prevScreen.el, {
        opacity: 0,
        y: -8,
        duration: dur * 0.55,
        ease: 'power2.in',
        onComplete: cleanup,
      });
      // Safety net for paused requestAnimationFrame (e.g. a hidden tab):
      // guarantee the previous screen is destroyed and removed even if the
      // tween's onComplete never fires, so listeners don't leak and screens
      // don't accumulate.
      window.setTimeout(cleanup, dur * 1000 + 300);
    }
    gsap.fromTo(
      next.el,
      { opacity: 0, y: reduced ? 0 : 14 },
      { opacity: 1, y: 0, duration: dur, ease: 'power3.out', delay: prev ? dur * 0.2 : 0 },
    );

    this.current = next;
    next.onEnter?.();
  }
}

export function boot(root: HTMLElement): void {
  const app = new App(root);
  app.start();
}
