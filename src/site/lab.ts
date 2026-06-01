/**
 * Full-site controller. One audio engine and one visualization stage, driven
 * two ways: the scroll-story activates scenes as they pass the centre of the
 * viewport, and the playground controls below let you drive it by hand. Both
 * write to the same transport store, so they never disagree.
 */

import { schedule, EXAMPLES, PUMP_IVIIVI, type Progression, type ScheduleResult } from "../core/index";
import { TransportStore } from "../transport/store";
import { AudioEngine } from "../audio/engine";
import { Stage } from "../viz/stage";
import { SCENES, type Scene } from "../content/beats";

function $<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function progressionById(id: string): Progression {
  return EXAMPLES.find((e) => e.id === id) ?? PUMP_IVIIVI;
}

export function initLab(): void {
  const stageEl = $("lab-stage");
  if (!stageEl) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = new TransportStore({ cycles: 4, bpm: 90, progressionId: PUMP_IVIIVI.id });
  const engine = new AudioEngine(store);

  let current = PUMP_IVIIVI;
  let result: ScheduleResult = schedule(current, { cycles: store.get().cycles });
  engine.load(result);

  const stage = new Stage({ host: stageEl, store, getBeat: () => engine.getBeat(), result });
  stage.start();

  // Browsers gate audio behind a gesture; unlock on the first interaction so the
  // scroll-story's autoplay scenes actually sound (and animate) once the reader
  // has touched the page.
  const unlock = (): void => void engine.unlock();
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });

  function loadProgression(prog: Progression, opts: { play?: boolean; tuning?: "JI" | "ET" } = {}): void {
    current = prog;
    const cycles = prog.kind === "melodic" ? 1 : store.get().cycles;
    result = schedule(prog, { cycles });
    engine.load(result);
    stage.setResult(result);
    store.set({ progressionId: prog.id });
    engine.seek(0);
    if (opts.tuning) engine.setTuning(opts.tuning);
    if (opts.play && !reduced) void engine.play();
    else engine.pause();
  }

  // ---- visualization tabs -------------------------------------------------
  const tabsEl = $("lab-tabs");
  if (tabsEl) {
    for (const v of stage.list()) {
      const b = document.createElement("button");
      b.className = "tab";
      b.type = "button";
      b.textContent = v.label;
      b.dataset.viz = v.id;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(v.id === stage.currentId()));
      b.addEventListener("click", () => selectViz(v.id));
      tabsEl.append(b);
    }
  }
  function selectViz(id: string): void {
    stage.show(id);
    tabsEl?.querySelectorAll<HTMLButtonElement>(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.viz === id)));
  }

  // ---- transport controls -------------------------------------------------
  const playBtn = $<HTMLButtonElement>("lab-play");
  const modeBtn = $<HTMLButtonElement>("lab-mode");
  const readout = $("lab-readout");
  const live = $("lab-live");
  const tempo = $<HTMLInputElement>("lab-tempo");
  const cycles = $<HTMLInputElement>("lab-cycles");
  const cyclesOut = $("lab-cycles-out");

  playBtn?.addEventListener("click", () => engine.toggle());
  modeBtn?.addEventListener("click", () => engine.setTuning(store.get().tuning === "JI" ? "ET" : "JI"));
  tempo?.addEventListener("input", () => engine.setTempo(Number(tempo.value)));
  cycles?.addEventListener("input", () => {
    store.set({ cycles: Number(cycles.value) });
    if (cyclesOut) cyclesOut.textContent = cycles.value;
    if (current.kind !== "melodic") loadProgression(current);
  });

  // ---- example picker (playground) ---------------------------------------
  const examplesEl = $("lab-examples");
  if (examplesEl) {
    for (const ex of EXAMPLES) {
      const b = document.createElement("button");
      b.className = "chip";
      b.type = "button";
      b.textContent = ex.name;
      b.dataset.example = ex.id;
      b.addEventListener("click", () => {
        loadProgression(ex, { play: true });
        markExample(ex.id);
      });
      examplesEl.append(b);
    }
    markExample(current.id);
  }
  function markExample(id: string): void {
    examplesEl?.querySelectorAll<HTMLButtonElement>(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.example === id)));
  }

  // ---- reflect state into the UI -----------------------------------------
  store.subscribe((s) => {
    if (playBtn) playBtn.textContent = s.playing ? "⏸ Pause" : "▶ Play";
    if (modeBtn) {
      modeBtn.textContent = s.tuning === "JI" ? "Just intonation" : "Equal temperament";
      modeBtn.setAttribute("aria-pressed", String(s.tuning === "ET"));
    }
    if (readout) {
      const drift = current.kind === "melodic" || s.tuning === "ET" ? "" : ` · ${result.driftPerCycleCents.toFixed(1)}¢/cycle`;
      readout.textContent = `${current.name} · ${s.tuning}${drift}`;
    }
    if (cyclesOut && cycles) cyclesOut.textContent = cycles.value;
  });

  // ---- scroll-story -------------------------------------------------------
  const steps = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"));
  let activeScene = "";
  function activate(scene: Scene): void {
    if (scene.id === activeScene) return;
    activeScene = scene.id;
    const prog = progressionById(scene.exampleId);
    const changed = prog.id !== current.id;
    if (changed) loadProgression(prog, { tuning: scene.tuning });
    else {
      engine.seek(0);
      if (scene.tuning) engine.setTuning(scene.tuning);
    }
    if (current.id === prog.id) markExample(prog.id);
    selectViz(scene.viz);
    if (scene.autoplay && !reduced) void engine.play();
    else engine.pause();
    if (live) live.textContent = `${scene.title}. Showing ${scene.viz}, ${scene.tuning ?? store.get().tuning} tuning.`;
  }

  if (steps.length) {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target as HTMLElement | undefined;
        const id = top?.dataset.scene;
        const scene = SCENES.find((s) => s.id === id);
        if (scene) activate(scene);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.5, 1] },
    );
    steps.forEach((s) => io.observe(s));
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initLab);
else initLab();
