# Password change — implemented and verified slice

2026-09-06, source v19. This supersedes the pre-implementation findings in PASSWORD_CHANGE_REVIEW.md; earlier failures are retained.

## Use

Open the account menu → Change your password, or `/en/dashboard/change-password` / `/fr/dashboard/change-password`. The current role must contain the existing canonical `profile.password.update` permission. A role with only the unknown legacy `PASSWORD_READ` value is not granted additional authority automatically; an authorized role administrator must review its intended rights.

Enter your current password and a different policy-compliant password (12–128 characters, no repeated triples, common passwords, email local part or recent reuse). Your current password provides actual fresh assurance and uses the existing attempt limits. Save once. The server changes the credential, retains password history and the security audit, revokes this account's sessions and invalidates earlier reset links in one transaction. You are sent to the localized sign-in page; sign in with the new password. The informational sign-in notice is not itself evidence of a completed change.

Wrong password, policy rejection and recoverable transport errors preserve the draft. A stale account or expired/revoked session requires signing in again. An uncertain response may follow a completed write: try the new password before requesting recovery. Do not automatically replay the old request. Administrator changes require `users.password.reset`, fresh password assurance and a same-organization active target. That existing service/action branch leaves the acting administrator's sessions intact; no new target-reset screen was introduced.

## Delivered controls and presentation

The service checks current actor, organization, role membership, credential generation and session again under PostgreSQL locks after password preparation. Credential/history/session/reset-link/audit effects commit together. Concurrent requests cannot overwrite a newer credential; audit or credential failure rolls back all effects. Identity service changes were limited to the extracted password workflow and re-export after automatic review rejected a broad shared-file replacement.

The authenticated route reuses the dashboard shell and page theme, semantic brand/info/danger colors, shared form controls and EN/FR strings. Both passwords are masked. Hydration-disabled fields and native POST avoid credential submission through GET. Errors receive focus, duplicate pending submission is prevented, and the account-menu entry is permission-scoped. Browser testing exposed a real handoff race with session revocation; successful self-service now redirects outside error normalization directly to localized sign-in.

## Evidence

- `password-change-final-regression.json`: 151/151 checks across eight affected service, action, form, route, navigation and shell suites. Initial final run passed 151 but could not write its receipt (EPERM); scoped retry saved the receipt, exit 0, chunk c88822.
- Typecheck exit 0, chunk 4912cc. Nineteen-file scoped lint exit 0, a08350. Scoped diff check exit 0, 1405f2; preexisting CRLF notices retained.
- `password-change-279e10b0-843.json`: 19/19 real PostgreSQL checks, current source stable and unrelated authority unchanged. Includes self/admin, concurrent winner, rollback/retry, seven revocations during preparation, five final-lock checks, wrong/reused password and foreign target. No external fetch executed. Earlier 33c248ee-8f3 also passed 19/19. Refresh fb985649-a81 failed its first expected-success assertion with 400; the exact policy code was not retained. The fixture generator had a possible repeated-character boundary collision; a separator and actual schema assertion were added, without changing production policy, before the successful rerun.
- `password-change-browser-browser-8b9fbe91-1e0.json`: actual EN/FR 2/2, source stable and unrelated authority unchanged. Current-password and policy failures, interrupted request/retry, actual two-session revocation, one audit, old-password rejection, new-password login, denied navigation, masked POST, no-JavaScript safety, keyboard handoff and 390/768/1440 widths. Fourteen screenshots retained; French ready and English sign-in handoff visually inspected.
- Development route readiness: EN 2667 ms, FR 2989 ms. Save/sign-in handoff: EN 22178 ms, FR 2328 ms. This is an observed development baseline, not a production budget pass or evidence of a quantified improvement.
- Static module scan `password-change-boundaries.json` remains failed with three parser gaps (conditional permission and delegated route guard) and zero active service-boundary violations. Current action/route denial tests and browser permission checks provide separate runtime evidence; the static result is not relabeled.

## Operating and review limits

No schema migration, deployment, production credential change or provider notification occurred. Keep the existing Argon2id, password policy, audit and session facilities together when rolling out. Reverting the UI does not restore old passwords or sessions. Use the existing verified recovery procedure for affected users; do not restore credential hashes or erase audit/history. Both generations of local successful browser credentials have changed; never reset/replay consumed fixtures. Their private files are not report artifacts.

Architecture/backend/data/security/IAM, frontend/accessibility/EN-FR, product, audit, QA and support perspectives apply. Finance, statutory/country rules, inventory/POS, AP/payroll, ledger, analytics and AI: not applicable to this bounded credential mutation; their business records are not changed. Commercial packaging: existing settings/module observation preserved, no new entitlement or price. Provider notification and public forgotten-password delivery are separate workflows. Native zoom, actual screen reader and comprehensive contrast remain unverified. No whole-platform, full-build, release, X1 or professional certification is claimed.
