/**
 * Generate site/manifest.json from src/manifest.base.json, injecting the
 * absolute GCS URLs that a *remote* applet must carry (the hub does no
 * auto-wiring for manifestUrl entries) plus today's date as `updated`.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base = JSON.parse(await readFile(resolve(root, "src/manifest.base.json"), "utf8"));

const BUCKET_BASE = "https://storage.googleapis.com/luke-sarfas-applets";
const gcs = `${BUCKET_BASE}/${base.slug}`;

const manifest = {
  ...base,
  updated: new Date().toISOString().slice(0, 10),
  preview: `${gcs}/preview.png`,
  applet: `${gcs}/applet/index.html`,
};

const outDir = resolve(root, "site");
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`[make-manifest] wrote site/manifest.json (updated ${manifest.updated})`);
