/**
 * Feature detection for the browser APIs the lab leans on. Computed once and
 * frozen so the audio engine, the stage, and the UI all agree on what degrades.
 * No throwing: every probe is defensive so a hostile or stripped-down host can't
 * blank the page just by lacking a constructor.
 */

export interface Capabilities {
  /** window.AudioContext or the webkit-prefixed fallback exists. */
  audio: boolean;
  /** A <canvas> hands back a 2D context. */
  canvas2d: boolean;
  /** IntersectionObserver exists (used to pause the rAF loop offscreen). */
  intersectionObserver: boolean;
}

function detectAudio(): boolean {
  try {
    return typeof window !== "undefined" && (window.AudioContext != null || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext != null);
  } catch {
    return false;
  }
}

function detectCanvas2d(): boolean {
  try {
    if (typeof document === "undefined") return false;
    const c = document.createElement("canvas");
    return typeof c.getContext === "function" && c.getContext("2d") != null;
  } catch {
    return false;
  }
}

function detectIntersectionObserver(): boolean {
  try {
    return typeof IntersectionObserver === "function";
  } catch {
    return false;
  }
}

let cached: Capabilities | null = null;

/** Probe the host once; subsequent calls return the same frozen result. */
export function capabilities(): Capabilities {
  if (!cached) {
    cached = Object.freeze({
      audio: detectAudio(),
      canvas2d: detectCanvas2d(),
      intersectionObserver: detectIntersectionObserver(),
    });
  }
  return cached;
}

/** Convenience: can we synthesize sound at all on this host? */
export function isAudioAvailable(): boolean {
  return capabilities().audio;
}
