/**
 * Fail the build if the embeddable applet would blow its first-paint budget.
 * The applet contract asks for ≤200 KB transferred; we check gzipped size.
 */
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = resolve(root, "site/applet/index.html");
const LIMIT = 200 * 1024;

const buf = await readFile(file);
const gz = gzipSync(buf).length;

const raw = (buf.length / 1024).toFixed(1);
const gzkb = (gz / 1024).toFixed(1);
console.log(`[size-check] applet/index.html: ${raw} KB raw, ${gzkb} KB gzip (budget ${LIMIT / 1024} KB gzip)`);

if (gz > LIMIT) {
  console.error(`[size-check] FAIL: ${gzkb} KB gzip exceeds the ${LIMIT / 1024} KB budget.`);
  process.exit(1);
}
console.log("[size-check] OK");
