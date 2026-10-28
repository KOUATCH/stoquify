# Daily Truth Completion Composition Report

Generated: 2026-07-18
Program: Stoquify Referral-Worthy Execution Program
Phase: 2 - Daily Truth Dashboard And Action Center
Slice: 14 - Versioned branch daily-close completion composition
Primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Status: complete

## Executive Result

Phase 2 / Slice 14 is complete. Stoquify now has a service-only, versioned branch daily-close completion read model that composes the existing pre-sign readiness service with the Slice 13 post-review sign-off state service. It does not read Prisma directly and it does not alter either source result.

The composition reports `NOT_STARTED`, `BLOCKED`, `AWAITING_SIGN_OFF`, `SIGNED`, or `EVIDENCE_DRIFTED`. `SIGNED` means a valid active sign-off exists and the stored review still matches current operational readiness. A signature remains visible when later operational evidence drifts, but completion becomes unsatisfied and the result names the exact drift dimensions.

The complete existing readiness object is returned unchanged as `preSignReadiness`, including its checklist, blockers, evidence coverage, readiness state, unsupported manager-sign-off and payment-reconciliation items, legacy unsupported completion record, and `sourceHash`. The sign-off projection is returned unchanged as `postReviewSignOffState` with its separate `projectionHash`. The composition therefore proves that adding an active signature changes the composition state and hash without changing the pre-sign operational source hash.

No command, server action, API route, page, component, Prisma model, migration, readiness mutation, drift mutation, revocation, certificate, notification, AI, or WhatsApp behavior was added.

## Before

- Pre-sign operational readiness and post-review sign-off state were separately available through service APIs.
- Downstream code had no safe versioned contract for interpreting both layers together.
- Treating sign-off as another readiness input would have changed the stored review source hash after signing, creating self-induced drift and unsafe replay semantics.
- Existing readiness correctly continued to represent manager sign-off, payment reconciliation, and final completion as unsupported.

## After

### Service-Owned Composition

`getBranchDailyCloseCompletion()` accepts the existing readiness input shape: trusted operating access context, one bounded location ID, one strict `YYYY-MM-DD` business date, optional evaluation time, and optional positive snapshot age.

The service normalizes one evaluation clock and invokes in parallel:

- `getEndOfDayCloseReadiness()`;
- `getBranchDailyCloseSignOffState()`.

Both calls receive the same trusted access context, location, business date, and evaluation time. No partial result is returned when either service denies access or fails.

### Cross-Result Boundary

Before deriving completion, the composition fails closed unless both source results agree on:

- tenant and actor;
- generation time and business date;
- exact location scope, ID, name, and code;
- authority kind and basis;
- valid source/projection hashes and count invariants;
- frozen pre-sign and post-review controls.

The existing readiness result must still expose the legacy unsupported completion record and must keep `MANAGER_SIGN_OFF` and `PAYMENT_RECONCILIATION` unsupported with no invented evidence IDs or hashes. The post-review result must have a valid state shape, lifecycle counts, and exact signed-to-review evidence identity.

### Evidence Alignment

When a review exists, the composition compares its stored snapshot with current pre-sign readiness across five dimensions:

1. readiness source hash;
2. readiness state;
3. supported item count;
4. unsupported item count;
5. blocker count.

Any difference produces `EVIDENCE_DRIFTED` and one or more deterministic reason codes. This is legitimate operational drift, not evidence corruption. Cross-tenant, cross-actor, cross-location, authority, malformed-hash, impossible-state, or control mismatch remains a forbidden inconsistency.

### Completion States

| State | Meaning | Completion satisfied |
|---|---|---|
| `NOT_STARTED` | no durable review exists | no |
| `BLOCKED` | current review is blocked and its evidence is still current | no |
| `AWAITING_SIGN_OFF` | current review awaits one controlled signature | no |
| `SIGNED` | one active sign-off exists and reviewed evidence remains current | yes |
| `EVIDENCE_DRIFTED` | current operational readiness differs from the stored review | no |

For signed drift, the active signer and signing time remain visible as historical state while `completionSatisfied` is false. The composition does not silently erase a real signature and does not allow it to certify changed evidence.

### Self-Drift Protection

The contract freezes these controls:

- `compositionPurpose: VERSIONED_COMPLETION_READ_MODEL`;
- `preSignReadinessPreserved: true`;
- `preSignSourceHashIncludesSignOff: false`;
- `readinessPromoted: false`;
- `paymentReconciliationClaimed: false`;
- `finalCloseClaimed: false`.

`compositionHash` covers stable composition facts and the two independent source hashes. Viewer identity and evaluation time are not hashed. Tests prove the exact same readiness object and `sourceHash` remain present before and after an active signature while state changes from `AWAITING_SIGN_OFF` to `SIGNED`.

## Files

Added for Slice 14:

- `services/end-of-day-close/branch-daily-close-completion-contracts.ts`
- `services/end-of-day-close/branch-daily-close-completion.service.ts`
- `services/end-of-day-close/__tests__/branch-daily-close-completion.service.test.ts`
- `what-next/referrals/DAILY_TRUTH_COMPLETION_COMPOSITION_REPORT_2026-07-18.md`

Updated for Slice 14:

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Generated supporting evidence refreshed:

- `what-next/role-based-operating-cockpit-readiness.md`
- `what-next/role-based-operating-cockpit-readiness.json`

No existing readiness, review drift, sign-off command, sign-off state, action, route, page, component, Prisma schema, migration, notification, certificate, AI, WhatsApp, or unrelated application file was changed by Slice 14.

## Verification

Focused Slice 14 suite:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/branch-daily-close-completion.service.test.ts
```

Result: 1 suite passed, 34 tests passed, 0 failed.

Required composition/state/command/drift/readiness regression set:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/branch-daily-close-completion.service.test.ts services/end-of-day-close/__tests__/branch-daily-close-sign-off-state.service.test.ts services/end-of-day-close/__tests__/branch-daily-close-sign-off.service.test.ts services/end-of-day-close/__tests__/branch-daily-close-review-drift.service.test.ts services/end-of-day-close/__tests__/end-of-day-close-readiness.service.test.ts
```

Result: 5 suites passed, 126 tests passed, 0 failed.

Complete end-of-day-close regression:

```text
npm test -- --runInBand services/end-of-day-close/__tests__
```

Result: 9 suites passed, 178 tests passed, 0 failed.

Additional checks:

- focused ESLint for contract, service, and tests: passed with 0 errors and 0 warnings;
- `npm run typecheck`: passed;
- `npx prisma validate`: schema valid;
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers;
- action/route/component reference scan: 0 public-surface references;
- focused direct-database, mutation, public-layer, delivery, AI, and WhatsApp scan: 0 forbidden dependencies;
- focused file trailing-whitespace scan: 0 findings;
- temporary Slice 14 artifacts: 0.

The repository-wide `git diff --check` still reports pre-existing blank-line findings in `.env.example` and `playwright.config.ts`; neither file was touched by Slice 14.

## Slice 14 Gate Audit

| Requirement | Authoritative evidence | Result |
|---|---|---|
| Compose existing service APIs | service mocks and exact call tests | passed |
| Same tenant/actor/location/day/time | normalized invocation and mismatch tests | passed |
| Reassert authority and evidence boundaries | fail-closed boundary assertions | passed |
| Preserve pre-sign readiness unchanged | referential preservation and legacy-contract tests | passed |
| Keep post-review projection separate | embedded source result and separate hash controls | passed |
| Explicit completion states | state and drift reason tests | passed |
| Prevent self-induced drift | before/after signature source-hash test | passed |
| Keep command and drift behavior unchanged | required regression suites | passed |
| Make no unsupported close claims | frozen controls and readiness checklist assertions | passed |
| Data-minimized result | recursive redaction test | passed |
| No product surface or write behavior | dependency test and static scan | passed |
| Focused and broad verification | 34 focused, 126 required, 178 complete-close tests | passed |

## Residual Risks

- The completion composition remains intentionally unreachable from product surfaces.
- Review creation and sign-off commands remain service-only.
- Existing readiness still reports manager sign-off and completion as unsupported; callers must use the versioned composition rather than reinterpret readiness.
- The two source services execute concurrently but do not share one database transaction. A real operational change between reads is represented conservatively as drift or a later refresh, not atomic certification.
- Slice 6 and Slice 11 migrations remain validated but undeployed locally, so no migrated-database integration test ran.
- Revocation and supersession have persistence semantics but no command workflow.
- Direct privileged SQL could still mutate signed evidence; service and release gates must continue to prohibit it.
- Provider reconciliation and unlinked payment branch coverage remain incomplete.
- The close contract still uses UTC despite organization timezone availability.

## Next Slice Gate

Phase 2 / Slice 15 should add a **protected read-only server-action adapter for branch daily-close completion only**. It should:

1. expose `getBranchDailyCloseCompletion()` through one narrow server action with `dashboard.read`, audit evidence, and dashboard module entitlement metadata;
2. derive tenant and actor only from the protected server context and ignore or reject caller-supplied organization/user identity;
3. accept only bounded location ID, strict business date, and optional positive max-age input;
4. preserve the versioned completion result without flattening, promoting readiness, or reconstructing evidence in the action layer;
5. map validation, RBAC, scope, and service inconsistency failures through the established protected-action envelope without leaking private evidence;
6. add focused action tests for trusted-context propagation, hostile identity input, exact result preservation, protection metadata, malformed input, and denial propagation;
7. add no start-review command, sign-off command, revocation command, API route, page, component, notification, certificate, AI, or WhatsApp behavior.

Expected implementation files:

- `actions/end-of-day-close/branch-daily-close-completion.actions.ts`
- `actions/end-of-day-close/__tests__/branch-daily-close-completion.actions.test.ts`
- `what-next/referrals/DAILY_TRUTH_COMPLETION_ACTION_REPORT_<date>.md`

Next primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`, followed by `/stoquify-referral-war-room` for evidence review.
