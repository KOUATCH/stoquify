# HR21 development04 — password assurance and protected HR admission

Status: VERIFIED_SCOPED once accompanied by the sealed passing evidence.json. Overall HR21 remains IMPLEMENTED_PENDING_VERIFICATION. This is development verification; no deployment details were required.

## What changed

- A password re-verification lock now blocks use of retained recent assurance. Reaching the failure threshold clears prior assurance, so expiration of the throttle cannot resurrect it.
- The shared action guard compares the user and company from fresh authentication with the current permission context before module evaluation or business execution. A company move between those reads requires another password check.
- Employee directory/profile/self-profile and compensation read/write actions enforce the existing payroll module policy. Managed zero grants deny access; read-only payroll permits reads and denies writes. Other historical HR action files are not thereby certified as module-enforced.
- Locked-account password re-verification returns AUTH_REQUIRED instead of an internal-error classification.

The existing policy remains reusable recent authentication, normally five minutes, bound to the current session and company. It is not a single-use approval token. No schema, permission vocabulary or new authentication system was introduced.

## Verification and independence

| Evidence class | Result and scope |
|---|---|
| Native authentication and real PostgreSQL | 25 scenarios passed, including real BetterAuth credential login, signed cookies, Argon2 password verification, session assurance, direct HR server actions, module decisions and stored outcomes. |
| Saved-source reproduction | The same harness with six saved pre-change owners reproduced eight failing assertions: active-lock admission, expired-throttle resurrection, employee/compensation module writes, selected module reads, read-only writes, company race, and locked-account error classification. Synthetic fixtures were cleaned. |
| Focused mocked regressions | 49 tests across six suites passed; 16 additional tests across four adjacent-action suites passed for lifecycle, payment details, time/leave and approval inbox. |
| Type and workflow checks | Exact final results are retained in typecheck-final.log, workflow.log and diffcheck.log and required by the sealing script. |
| Independent review | Read-only independent source/evidence review; reviewer executed no tests. Findings and final disposition are recorded separately. |
| Browser, Next transport, providers, human acceptance | Not executed in this slice. |

The harness adapts only the guarded Prisma connection, request headers, server-only marker and Next cache revalidation. It calls actual server actions directly; it does not qualify the Next action transport, request-origin handling or rendered interface. The race test adds an explicit real-database interleaving between the actual assurance and permission reads. Neither owner is replaced with a fabricated successful decision.

Native cases verify login alone cannot mutate; invalid/oversized passwords; server-derived session/company; five failures and expired throttle; no transfer to another user or session; stale/future/wrong-company evidence; intentional reuse and employee-request replay without duplicate events; permissions; foreign employee denial without row/event changes; compensation proposal, independent actor separation and missing-contract denial; module absence, read-only behavior and positive handoff access; live company/account/session changes; and audit secrecy.

The compensation fixture deliberately has no approved contract. Independent approval correctly returns BUSINESS_RULE_VIOLATION and leaves the assignment DRAFT. Complete successful document/contract/compensation lifecycle evidence remains separately recorded in development02; this slice does not pretend to repeat it.

## Review corrections

The reviewer required successful payroll handoff admission with salary-read permission before checking module denial, plus a specific denied module audit. This prevents an unrelated permission failure from satisfying the module test. The foreign edit now supplies the foreign employee's matching number and current version, then checks both companies' employee rows and business-event count remain unchanged.

Fixture expectations were corrected to current safe-action codes: foreign reads FORBIDDEN; foreign ID/number edit rejected by tenant-bounded identity resolution as CONFLICT; revoked actions AUTH_REQUIRED. Security tests require exact codes, never merely any failure. Older adjacent mocked tests were updated only to include matching server-owned user/company claims and the logger method exercised by existing denial handling.

## Environment, provenance and limits

Only stoquify_local_hris_20261024 at 127.0.0.1:55464 was used, with unique synthetic organizations/accounts. The harness checks cleanup of organizations, users, accounts and sessions before reporting PASS. No application .env, real employee credentials, live provider, invitation or external network was used.

Initial local-launch attempts could not connect and are retained as failed environment runs. The owned synthetic PostgreSQL process was verified, restarted after normal stop failed, recovered its local database, and then accepted the native tests. Final shutdown is separately retained. Those failed starts are not counted as application verification.

The early file named unit-reproduction.log completed after fixes and is not before-fix proof. The explicit saved-source native baseline replay is the before-fix proof. Baselines include the shared working-tree state at the start of this slice; unrelated changes were preserved. No commit or deployment was performed.

Rollback is code-only but would restore the reproduced weaknesses. No migration or backfill is required. Preserve the assurance invalidation, matching user/company and module checks when changing these paths.

## Next ordered development step

Run isolated rendered application journeys for hiring, leave, shifts, payroll preparation and termination, with fresh-password prompts, validation/recovery, role denials and supported locales. Read the UI master and page contracts first. Hosting, human operator acceptance and production qualification remain later milestones and do not block this development work.
