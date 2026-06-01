/**
 * A single synthesized note. The timbre is deliberately harmonic-rich (a couple
 * of partials) so the beating between pure and tempered intervals is audible —
 * that beating is the whole point. Voices can be retuned live (the JI⇄ET toggle)
 * by gliding the oscillator frequency.
 */

export interface VoiceOptions {
  /** peak gain before the master bus */
  gain?: number;
  type?: OscillatorType;
}

export interface Voice {
  setFreq(freq: number, when: number): void;
  release(when: number): void;
}

export function createVoice(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  start: number,
  durSec: number,
  opts: VoiceOptions = {},
): Voice {
  const peak = opts.gain ?? 0.2;
  const attack = 0.012;
  const decay = 0.14;
  const sustain = 0.62;
  const rel = 0.22;
  const end = start + Math.max(durSec, attack + decay);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.linearRampToValueAtTime(peak, start + attack);
  amp.gain.linearRampToValueAtTime(peak * sustain, start + attack + decay);
  amp.gain.setValueAtTime(peak * sustain, Math.max(start + attack + decay, end - rel));
  amp.gain.linearRampToValueAtTime(0.0001, end);
  amp.connect(dest);

  // Fundamental + a quiet octave partial for body.
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? "triangle";
  osc.frequency.setValueAtTime(freq, start);
  osc.connect(amp);
  osc.start(start);
  osc.stop(end + 0.05);

  const partial = ctx.createGain();
  partial.gain.value = 0.18;
  partial.connect(amp);
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2, start);
  osc2.connect(partial);
  osc2.start(start);
  osc2.stop(end + 0.05);

  return {
    setFreq(f, when) {
      osc.frequency.setTargetAtTime(f, when, 0.03);
      osc2.frequency.setTargetAtTime(f * 2, when, 0.03);
    },
    release(when) {
      try {
        amp.gain.cancelScheduledValues(when);
        amp.gain.setTargetAtTime(0.0001, when, 0.04);
        osc.stop(when + 0.2);
        osc2.stop(when + 0.2);
      } catch {
        /* already stopped */
      }
    },
  };
}
