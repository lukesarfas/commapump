/**
 * The scroll-story. Each scene names the example to load, the visualization to
 * spotlight, and the transport state to set when it scrolls into view — the
 * narrative drives the one shared lab.
 */

export interface Scene {
  id: string;
  exampleId: string;
  viz: "tonnetz" | "ribbon" | "spiral" | "pianoroll";
  tuning?: "JI" | "ET";
  autoplay?: boolean;
  title: string;
  body: string;
}

export const SCENES: Scene[] = [
  {
    id: "hook",
    exampleId: "pump-i-vi-ii-v-i",
    viz: "ribbon",
    tuning: "JI",
    autoplay: true,
    title: "Sing a loop forever, and you sink",
    body: `<p>Unaccompanied choirs tend to drift flat over a long passage. It isn't carelessness — it's arithmetic. Here is the chord loop <strong>I–vi–ii–V–I</strong>, with every chord tuned <em>purely</em>. Watch the home note after each lap.</p>`,
  },
  {
    id: "cent",
    exampleId: "wandering-d",
    viz: "pianoroll",
    tuning: "JI",
    title: "First, a ruler: the cent",
    body: `<p>An octave is <strong>1200 cents</strong>; an equal-tempered semitone is 100. The comma we're chasing is about <strong>21.5¢</strong> — roughly a fifth of a semitone. Small, but it stacks up. The meter on the right reads each note's distance from the piano's pitch.</p>`,
  },
  {
    id: "pure",
    exampleId: "pump-i-vi-ii-v-i",
    viz: "pianoroll",
    tuning: "JI",
    title: "Pure intervals lock; tempered ones beat",
    body: `<p>Just intonation tunes intervals to whole-number ratios — the fifth is exactly 3:2, the major third 5:4 — so their harmonics line up and the chord stops beating. Flip to <strong>equal temperament</strong> and the thirds turn slightly sharp. The same toggle is in the bar below.</p>`,
  },
  {
    id: "two-ds",
    exampleId: "wandering-d",
    viz: "pianoroll",
    tuning: "JI",
    autoplay: true,
    title: "The note D has two faces",
    body: `<p>Over a sense of C, there are two pure D's: the <strong>major whole tone 9/8</strong> (D as the fifth of G) and the <strong>minor whole tone 10/9</strong> (D as the third of the ii chord). They differ by exactly <strong>81/80</strong> — the syntonic comma. That gap is the whole story.</p>`,
  },
  {
    id: "name",
    exampleId: "fifths-chain",
    viz: "spiral",
    tuning: "JI",
    title: "Meet the syntonic comma",
    body: `<p>Stack four pure fifths and drop two octaves and you get the Pythagorean third, 81/64 (≈408¢). The pure major third is 5/4 (≈386¢). The leftover — <strong>81/80, 21.5¢</strong> — is the syntonic comma. (Not to be confused with the Pythagorean comma, 23.5¢, from twelve fifths.)</p>`,
  },
  {
    id: "fifths",
    exampleId: "fifths-chain",
    viz: "spiral",
    tuning: "JI",
    autoplay: true,
    title: "The fifths that won't come home",
    body: `<p>Walk up four pure fifths — C, G, D, A, E — then step home by a pure major third. You land a comma <strong>sharp</strong> of where you started. Fifths and thirds simply don't agree; the spiral never closes.</p>`,
  },
  {
    id: "pump",
    exampleId: "pump-i-vi-ii-v-i",
    viz: "tonnetz",
    tuning: "JI",
    autoplay: true,
    title: "The pump",
    body: `<p>Now the famous loop. Hold the D at 10/9 through the ii chord, reuse it as the fifth of G, and the resolving C is dragged <strong>down</strong> by a comma. On the lattice, the walk leaves "C" and arrives at a different node — every chord pure, yet home has moved.</p>`,
  },
  {
    id: "accumulate",
    exampleId: "pump-i-vi-ii-v-i",
    viz: "ribbon",
    tuning: "JI",
    autoplay: true,
    title: "And it keeps going",
    body: `<p>The drift doesn't cancel — it accumulates. Each lap of the progression sinks the key another <strong>−21.5¢</strong>: −21.5, −43.0, −64.5… After about six loops you've lost a whole semitone.</p>`,
  },
  {
    id: "benedetti",
    exampleId: "pump-i-vi-ii-v-i",
    viz: "pianoroll",
    tuning: "JI",
    title: "A 16th-century proof",
    body: `<p>This isn't a modern curiosity. The mathematician <strong>Giovanni Battista Benedetti</strong> wrote two short two-voice pieces (c.1563, published 1585) for the composer Cipriano de Rore precisely to show that holding every interval pure forces the pitch to slide. He proved your tuner isn't broken.</p>`,
  },
  {
    id: "piano",
    exampleId: "pump-i-vi-ii-v-i",
    viz: "ribbon",
    tuning: "ET",
    autoplay: true,
    title: "So why doesn't a piano drift?",
    body: `<p>Equal temperament <strong>tempers the comma out</strong>: it fuses the two D's into one note, paying a small tuning tax on every third so nothing accumulates. Switch the lab to <strong>ET</strong> and the staircase flattens to a line. That's the trade — uniform slight impurity in exchange for a key that stays put.</p>`,
  },
];
