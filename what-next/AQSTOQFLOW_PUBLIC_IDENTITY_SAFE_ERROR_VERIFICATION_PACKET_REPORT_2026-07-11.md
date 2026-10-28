# AqStoqFlow Public Identity Safe-Error Verification Packet Report

Date: 2026-07-11

Workspace: `E:\ohada saas\Focused projects\stoquify`

Mode: surgical verification and test ratchet

Skill: `exam-007-aqstoqflow-error-response-normalizer`

Risk class: 007, raw error response normalization

## Objective

Restore and prove the safe-error release baseline for the public identity abuse-control service without weakening serializable retries, public enumeration resistance, request-context derivation, or redaction.

## Evidence Inspected

- `C:\Users\J COMPUTER\.codex\attachments\d4300d6a-93c0-47d2-88d3-143976652de1\pasted-text-1.txt`
- `what-next/AQSTOQFLOW_MODULE_CONTROL_INVENTORY_CLASSIFICATION_PACKET_REPORT_2026-07-11.md`
- `graphify-out/GRAPH_REPORT.md`
- `prisma/schema.prisma`
- `services/security/public-identity-abuse.service.ts`
- `services/security/__tests__/public-identity-abuse.service.test.ts`
- `services/users/user-identity.service.ts`
- `services/users/__tests__/user-identity.service.test.ts`
- `actions/users/createUser.ts`
- `actions/users/createInvitedUser.ts`
- `actions/users/sendResetLink.ts`
- `actions/users/updateUserPassword.ts`
- `actions/users/verifyOtp.ts`
- `actions/users/__tests__/public-identity-actions.test.ts`
- `actions/_shared/safe-action-responses.ts`
- `actions/_shared/__tests__/safe-action-responses.test.ts`
- `services/_shared/action-errors.ts`
- `lib/error-handling/canonical.ts`
- `scripts/raw-error-boundary-gate.js`
- `scripts/public-identity-abuse-gate.js`
- their focused script tests and current generated readiness artifacts

The two historical reports named by the skill were not present at their expected paths:

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`

Current code, policy gates, graph evidence, schema evidence, and the prior dated packet were therefore used as the authoritative sources for this slice.

## Current-State Finding

The raw `throw error` finding reported by the preceding packet had already been corrected by concurrent work before this packet edited files.

The live runtime service now:

- hashes public identifiers with HMAC before persistence;
- uses serializable transactions;
- retries Prisma `P2002` and `P2034` conflicts up to three attempts;
- converts exhausted retryable conflicts to non-exposing `DATABASE_CONFLICT` errors;
- converts other persistence failures to non-exposing `DATABASE_UNAVAILABLE` errors;
- never includes raw Prisma messages in the typed client boundary;
- keeps subject and IP dimensions separate and hashed.

The public server actions already catch these typed failures:

- registration and invitation use `safeStatusActionErrorResult`;
- password-reset requests preserve a generic `200` response;
- reset completion uses the safe status mapper;
- OTP verification logs safe metadata and returns a generic denial status.

No runtime service or action implementation was changed by this packet.

## Test Ratchet Added

The packet strengthened focused evidence in three places:

1. `services/security/__tests__/public-identity-abuse.service.test.ts`
   - asserts the exact stable safe message for exhausted serialization conflicts;
   - asserts the exact stable safe message for non-retryable persistence failures;
   - preserves assertions for three retry attempts and non-exposing typed errors.

2. `actions/_shared/__tests__/safe-action-responses.test.ts`
   - proves a non-exposing typed `DATABASE_CONFLICT` becomes the canonical internal client message;
   - proves the client response does not contain Prisma detail.

3. `actions/users/__tests__/public-identity-actions.test.ts`
   - proves registration infrastructure errors are routed through the safe status mapper;
   - proves the returned registration envelope contains no raw database detail;
   - proves password-reset request failures remain generic and enumeration-safe.

## Changed Files

Direct test edits made by this packet:

- `services/security/__tests__/public-identity-abuse.service.test.ts`
- `actions/_shared/__tests__/safe-action-responses.test.ts`
- `actions/users/__tests__/public-identity-actions.test.ts`

Runtime implementation inspected and preserved, but not authored or edited by this packet:

- `services/security/public-identity-abuse.service.ts`
- `services/users/user-identity.service.ts`
- public identity actions under `actions/users/`
- `package.json` policy wiring

Evidence refreshed by required release commands:

- `what-next/public-identity-abuse-readiness.md`
- `what-next/public-identity-abuse-readiness.json`
- `what-next/api-route-guard-inventory.md`
- `what-next/api-route-guard-inventory.json`
- `what-next/settings-surface-classification.md`
- `what-next/settings-surface-classification.json`
- `what-next/ledger-close-truth-readiness.md`
- `what-next/ledger-close-truth-readiness.json`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

Packet report:

- `what-next/AQSTOQFLOW_PUBLIC_IDENTITY_SAFE_ERROR_VERIFICATION_PACKET_REPORT_2026-07-11.md`

## Focused Verification

Primary command:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath services\security\__tests__\public-identity-abuse.service.test.ts services\users\__tests__\user-identity.service.test.ts actions\users\__tests__\public-identity-actions.test.ts actions\_shared\__tests__\safe-action-responses.test.ts scripts\__tests__\public-identity-abuse-gate.test.js scripts\__tests__\raw-error-boundary-gate.test.js
```

Result:

- Test suites: 6 passed, 6 total.
- Tests: 38 passed, 38 total.

Final current-worktree focused refresh also included the concurrently corrected assurance-registry suite:

- Test suites: 7 passed, 7 total.
- Tests: 78 passed, 78 total.

Exact fail-mode checks:

- `node scripts/raw-error-boundary-gate.js --mode fail`: passed, 0 active unsafe findings.
- `npm run public-identity:abuse:gate`: ready, 15/15 checks, 0 blockers, 1 release-secret warning.

## Release Gates

Passed on the stabilized current worktree:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`: 0 errors, 4 unrelated existing warnings
- `npm run policy:gates`
- `node scripts/workflow-assurance-release-gate.js --mode fail`: 37/37 checks, 0 blockers
- `node scripts/kontava-moat-release-gate.js --mode fail`: ready, 0 blockers
- `npm test -- --runInBand`: 306 suites and 1588 tests passed
- `npm run build:app`: passed; stale `.next` output from an earlier transient failure was safely cleaned by the build wrapper

The aggregate policy run passed inventory, service, API, public-identity, settings, workflow, moat, receipt-token, payroll immutability, hard-delete, regulatory, demo-trust, and raw-error checks. A later stitched run also passed the newly added ledger-close truth gate at 10/10.

## Stitched Verification Result

`npm run verify:repo` did not produce a green aggregate exit in one uninterrupted worktree snapshot.

It passed:

- Prisma validation;
- typecheck;
- lint;
- the expanded policy suite, including public identity and ledger-close truth;
- the production build.

Its final Jest phase encountered a transient concurrent syntax error in `services/assurance/__tests__/assurance-registry.service.test.ts`. That file was corrected by its owning concurrent workstream after the failure. The corrected assurance suite then passed in the 7-suite focused refresh, and a final current-state full Jest run passed 306/306 suites and 1588/1588 tests.

This report therefore records all constituent release gates as green on the current worktree, while accurately recording that the single stitched `verify:repo` invocation exited non-zero because the worktree changed during its run.

## Control Impact

- Tenant isolation: unchanged; public identity operations remain outside tenant-auth flows where appropriate, and authenticated workflows retain server-owned scope.
- RBAC: unchanged; this packet did not modify protected internal user-management actions.
- Module entitlement: unchanged and still report-only outside existing observe-mode controls.
- Auditability: existing security-event logging and safe structured logging remain intact.
- Redaction: stronger focused proof now covers typed persistence errors and public action results.
- Safe errors: raw-error fail baseline restored to zero and directly tested at service, mapper, and action boundaries.
- Database safety: no schema, migration, seed, reset, or destructive database operation was added by this packet.
- Release gates: all current constituent commands are green; the stitched-run concurrency caveat is documented above.

## Residual Risks

- `PUBLIC_IDENTITY_ABUSE_HASH_SECRET` is not configured in this local environment. The readiness gate correctly keeps one release warning and never prints secret values.
- The production public receipt token secret is also not configured locally.
- A clean `verify:repo` run on a frozen worktree snapshot is still desirable because concurrent edits caused its aggregate command to exit non-zero despite current constituent passes.
- Four unrelated lint/build warnings remain.
- The two historical reports expected by the selected skill are absent at their documented paths.
- Module entitlement remains report-only, with 16 missing-permission and 34 unmapped inventory classifications.
- The worktree remains broadly dirty with concurrent enterprise-upgrade changes not owned by this packet.

## Next Safe Implementation Task

Before the next edit, obtain one uninterrupted `npm run verify:repo` result from a stable worktree snapshot.

Then resume Phase 3 with a focused internal module-governance inventory packet for:

- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`

Current evidence shows:

- the catalog service is falsely inferred as the `pos` commercial module because the scanner reads catalog contents as ownership evidence;
- the entitlement service is `unmapped, enforcement candidate` even though it is internal cross-module governance infrastructure.

The next packet should classify these internal services from exact file ownership, add focused inventory tests, regenerate report-mode artifacts, and keep hard enforcement disabled.
