/**
 * Embeddable applet — the full thing in miniature: synthesis from exact ratios,
 * all four visualizations on one playhead, and a JI⇄ET toggle. Self-contained;
 * bundled and inlined by build-applet.mjs. Audio is gated behind the play gesture
 * (the hub iframe grants no autoplay).
 */
import { schedule, PUMP_IVIIVI } from "../core/index";
import { TransportStore } from "../transport/store";
import { AudioEngine } from "../audio/engine";
import { Stage } from "../viz/stage";

function byId<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function init(): void {
  const stageEl = byId("stage");
  const switchEl = byId("switch");
  const playBtn = byId<HTMLButtonElement>("play");
  const modeBtn = byId<HTMLButtonElement>("mode");
  const readout = byId("readout");

  const cycles = 4;
  const result = schedule(PUMP_IVIIVI, { cycles });
  const store = new TransportStore({ progressionId: PUMP_IVIIVI.id, cycles, bpm: 90 });
  const engine = new AudioEngine(store);
  engine.load(result);

  const stage = new Stage({ host: stageEl, store, getBeat: () => engine.getBeat(), result });
  stage.start();

  for (const v of stage.list()) {
    const b = document.createElement("button");
    b.className = "tab";
    b.type = "button";
    b.textContent = v.label;
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(v.id === stage.currentId()));
    b.addEventListener("click", () => {
      stage.show(v.id);
      switchEl.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", "false"));
      b.setAttribute("aria-selected", "true");
    });
    switchEl.append(b);
  }

  playBtn.addEventListener("click", () => engine.toggle());
  modeBtn.addEventListener("click", () => engine.setTuning(store.get().tuning === "JI" ? "ET" : "JI"));

  store.subscribe((s) => {
    playBtn.textContent = s.playing ? "⏸ Pause" : "▶ Play";
    modeBtn.textContent = s.tuning === "JI" ? "Just intonation" : "Equal temperament";
    modeBtn.setAttribute("aria-pressed", String(s.tuning === "ET"));
    const drift = s.tuning === "JI" ? result.driftPerCycleCents.toFixed(1) + "¢ / cycle" : "no drift";
    readout.textContent = `I–vi–ii–V–I · ${s.tuning} · ${drift}`;
  });

  try {
    parent.postMessage({ type: "applet:ready" }, "*");
  } catch {
    /* not embedded */
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
