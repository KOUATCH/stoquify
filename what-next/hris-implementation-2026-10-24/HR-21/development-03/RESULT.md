# HR21 development continuation 03 — native authentication and tenant authority

Status: **VERIFIED_SCOPED** for the checks described below. Overall HR21 remains **IMPLEMENTED_PENDING_VERIFICATION** for complete application/operator release acceptance. Development continued without deployment details, as requested. Previous [effective-leaver and recovery checks](../development-02/RESULT.md) remain separately recorded.

## Correctness fixes

1. **Permanent account locks could be cleared by valid credentials.** The actual BetterAuth credential handler reproduced this defect; lock-reproduction-failure.json retains the failing assertion. Login now rejects inactive, indefinitely locked and currently throttled accounts with an authentication error. Only an expired timed throttle may be cleared, using a conditional update. Post-login bookkeeping cannot clear an account that has since been disabled or locked.
2. **Attached roles were not restricted to the current tenant.** Fresh authorization now selects and filters each role's organization before deriving permissions, user roles or superuser authority. A regression keeps an old-tenant wildcard role attached during a synthetic tenant move and proves it grants nothing; a newly assigned current-tenant narrow role grants only its own permission. Ordinary sessions are not falsely described as permanently bound to a tenant: the existing Session model binds identity, while each authorization request derives current tenant authority.
3. **Current session data is read consistently.** requireSession bypasses the signed cookie cache, matching the existing fresh RBAC read, and still checks the live session mirror. Revoked and expired sessions deny even when the request retains its signed cookie-cache data.

Owned product changes: lib/auth.ts, lib/security/rbac.ts, lib/security/auth-session.ts. Focused tests: lib/security/__tests__/rbac.test.ts and auth-session.test.ts; the existing auth-deactivation.test.ts was reused and preserved. Existing mocked BetterAuth casts were made explicit through unknown so the focused type check is clean. No schema change, new permissions or new identity system was introduced.

## Evidence classes

The command registry fingerprint was updated only for the independently reviewed RBAC mocked regression test. The initial workflow drift report is retained; final workflow validation passed after that reviewed update. Other registry entries were preserved.

| Class | Result |
|---|---|
| Native authentication + real PostgreSQL | **13 checks passed** using the actual BetterAuth handler/configuration, real Argon2 passwords, PostgreSQL adapter, signed cookies, session owner, RBAC and HR profile reader. Only the database connection, request-header context and server-only import boundary are adapted for the local harness. |
| Focused mocked security tests | **24 passed across3 suites**: deactivation/permanent locks, RBAC tenant isolation and session/fresh-auth unit contracts. These unit mocks do not qualify fresh-auth integration. |
| Typecheck | **0 diagnostics** for the changed auth owners and focused tests. The initial8 mock-cast diagnostics remain retained and were corrected; no whole-repository build claim. |
| Independent review | **PASS_SCOPED_SOURCE_ONLY** for the product fixes and **PASS_SCOPED** source/retained-evidence review; reviewer executed no tests. |
| Browser/provider/operator | **NOT_RUN** here. This harness is an actual auth.handler/cookie API integration, not a rendered Next application or browser journey. |

The13 native checks cover anonymous denial; wrong password401; permanent lock403; disabled, timed-lock and unverified login403; untrusted browser-origin403; successful credential/cookie issuance and explicit security-audit counts; authorized HR read; own/cross-tenant scope; live role revocation; inactive/locked account denial; tenant moves without inherited wildcard authority; deleted sessions; expired sessions. All denials use expected statuses/codes where available, so a500 cannot count as correct login denial. Signed session_data cookies are explicitly retained throughout the revocation checks.

## Review findings and corrections

The first synthetic tenant-move expectation incorrectly assumed any tenant move must invalidate ordinary credentials. Source and schema review corrected the contract to current tenant identity plus no inherited foreign authority; no new tenant-binding mechanism was invented. The first origin fixture lacked browser Fetch Metadata; the installed library intentionally treats nonbrowser no-cookie requests differently. The corrected fixture sends browser metadata and verifies403; no origin-validation product change was needed. Review also required exact denial statuses rather than merely non200; this was implemented before final verification.

## Data and limits

Only guarded stoquify_local_hris_20261024 on127.0.0.1:55464 was used. Synthetic users, credentials, sessions, roles and organizations are namespaced and cleaned. Cleanup explicitly checks organization, user, account and session absence before PASS. No passwords, tokens or cookies are retained in artifacts. AsyncLocalStorage supplies request-scoped headers; external fetch and social providers are disabled in the harness. No application .env, deployment, invitation, live provider or real DBakes account was used.

Password step-up/fresh-auth action admission, full Next route/module enforcement, browser workflows and human operator acceptance remain separate checks. No production readiness, country-rule qualification or complete security certification is claimed.

## Next ordered development work

Continue with native password step-up and protected HR action/module admission, followed by isolated rendered application journeys. These are development checks and do not require deployment details. Actual hosting, named human acceptance and rollout remain later release work. HR20 live payroll and HR22 expansion remain unselected.

Architecture/security reuse existing authentication, session, single employee and current-role owners. QA separates real authentication/database results from mocked tests. UI, country calculations, AI, POS and purchasing behavior did not change. Rollback must preserve account locks and current-tenant role filtering; reverting to the old behavior reintroduces these defects. No migration/backfill is required.
