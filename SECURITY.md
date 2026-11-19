# Security audit — work in progress

## My kind of app
TripBox is a GitHub Pages prototype that processes photos in the browser. Its optional AI server is local-only. Google sign-in is live; on November 18 a real Google sign-in returned to the deployed app, and Amanda reported sign-in and sign-out working. Account-backed style-reference previews and selected style preferences are live; the style-library table uses owner-scoped RLS. Birthday storage is not implemented.

## What I checked
- On November 17, 2026, searched the local working copy's `docs/` and `server.py` text source for common secret-key markers, including Supabase secret and service-role keys. This narrow pattern search returned no matches; it is not a full secret or history scan.
- Reviewed the local AI server's request validation and local-only host/origin restrictions. Its in-memory request limit is not a sufficient public deployment control.
- Ran the JavaScript account UI, analytics and card tests. Account authentication was mocked; an OAuth callback-code suppression check passed. All six server tests passed, including loopback HTTP tests for rejected cross-origin requests and request limits; the provider response in that test was mocked.

- On November 18, checked the style-library table: RLS is enabled, three owner-scoped policies exist, and the anonymous role has no SELECT grant. An HTTP request using the publishable key without a user session returned 401 with permission denied. A rollback-only SQL test simulated the two actual user IDs and found that the second could neither read nor update the first user's synthetic row. The live app was also tested by saving a synthetic reference in the NYU account, signing out and back in, then switching to the personal account; the NYU reference was not shown there. This UI check does not replace direct adversarial API testing with both sessions.

## What I found and fixed
- The proposed Google sign-in flow could put an OAuth code in the callback URL while analytics starts. The app suppresses analytics on callback URLs including authorization codes and error details; this still needs a real browser privacy review.
- The real photo workflow and third-party user testing have not been verified end-to-end. Google sign-in was verified on the live site; Amanda reported that sign-out also works.

- A repeat read-only anonymous HTTP request on November 18, using the publishable key without a user session, returned HTTP 401 and PostgreSQL permission-denied code 42501 for the style-library table. The actual response was saved locally as submission evidence; it does not replace a two-session adversarial API test.
- A current redesigned dashboard replay showed masked text and an account area hidden from recording. A replay of populated photo-review and typed-input areas remains to be checked.

## November 18 follow-up
- Reviewed the current repository’s Supabase migration: owner-only read, insert and update policies are defined, with no anonymous grant and an 8 MiB payload limit. This is a source review; the live settings and prior tests are described above.
- Reviewed analytics settings: input and text masking and blocking for images, canvases and marked photo regions are configured. A synthetic image and a test phrase were used in the live app, but the corresponding populated review and input moments were not located in playback, so those protections are not yet confirmed in a live replay.
- Re-ran account, card, workspace, and analytics checks against the local staged copy; these are automated checks, and the account test uses mocked authentication. They are not a full production security audit.

## Repository and dependency follow-up
- On November 18, cloned GitHub main at commit `5346ca996bb883521b1a85c0f4c87c205b6316ab` and scanned its reachable patch history for OpenAI-style, OpenRouter, Supabase secret-key and private-key-header patterns. The only OpenAI-style match was an example placeholder in `.env.example`; no other matches were found for those patterns. This is a narrow pattern scan, not proof that history contains no secrets.
- Fetched the pinned Supabase JavaScript dependency from its CDN and independently computed its SHA-384; it matched the integrity value in the app. The PostHog analytics script is loaded from a remote, unpinned URL and remains a third-party supply-chain dependency.
- On that clean checkout, six Python server tests passed after allowing a loopback port; the provider was mocked. Account, account-library, library-session, cards, workspace and analytics JavaScript tests also passed. Authentication and database service tests were mocked where indicated by the test output.

## Source review follow-up
- Searched JavaScript in the clean checkout's app and analytics source for `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, and `window.open`; no uses were found. This targeted search does not prove the absence of cross-site scripting or other vulnerabilities.
- Compared the checked-out app entry point, main app script, analytics configuration, and style-library migration to the then-current GitHub files by blob hash; they matched. Other published assets and dependencies still need review.

## Phone and cross-device check
- Amanda reported that she signed in on her phone, saved style carried over to her computer, and she added and reviewed a photo on the phone. This is a builder-reported functional check, not a direct adversarial API test or a full phone security review.

## November 19 anonymous-access recheck
- Repeated a read-only GET for the style-library revision using only the public publishable key and no user session. Supabase returned HTTP 401 with permission denied. This confirms anonymous table access was refused at the time of this test; it does not establish isolation between two authenticated users.
- PostHog's recordings page remained accessible, but the populated photo-review and typed-input moments have not been verified in playback. Do not treat replay privacy as passed until both are observed.

## November 19 published-source follow-up
- Compared Git blob hashes for the prototype HTML, analytics configuration, account, curation, reference store, account library, AI, cards and workspace scripts against current GitHub main; the inspected local copies matched. Reviewed their script origins: Supabase is version-pinned with an integrity attribute, and PostHog loads a remote unpinned script. External card links use `noopener noreferrer`. This is a targeted source review, not proof that the CDN-delivered files are safe or that all published assets have been audited.
- Session replay listed recent prototype activity, but the specific populated review and typed-input moments were not verified in playback; the privacy check remains open.

## What is left
- Continue the published-assets and dependency review beyond the limited history scan and Supabase integrity check above. Verify the delivered script in a browser, any deployed provider configuration, and spending controls.
- Test direct adversarial API requests with both signed-in sessions and verify existing-browser import. Amanda saved a screenshot showing HTTP 401 and permission denied; its request context is in the local evidence file.
- If deploying an AI endpoint, design and verify abuse prevention, safe host/origin handling, rate limits across restarts, request-size limits and provider spending caps.
- Verify remaining photo workflows, phone analytics and current-design session replay masking; phone sign-out has not been separately verified. Complete an adversarial review and document all findings and fixes.
- This document is an initial record, not a completed security audit.
