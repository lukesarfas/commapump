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

  // Degrade to silent visuals when this host has no Web Audio. A title alone
  // doesn't reach touch users or many screen readers, so surface a visible,
  // announced note and mark the dead Play control disabled (embed.css greys it).
  if (!engine.isAvailable()) {
    playBtn.disabled = true;
    playBtn.setAttribute("aria-disabled", "true");
    const note = byId("audio-note");
    if (note) note.textContent = "Audio isn't available in this browser; the visuals still work.";
  }

  // APG tablist: #stage is the single tabpanel (aria-controls), one tab is the
  // tab stop at a time (roving tabindex), Left/Right/Home/End move focus.
  const howtoEl = byId("howto");
  function setHowTo(id: string): void {
    if (howtoEl) howtoEl.textContent = stage.list().find((v) => v.id === id)?.howToRead ?? "";
  }
  function selectViz(id: string): void {
    stage.show(id);
    switchEl.querySelectorAll<HTMLButtonElement>(".tab").forEach((t) => {
      const on = t.dataset.viz === id;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    stageEl.setAttribute("aria-labelledby", `tab-${id}`);
    setHowTo(id);
  }
  // With a single visualization there's nothing to switch — hide the tablist.
  if (stage.list().length <= 1) switchEl.hidden = true;
  for (const v of stage.list()) {
    const b = document.createElement("button");
    b.className = "tab";
    b.type = "button";
    b.id = `tab-${v.id}`;
    b.textContent = v.label;
    b.dataset.viz = v.id;
    b.setAttribute("role", "tab");
    b.setAttribute("aria-controls", "stage");
    const selected = v.id === stage.currentId();
    b.setAttribute("aria-selected", String(selected));
    b.tabIndex = selected ? 0 : -1;
    b.addEventListener("click", () => selectViz(v.id));
    switchEl.append(b);
  }
  stageEl.setAttribute("aria-labelledby", `tab-${stage.currentId()}`);
  setHowTo(stage.currentId());
  const exEl = byId("example-note");
  if (exEl) {
    const s = document.createElement("strong");
    s.textContent = PUMP_IVIIVI.name;
    exEl.replaceChildren(s, document.createTextNode(` — ${PUMP_IVIIVI.teaching}`));
  }
  switchEl.addEventListener("keydown", (e) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const tabs = Array.from(switchEl.querySelectorAll<HTMLButtonElement>(".tab"));
    const i = tabs.findIndex((t) => t === document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : (i + 1) % tabs.length;
    selectViz(tabs[next].dataset.viz!);
    tabs[next].focus();
  });

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

/** Boot the applet, isolating any failure so the iframe never shows a blank page. */
function boot(): void {
  try {
    init();
  } catch (err) {
    console.warn("CommaPump: applet failed to initialize.", err);
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
