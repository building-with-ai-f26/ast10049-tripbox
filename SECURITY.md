# Security audit — work in progress

## My kind of app
TripBox is a GitHub Pages prototype that processes photos in the browser. Its optional AI server is local-only. Google sign-in is being developed on a branch; it is not yet live. Account-backed preference, birthday and photo storage are not yet implemented.

## What I checked
- On November 17, 2026, searched the local working copy's `docs/` and `server.py` text source for common secret-key markers, including Supabase secret and service-role keys. This narrow pattern search returned no matches; it is not a full secret or history scan.
- Reviewed the local AI server's request validation and local-only host/origin restrictions. Its in-memory request limit is not a sufficient public deployment control.
- Ran the JavaScript account UI, analytics and card tests. Account authentication was mocked; an OAuth callback-code suppression check passed. Three server validation tests passed; three server HTTP tests could not run because this environment denied local socket binding.

## What I found and fixed
- The proposed Google sign-in flow could put an OAuth code in the callback URL while analytics starts. The branch suppresses analytics on callback URLs; this needs a real browser privacy review before release.
- The real photo workflow and sign-in have not been verified end-to-end on the branch. No actual OAuth or third-party user test is claimed.

## What is left
- Review the complete published assets, repository history, dependencies and exposure of secrets. Verify security of any deployed provider configuration and spending controls.
- Before storing user data, create necessary tables with RLS and restrictive grants; prove unauthenticated and second-user access is denied, and capture evidence.
- If deploying an AI endpoint, design and verify abuse prevention, safe host/origin handling, rate limits across restarts, request-size limits and provider spending caps.
- Verify OAuth, redirect handling, sign-out, analytics and session replay in a real browser and on a phone. Complete an adversarial review and document all findings and fixes.
- This document is an initial record, not a completed security audit.
