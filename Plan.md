# Build 2 — Risk, architecture, and budget

Builder: Amanda Tripodi · Due November 16, 2026, noon New York time.
Canonical PRD v2 and log: `docs/index.html`.

## Biggest risk and test

AI may select technically attractive images that do not match the builder’s taste or memories.
Use a 12-photo real-trip batch, mark favorites before AI, then compare returned Post suggestions with prior keeps and record replacements and review time. Repeat with one outside tester. Results pending; synthetic checks test plumbing only.

## One complete user action

Import JPEGs → allow sharing previews → ask AI → browser POSTs to local `/api/recommend` → Python reads the key from ignored `.env` and calls OpenRouter → backend validates IDs/reasons → browser adds editable Post picks → build drafts. Existing keeps remain, and Undo reverses the AI batch.

Frontend: `docs/prototype/`. Backend: `server.py`. Model: `nvidia/nemotron-3.5-super-vl:free`. No server database. Saved style references: IndexedDB on the browser origin. Product page: static GitHub Pages. AI backend: builder’s laptop, not GitHub Pages.

## Cost estimate

Default model: `nvidia/nemotron-3.5-super-vl:free`, image-capable with JSON response support in OpenRouter’s model catalog. Listed input/output token prices are $0; there is no paid fallback. Example 100 runs/day × 30 = $0 model-token charges, but free-tier quotas can prevent that volume. Rate limits/availability remain a product risk. For a future paid model, cost = (input tokens × input price per million + output tokens × output price per million) / 1,000,000. Confirm real usage in OpenRouter Activity. Local matching also makes no paid calls. Actual builder hours and total build-week spend are pending.

The first paid-model test was rejected for account credits; the free Google model returned provider rate limits. Neither response counts as a successful AI recommendation. A later real NVIDIA free-model browser request returned two picks, 683 input tokens, 47 output tokens, and $0 reported cost. Current live-test status is recorded in `tests/build-2-verification.md`.

## Setup and recovery

Run `python3 server.py`; open http://127.0.0.1:8000/prototype/. Requires Python 3.10+, an ignored `.env` with the OpenRouter key, internet, and funded provider access. Set a small key spending limit. The backend enforces batch/output/concurrency limits but these are not a dollar cap. Stop with Ctrl+C. Git commits provide code rollback. Never commit `.env` or include it in screenshots.

## Learn with AI — explain, then quiz

1. Which files run in the browser, and why can’t the OpenRouter key go there?
2. Trace one click from the AI button to the displayed recommendation.
3. What breaks if GitHub Pages receives `/api/recommend`? Why is localhost different?
4. How do input/output tokens determine one run’s cost, and why can retries add cost?
5. What remains after refresh? What changes if browser storage is unavailable?
6. Which data does PostHog collect, and which photo areas are blocked from replay?

Amanda’s own answers and completed quiz practice are pending. Do not claim agent-written answers are builder learning evidence.
