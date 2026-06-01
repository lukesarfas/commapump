# Deployment

CommaPump ships two artifacts from one source tree:

1. the **embeddable applet** — a single self-contained `index.html` that the hub
   (luke.sarfas.com) iframes, and
2. the **full scroll-story site** — the rich explainer + playground.

Both are static; both live in the same public GCS bucket at separate paths. This
document covers the build, the two deploy paths, the applet contract / hub
registration, and the custom-domain path.

Prerequisites: Node ≥ 20, and (for deploys) a `gcloud` CLI authenticated with
write access to the `luke-sarfas-applets` bucket. See
[COST.md](./COST.md) for the Cache-Control scheme the deploy scripts apply and
[SECURITY.md](../SECURITY.md) for the credential model.

## Build

```sh
npm ci          # reproducible install from the lockfile
npm run build   # full site → dist/ ; applet + manifest + preview → site/
```

`npm run build` runs five steps in order (see `package.json`):

1. `astro build` → the full static site in `dist/`.
2. `node scripts/build-applet.mjs` → bundles `src/embed/main.ts` with esbuild,
   inlines JS + CSS into `src/embed/template.html`, computes and pins the inline
   script's CSP sha256, and writes `site/applet/index.html`.
3. `node scripts/make-manifest.mjs` → writes `site/manifest.json` with absolute
   GCS URLs and today's `updated` date.
4. `node scripts/make-preview.mjs` → writes `site/preview.png` (1600×900).
5. `node scripts/size-check.mjs` → **fails the build** if the gzipped applet
   exceeds the 200 KB budget.

After a build, `site/` contains exactly what a remote applet must publish:

```
site/manifest.json        # remote-applet contract: absolute GCS URLs
site/preview.png          # 1600×900 hero / OG image
site/applet/index.html    # self-contained embeddable demo, ≤200 KB gzip
```

Useful subset scripts: `npm run build:applet` (applet + size-check only),
`npm run build:site` (full site only), `npm run preview` (serve `dist/` locally),
`npm test` (Vitest), `npm run typecheck`.

## `npm run deploy:applet`

Builds, then publishes `site/` to the applet path and stamps Cache-Control:

```sh
npm run deploy:applet
```

It runs:

1. `npm run build`.
2. `gcloud storage rsync site/ gs://luke-sarfas-applets/commapump/ --recursive
   --delete-unmatched-destination-objects`.
3. `gcloud storage objects update` to set `public, max-age=300` on
   `commapump/applet/**` (the self-contained `applet/index.html`), top-level
   `commapump/*.html`, and `commapump/manifest.json`. Everything the applet
   deploy publishes is short-lived; **nothing on the applet path is `immutable`**,
   because the applet's URL is fixed (not content-hashed) and a year-long cache
   would pin stale bytes at the edge. See
   [COST.md](./COST.md#cache-control-scheme) for why, and for what the 5-minute
   TTL means for redeploy visibility.

Publishing is **manual** for this solo project: run `npm run deploy:applet` from
a machine authenticated to GCS (`gcloud auth login`). The script builds,
rsyncs `site/` to the bucket, and sets `Cache-Control`. There is no publish CI
(an earlier `publish-applet.yml` was removed — it needed a service-account secret
that was never provisioned and only added failing-run noise). After publishing,
trigger a hub rebuild if needed (`gh workflow run "Build & Deploy" --repo
lukesarfas/luke.sarfas.com`) so the card picks up manifest changes.

## `npm run deploy:site`

Publishes the full scroll-story site to its own bucket path:

```sh
npm run deploy:site
```

It builds with `SITE_BASE=/luke-sarfas-applets/commapump-site/` so all asset URLs
resolve under the bucket subpath, rsyncs `dist/` to
`gs://luke-sarfas-applets/commapump-site/`, and stamps Cache-Control
(`immutable` on `_astro/**`, short max-age on `**/*.html` and `manifest.json`).

This bucket-subpath deploy is a **stopgap** until the custom domain is wired up
(below); `SITE_BASE` exists precisely so the build can target a non-root prefix.

## The applet contract & hub registration

CommaPump is a **remote applet**: the hub does not vendor its code, it loads it by
URL. The contract is `manifest.json` plus the two assets it points at.

`site/manifest.json` is generated from `src/manifest.base.json` and carries the
absolute GCS URLs a remote applet needs (the hub does no auto-wiring for these):

```json
{
  "name": "CommaPump",
  "slug": "commapump",
  "tagline": "Hear just-intonation music drift out of tune.",
  "preview": "https://storage.googleapis.com/luke-sarfas-applets/commapump/preview.png",
  "applet":  "https://storage.googleapis.com/luke-sarfas-applets/commapump/applet/index.html",
  "links": { "site": "...", "repo": "..." }
}
```

Register it on the hub with one line in
`apps/luke.sarfas.com/src/data/projects.json`:

```json
{ "slug": "commapump", "manifestUrl": "https://storage.googleapis.com/luke-sarfas-applets/commapump/manifest.json" }
```

The hub fetches that `manifestUrl`, reads `preview` for the card, and iframes
`applet` for the live demo. Framing controls (sandbox, frame-ancestors) are the
hub's responsibility — see [SECURITY.md](../SECURITY.md). The applet expects no
autoplay grant: it gates audio behind an explicit play gesture and posts
`{ type: "applet:ready" }` to its parent once mounted.

To update the live applet: change code, run `deploy:applet` (or push to `main`
touching `site/`). Both the `manifest.json` the hub reads and `applet/index.html`
itself are stamped with a 5-minute TTL (`max-age=300`), so the hub re-reads the
contract and warm browser/CDN caches pick up the new applet bytes within
~5 minutes — no purge required. `applet/index.html` is deliberately **not**
`immutable`: its URL is fixed rather than content-hashed, so a long cache would
otherwise serve stale bytes for up to a year. See
[COST.md](./COST.md#cache-control-scheme).

## Custom domain — `commapump.sarfas.com`

The long-term home for the full site is `commapump.sarfas.com`. The Astro config
already sets `site: "https://commapump.sarfas.com"`, so canonical and OG URLs are
correct as soon as the domain is live. Path via DNS + Firebase Hosting:

1. **Create a Firebase Hosting site/target** for CommaPump (e.g. `firebase init
   hosting`, public dir `dist/`, configured as an SPA-free static site).
2. **Build for the root** (drop `SITE_BASE`, so `base: "/"`):
   ```sh
   npm run build:site      # astro build → dist/ at root base
   firebase deploy --only hosting:commapump
   ```
3. **Add the custom domain** in the Firebase console (Hosting → Add custom
   domain → `commapump.sarfas.com`).
4. **DNS**: add the records Firebase shows (a `TXT` for verification, then the
   `A`/`AAAA` records — or a `CNAME` to the Firebase target) to the
   `sarfas.com` zone. Firebase provisions and renews the TLS certificate
   automatically.
5. **Custom response headers** (optional but recommended for the full site):
   set `frame-ancestors` / `X-Frame-Options` and the same Cache-Control tiers in
   `firebase.json` headers, since `<meta>` CSP cannot set framing directives.
6. **Repoint the manifest's site link**: update `links.site` in
   `src/manifest.base.json` to `https://commapump.sarfas.com/` and redeploy the
   applet so the hub card links to the real site.

Until then, `deploy:site` to the bucket subpath remains the working full-site
deploy, and `deploy:applet` is the production path for the embedded demo.

Alternatively, the same `dist/` can be fronted with Cloud CDN or Cloudflare on
the custom domain instead of Firebase; see [COST.md](./COST.md) for that path.
