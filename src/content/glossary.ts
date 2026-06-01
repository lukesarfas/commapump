export interface GlossaryEntry {
  term: string;
  def: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  { term: "Cent", def: "1/1200 of an octave; 1/100 of an equal-tempered semitone. The standard fine unit of pitch." },
  { term: "Just intonation", def: "Tuning intervals to small whole-number frequency ratios (3/2, 5/4…) so harmonics align and chords beat minimally." },
  { term: "5-limit", def: "Just intonation using only the primes 2, 3 and 5 — the basis of common-practice triadic harmony." },
  { term: "Syntonic comma", def: "81/80, about 21.5¢. The gap between four pure fifths and a pure major third; the comma the pump accumulates." },
  { term: "Pythagorean comma", def: "531441/524288, about 23.5¢. The gap from twelve pure fifths versus seven octaves — related, but not the syntonic comma." },
  { term: "Schisma", def: "About 1.95¢ — the tiny difference between the Pythagorean and syntonic commas." },
  { term: "Tonnetz", def: "A lattice with fifths along one axis and major thirds along another; the same note name appears at many points a comma apart." },
  { term: "Temperament", def: "Deliberately impure tuning that closes the gaps. 12-tone equal temperament splits the octave into twelve equal 100¢ steps." },
  { term: "Temper out", def: "To make a comma vanish by equating the intervals it separated — equal temperament tempers out the syntonic comma." },
  { term: "Comma pump", def: "A chord or melody loop that, played in strict just intonation, shifts the tonic by a comma each cycle." },
];
