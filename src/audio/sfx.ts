/* ============================================================
   POLYFUSE · Sound. Tones are synthesised to WAV data-URIs at boot
   (no asset files) and played through Howler, which manages global
   mute/volume and the autoplay unlock. Merges are pitched up by tier
   for an ascending-reward feel. Moves/spawns are intentionally silent
   (too frequent — see the motion frequency gate).
   ============================================================ */

import { Howl, Howler } from 'howler';

const SR = 44100;

type Wave = 'sine' | 'triangle';

interface ToneSpec {
  freqs: number[]; // summed partials (a single freq, or a chord)
  dur: number; // seconds
  wave?: Wave;
  gain?: number;
  attack?: number;
  decay?: number; // exponential tail factor
}

function sample(wave: Wave, phase: number): number {
  if (wave === 'triangle') return 2 * Math.abs(2 * (phase - Math.floor(phase + 0.5))) - 1;
  return Math.sin(phase * 2 * Math.PI);
}

/** Render a tone to a 16-bit mono WAV data-URI. */
function toneWav(spec: ToneSpec): string {
  const { freqs, dur, wave = 'sine', gain = 0.5, attack = 0.005, decay = 4.5 } = spec;
  const n = Math.floor(SR * dur);
  const buf = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buf);

  const writeStr = (off: number, s: string): void => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + n * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SR, true);
  view.setUint32(28, SR * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, n * 2, true);

  const norm = gain / freqs.length;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env =
      Math.min(1, t / attack) * Math.exp(-decay * (t / dur)) * (1 - t / dur);
    let s = 0;
    for (const f of freqs) s += sample(wave, t * f);
    const v = Math.max(-1, Math.min(1, s * norm * env));
    view.setInt16(44 + i * 2, v * 0x7fff, true);
  }

  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

type SfxName = 'merge' | 'click' | 'back' | 'win' | 'over' | 'undo' | 'newbest';

const SPECS: Record<SfxName, ToneSpec> = {
  merge: { freqs: [523.25], dur: 0.16, wave: 'sine', gain: 0.45, decay: 5 },
  click: { freqs: [392, 587.33], dur: 0.07, wave: 'triangle', gain: 0.28, decay: 7 },
  back: { freqs: [330, 247], dur: 0.09, wave: 'triangle', gain: 0.26, decay: 7 },
  undo: { freqs: [294, 196], dur: 0.1, wave: 'sine', gain: 0.3, decay: 6 },
  win: { freqs: [523.25, 659.25, 783.99, 1046.5], dur: 0.7, wave: 'sine', gain: 0.5, decay: 2.2 },
  over: { freqs: [220, 174.61], dur: 0.5, wave: 'sine', gain: 0.4, decay: 2.5 },
  newbest: { freqs: [659.25, 987.77], dur: 0.35, wave: 'sine', gain: 0.45, decay: 3 },
};

class SoundEngine {
  private sounds = new Map<SfxName, Howl>();
  private ready = false;
  private enabled = true;

  init(enabled: boolean): void {
    if (this.ready) {
      this.setEnabled(enabled);
      return;
    }
    this.enabled = enabled;
    try {
      for (const name of Object.keys(SPECS) as SfxName[]) {
        this.sounds.set(name, new Howl({ src: [toneWav(SPECS[name])], preload: true }));
      }
      Howler.volume(0.85);
      Howler.mute(!enabled);
      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.ready) Howler.mute(!enabled);
  }

  play(name: SfxName, rate = 1): void {
    if (!this.ready || !this.enabled) return;
    const h = this.sounds.get(name);
    if (!h) return;
    const id = h.play();
    if (rate !== 1) h.rate(rate, id);
  }

  /** Merge tone pitched up with the resulting tier. */
  merge(level: number): void {
    this.play('merge', 1 + Math.min(level, 10) * 0.05);
  }
}

export const sfx = new SoundEngine();
