/**
 * Assemble the embeddable applet: bundle src/embed/main.ts with esbuild, inline
 * it and the CSS into a single self-contained site/applet/index.html. No
 * external requests, so the hub iframe paints from one document.
 */
import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const entry = resolve(root, "src/embed/main.ts");
const templatePath = resolve(root, "src/embed/template.html");
const cssPath = resolve(root, "src/embed/embed.css");
const outDir = resolve(root, "site/applet");
const outFile = resolve(outDir, "index.html");

const result = await build({
  entryPoints: [entry],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  write: false,
  legalComments: "none",
});

const js = result.outputFiles[0].text;
const css = await readFile(cssPath, "utf8");
const template = await readFile(templatePath, "utf8");

// The applet inlines exactly one module script. Its text is `js` verbatim, so
// the CSP sha256 must hash that exact string (base64). The template's meta CSP
// carries a __APPLET_SCRIPT_HASH__ token inside script-src; pinning the hash
// lets the strict policy admit this one script without `unsafe-inline`.
const scriptHash = createHash("sha256").update(js, "utf8").digest("base64");

// Function replacements avoid `$` being treated as a special pattern.
let html = template
  .replace("/*__CSS__*/", () => css)
  .replace("/*__JS__*/", () => js)
  .replaceAll("__APPLET_SCRIPT_HASH__", () => scriptHash);

if (template.includes("__APPLET_SCRIPT_HASH__")) {
  console.log(`[build-applet] pinned inline script CSP hash sha256-${scriptHash}`);
} else {
  console.warn("[build-applet] WARN: no __APPLET_SCRIPT_HASH__ token in template; CSP hash not pinned.");
}

await mkdir(outDir, { recursive: true });
await writeFile(outFile, html, "utf8");
console.log(`[build-applet] wrote ${outFile} (${(html.length / 1024).toFixed(1)} KB raw)`);
