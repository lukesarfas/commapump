/**
 * One shared AudioContext, created lazily and unlocked inside a user gesture
 * (iOS needs both a resume() and a silent buffer played on first touch). When
 * Web Audio is unavailable the getter returns null instead of throwing, so the
 * engine can degrade to a silent, visual-only experience.
 */

import { isAudioAvailable } from "../transport/capabilities";

let ctx: AudioContext | null = null;

/** Lazily create the shared context. Returns null if Web Audio is unavailable. */
export function getAudioContext(): AudioContext | null {
  if (ctx) return ctx;
  if (!isAudioAvailable()) return null;
  try {
    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

export async function unlockAudio(): Promise<AudioContext | null> {
  const c = getAudioContext();
  if (!c) return null;
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* ignore */
    }
  }
  // iOS: a one-sample silent buffer on the gesture frees the context.
  try {
    const buffer = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
  return c;
}

export function audioReady(): boolean {
  return ctx != null && ctx.state === "running";
}
