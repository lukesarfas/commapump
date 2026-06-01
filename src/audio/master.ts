/** Master bus: output gain into a soft limiter so stacked just chords can't clip. */

export interface Master {
  readonly input: GainNode;
  setVolume(v: number): void;
}

export function createMaster(ctx: AudioContext): Master {
  const gain = ctx.createGain();
  gain.gain.value = 0.85;

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 20;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;

  gain.connect(limiter);
  limiter.connect(ctx.destination);

  return {
    input: gain,
    setVolume: (v) => {
      gain.gain.value = v;
    },
  };
}
