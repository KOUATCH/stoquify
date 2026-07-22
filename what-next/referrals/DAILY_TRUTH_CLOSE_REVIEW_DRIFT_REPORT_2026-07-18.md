# Daily Truth Close-Review Drift Report

Generated: 2026-07-18
Program: Stoquify Referral-Worthy Execution Program
Phase: 2 - Daily Truth Dashboard And Action Center
Slice: 9 - Read-only branch daily-close review evidence-drift assessment
Primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Status: complete

## Executive Result

Phase 2 / Slice 9 is complete. Stoquify can now compare one stored non-final branch/day review with fresh service-owned end-of-day readiness and return an explicit `NOT_STARTED`, `CURRENT`, or `DRIFTED` assessment.

The assessment is read-only. It does not refresh, mutate, waive, approve, sign, complete, or certify the stored review. It returns no stored evidence manifest and no monetary, customer, provider, authentication, idempotency, or correlation data.

The next narrow slice is Phase 2 / Slice 10: establish the canonical branch daily-close sign-off control policy across permission risk, sensitive-action assurance, maker-checker, and module ownership. It must not add a sign-off command, lifecycle transition, schema change, action, or UI.

## Before

- `BranchDailyCloseRun` stored the original readiness source hash, evidence hash, observation time, coverage counts, blocker count, and full evidence manifest.
- `getEndOfDayCloseReadiness()` produced the current service-owned readiness source hash for the same branch/day.
- No service compared the stored review with current readiness.
- A future sign-off command therefore had no reusable evidence-drift gate.
- The run lifecycle remained deliberately non-final with only `IN_REVIEW` and `BLOCKED` states.

## After

### Service Contract

`getBranchDailyCloseReviewDrift()` accepts:

- trusted operating-access context;
- one location identifier;
- one strict `YYYY-MM-DD` business date;
- optional current time and freshness window.

It returns:

- organization, actor, branch, business date, and authority identity;
- `NOT_STARTED`, `CURRENT`, or `DRIFTED` state;
- deterministic drift reason codes;
- a minimal stored evidence summary when a run exists;
- the corresponding current readiness summary.

### Access And Read Order

The service:

1. validates location and business-date input before reads;
2. calls `getEndOfDayCloseReadiness()` as the current service-owned access, location, and evidence authority;
3. rechecks organization, actor, location, business date, capture source, reconciliation honesty, sign-off honesty, counts, timestamps, and readiness source hash;
4. reads one stored run through the unique organization/location/business-date key;
5. validates the returned row identity and hash/count fields;
6. compares stored and current evidence without writing.

Current readiness is therefore established before the stored review is queried. Cross-tenant and unassigned-location denials propagate before the stored-run read.

### Stored-Run Selector

The selector contains only:

- run ID;
- organization ID;
- location ID;
- business date;
- stored readiness state;
- supported and unsupported item counts;
- blocker count;
- evidence observation time;
- readiness source hash;
- evidence hash.

It does not select the evidence manifest, request hash, idempotency key, correlation ID, starter identity, lifecycle timestamps, monetary facts, customer data, provider data, or sign-off fields.

### Assessment States

| State | Rule | Meaning |
|---|---|---|
| `NOT_STARTED` | No organization/location/day run exists | Current readiness is available, but no stored review baseline exists. |
| `CURRENT` | Stored and current source hash, readiness state, coverage counts, and blocker count match | The stored non-final review still represents current service-owned readiness. |
| `DRIFTED` | One or more compared fields differ | The stored review must not be relied on as current evidence. |

`CURRENT` is impossible when the readiness source hashes differ, even if all counts remain equal.

### Deterministic Drift Reasons

Reasons are emitted in this stable order:

1. `READINESS_SOURCE_HASH_CHANGED`;
2. `READINESS_STATE_CHANGED`;
3. `SUPPORTED_ITEM_COUNT_CHANGED`;
4. `UNSUPPORTED_ITEM_COUNT_CHANGED`;
5. `BLOCKER_COUNT_CHANGED`.

The ordering is independent of object iteration or database behavior and is covered by focused tests.

### Current Evidence Honesty

The drift service accepts current readiness only when:

- the organization, actor, location, and business date match the request;
- the readiness source hash is a valid SHA-256 evidence hash;
- coverage and blocker counts are non-negative integers;
- `PAYMENT_CAPTURE_ATTRIBUTION` remains a supported `PAYMENT_CAPTURE` source with a source hash;
- `PAYMENT_RECONCILIATION` remains `UNSUPPORTED` with empty source IDs and a null hash;
- `MANAGER_SIGN_OFF` remains `UNSUPPORTED` with empty source IDs and a null hash;
- completion still reports no supported or completed sign-off.

The assessment does not turn capture attribution into reconciliation and does not treat a stored review as approval.

## Data-Minimized Result

The returned stored/current evidence summaries include only:

- source ID for the stored run;
- observation times;
- readiness states;
- readiness/evidence hashes;
- supported and unsupported counts;
- blocker counts.

The result does not expose the stored manifest or the detailed current checklist, facts, blockers, payment IDs, money, customer data, provider details, authentication evidence, or command metadata.

## Files Added

- `services/end-of-day-close/branch-daily-close-review-drift-contracts.ts`
- `services/end-of-day-close/branch-daily-close-review-drift.service.ts`
- `services/end-of-day-close/__tests__/branch-daily-close-review-drift.service.test.ts`
- `what-next/referrals/DAILY_TRUTH_CLOSE_REVIEW_DRIFT_REPORT_2026-07-18.md`

The war-room register and generated role-cockpit evidence were refreshed. No existing schema, migration, write service, action, route, page, component, notification, provider mapping, sign-off lifecycle, AI, or WhatsApp behavior was changed.

## Verification

Focused Slice 9 tests:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/branch-daily-close-review-drift.service.test.ts
```

Result: 1 suite passed, 25 tests passed, 0 failed.

Prescribed regression set:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/branch-daily-close-review-drift.service.test.ts services/end-of-day-close/__tests__/end-of-day-close-readiness.service.test.ts services/end-of-day-close/__tests__/end-of-day-close-review.service.test.ts services/end-of-day-close/__tests__/branch-payment-attribution.service.test.ts services/operating-access/__tests__/operating-access-scope.service.test.ts
```

Result: 5 suites passed, 92 tests passed, 0 failed.

Additional checks:

- focused ESLint for the three Slice 9 files: passed;
- `npm run typecheck`: passed;
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers;
- static current-readiness call count: 1;
- static stored-run read count: 1;
- static database-call inventory: `db.branchDailyCloseRun.findUnique` only;
- static domain-write scan: no matches;
- static manifest/sensitive-field scan: no matches;
- static provider-read scan: no matches;
- static action/UI/notification/AI/WhatsApp import scan: no matches;
- graph report search: no Slice 9 nodes, so live code, schema, and focused tests remain authoritative.

The role-cockpit gate applies to the Daily Digest cockpit rather than every Stoquify surface. It remains supporting release evidence, not Phase 2 certification.

## Slice 9 Gate Audit

| Requirement | Evidence | Result |
|---|---|---|
| Trusted access, one location, strict date | contract, input validators, malformed-input tests | passed |
| Access before stored evidence | readiness invocation order and denial tests | passed |
| Tenant/managed-location enforcement | readiness authority reuse and operating-access regressions | passed |
| Current service-owned readiness | direct readiness composition | passed |
| Ownership-scoped minimal stored selector | exact query assertion and static scan | passed |
| Explicit assessment states | current/not-started/drifted tests | passed |
| Hash equality required for current | hash-only drift test | passed |
| Deterministic reason codes | all-reasons order test | passed |
| Minimal result, no manifest | recursive prohibited-key tests | passed |
| Capture/reconciliation/sign-off honesty | current-contract invariant tests | passed |
| No mutation or notification | write spies and static scans | passed |
| No schema/action/route/UI/provider/AI work | scoped implementation audit | passed |
| Identity failure and zero writes | current/stored mismatch tests | passed |

## Residual Risks

- A drift assessment is evidence only; it cannot authorize or perform sign-off.
- The stored run lifecycle still has no signed state, signer, sign time, signed evidence hash, or revocation/reopen model.
- No canonical branch daily-close sign-off permission or sensitive-action ID exists yet.
- Existing fresh-auth, critical-permission, module-entitlement, and maker-checker primitives are reusable but are not wired to branch daily close.
- The module owner for daily-close sign-off must be frozen explicitly; `dashboard`, `pos`, and accounting `close_assurance` currently represent different commercial and ownership boundaries.
- Provider-account location ownership remains undefined, so payment reconciliation stays unsupported.
- Unlinked payment branch coverage remains unavailable.
- The close contract continues to use UTC and requires a separate timezone compatibility plan.
- The Slice 6 migration remains validated but was not deployed in this local execution run.

## Next Slice Gate

Phase 2 / Slice 10 should establish a **branch daily-close sign-off control-policy foundation only**. It should:

1. freeze a canonical sensitive-action ID and permission for branch daily-close sign-off;
2. assign critical permission risk so wildcard permission cannot silently grant it;
3. register a critical sensitive-action policy with L1 assurance, a bounded fresh-auth window, maker-checker self-approval blocking, an audit action, and detector signals;
4. freeze the commercial module owner and access intent rather than borrowing accounting-period close semantics accidentally;
5. expose a typed policy contract for the later sign-off command;
6. reuse existing RBAC, sensitive-action, module-entitlement, and fresh-auth primitives;
7. prove missing permission, stale auth, self-approval, and module denial behavior with focused tests;
8. add no branch-close mutation, schema, migration, action, route, UI, notification, certificate, AI, or WhatsApp behavior;
9. leave `MANAGER_SIGN_OFF` and completion unsupported in readiness until persistence and command slices are separately implemented.

Expected report: `what-next/referrals/DAILY_TRUTH_SIGN_OFF_CONTROL_POLICY_REPORT_<date>.md`.

Next primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`, followed by `/stoquify-referral-war-room` for evidence review.
