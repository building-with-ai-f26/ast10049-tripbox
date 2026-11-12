# Build 2 verification — November 12, 2026

## Automated checks

`python3 -m unittest discover -s tests -v`: 6 tests passed.

Covers request bounds, duplicate IDs, remote-image URL rejection, invalid model output, secret exclusion from provider payload, cross-origin rejection, missing-key recovery, `.env` not served, a successful mocked upstream response, and local rate limiting. Mocked responses do not count as a real AI call.

JavaScript syntax checks and `git diff --check` passed. A design detector reported existing uppercase labels, the incumbent cream palette, and the initially empty review image in a closed dialog; these are not new functional failures. No redesign was attempted.

## Real browser/API evidence

In the local app at `http://127.0.0.1:8000/prototype/`, imported two synthetic JPEG fixtures, enabled preview-sharing permission, and clicked **Ask AI for Post picks**.

The real OpenRouter request using `nvidia/nemotron-3.5-super-vl:free` returned two editable Post picks with valid IDs and image-specific explanations. Browser status reported **683 input tokens, 49 output tokens, cost $0.000000**. A repeated call also succeeded (49 output tokens); draft creation worked, and two Undo actions restored zero picks. Photo cards showed Post labels and explanations for the blue/yellow and orange/pink synthetic fixtures. No console errors/warnings were observed at that point.

These are technical fixtures, not actual travel photos or user research. Taste, duplicate quality, and time savings remain unvalidated. See `docs/build-2-ai-demo.jpg` for browser evidence.

Earlier checks: paid model returned a credits error; free Google model returned provider rate limits; the first NVIDIA batch timed out. The smaller browser request with reasoning disabled succeeded. Free models may still be slow, unavailable, or rate-limited. The implementation has no paid fallback.

## PostHog

Both `docs/index.html` and `docs/prototype/index.html` load the shared US PostHog configuration. It enables pageviews, masked click autocapture, session replay, `clicked_try_product`, and AI start/completion/failure events. All input values and replay text are masked, and images/photo containers are blocked. Analytics errors must not break photo review or AI.

Dashboard access reached the US login page; dashboard receipt, replay playback, and the required dashboard screenshot are **pending sign-in**. SDK configuration is not proof that these items arrived. Do not mark Build 2 fully complete until this is observed.

## Remaining manual checks and evidence

1. Sign into the matching US PostHog project. Visit product page and local app, click Try the prototype, and interact for 10 seconds. In Activity confirm `$pageview`, `$autocapture`, `clicked_try_product`, and AI events.
2. Open and watch a session recording; confirm personal photos and input values are absent. Capture a dashboard screenshot showing events for submission.
3. Compare AI and manual favorites/review time using a permitted real-trip batch; repeat with an outside tester. Record actual results, hours, costs, and pod feedback.
4. Product page and app were checked at 390px width with no horizontal overflow. Full 200% zoom, keyboard-only, and screen-reader testing remain pending. No complete accessibility claim is made.
5. Confirm meaningful pushes on two separate days during November 10–16; submit product page/repository URLs and dashboard screenshot in Icerynk by November 16 at noon New York time.
6. Bring the laptop running `python3 server.py` November 17.
