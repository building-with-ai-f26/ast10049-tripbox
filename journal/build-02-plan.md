# Build 2 — Working checklist

Due Monday, November 16, 2026 at noon New York time. Bring the local app to class November 17.
Canonical PRD and public log: `docs/index.html`.

## Implemented November 12

- [x] Local Python server and OpenRouter recommendation request using bounded photo previews.
- [x] API secret in ignored `.env`, never in `docs/` or GitHub.
- [x] Explicit preview-sharing permission, editable picks, Undo, failure recovery.
- [x] Public and local PostHog installation; masked replay configuration and photo blocking.
- [x] PRD v2 risk/test plan, architecture, free-model unit economics.
- [x] Project-specific AGENTS.md, README setup, and automated validation tests.

## Verification and submission — do not claim these without evidence

- [x] Real free-model AI action returned 2 editable picks locally (683 input / 49 output tokens, $0); browser screenshot on product page.
- [ ] Compare picks and review time using actual trip photos; record builder findings.
- [x] Verified public/local pageviews, clicks, named launch and AI events, plus a playable masked 14-second replay.
- [x] Saved the private PostHog dashboard screenshot for submission; public evidence hides person IDs/visitor metadata.
- [x] Record builder report: 5 hours; $20/month subscription; ~$5 weekly allocation (four-week month), not extra API spending. Verified free calls: $0.
- [x] Record builder feedback: works well but needs better preference understanding.
- [ ] Record outside/pod feedback; none supplied yet.
- [x] Verified meaningful pushes on November 11 and 12. No backdating.
- [ ] Submit product page, repository URL, and PostHog screenshot in Icerynk.
- [ ] Practice frontend/backend, APIs/tokens, localhost/.env, analytics/replay; answer Plan.md questions in your own words.
- [ ] Bring laptop with `python3 server.py` running November 17.

## What the agent did

Implemented browser → local backend → OpenRouter → validated editable Post picks, privacy-aware analytics configuration, and documentation. User selected OpenRouter, supplied the public PostHog snippet, saved the secret locally, and requested free models. Paid requests are not enabled as a fallback.

## Limits and evidence

See `tests/build-2-verification.md`. Synthetic-image checks establish technical behavior only. They are not taste validation, pod critique, or user research. Actual model success, replay playback, and screenshot evidence must be recorded when observed.

Agent/model name: Codex; exact coding model not recorded. Builder report received November 15: 5 hours, $20/month subscription, approximately $5/week allocation. Outside/pod feedback remains pending. The earlier ~$5.60 Build 1 subscription allocation is not new API spend.

## November 15 card studio

Added postcards, thank-you notes, and invitations with local preview, full-photo composition, downloadable PNG and copyable text. Provider links lead to Canva templates and Shutterfly cards for manual upload. Account linking, automatic uploads, ordering, and sending remain unimplemented; no direct connection is claimed. Builder approved this scope and does not have a Canva developer integration.
