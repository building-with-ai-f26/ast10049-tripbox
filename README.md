# Tripbox

> Your trip, your taste, your favorite memories—sorted for sharing and keeping.

Tripbox helps turn camera-roll chaos into favorites for Instagram posts, Stories, photo books, and frames, without changing your original photos.

- **Builder:** Amanda Tripodi
- **Product page, living PRD, and build log:** [Visit Tripbox](https://building-with-ai-f26.github.io/ast10049-tripbox/)
- **Interactive prototype:** [Try Tripbox in your browser](https://building-with-ai-f26.github.io/ast10049-tripbox/prototype/)
- **Repository:** [ast10049-tripbox](https://github.com/building-with-ai-f26/ast10049-tripbox)

## Try the core workflow

The public demo needs no account or API key and uses local visual matching. The optional Build 2 AI action requires the local Python server and a private OpenRouter key. Open the app on the device containing your photos.

1. Name your trip and choose a few JPG or PNG photos from your device. Some HEIC photos may need conversion to JPG.
2. Optionally add past favorites or Instagram screenshots as style references.
3. Adjust the quantities for posts, Stories, photo-book pages, and frames.
4. Generate suggested picks, review similar shots, and keep or skip photos. Tag photos as “Me,” “Other people,” or “Scenery” to guide selection.
5. Assign favorites to their uses, create drafts, and reorder photos.
6. Save a draft plan as JSON or download your untouched originals.

Trip photos and working selections stay in the current tab and clear on refresh. Style references persist in this browser only when you choose to save the library. A draft-plan download contains filenames and settings, not the photos themselves.

## What works today—and what is still a prototype

The public demo uses local visual matching. The local app can also send up to 12 candidate previews and 3 style references to the free `nvidia/nemotron-3.5-super-vl:free` model through OpenRouter, after explicit preview-sharing permission. It returns up to 6 editable Post suggestions, keeps existing choices, and supports batch Undo. Free-provider availability and rate limits can prevent a response; there is no paid fallback. It supports photo import, style references, keep/skip review, similar-shot groups, and planning layouts. It does not connect to Instagram, recognize faces, publish posts, order prints, or produce finished print-ready books. Visitors use their own photos; projects are not shared between people or devices.

## Public access and accessibility

GitHub Pages serves the product page and prototype from `main` → `/docs`. Anyone with the prototype link can open it without a GitHub account. Local matching processes photos in the browser. The optional AI action sends resized previews through the loopback-only server to OpenRouter and its model provider. Originals are not uploaded.

The prototype includes responsive layouts, labeled controls, visible keyboard focus, status announcements, and reduced-motion support. In photo review, use **K** to keep, **S** to skip, **U** to undo, arrow keys to move, and **Escape** to close. Full keyboard, screen-reader, contrast, and mobile usability testing is still needed; these features are not a claim of complete accessibility.

## Run locally — Build 2 AI app

Use Python 3.10+ and a modern browser. No pip/npm dependencies are required.

1. Clone the repository (or pull your existing checkout).
2. If `.env` does not already exist, copy `.env.example` to `.env`.
3. Put your OpenRouter key after `OPENROUTER_API_KEY=` in `.env`. Never commit it or paste it into browser code.
4. Run the local server:


```sh
git clone https://github.com/building-with-ai-f26/ast10049-tripbox.git
cd ast10049-tripbox
python3 server.py
```

Open [the product page](http://127.0.0.1:8000/) or [the prototype](http://127.0.0.1:8000/prototype/). Stop with Ctrl+C. Restart after editing `.env`.

For the AI workflow: import a small JPEG/PNG batch, check the preview-sharing permission box, click **Ask AI for Post picks**, review the suggestions, then create drafts. Requests use the first 12 non-skipped photos in import order. The number of Post photos requested determines the AI count, capped at 6. Errors preserve your existing picks.

The default model is free at the provider’s listed token price; rate limits and availability still apply. The app has no paid fallback. You can change `OPENROUTER_MODEL` in `.env`, but check the new model’s image support and price first. `.env` stays outside GitHub Pages. `server.py` binds only to 127.0.0.1, serves only `docs/`, caps requests at 6 MB/800 output tokens, and permits one active request and 20 calls per server start. These controls do not replace a provider spending limit.

For the public-style static demo without AI, run `python3 -m http.server 8000 --bind 127.0.0.1 --directory docs`.

## Build 2 status and evidence

The implementation includes the local AI endpoint, response validation, consent, PostHog on both surfaces, PRD v2, and local setup instructions. See [verification and remaining tasks](tests/build-2-verification.md) and [the Build 2 checklist](journal/build-02-plan.md). Implementation does not by itself prove the real model succeeded or that dashboard events/replay were received.

PostHog collects pageviews, masked click autocapture, `clicked_try_product`, and AI start/complete/failure events. Photo areas and input values are excluded from replay. The `phc_` project token in `docs/analytics.js` is public by design; the OpenRouter key is private. Pageviews, clicks, named launch/AI events, and masked replay playback were verified November 12. The private [Build 2 evidence dashboard](https://us.posthog.com/project/721209/dashboard/2344126) contains received test events. A dashboard screenshot is saved for submission; outside user evidence remains pending.

## Verification

```sh
python3 -m unittest discover -s tests -v
node --check docs/prototype/ai.js
node --check docs/analytics.js
node tests/test_analytics.cjs
git diff --check
```

Tests reject oversized batches, remote image URLs, invalid IDs, and malformed AI selections. Follow the browser and PostHog checks in the verification notes for end-to-end evidence.

## Project map

| Path | Purpose |
| --- | --- |
| [`docs/index.html`](docs/index.html) | Public product page, living PRD, screenshots, and build log |
| [`docs/prototype/`](docs/prototype/) | Runnable HTML, CSS, and JavaScript prototype |
| [`server.py`](server.py) | Local-only OpenRouter backend; reads ignored `.env` |
| [`docs/prototype/ai.js`](docs/prototype/ai.js) | Consent, preview request, and editable AI picks |
| [`docs/analytics.js`](docs/analytics.js) | Public PostHog configuration and replay masking |
| [`docs/prototype/curation.js`](docs/prototype/curation.js) | Local photo matching and selection logic |
| [`docs/prototype/reference-store.js`](docs/prototype/reference-store.js) | Browser storage for saved style references |
| [`AGENTS.md`](AGENTS.md) | Coding-agent rules and project context |
| [`tests/`](tests/) | Verification and user-feedback guidance |
| [`Intent.md`](Intent.md), [`Plan.md`](Plan.md), [`journal/`](journal/) | Planning and build notes |
| [`SPONSOR_MEMO.md`](SPONSOR_MEMO.md) | Course sponsor memo |

Edit the prototype directly in `docs/prototype/` so future changes are included in the GitHub Pages deployment.
