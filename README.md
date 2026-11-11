# Tripbox

> Your trip, your taste, your favorite memories—sorted for sharing and keeping.

Tripbox helps turn camera-roll chaos into favorites for Instagram posts, Stories, photo books, and frames, without changing your original photos.

- **Builder:** Amanda Tripodi
- **Product page, living PRD, and build log:** [Visit Tripbox](https://building-with-ai-f26.github.io/ast10049-tripbox/)
- **Interactive prototype:** [Try Tripbox in your browser](https://building-with-ai-f26.github.io/ast10049-tripbox/prototype/)
- **Repository:** [ast10049-tripbox](https://github.com/building-with-ai-f26/ast10049-tripbox)

## Try the core workflow

No account, installation, or API key is needed. Open the prototype on the device containing your photos.

1. Name your trip and choose a few JPG or PNG photos from your device. Some HEIC photos may need conversion to JPG.
2. Optionally add past favorites or Instagram screenshots as style references.
3. Adjust the quantities for posts, Stories, photo-book pages, and frames.
4. Generate suggested picks, review similar shots, and keep or skip photos. Tag photos as “Me,” “Other people,” or “Scenery” to guide selection.
5. Assign favorites to their uses, create drafts, and reorder photos.
6. Save a draft plan as JSON or download your untouched originals.

Trip photos and working selections stay in the current tab and clear on refresh. Style references persist in this browser only when you choose to save the library. A draft-plan download contains filenames and settings, not the photos themselves.

## What works today—and what is still a prototype

The demo uses local visual matching rather than a trained AI model. It supports photo import, style references, keep/skip review, similar-shot groups, and planning layouts. It does not connect to Instagram, recognize faces, publish posts, order prints, or produce finished print-ready books. Visitors use their own photos; projects are not shared between people or devices.

## Public access and accessibility

GitHub Pages serves the product page and prototype from `main` → `/docs`. Anyone with the prototype link can open it without a GitHub account. Photos are processed in the browser rather than uploaded to a server.

The prototype includes responsive layouts, labeled controls, visible keyboard focus, status announcements, and reduced-motion support. In photo review, use **K** to keep, **S** to skip, **U** to undo, arrow keys to move, and **Escape** to close. Full keyboard, screen-reader, contrast, and mobile usability testing is still needed; these features are not a claim of complete accessibility.

## Run locally

No package installation or backend is required. With Python 3 installed:

```sh
git clone https://github.com/building-with-ai-f26/ast10049-tripbox.git
cd ast10049-tripbox
python3 -m http.server 8000 --bind 127.0.0.1 --directory docs
```

Open [the product page](http://127.0.0.1:8000/) or [the prototype](http://127.0.0.1:8000/prototype/). Stop the server with Ctrl+C.

## Project map

| Path | Purpose |
| --- | --- |
| [`docs/index.html`](docs/index.html) | Public product page, living PRD, screenshots, and build log |
| [`docs/prototype/`](docs/prototype/) | Runnable HTML, CSS, and JavaScript prototype |
| [`docs/prototype/curation.js`](docs/prototype/curation.js) | Local photo matching and selection logic |
| [`docs/prototype/reference-store.js`](docs/prototype/reference-store.js) | Browser storage for saved style references |
| [`AGENTS.md`](AGENTS.md) | Coding-agent rules and project context |
| [`tests/`](tests/) | Verification and user-feedback guidance |
| [`Intent.md`](Intent.md), [`Plan.md`](Plan.md), [`journal/`](journal/) | Planning and build notes |
| [`SPONSOR_MEMO.md`](SPONSOR_MEMO.md) | Course sponsor memo |

Edit the prototype directly in `docs/prototype/` so future changes are included in the GitHub Pages deployment.
