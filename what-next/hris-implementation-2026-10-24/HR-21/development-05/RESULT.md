# HR21 development05 — password recovery in the real application

Status: VERIFIED_SCOPED. Overall HR21 remains IMPLEMENTED_PENDING_VERIFICATION. Development continues without deployment prerequisites.

## What changed

Protected HR screens now offer password confirmation when a recent check is required. Confirmation clears the password from the form, preserves business drafts, restores focus and requires an explicit retry of a mutation. Initial protected reads refresh through the existing server authorization gate. English and French recovery copy uses the current dashboard components and styles.

The independent reviewer’s findings were fixed: late challenges cannot reopen after cancellation or verification; employee switching invalidates old challenges; revoked authority hides private review details; and unknown outcomes keep their original command, version, reason, evidence and idempotency key for explicit receipt recovery. A confirmed write remains visibly confirmed if its subsequent read fails. No automatic mutation retry was introduced.

The existing five-minute, session/company-bound password assurance policy remains unchanged. This is not a single-use approval-token implementation. No backend authorization rules, database schema, payroll calculation or statutory policy were changed in this slice.

## Verification

| Lane | Final outcome | Evidence |
| --- | --- | --- |
| Independent source inspection | PASS_SCOPED; all reported findings resolved | INDEPENDENT-REVIEW.md |
| Mocked UI/action transport tests | 74 passed, 8 suites | ui-unit-final.log |
| Actual Chromium + Next + native HTTP authentication + local PostgreSQL | 9 passed; no unhandled page exceptions; synthetic cleanup verified | browser-results.json, browser-final.log |
| Bounded types for changed sources/tests and imports | 0 diagnostics | typecheck-final.log |
| Workflow contract / owned diff | Passed / clean | workflow.log, diffcheck.log |
| Owned Next and PostgreSQL services | Stopped after checks | next-stop.log, postgresql-stop.log |

The browser run uses actual installed Next15.5.27 development routes, BetterAuth credential HTTP transport, real cookies, real protected server actions and the dedicated local database. It does not use fixture-role cookies or a service-action browser adapter. Authentication was performed through the real HTTP endpoint; the login form itself was not part of these nine checks.

Browser checks: native sign-in; wrong password clears input and writes nothing; cancel preserves the employee draft and focus; verification does not submit; explicit Save creates exactly one employee draft; expired assurance opens the French narrow-screen gate with focus; confirmation reruns and admits the authorized handoff read; revoked permission still denies after confirmation; and missing payroll-module access still denies with fresh assurance. Source hashes were stable throughout the final run. Expected aborted navigation/revalidation requests are retained separately from unhandled browser exceptions.

The original missing-recovery behavior was reproduced through the real English authoring page: freshness denial, no employee write, no password dialog. See browser-baseline.json and baseline-no-password-recovery.png. The initial linked app directory was not discovered by Next; the successful runtime copies the route tree, links other current source directories and isolates configuration/output. Harness hydration waits and mocked test imports were corrected before the final passing runs. Earlier failed outputs are diagnostic history, not certification.

## Boundaries and next work

The final browser evidence covers employee-draft recovery and protected payroll-handoff workspace admission. It does not certify hiring through contract activation, a completed leave/shift/payroll/termination lifecycle, nested review dialogs in a real browser, full accessibility or whole-application localization. Nested review and unknown-outcome recovery are covered by mocked UI tests and independent source inspection in this slice. The existing English `Forbidden` body on a French denial state is recorded for the next UI pass.

No production build, schema promotion, deployment, live provider, external message or actual DBakes user account was used. Runtime credentials remained in memory, no browser authentication-state file was saved, and test users/accounts/sessions/organization were verified removed. Runtime folders are ignored and retained only for repeatable development work.

Continue with the ordered real business journeys in NEXT.md. Human acceptance, statutory/provider acceptance and deployment remain separate later stages.
