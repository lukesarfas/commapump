/**
 * The scroll-story. Each scene names the example to load, the visualization to
 * spotlight, and the transport state to set when it scrolls into view — the
 * narrative drives the one shared lab.
 */

export interface Scene {
  id: string;
  exampleId: string;
  viz: "pianoroll";
  tuning?: "JI" | "ET";
  autoplay?: boolean;
  title: string;
  body: string;
}

export const SCENES: Scene[] = [
  {
    id: "hook",
    exampleId: "pump-i-vi-ii-v-i",
    viz: "pianoroll",
    tuning: "JI",
    autoplay: true,
    title: "Sing a loop forever, and you sink",
    body: `<p>Unaccompanied choirs tend to drift flat over a long passage. It isn't carelessness — it's arithmetic. Here is the chord loop <strong>I–vi–ii–V–I</strong>, every chord tuned <em>purely</em>. Watch the home note after each lap.</p>`,
  },
  {
    id: "cent",
    exampleId: "pump-i-vi-ii-v-i",
    viz: "pianoroll",
    tuning: "JI",
    title: "First, a ruler: the cent",
    body: `<p>An octave is <strong>1200 cents</strong>; an equal-tempered semitone is 100. The comma we're chasing is about <strong>21.5¢</strong> — a fifth of a semitone. Small, but it stacks up. Each note flashes how far it lands from a piano's pitch.</p>`,
  },
  {
    id: "relative",
    exampleId: "pump-i-vi-ii-v-i",
    viz: "pianoroll",
    tuning: "JI",
    title: "Pitch is relative",
    body: `<p>There's no “absolute” pitch in just intonation — you pick one note as the <strong>reference</strong> (here C, the dashed line, written <strong>1/1</strong>) and tune every other note as an exact ratio above it. A pure fifth is <strong>3/2</strong> — that's G. A pure major third is <strong>5/4</strong> — that's E. Every pitch is a ratio from the reference.</p>`,
  },
  {
    id: "lock",
    exampleId: "pump-i-vi-ii-v-i",
    viz: "pianoroll",
    tuning: "JI",
    autoplay: true,
    title: "Whole-number ratios lock",
    body: `<p>Tune a chord that way and it stops beating. C–E–G is the ratio <strong>4 : 5 : 6</strong> — frequencies in tiny whole numbers, so their overtones line up and the roughness vanishes. Each note flashes its ratio from the chord's root: <strong>1/1, 5/4, 3/2</strong>. That beat-free lock is the prize just intonation chases.</p>`,
  },
  {
    id: "chain",
    exampleId: "pump-i-vi-ii-v-i",
    viz: "pianoroll",
    tuning: "JI",
    title: "Chords pass tuning down a chain",
    body: `<p>Here's where it gets interesting. Neighbouring chords share notes — C major and A minor share <strong>C and E</strong>; A minor and D minor share <strong>A</strong> — and the shared note keeps its pitch as the music moves on. Each chord is tuned relative to the one before it, link by link.</p>`,
  },
  {
    id: "d-low",
    exampleId: "wandering-d",
    viz: "pianoroll",
    tuning: "JI",
    autoplay: true,
    title: "The D the ii chord wants",
    body: `<p>Follow the A. In the A-minor chord it's tuned to <strong>5/3</strong> (a pure major sixth above C). That same A is held into the D-minor chord, where it is the fifth. For D minor to stay pure, D must sit a pure fifth <em>below</em> that A: <strong>D = 5/3 ÷ 3/2 = 10/9</strong> — the minor whole tone. Watch it flash 10/9.</p>`,
  },
  {
    id: "d-high",
    exampleId: "wandering-d",
    viz: "pianoroll",
    tuning: "JI",
    autoplay: true,
    title: "The D the G chord wants",
    body: `<p>But the very next chord disagrees. In G major, D is the <em>fifth of G</em> — and for G to ring as a pure 3/2, its fifth has to be <strong>9/8</strong>, the major whole tone. One staff position, “D”, pulled two ways: <strong>9/8 from G, 10/9 from A.</strong> The roll puts them at two different heights.</p>`,
  },
  {
    id: "name",
    exampleId: "wandering-d",
    viz: "pianoroll",
    tuning: "JI",
    title: "That gap is the comma",
    body: `<p>Divide the two D's — <strong>9/8 ÷ 10/9 = 81/80</strong>, about 21.5¢: the <strong>syntonic comma</strong>. It's the unavoidable gap between intervals built from threes (fifths) and intervals built from fives (thirds). (Not the Pythagorean comma, 23.5¢, which comes from stacking twelve fifths.)</p>`,
  },
  {
    id: "pump",
    exampleId: "pump-i-vi-ii-v-i",
    viz: "pianoroll",
    tuning: "JI",
    autoplay: true,
    title: "The pump",
    body: `<p>The progression refuses to choose. It holds the <strong>10/9</strong> D through the ii chord and then re-uses it as the fifth of G — so G is forced a comma flat, and the C it resolves to is dragged down <strong>81/80</strong> with it. Every chord is perfectly in tune; home has moved.</p>`,
  },
  {
    id: "accumulate",
    exampleId: "pump-i-vi-ii-v-i",
    viz: "pianoroll",
    tuning: "JI",
    autoplay: true,
    title: "And it keeps going",
    body: `<p>The drift doesn't cancel — it accumulates. Each lap sinks the key another <strong>−21.5¢</strong>: −21.5, −43.0, −64.5… after about six loops you've lost a whole semitone.</p>`,
  },
  {
    id: "fifths",
    exampleId: "fifths-chain",
    viz: "pianoroll",
    tuning: "JI",
    autoplay: true,
    title: "The fifths that won't come home",
    body: `<p>A second way to see the same crack: walk up four pure fifths — C, G, D, A, E — then step home by a pure major third. You land a comma <strong>sharp</strong>. Fifths (powers of 3) and thirds (powers of 5) just don't line up, so the line can't come home.</p>`,
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
    viz: "pianoroll",
    tuning: "ET",
    autoplay: true,
    title: "So why doesn't a piano drift?",
    body: `<p>Equal temperament <strong>tempers the comma out</strong>: it splits the octave into twelve identical steps, fusing the two D's into one note and paying a small tax on every third so nothing accumulates. Switch the lab to <strong>ET</strong> and the staircase flattens to a line — uniform slight impurity for a key that stays put.</p>`,
  },
];
