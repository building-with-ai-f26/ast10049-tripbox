# AGENTS.md — Coding Agent Operating Manual

> Give this file to your coding agent and check that it is using these instructions. Keep the stack, commands, and ground rules current.

## 1. Project Overview
- **Product:** Tripbox helps review trip photos and create editable sharing/keepsake drafts. PRD and build log: `docs/index.html`.
- **Core workflow:** import photos → local or optional AI recommendations → review picks → assign purposes → build/export a draft plan.
- **Stack:** static HTML/CSS/JavaScript, Python 3.10+ standard-library server, OpenRouter chat completions, IndexedDB style library, PostHog.
- **Structure:** `docs/` is the GitHub Pages root; `docs/prototype/` is the app; `docs/analytics.js` configures public analytics; `docs/prototype/cards.js` renders cards and exports PNGs; `server.py` runs only on the laptop; `tests/` holds verification.
- **AI:** `docs/prototype/ai.js` sends at most 12 JPEG previews and 3 references after consent. `server.py` keeps the key private, validates requests/results, and returns picks/usage. Never send originals, filenames, or photo content to analytics.
- **Publishing:** GitHub Pages serves `main` → `/docs`. It cannot execute `server.py`; public AI remains disabled. Edit source inside `docs/prototype/`.

## 2. Commands
- **Dependencies:** Python 3.10+ and a modern browser. No pip/npm install needed for the app.
- **Setup:** copy `.env.example` to `.env` only if `.env` does not already exist. Add `OPENROUTER_API_KEY` locally; never overwrite an existing secret. Default model: `nvidia/nemotron-3.5-super-vl:free`.
- **Run AI app:** `python3 server.py`, then open `http://127.0.0.1:8000/prototype/`. Restart after changing `.env`; Ctrl+C stops it. `PORT` changes the port.
- **Static demo only:** `python3 -m http.server 8000 --bind 127.0.0.1 --directory docs` (no AI endpoint).
- **Tests:** `python3 -m unittest discover -s tests -v`; `node --check docs/prototype/ai.js`; `node --check docs/prototype/app.js`; `node --check docs/analytics.js`; `node tests/test_analytics.cjs`; `node tests/test_cards.cjs`; `git diff --check`.
- **Live checks:** see `tests/build-2-verification.md`. Paid calls need a configured key, internet, and credits. Use only synthetic or explicitly permitted photos.
- **Limits:** 6 MB request, 12 candidate previews, 3 references, 6 picks, 800 output tokens, one concurrent call, five seconds between calls, 20 calls per server start. Set a provider key spending limit too.

## Card studio
- Choose among kept, non-skipped photos. Card previews/export use original local photos, never a provider upload.
- PNGs have flattened text; no bleed/postcard back is generated. Respect full composition; do not crop originals.
- Canva and Shutterfly links are manual handoffs, not account connections. Do not label them “connected” without implementing OAuth/verified provider integration.
- Card UI is `ph-no-capture`; the explicit `card_exported` event includes only the card-type enum.
- Card state is in the tab; no persistence is promised. Never send headings/messages/filenames to analytics.

## 3. Non-Negotiable Engineering Rules
1. **Plan before coding:** Before touching multiple files, propose a brief plan and wait for approval.
2. **Small batches:** Make small, focused changes that can be reviewed and explained by a human in a single Pull Request.
3. **Explainability:** Avoid unnecessary abstractions or dependencies. Help the human builder understand the main components, what changed, why it matters, what could break, and how it was checked.
4. **Verify changes:** Run relevant checks. For a reproducible logic bug, use a failing test to demonstrate the fix when practical. Record manual checks and known limitations; follow the selected Build 4 evaluation track.
5. **Zero secrets in code:** Never hardcode API keys, tokens, or credentials. Always read from environment variables (`.env`) and update `.env.example` when new variables are needed.
6. **Stop when looping:** If a fix fails twice in a row, stop, summarize what failed, and ask the human before trying a third approach.

## Shipping
1. Work from the course repository and edit the app in `docs/prototype/`.
2. Use a focused branch for changes; run the applicable checks listed above and record any checks that could not run.
3. Review the changes, push them to GitHub, and confirm the intended commit reaches the published site.
4. Open the live URL and check the changed workflow. Report what was actually verified and what remains untested.

## Ask Amanda first
- Changes that delete or overwrite user data or production databases.
- New credentials, changes to access or permissions, or actions that expose personal data.
- Purchases or changes that create a paid service or recurring cost.
- Publishing or ordering anything on someone's behalf.

## Rule from a real mistake
TripBox's local `~/tripbox/prototype/` and course GitHub Pages files diverged. Treat `building-with-ai-f26/ast10049-tripbox` and `docs/prototype/` as the source for the published app. Before editing, check the repository and current revision; after shipping, verify the live URL. Never overwrite newer features with an older local copy.
