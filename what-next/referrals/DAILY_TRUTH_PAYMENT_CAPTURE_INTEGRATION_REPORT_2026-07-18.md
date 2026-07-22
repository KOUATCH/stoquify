# Daily Truth Payment-Capture Integration Report

Generated: 2026-07-18
Program: Stoquify Referral-Worthy Execution Program
Phase: 2 - Daily Truth Dashboard And Action Center
Slice: 8 - Branch payment-capture integration into end-of-day readiness
Primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Status: complete

## Executive Result

Phase 2 / Slice 8 is complete. Branch end-of-day readiness now consumes direct sales-order-linked payment-capture attribution as a distinct, service-owned checklist source.

The integration does not relabel capture attribution as settlement or reconciliation. `PAYMENT_RECONCILIATION` and `MANAGER_SIGN_OFF` remain separate `UNSUPPORTED` checklist items with empty source identifiers and null source hashes.

Readiness still resolves operating access exactly once and verifies the active organization-owned location exactly once. The attribution module now exposes an explicitly internal composition reader that rechecks organization, actor, authority, location, and UTC business-date coherence without repeating access resolution or the location read.

The next narrow slice is Phase 2 / Slice 9: add a read-only branch daily-close review evidence-drift assessment before any sign-off command or product surface is considered.

## Before

- `getBranchPaymentAttribution()` independently resolved access, verified location, and returned direct capture evidence.
- `getEndOfDayCloseReadiness()` independently resolved the same access and location but did not consume capture attribution.
- Calling the public attribution service from readiness would have duplicated the authority decision and location read.
- The readiness checklist had no capture-specific item and exposed four supported items plus two unsupported items.
- Slice 6 review manifests could generically persist supported checklist entries, but the review boundary did not require capture evidence.
- Payment reconciliation and manager sign-off were correctly unsupported.

## After

### Public And Internal Attribution Boundaries

`getBranchPaymentAttribution()` remains the public fail-closed service. It still:

1. validates location and business-date input;
2. resolves operating access;
3. checks organization and actor identity;
4. validates tenant-wide or exact managed-location authority;
5. queries one active, non-deleted, organization-owned location;
6. delegates to the internal reader only after those checks succeed.

`readBranchPaymentAttributionForVerifiedCloseContext()` is the new internal composition boundary. It:

- accepts an allowed operating-access decision and already-verified location evidence;
- rechecks organization and actor identity;
- rechecks authority/scope coherence and exact location membership;
- rechecks verified location identity, name, and code;
- recomputes and compares the UTC business-date period boundaries;
- reads only directly attributable payment captures;
- performs no operating-access resolution and no location query.

### Readiness Integration

`getEndOfDayCloseReadiness()` now reads the following evidence after one access decision and one location verification:

- branch operating snapshot;
- overlapping POS sessions;
- branch cash drawers;
- direct sales-order-linked payment captures.

The capture read runs with the same organization, actor, location, business date, period, freshness window, and authority evidence already established by readiness.

### Checklist Mapping

| Attribution state | Readiness checklist state | Meaning |
|---|---|---|
| `AVAILABLE_WITH_LIMITATIONS` | `READY` | Directly linked captures are available; unlinked and provider evidence remain outside coverage. |
| `NO_ACTIVITY_WITH_LIMITATIONS` | `NO_ACTIVITY` | No directly linked capture exists for the branch day; no tenant-wide fallback is substituted. |
| `STALE_WITH_LIMITATIONS` | `STALE` | Direct capture evidence exists but is outside the allowed freshness window. |

The new checklist source is:

- key: `PAYMENT_CAPTURE_ATTRIBUTION`;
- source type: `PAYMENT_CAPTURE`;
- evidence: payment IDs, deterministic source hash, observation time, freshness, and evidence grade.

The checklist now has five supported items and two unsupported items. Evidence coverage remains `PARTIAL` because provider reconciliation and manager sign-off are still unsupported.

### Readiness Facts

Readiness now adds only:

- attributed payment count;
- attributed payment status counts;
- attributed payment method counts.

It does not expose amount, balance, variance, fee, tender/change, currency, customer, provider-reference, transaction identifier, bank/card detail, or processor response data.

### Limitations And Blockers

Capture limitations are propagated into readiness blockers:

- `UNLINKED_PAYMENT_BRANCH_COVERAGE_UNAVAILABLE`;
- `BRANCH_PROVIDER_RECONCILIATION_UNSUPPORTED`;
- `BRANCH_PAYMENT_CAPTURE_EVIDENCE_STALE` when applicable.

These limitations do not convert `PAYMENT_RECONCILIATION` into a supported source. A branch may be ready for non-final review while its evidence coverage remains partial and the limitations remain visible.

### Review Manifest

The Slice 6 non-final review manifest now persists:

- the `PAYMENT_CAPTURE_ATTRIBUTION` supported source;
- capture source IDs and source hash;
- capture observation/freshness/evidence-grade data;
- attributed payment status and method counts;
- capture coverage blockers;
- updated five-supported/two-unsupported counts.

The review boundary now rejects readiness evidence that omits capture attribution, marks it unsupported, uses a different source type, or omits its source hash.

The manifest remains non-final, unsigned, data-minimized, deterministically hashed, and explicit that broad payment-location ownership, manager sign-off, and final close are not claimed.

## Source And Ownership Honesty

| Source | Slice 8 treatment | Reason |
|---|---|---|
| `Payment` linked to organization-owned `SalesOrder.locationId` | supported capture attribution | The sales order supplies a verified branch dimension. |
| Unlinked payment | unavailable at branch scope | `Payment` has no direct branch owner. |
| Purchase-order payment | excluded | It is not inbound sales capture for branch end-of-day evidence. |
| Provider event or statement line | unsupported | Existing records do not prove branch ownership. |
| Payment transaction or reconciliation run | unsupported | Provider-account scope is not a certified location dimension. |
| Manager sign-off | unsupported | No controlled sign-off lifecycle exists. |

Capture attribution remains operational evidence. It is not settlement, provider matching, reconciliation, certification, approval, or completion.

## Files Changed

- `services/end-of-day-close/branch-payment-attribution.service.ts`
- `services/end-of-day-close/end-of-day-close-readiness-contracts.ts`
- `services/end-of-day-close/end-of-day-close-readiness.service.ts`
- `services/end-of-day-close/end-of-day-close-review-contracts.ts`
- `services/end-of-day-close/end-of-day-close-review.service.ts`
- `services/end-of-day-close/__tests__/branch-payment-attribution.service.test.ts`
- `services/end-of-day-close/__tests__/end-of-day-close-readiness.service.test.ts`
- `services/end-of-day-close/__tests__/end-of-day-close-review.service.test.ts`
- `what-next/referrals/DAILY_TRUTH_PAYMENT_CAPTURE_INTEGRATION_REPORT_2026-07-18.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

The role-cockpit evidence files were regenerated by their existing gate. No schema, migration, action, route, page, component, notification, provider mapping, synthetic matching, sign-off, AI, or WhatsApp behavior was added.

## Verification

Focused regression command:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/branch-payment-attribution.service.test.ts services/end-of-day-close/__tests__/end-of-day-close-readiness.service.test.ts services/end-of-day-close/__tests__/end-of-day-close-review.service.test.ts services/operating-access/__tests__/operating-access-scope.service.test.ts
```

Result: 4 suites passed, 67 tests passed, 0 failed.

Additional checks:

- focused ESLint across the touched contracts, services, and tests: passed;
- `npm run typecheck`: passed;
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers;
- static readiness resolver-call count: 1;
- static readiness location-read count: 1;
- static provider-read scan: no matches;
- static prohibited financial-field initializer scan: no matches;
- static domain-write scan across attribution and readiness services: no matches;
- graph report search: no matching Slice 8 nodes, so live code and focused tests remain authoritative;
- temporary patch-file audit: no Slice 8 patch files remain.

The role-cockpit gate applies to the Daily Digest cockpit, not every Stoquify role surface. It is supporting release evidence, not broad Phase 2 certification.

## Slice 8 Gate Audit

| Requirement | Evidence | Result |
|---|---|---|
| One access resolution and one location verification | focused invocation-order/count tests and static call counts | passed |
| Public fail-closed service plus internal reader | service split and direct internal-reader tests | passed |
| Internal identity/authority/location/date coherence | parameterized fail-closed tests before payment read | passed |
| Distinct capture checklist source | `PAYMENT_CAPTURE_ATTRIBUTION` / `PAYMENT_CAPTURE` contracts and tests | passed |
| Available/no-activity/stale mapping | readiness state tests | passed |
| Capture blockers retained | readiness and review-manifest assertions | passed |
| Reconciliation/sign-off remain unsupported | empty-ID/null-hash assertions | passed |
| Count-only facts | contracts, result scans, and prohibited-key tests | passed |
| Deterministic readiness and review hashes | repeat-read and idempotent replay tests | passed |
| Review manifest persists capture source | manifest source/count/blocker assertions | passed |
| No excluded product surface or schema work | scoped implementation audit | passed |
| Tenant/location failure and zero writes | focused denial and write-spy tests | passed |

## Residual Risks

- Capture attribution excludes unlinked payments and therefore cannot represent complete branch payment coverage.
- Provider-account location ownership remains undefined. No schema change should be made until the business ownership rule is agreed and validated.
- The close contract still uses UTC even though organization timezone data exists. A timezone change needs an explicit compatibility and migration plan.
- Capture method/status counts do not prove funds are settled.
- The Slice 6 migration remains validated but was not deployed in this local execution run.
- The stored review manifest is observed evidence, not certification. Any future sign-off must compare current evidence against the stored manifest and reject drift.
- No external command surface exists. A future sensitive command requires dedicated permission, module entitlement, fresh authentication, maker/checker controls, audit, idempotency, and rollback/recovery design.

## Next Slice Gate

Phase 2 / Slice 9 should add a **read-only branch daily-close review evidence-drift assessment** before any sign-off command or UI. It should:

1. accept trusted operating-access context, one location, and one business date;
2. resolve operating access and verify location before reading a stored review;
3. reuse current end-of-day readiness as the live service-owned evidence source;
4. read the organization/location/day review record with a minimal selector;
5. return explicit `NOT_STARTED`, `CURRENT`, or `DRIFTED` state;
6. compare stored and current readiness source hashes without mutating the run;
7. expose stored/current hashes, observation times, supported/unsupported counts, blocker counts, and drift reason codes only;
8. preserve capture attribution, unsupported reconciliation, and unsupported sign-off truth;
9. return no evidence manifest, monetary fields, customer data, provider detail, or sensitive authentication material;
10. add no schema, migration, action, route, UI, notification, sign-off transition, AI, or WhatsApp behavior;
11. prove tenant isolation, assigned-location scope, no-run state, current state, drifted state, source-identity failures, data minimization, and zero writes with focused tests.

Expected report: `what-next/referrals/DAILY_TRUTH_CLOSE_REVIEW_DRIFT_REPORT_<date>.md`.

Next primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`, followed by `/stoquify-referral-war-room` for evidence review.
