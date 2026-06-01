/**
 * Generate site/preview.png (1600×900, the applet hero) with a tiny,
 * dependency-free PNG encoder. Draws the signature motif: a tonic staircase
 * sinking one comma per step on a dark ground. Replaced by a rendered viz
 * frame in a later polish pass; for now it's an intentional placeholder.
 */
import { deflateSync } from "node:zlib";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const W = 1600;
const H = 900;

// --- minimal PNG (truecolor, 8-bit) ----------------------------------------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(width, height, rgb) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- draw -------------------------------------------------------------------
const px = Buffer.alloc(W * H * 3);
function set(x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
}
function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

// background: subtle vertical gradient, dark warm navy
for (let y = 0; y < H; y++) {
  const t = y / H;
  const r = lerp(28, 18, t);
  const g = lerp(26, 17, t);
  const b = lerp(34, 22, t);
  for (let x = 0; x < W; x++) set(x, y, r, g, b);
}

// descending staircase: 6 steps, each a comma lower
const steps = 6;
const margin = 200;
const stepW = (W - margin * 2) / steps;
const top = 250;
const drop = 70;
const amber = [232, 178, 86];
const warm = [224, 140, 90];
for (let s = 0; s < steps; s++) {
  const x0 = Math.round(margin + s * stepW);
  const x1 = Math.round(margin + (s + 1) * stepW);
  const y = Math.round(top + s * drop);
  const col = [lerp(amber[0], warm[0], s / steps), lerp(amber[1], warm[1], s / steps), lerp(amber[2], warm[2], s / steps)];
  // horizontal tread
  for (let x = x0; x < x1; x++) for (let t = -3; t <= 3; t++) set(x, y + t, col[0], col[1], col[2]);
  // vertical riser to next step
  if (s < steps - 1) for (let yy = y; yy <= y + drop; yy++) for (let t = -3; t <= 3; t++) set(x1 + t, yy, col[0], col[1], col[2]);
  // node dot
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) if (dx * dx + dy * dy <= 49) set(x0 + dx, y + dy, col[0], col[1], col[2]);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "site");
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, "preview.png"), encodePng(W, H, px));
console.log("[make-preview] wrote site/preview.png (1600×900)");
