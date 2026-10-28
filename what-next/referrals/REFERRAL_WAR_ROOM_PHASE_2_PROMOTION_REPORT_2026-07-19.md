# Referral War Room Phase 2 Promotion And Phase 3 Entry Decision

Generated: 2026-07-19  
Program: Stoquify Referral-Worthy Execution Program  
Invocation: `/stoquify-referral-war-room`  
Operating skill: `stoquify-referral-war-room-orchestrator`

## Executive Decision

Phase 2: Daily Truth Dashboard And Action Center is **promoted complete at the product-capability level**.

The roadmap's previously unmet criterion now passes: the operating surface exposes three distinct, source-owned, durable commands:

1. Start branch daily-close review.
2. Sign branch daily close with independent password step-up.
3. Sign payment reconciliation with independent maker-checker evidence.

Slice 24 certified the third command through authenticated English/French desktop and mobile browser evidence, server-confirmed `SIGNED` truth, one retained business event, one retained ledger audit, and exact restoration of mutable fixture state.

Phase 3: Leakage Radar And Inventory Loss is therefore **opened for one audit-only entry slice**. No Phase 3 product code, schema, route, or UI is authorized by this orchestration pass.

The current repository-wide deployment gate remains **HOLD**. A concurrent HRIS authority-contract change leaves the unchanged People page comparing against a removed authority value, so the present `npm run typecheck` fails outside the referral slice. This failure is not waived for deployment, but it does not invalidate the already certified Phase 2 contracts or prevent an audit-only Phase 3 handoff.

## Evidence Reviewed

- `docs/referrals/stoquify-referral-worthy-war-plan-report.md`
- `docs/referrals/stoquify-referral-worthy-war-plan-prompt.md`
- `docs/referrals/stoquify-referral-worthy-execution-roadmap.md`
- `docs/referrals/stoquify-referral-worthy-executed-roadmap-report.md`
- `docs/referrals/referral-worthy-platform-features-report.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_2_REPORT_2026-07-19.md`
- `what-next/referrals/DAILY_TRUTH_RECONCILIATION_SIGN_COMMAND_UI_REPORT_2026-07-19.md`
- `what-next/referrals/DAILY_TRUTH_RECONCILIATION_SIGN_COMMAND_UI_BROWSER_EVIDENCE_2026-07-19.json`
- `what-next/referrals/DAILY_TRUTH_RECONCILIATION_SIGN_COMMAND_UI_BROWSER_PREFLIGHT_2026-07-19.json`
- Installed war-room, Leakage Radar, release-evidence, POS-ledger, payment-reconciliation, cash-triage, and inventory-loss skill contracts.
- Live POS drawer, payment exception, reconciliation, inventory adjustment, workflow-assurance, RBAC, action, and Prisma boundaries.
- `graphify-out/GRAPH_REPORT.md`, including the existing POS and payment-reconciliation architecture communities.

## Phase 2 Promotion Matrix

| Criterion                                                | Decision | Evidence                                                          |
| -------------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| Service-owned daily and branch truth                     | pass     | Phase 1 scope reports and Phase 2 Slices 1-18                     |
| Role- and location-aware operating surface               | pass     | Manager Action Center scope, bundle, and product-surface reports  |
| Critical cards link to evidence and next action          | pass     | Manager Action Center and daily-close workspace                   |
| Audited daily-close review                               | pass     | Slices 19-20 and durable browser evidence                         |
| Independent, fresh-auth daily-close sign-off             | pass     | Slice 20 certification                                            |
| At least three resolvable daily commands                 | pass     | Slice 24 adds source-owned payment reconciliation sign-off        |
| No UI-derived terminal truth                             | pass     | Protected reads and commands return source-owned completion state |
| Browser, accessibility, layout, and restoration evidence | pass     | Slice 24 browser certification, 6/6 stages                        |
| Current repository deployment gate                       | hold     | Unrelated HRIS/People TS2367 remains in the live worktree         |

This is a roadmap capability promotion, not a claim that the entire dirty worktree is deployable.

## Typecheck Adjudication

Current command:

```text
npm run typecheck
```

Result: **failed** with one diagnostic:

```text
app/[locale]/(dashboard)/dashboard/people/page.tsx(58,26): error TS2367
```

The page compares `directory.accessScope.authority.kind` with `LOCATION_RESPONSIBILITY`. The live `HrisPeopleAccessScope` union now contains `TENANT_HRIS_ADMIN`, `REPORTING_RELATIONSHIP`, `DELEGATED_MANAGER_AUTHORITY`, `LOCATION_RESPONSIBILITY_COMPATIBILITY`, and `OWN_RECORD`.

Targeted Git evidence shows:

- `app/[locale]/(dashboard)/dashboard/people/page.tsx` is unchanged.
- `services/hris/employee.service.ts` is unchanged.
- `services/hris/org.service.ts` is modified in the current worktree.
- The HRIS diff adds effective reporting relationships and delegated authority, and renames the compatibility value from `LOCATION_RESPONSIBILITY` to `LOCATION_RESPONSIBILITY_COMPATIBILITY`.

Slice 24 did not touch the People or HRIS workflow, and its full typecheck passed before this concurrent contract drift appeared. The war room therefore records two separate decisions:

- **Phase 2 capability acceptance:** pass.
- **Repository deployment/release readiness:** hold until the HRIS consumer and contract agree and the full typecheck is green.

No HRIS code was changed in this orchestration pass.

## Phase 3 Readiness Evidence

The live platform already has useful foundations, but they do not yet form one certified Leakage Radar contract.

| Foundation                    | Current evidence                                                                                                                                                                   | Boundary still requiring a decision                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| POS cash-drawer projection    | `services/pos/drawer-dashboard.service.ts` computes high/medium session variance, stale sessions, open drawers without sessions, location, terminal, cashier, and aggregate amount | Alerts are transient read output with constant IDs; the service writes no exception, event, or audit lifecycle                         |
| OHADA currency thresholds     | XAF/XOF medium/high thresholds are currently 2,000/10,000; other currencies use 10/50                                                                                              | Thresholds are hard-coded and unversioned rather than tenant-configured policy                                                         |
| Payment exception persistence | `PaymentException` owns type, severity, status, source, evidence, owner, notes, SLA, and resolution timestamps                                                                     | It has no explicit append-only exception-event relation and no first-class amount-at-risk, location, terminal, or subject-actor fields |
| Payment exception producers   | Provider events, statement import, and reconciliation runs create durable exceptions; suspense workflow supports assignment and resolution proposal                                | The audit must determine whether this payment-owned model may own POS leakage or should remain payment-specific                        |
| Workflow assurance incidents  | Generic durable incident and incident-event models already provide source hashes, fingerprints, severity, lifecycle, assignment, evidence grade, and history                       | Reuse is only a candidate; it must not become leakage truth without ownership, amount, scope, and resolution-contract proof            |
| Inventory control             | Adjustment approval, immutable movement, ledger posting, business event, close invalidation, and exact reversal services exist                                                     | Inventory-loss execution remains a later paired slice; it must not be folded into the first cash audit                                 |
| Daily operating surface       | Phase 2 can compose source-owned actions without inventing terminal truth                                                                                                          | Leakage exceptions may enter Daily Truth only after their owning read model and command lifecycle are certified                        |

Focused baseline verification passed:

```text
npm test -- --runInBand actions/pos/__tests__/drawer-dashboard.actions.test.ts services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts services/inventory/__tests__/inventory-adjustment.service.test.ts
```

Result: 3 suites, 14 tests passed.

## Selected Next Slice

**Phase 3 / Slice 1: Leakage Radar Source And Exception Ownership Audit.**

Run `stoquify-cash-leakage-radar` via `/stoquify-leakage-radar` in audit mode only.

The slice must inspect live code and decide, before any product edit:

1. Which service owns canonical Leakage Radar truth.
2. Whether `PaymentException`, `WorkflowAssuranceIncident`, or a narrow leakage-owned contract is the correct persistence boundary.
3. Whether closed POS-session cash variance is the safest first deterministic rule, or must be rejected in favor of a better-evidenced source.
4. The exact rule inputs, sign semantics, currency rounding, threshold source, threshold version, effective time, and false-positive fixtures.
5. Stable exception identity, source version/hash, fingerprint, idempotency, stale-source behavior, reopening, and invalidation.
6. Required evidence: tenant, location, terminal, drawer, session, cashier/actor attribution, business date, expected amount, observed amount, signed variance, absolute amount at risk, source timestamps, and evidence links.
7. RBAC, module entitlement, tenant/location authority, redaction, and non-enumerating denial behavior.
8. Lifecycle and maker-checker rules for assign, explain, propose resolution, approve, dismiss, reopen, and override; silent dismissal is forbidden.
9. Required audit log, append-only event, business event, notification, and Daily Truth integration contracts.
10. The smallest implementation slice, expected files, migration decision, focused tests, release gates, rollout, and rollback.

## Expected Audit Surface

- `services/pos/drawer-dashboard.service.ts`
- `services/pos/drawer-dashboard.schemas.ts`
- `actions/pos/drawer-dashboard.actions.ts`
- POS session close, refund, void, discount, and cash-drawer mutation services
- `services/payments/statement-import.service.ts`
- `services/payments/provider-event.service.ts`
- `services/reconciliation/payment-reconciliation-run.service.ts`
- `services/reconciliation/payment-suspense-workflow.service.ts`
- `services/reconciliation/payment-reconciliation-dashboard.service.ts`
- `services/assurance/assurance-incident.service.ts`
- `services/events/business-event.service.ts`
- relevant inventory adjustment/count evidence boundaries for dependency mapping only
- `prisma/schema.prisma`
- focused existing tests and permission catalogs

Expected artifact:

```text
what-next/referrals/CASH_LEAKAGE_RADAR_REPORT_2026-07-19.md
```

The audit report must identify inspected files, chosen owner, rejected alternatives, first rule, data contract, lifecycle, permission matrix, migration decision, expected implementation files, fixtures, commands, blockers, and residual risks.

## Verification Contract For The Eventual Implementation

The audit must specify focused checks for:

- deterministic threshold boundary and currency-rounding fixtures;
- shortage, overage, exact match, stale source, reopened source, and threshold-version changes;
- tenant, location, RBAC, module entitlement, and redaction denials;
- stable fingerprint and replay idempotency;
- maker-checker resolution and self-approval denial;
- append-only history, audit, business event, and notification dedupe;
- source drift before resolution;
- Daily Truth composition that never invents terminal status;
- non-accusatory English and French product vocabulary.

No eventual implementation may be certified while the full repository typecheck remains red. Run focused tests first, then restore a green `npm run typecheck`; run service, module-surface, role-cockpit, and policy gates only when their contracts are touched.

## Non-Goals And Guardrails

- Do not create Leakage Radar UI in the audit slice.
- Do not add or alter Prisma models before the ownership decision.
- Do not treat drawer-dashboard alerts as durable exceptions.
- Do not turn payment-owned exceptions into a generic cross-domain table by assumption.
- Do not call an exception fraud, theft, or staff misconduct without reviewed evidence.
- Do not implement predictive scoring.
- Do not begin Inventory Loss product work in the same slice.
- Do not add generic Action Item persistence.
- Do not give AI copilot or WhatsApp any source-of-truth or approval authority.
- Do not modify the unrelated HRIS worktree change as part of Leakage Radar.

## Handoff

Run:

```text
/stoquify-leakage-radar
```

Complete only **Phase 3 / Slice 1: Leakage Radar Source And Exception Ownership Audit**, save `what-next/referrals/CASH_LEAKAGE_RADAR_REPORT_2026-07-19.md`, and return to `/stoquify-referral-war-room` before product implementation.
