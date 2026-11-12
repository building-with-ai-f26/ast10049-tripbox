# Build 2 verification — November 12, 2026

## Automated checks

`python3 -m unittest discover -s tests -v`: 6 tests passed.

Covers request bounds, duplicate IDs, remote-image URL rejection, invalid model output, secret exclusion from provider payload, cross-origin rejection, missing-key recovery, `.env` not served, a successful mocked upstream response, and local rate limiting. Mocked responses do not count as a real AI call.

`node tests/test_analytics.cjs` passed: launch clicks use the live SDK after it replaces the loading array, and replay masking remains configured.

JavaScript syntax checks and `git diff --check` passed. A design detector reported existing uppercase labels, the incumbent cream palette, and the initially empty review image in a closed dialog; these are not new functional failures. No redesign was attempted.

## Real browser/API evidence

In the local app at `http://127.0.0.1:8000/prototype/`, imported two synthetic JPEG fixtures, enabled preview-sharing permission, and clicked **Ask AI for Post picks**.

The real OpenRouter request using `nvidia/nemotron-3.5-super-vl:free` returned two editable Post picks with valid IDs and image-specific explanations. Browser status reported **683 input tokens, 49 output tokens, cost $0.000000**. A repeated call also succeeded (49 output tokens); draft creation worked, and two Undo actions restored zero picks. Photo cards showed Post labels and explanations for the blue/yellow and orange/pink synthetic fixtures. No console errors/warnings were observed at that point.

These are technical fixtures, not actual travel photos or user research. Taste, duplicate quality, and time savings remain unvalidated. See `docs/build-2-ai-demo.jpg` for browser evidence.

Earlier checks: paid model returned a credits error; free Google model returned provider rate limits; the first NVIDIA batch timed out. The smaller browser request with reasoning disabled succeeded. Free models may still be slow, unavailable, or rate-limited. The implementation has no paid fallback.

## PostHog

Both `docs/index.html` and `docs/prototype/index.html` load the shared US PostHog configuration. It enables pageviews, masked click autocapture, session replay, `clicked_try_product`, and AI start/completion/failure events. All input values and replay text are masked, and images/photo containers are blocked. Analytics errors must not break photo review or AI.

Signed into the matching US project on November 12 and observed public/local pageviews, click autocapture, `clicked_try_product`, and AI start/completion events. `clicked_try_product` initially called the stale SDK loading queue; the handler now calls `window.posthog.capture`, and a regression check covers SDK replacement.

Project-level session recording was initially off. Enabled it, generated a fresh synthetic visit, then played the resulting 14-second recording. Replay showed masked trip-name input and text, with photo containers excluded. The default >5 active-seconds list filter hid this short test replay; lowering the view filter to >0 made it visible. No project-wide filter defaults were changed.

Created the private [Tripbox Build 2 Evidence dashboard](https://us.posthog.com/project/721209/dashboard/2344126) with native event feeds for public/local pageviews, launch clicks, and AI completions. All three showed received test events; the AI feed showed two completed requests. Saved a dashboard screenshot for the builder’s submission. Public evidence in `docs/build-2-posthog-events.jpg` hides the person column, and `docs/build-2-posthog-replay.jpg` omits visitor metadata. These are agent/builder technical checks, not real user research.

## Remaining manual checks and evidence

1. Keep the saved dashboard screenshot for Icerynk submission; repeat checks if analytics configuration changes.
2. Replay masking was checked with synthetic content. Continue checking with permitted test photos before broader testing.
3. Compare AI and manual favorites/review time using a permitted real-trip batch; repeat with an outside tester. Record actual results, hours, costs, and pod feedback.
4. Product page and app were checked at 390px width with no horizontal overflow. Full 200% zoom, keyboard-only, and screen-reader testing remain pending. No complete accessibility claim is made.
5. Commit history confirms meaningful pushes on November 11 and 12. Submit product page/repository URLs and the saved dashboard screenshot in Icerynk by November 16 at noon New York time.
6. Bring the laptop running `python3 server.py` November 17.
