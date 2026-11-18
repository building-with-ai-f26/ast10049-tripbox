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

## Phone and cross-device check
- Amanda reported that she signed in on her phone, saved style carried over to her computer, and she added and reviewed a photo on the phone. This is a builder-reported functional check, not a direct adversarial API test or a full phone security review.

## What is left
- Review the complete published assets, repository history, dependencies and exposure of secrets. The sign-in implementation pins its Supabase JavaScript dependency to 2.119.0 and includes a SHA-384 integrity check; verify the delivered script in a browser before release. Verify security of any deployed provider configuration and spending controls.
- Test direct adversarial API requests with both signed-in sessions, verify existing-browser import, and save the required security-test screenshot.
- If deploying an AI endpoint, design and verify abuse prevention, safe host/origin handling, rate limits across restarts, request-size limits and provider spending caps.
- Verify remaining photo workflows, phone analytics and current-design session replay masking; phone sign-out has not been separately verified. Complete an adversarial review and document all findings and fixes.
- This document is an initial record, not a completed security audit.
