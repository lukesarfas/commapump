# Cost model & price protections

CommaPump is a static site served from a Google Cloud Storage bucket. There is no
compute, no database, no per-request function billing, and no autoscaling.
Storage is a few hundred kilobytes. The only cost that varies with traffic is
**network egress** — bytes leaving GCS to visitors. This document gives the cost
model, the expected monthly cost at portfolio traffic, the caching scheme that
holds it down, how to front the bucket with a CDN, how to set a hard-stop billing
budget, and the bounded worst case.

For the cost requirements this satisfies, see SPEC §6.

## What it costs to serve

Cost components:

- **Storage** — a few hundred KB. GCS standard storage is ~$0.02/GB-month, so
  storage is a fraction of a cent per month. Effectively free.
- **Egress** — the only meaningful line item. GCS egress to the internet is on
  the order of **$0.12/GB** (varies by destination region; this is a safe upper
  estimate for planning).
- **Operations** — Class A/B operations (reads/lists) are billed per 10,000 and
  are negligible at this scale.

There is **no compute, no per-request billing, no autoscaling, and no egress
amplification.** Cost scales linearly and gently with bytes served, and the
caching + CDN scheme below keeps the bytes that actually leave the origin small.

## Payload sizes

- **Applet** (`applet/index.html`): a single self-contained document, **≤200 KB
  gzip** (enforced by `scripts/size-check.mjs`; the build fails if it is
  exceeded). This is the asset embedded by the hub.
- **Full site**: the HTML plus hashed `/_astro/**` JS/CSS, the `favicon.svg`, and
  the `preview.png`. The page is lightweight; abcjs is lazy and only loaded if a
  visitor reaches the notation section.

## Expected cost at portfolio traffic

This is a portfolio piece, not a product. Realistic traffic is tens to low
hundreds of visits per month.

Worked example for the **applet** (the hot path, embedded on the hub):

- ~200 KB per cold load × 1,000 loads/month ≈ 0.2 GB egress.
- 0.2 GB × $0.12/GB ≈ **$0.024/month** — a few cents.

The **full site** adds the HTML + `/_astro` bundle + preview image on first
visit; repeat visits are mostly served from the browser cache (see
Cache-Control). Even at a generous few thousand page views, egress stays in the
**low single-digit cents per month**. With a CDN in front (below), origin egress
drops further because the edge serves most bytes.

**Bottom line: expect cents per month, often rounding to ~$0.** The protections
below exist so that even an unexpected spike stays bounded and visible.

## Cache-Control scheme

Set on upload by the deploy scripts (`package.json`) and the publish workflow.
The glob each deploy stamps determines which tier a file lands in.

**Applet deploy** (`deploy:applet` → `gs://…/commapump/`):

Everything the applet deploy publishes lands in a single **short** tier —
`commapump/applet/**` (the self-contained `applet/index.html`), top-level
`commapump/*.html`, and `commapump/manifest.json` all get
`Cache-Control: public, max-age=300` (5 minutes). There is **no immutable tier**
on the applet path, by design:

- **`applet/index.html` is intentionally NOT immutable.** It is a single inlined
  document whose bytes (HTML + JS + CSS) change on every redeploy, but its URL is
  *fixed* — not content-hashed. Marking a stable, non-hashed URL `immutable` would
  pin stale applet bytes at warm browser/CDN caches for up to a year, so a new
  applet version would not become visible until those entries expired or were
  purged. The short 5-minute TTL avoids that: a redeploy is picked up promptly
  while still absorbing repeat-view bursts. (`immutable` is only safe on
  content-addressed URLs like `_astro/**`, whose filenames change with content —
  see the site deploy below.)
- The same 5-minute TTL on `commapump/manifest.json` keeps the contract the hub
  reads fresh, so the hub re-reads a changed manifest quickly while still
  absorbing bursts.

**Site deploy** (`deploy:site` → `gs://…/commapump-site/`):

- **Immutable** — content-hashed `_astro/**` assets, whose filenames change with
  content, so a year-long cache is safe and re-downloads are avoided.
- **Short** — `**/*.html` (recursive) and `manifest.json` get `max-age=300`, so a
  site redeploy is visible within ~5 minutes.

Concretely, after each `gcloud storage rsync`, the deploy commands run
`gcloud storage objects update` to stamp these headers.

## Fronting the bucket with a CDN (recommended)

Serving from the bucket directly works, but a CDN serves most bytes from edge
cache at lower (or zero, on free tiers) egress and adds TLS, HTTP/2, and better
latency. Two options:

### Option A — Cloudflare (free tier)

1. Add the custom domain (e.g. `commapump.sarfas.com`) to a Cloudflare zone.
2. Point a CNAME at the bucket's website endpoint (or use a Cloudflare Worker /
   transform rule to proxy `c.storage.googleapis.com/<bucket>/...`).
3. Set the proxy (orange-cloud) on, enable "Cache Everything," and let
   Cloudflare honor the origin `Cache-Control` headers above.
4. Result: the immutable `/_astro/**` bytes (and, on their 5-minute TTL, the
   applet and HTML bytes) are served from Cloudflare's edge after the first fetch;
   GCS egress is paid roughly once per asset version per edge location, not per
   visitor. Cloudflare's egress to visitors is free on the standard plan.

### Option B — Google Cloud CDN

1. Put the bucket behind an external HTTPS load balancer with a backend bucket.
2. Enable **Cloud CDN** on the backend bucket.
3. Cloud CDN honors the same `Cache-Control` headers stamped above: content-hashed
   `_astro/**` assets marked `immutable` get long edge TTLs, while the
   short-`max-age` paths — the applet (`applet/index.html`), top-level site HTML,
   and `manifest.json` — get the 5-minute edge TTL. Because the applet is *not*
   immutable, a redeploy is served fresh from the edge within ~5 minutes with no
   purge required.
4. Result: origin egress is replaced by cache fills; cache-hit egress is billed
   at lower CDN rates and the origin is hit far less often.

Either way, the CDN **caps origin egress**: a viral spike is absorbed at the
edge, and the GCS bill barely moves.

## Billing budget with email alerts (hard guardrail)

Even though runaway cost is structurally impossible here, set a budget so cost
can never *silently* drift. In the Google Cloud Console:

1. **Billing → Budgets & alerts → Create budget.**
2. Scope it to the project (or specifically the GCS service) that hosts the
   bucket.
3. Set the amount to **$5/month**.
4. Add **threshold alert rules at 50%, 90%, and 100%** of the budget, with
   **email notifications** to the billing admin (lukesarfas@icloud.com).
5. Save. At $2.50, $4.50, and $5.00 of actual spend you get an email — long
   before anything matters, given expected cost is cents.

Note: a budget *alerts*; it does not by itself stop billing. For this project
that is sufficient, because there is no autoscaling resource to disable — the
worst case is bounded anyway (next section). If you want a hard cap, a Pub/Sub +
Cloud Function on the budget topic could, e.g., disable public access, but that
is overkill here.

## Bounded worst case

The point of a static, no-compute design is that the worst case is *bounded and
predictable*:

- There is no compute to scale, no function to invoke per request, and no
  database to query — so no cost vector grows super-linearly with traffic.
- The only variable cost is egress, which is linear in bytes served. With a CDN
  in front, **origin** egress is capped by cache fills regardless of visitor
  volume.
- A truly viral spike — say the applet is loaded 1,000,000 times in a month
  with **no** CDN — is ~200 KB × 1e6 ≈ 200 GB egress ≈ **$24**. That is the
  realistic ceiling without a CDN, and it would trip the $5 budget alerts at
  50/90/100% well before reaching it. With a CDN in front, the same spike costs
  the origin a handful of cache fills and stays in the cents.

So: expected cost is ~$0; the alarmed budget is $5; and the absolute,
no-CDN, million-load ceiling is tens of dollars — visible, bounded, and
impossible to exceed silently.
