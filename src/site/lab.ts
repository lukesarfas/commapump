/**
 * Full-site controller. One audio engine and one visualization stage, driven
 * two ways: the scroll-story activates scenes as they pass the centre of the
 * viewport, and the playground controls below let you drive it by hand. Both
 * write to the same transport store, so they never disagree.
 */

import { schedule, EXAMPLES, PUMP_IVIIVI, type Progression, type ScheduleResult } from "../core/index";
import { capabilities } from "../transport/capabilities";
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

  // The scroll-story drives the lab during a passive read-through, but the
  // moment the reader grabs any playground control their choice must stick — the
  // narrative must not scroll past and clobber an explicit tab/tuning/example/
  // play selection. Latched on the first manual interaction.
  let userDriven = false;
  const takeControl = (): void => void (userDriven = true);

  const stage = new Stage({ host: stageEl, store, getBeat: () => engine.getBeat(), result });
  stage.start();

  // Announce state changes to screen readers (SPEC §4.3). The visible readout is
  // aria-live="off", and the scroll-story live region only fires while the story
  // drives the lab — so manual tuning/example/viz/tempo changes would otherwise
  // be silent to AT. Debounced so dragging a slider doesn't flood the queue.
  let announceTimer = 0;
  function announce(text: string): void {
    const live = $("lab-live");
    if (!live) return;
    clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
      live.textContent = text;
    }, 250);
  }

  // Reveal the UI-app's audio-unavailable slot and neutralize transport controls
  // when this host can't synthesize. Visuals and the drift readout still work.
  if (!engine.isAvailable()) {
    $("lab-audio-unavailable")?.removeAttribute("hidden");
    const play = $<HTMLButtonElement>("lab-play");
    if (play) {
      play.disabled = true;
      play.setAttribute("aria-disabled", "true");
    }
  }

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
  // APG tablist: the stage is the single tabpanel (aria-controls), one tab is the
  // tab stop at a time (roving tabindex), and Left/Right/Home/End move focus.
  const tabsEl = $("lab-tabs");
  const STAGE_ID = "lab-stage";
  if (tabsEl) {
    for (const v of stage.list()) {
      const b = document.createElement("button");
      b.className = "tab";
      b.type = "button";
      b.id = `lab-tab-${v.id}`;
      b.textContent = v.label;
      b.dataset.viz = v.id;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", STAGE_ID);
      const selected = v.id === stage.currentId();
      b.setAttribute("aria-selected", String(selected));
      b.tabIndex = selected ? 0 : -1;
      b.addEventListener("click", () => {
        takeControl();
        selectViz(v.id, { announce: true });
      });
      tabsEl.append(b);
    }
    tabsEl.addEventListener("keydown", (e) => {
      const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (!keys.includes(e.key)) return;
      const tabs = Array.from(tabsEl.querySelectorAll<HTMLButtonElement>(".tab"));
      const i = tabs.findIndex((t) => t === document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const next =
        e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : (i + 1) % tabs.length;
      const target = tabs[next];
      takeControl();
      selectViz(target.dataset.viz!, { announce: true });
      target.focus();
    });
    // Point the panel at the initially-selected tab without re-announcing.
    $(STAGE_ID)?.setAttribute("aria-labelledby", `lab-tab-${stage.currentId()}`);
    setHowTo(stage.currentId());
  }
  function setHowTo(id: string): void {
    const howto = $("lab-howto");
    if (howto) howto.textContent = stage.list().find((v) => v.id === id)?.howToRead ?? "";
  }
  function selectViz(id: string, opts: { announce?: boolean } = {}): void {
    stage.show(id);
    tabsEl?.querySelectorAll<HTMLButtonElement>(".tab").forEach((t) => {
      const on = t.dataset.viz === id;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    const stageEl2 = $(STAGE_ID);
    if (stageEl2) stageEl2.setAttribute("aria-labelledby", `lab-tab-${id}`);
    setHowTo(id);
    if (opts.announce) {
      const label = stage.list().find((v) => v.id === id)?.label ?? id;
      announce(`${label} visualization.`);
    }
  }

  // ---- transport controls -------------------------------------------------
  const playBtn = $<HTMLButtonElement>("lab-play");
  const modeBtn = $<HTMLButtonElement>("lab-mode");
  const readout = $("lab-readout");
  const live = $("lab-live");
  const tempo = $<HTMLInputElement>("lab-tempo");
  const cycles = $<HTMLInputElement>("lab-cycles");
  const cyclesOut = $("lab-cycles-out");

  playBtn?.addEventListener("click", () => {
    takeControl();
    engine.toggle();
  });
  modeBtn?.addEventListener("click", () => {
    takeControl();
    engine.setTuning(store.get().tuning === "JI" ? "ET" : "JI");
  });
  tempo?.addEventListener("input", () => {
    takeControl();
    engine.setTempo(Number(tempo.value));
  });
  cycles?.addEventListener("input", () => {
    takeControl();
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
        takeControl();
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
  let lastAnnounced = "";
  store.subscribe((s) => {
    if (playBtn) playBtn.textContent = s.playing ? "⏸ Pause" : "▶ Play";
    if (modeBtn) {
      modeBtn.textContent = s.tuning === "JI" ? "Just intonation" : "Equal temperament";
      modeBtn.setAttribute("aria-pressed", String(s.tuning === "ET"));
    }
    const drift = current.kind === "melodic" || s.tuning === "ET" ? "" : ` · ${result.driftPerCycleCents.toFixed(1)}¢/cycle`;
    const tuning = s.tuning === "JI" ? "just intonation" : "equal temperament";
    if (readout) readout.textContent = `${current.name} · ${s.tuning}${drift}`;
    // Mirror the drift readout into the polite live region (SPEC §4.3) so a
    // screen-reader user perceives tuning/example/tempo changes and the core
    // claim. Skip play/pause-only ticks that don't change this state.
    const message = `${current.name}, ${tuning}${drift ? `, sinking ${result.driftPerCycleCents.toFixed(1)} cents per cycle` : ""}.`;
    // Only announce once the reader drives the lab by hand; the scroll-story owns
    // its own live messages (in activate()), so this avoids double-speak.
    if (userDriven && message !== lastAnnounced) {
      lastAnnounced = message;
      announce(message);
    }
    if (cyclesOut && cycles) cyclesOut.textContent = cycles.value;
  });

  // ---- scroll-story -------------------------------------------------------
  const steps = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"));
  let activeScene = "";
  function activate(scene: Scene): void {
    if (scene.id === activeScene) return;
    activeScene = scene.id;
    // Once the reader has taken manual control, the story stops driving the lab
    // so it can't overwrite their explicit selection as scenes scroll past.
    if (userDriven) return;
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

  // Auto-advance is a progressive enhancement: feature-detect IntersectionObserver
  // (SPEC §4.2) and isolate construction in try/catch, matching stage.ts. On a host
  // without it the lab stays fully usable via the playground controls — only the
  // scroll-driven autoplay is lost, never the whole page.
  if (steps.length && capabilities().intersectionObserver) {
    try {
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
    } catch {
      // No auto-advance; playground controls remain fully functional.
    }
  }
}

/** Boot the lab, isolating any unexpected failure so the SSR page never blanks. */
function bootLab(): void {
  try {
    initLab();
  } catch (err) {
    console.warn("CommaPump: lab failed to initialize.", err);
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootLab);
else bootLab();
