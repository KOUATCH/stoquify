# Password recovery — implemented public journey

2026-09-06, source v20. ID-06 and ID-07 remain partially verified workflows because real email delivery and operator recovery are not yet proven.

## What to do

Open `/en/forgot-password` or `/fr/forgot-password`, enter the email used for your account and request a link. The response deliberately does not disclose whether an account exists or confirm delivery. Check the inbox and spam folder. Wait before requesting again; the existing server applies request limits. If nothing arrives, contact your workspace owner using your usual channel. The form retains the email for an explicit review/retry and no longer displays a fabricated delivery success or client-only cooldown.

Open the private reset link from the recovery message. Keep it private. The link contains the token and account email; neither is an approval reference or something to paste into public reports. Language switching preserves the same link. Enter and confirm a different policy-compliant password, then save. A successful response confirms the password was changed, previous sessions ended and the link consumed. Continue to sign in with the new password. Current organization access still applies.

For mismatched or rejected passwords, correct the preserved entries. For an invalid, expired, already-used or unavailable-account link, request a new link or contact the workspace owner. For an uncertain response, first try signing in with the new password: the database may have committed even if the response was lost. Do not assume failure means the old password is still valid.

Required user information: account email (from your original invitation/registration), the private reset link (from the existing email delivery channel), and the chosen new password. An administrator investigating failure needs the request time/timezone and affected account through a private support channel, and authorized access to application audit/provider records. Never ask the user to provide their password. This implementation does not create a new mail provider or resolve an unavailable mailbox.

## Corrections and controls

Both forms use the current public AuthV2Shell, responsive shared controls and EN/FR messages. Password fields are masked, disabled until hydration, and native forms use POST. Pending submissions are fenced. Policy/rate-limit/transport failures preserve drafts and receive focus. Only a confirmed reset response displays completion. The reset page sets no-referrer and no-index metadata; the private link remains in the current browser URL by the existing contract.

Reset input is bounded before database/password work. Initial and final checks require an active account and active, non-deleted organization. The final transaction locks the organization, conditionally consumes the current token/expiry/account/password generation, checks credential ownership, synchronizes credentials/history, revokes sessions and writes the mandatory security audit. Audit failure, credential failure or ambiguous credential ownership rolls back link consumption and other effects. Concurrent resets have one winner. Password policy and abuse limits are unchanged.

## Verification

- Original UI regression: statuses 400, 429 and 503 each triggered a false success (`password-recovery-before-02.json`, three failures). Initial attempt could not load the icon dependency; retained separately.
- Original service regression: completion resolved 200 despite transaction-audit failure (`password-reset-audit-before.json`, one failure). Corrected by moving the audit into the credential transaction.
- Final combined regression: 175/175, ten suites, `password-recovery-final-regression.json`, exit 0, chunk 323ff4. Includes unchanged password-change behavior, recovery forms, current route and public action contracts. Earlier focused 96/96 pass retained.
- Typecheck exit 0, 747bec (earlier f7bdb8 also passed). Ten-file lint exit 0, 8af4a9; final changed-test lint exit 0, ca6367. Diff check exit 0, 9df6a5; CRLF warning retained.
- Real PostgreSQL: `password-reset-98e3308e-a30.json`, 15/15, source stable and unrelated authority unchanged. Success/single-use, concurrent winner, audit/credential rollback and retry, expiry/replacement/password/account/organization revocation during preparation, duplicate/misbound credential rollback, final row-lock checks and policy recovery. Per-check duration fields in this driver were captured before awaiting work and are not valid latency measurements; no timing claim is based on them.
- Actual application: `password-recovery-browser-browser-8b5721cb-a9d.json`, EN/FR 2/2, source stable and unrelated authority unchanged. Unknown-account acknowledgement without mail, malformed/expired link, policy rejection, interrupted request and preserved draft, true reset, two actual sessions revoked per account, one audit and history change, old-password denial and new-password login. Fifteen masked screenshots. French mobile ready screen visually inspected.
- Viewports 390/768/1440, keyboard submission, reduced-motion preference, focus on errors, no-JavaScript password safety, language-link preservation and no-referrer metadata verified. No new password appeared in a URL.
- Development readiness: EN 1613 ms, FR 2078 ms; save 1485/1426 ms respectively. These are observed development baselines, not production budget passes.

## Rollout and limits

No migration, deployment or existing-customer mutation. Keep the service, action and localized forms together. Do not restore old passwords, consumed tokens or expired sessions when recovering from a UI rollback; use current authorized recovery and retain the audit. Successful synthetic fixtures are consumed and must not be reset for repeat screenshots. Private fixture files are excluded from report artifacts.

The existing reset-request provider call is inline, with no durable delivery/retry record; full mail delivery and operational recovery remain open. No live mail was sent. A historical exported `components/auth/ForgotPasswordForm` still simulates a send and has no current direct route caller; it is explicitly retained in the reconciliation backlog, not counted as verified. Native zoom, actual screen reader, comprehensive contrast and complete downstream onboarding remain unverified. The earlier module scanner's conditional-password-action/custom-wrapper parser gaps remain separate; a service-boundary pass does not clear them.

Architecture, backend/data consistency, security/privacy/abuse, frontend/EN-FR/accessibility, product, QA, audit and rollout/support apply. Provider delivery remains an open boundary. Finance/statutory/country packs, POS/inventory, AP/payroll, ledger, analytics and AI: not applicable to this bounded credential recovery because their records and policies are not changed. Commercial packaging: no change. No full-platform, full-build, release, X1 or professional certification.
