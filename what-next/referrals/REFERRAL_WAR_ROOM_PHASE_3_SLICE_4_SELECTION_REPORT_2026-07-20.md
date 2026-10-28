# Referral War Room Phase 3 Slice 4 Selection Decision

Generated: 2026-07-20  
Program: Stoquify Referral-Worthy Execution Program  
Invocation: `/stoquify-referral-war-room`  
Operating skill: `stoquify-referral-war-room-orchestrator`

## Executive Decision

The war room accepts the certified stable-case-identity foundation and selects exactly one next implementation slice:

> **Phase 3 / Slice 4: POS Closed-Shift Cash-Shortage Rule Contract**

Selected operating skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`  
Source-contract reviewers: `004-aqstoqflow-business-event-gateway` and `007-aqstoqflow-pos-ledger-controls`

This slice is authorized to build a strict, deterministic, side-effect-free `cash_shortage/v1` evidence and policy evaluator over the already accepted `pos.shift.closed` schema-version-1 source contract.

It is not authorized to register or schedule the assurance rule, create or update Workflow Assurance incidents, install production thresholds, persist policy records, expose routes/actions/UI, send notifications, change POS close behavior, implement inventory-loss behavior, or give AI or WhatsApp authority.

## Why This Slice Is Next

The stable identity prerequisite is complete, but terminal money-protection resolution still requires source revalidation. A source recheck cannot be implemented safely until the same deterministic shortage rule can run both at detection time and approval time.

The pure evaluator is therefore the next shared dependency. It can prove source eligibility, signed-variance arithmetic, policy effectiveness, threshold boundaries, severity, safe wording, and evidence pinning without creating cases or depending on unresolved assignment and maker-checker controls.

Selecting immediate incident creation would be premature because:

- the configured runtime database has not installed the stable logical-identity index yet;
- generic resolve and suppress remain immediate single-actor transitions;
- assignment still lacks tenant and managed-location membership validation;
- source recheck and independent resolution approval do not yet exist;
- production threshold governance is not approved or persisted.

Selecting broad lifecycle hardening before the rule kernel would also invert a dependency: source recheck needs a deterministic evaluator to rerun.

## Evidence Reviewed

- All required referral roadmap and war-plan documents
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/CASH_LEAKAGE_RADAR_REPORT_2026-07-19.md`
- `what-next/referrals/POS_SHIFT_CLOSE_EVIDENCE_FOUNDATION_REPORT_2026-07-19.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_3_SELECTION_REPORT_2026-07-19.md`
- `what-next/referrals/WORKFLOW_ASSURANCE_STABLE_CASE_IDENTITY_REPORT_2026-07-20.md`
- Installed war-room, leakage, business-event, and POS-ledger skills
- Live POS close event payload, replay validation, audit, outbox, and tests
- Live business-event schema, hashing, and persistence contract
- Live assurance registry, incident commands, action guards, UI commands, and persistence model
- Current combined graph artifacts, with the limitation that the graph predates the July 19-20 source and identity changes; live code is authoritative
- Read-only PostgreSQL source, incident, definition, index, and migration preflights

## Refreshed Runtime Preflight

The configured local PostgreSQL `public` schema currently reports:

| Check | Count / state | Decision |
| --- | ---: | --- |
| `pos.shift.closed` events | 0 | The evaluator contract is prospective; no existing v1 evidence needs adjudication |
| Workflow Assurance incidents | 0 | No case data is at risk |
| `pos.closed_shift_cash_shortage.review` definitions | 0 | No hidden or partially active detector exists |
| Duplicate POS close source groups | 0 | No source merge is required |
| Stable identity index | Not installed | Incident integration remains blocked |
| Runtime incident unique key | Legacy fingerprint/source-hash key | Must not be used for new leakage cases |

`npx prisma migrate status` reports two pending migrations:

- `20260719190000_hris_org_manager_scope_foundation`
- `20260719203000_workflow_assurance_stable_case_identity`

Applying all pending migrations would widen this slice into unrelated HRIS runtime state. This selection does not deploy, reorder, or mark either migration. The pure evaluator has no database dependency, while later case integration must stop until the stable identity migration is installed through an approved deployment path.

## Authorized Source Contract

The evaluator may accept only one strict representation of the committed event:

- event type `pos.shift.closed`;
- event source `POS`;
- schema version `1`;
- source type `CASH_DRAWER_CLOSE`;
- event status `RECORDED` or `APPLIED`;
- source ID equal to payload session ID;
- envelope organization, actor, location, register, occurrence time, and source identity equal to their payload counterparts;
- payload evidence version `1`;
- complete session, terminal, location, drawer, closing-transaction, actor, currency, amount, variance, direction, explanation, timestamp, and totals fields;
- payload hash equal to the canonical business-event hash;
- signed variance equal to `countedBalance - expectedBalance` using decimal arithmetic;
- variance direction equal to the signed variance;
- nonzero variance accompanied by an explanation.

Malformed, incomplete, hash-mismatched, identity-mismatched, or arithmetically inconsistent evidence must produce a blocked evaluation. It must never be interpreted as a shortage.

## Authorized Policy Contract

The evaluator may consume one caller-selected versioned policy with:

- stable policy ID and positive version;
- policy kind/version;
- currency;
- review and high thresholds;
- minor-unit scale;
- explicit rounding mode;
- effective-from and optional effective-to timestamps;
- approval state;
- observe or enforce mode.

The evaluator must block missing, malformed, unapproved, currency-mismatched, not-yet-effective, expired, invalid-threshold, or enforce-mode policies. This slice permits observe mode only.

No XAF, XOF, or fallback threshold is built in. Test fixtures may use the previously proposed 2,000/10,000 values, but fixture values are not production approval.

## Authorized Evaluation Outcomes

The evaluator returns one discriminated result:

- `blocked`: source or policy cannot support a trustworthy decision;
- `not_triggered`: balanced, overage, or shortage below the review threshold;
- `triggered`: shortage at or above the review threshold, with `warning` or `high` severity.

Threshold semantics:

- signed variance is counted minus expected;
- only negative variance can trigger this rule;
- amount at risk is the absolute normalized shortage;
- equality with the review threshold triggers;
- equality with the high threshold produces high severity;
- policy minor-unit and rounding rules normalize values without converting through JavaScript `Number`;
- output pins policy ID/version, source hash, event ID, close time, original values, normalized values, and safe source context;
- user-facing wording says `Cash shortage requiring review` and must not accuse an employee of fraud or theft.

## Expected Files

- `services/leakage/pos-shift-cash-shortage-contracts.ts`
- `services/leakage/pos-shift-cash-shortage-evaluator.ts`
- `services/leakage/__tests__/pos-shift-cash-shortage-evaluator.test.ts`
- a dated implementation report under `what-next/referrals/`

No Prisma schema, migration, POS source, assurance registry, incident service, action, component, route, module catalog, AI, or WhatsApp file is expected to change.

## Verification Plan

Focused tests must prove:

- exact balance, overage, and shortage below threshold do not trigger;
- exact review threshold, one minor unit above, and exact high threshold classify correctly;
- XAF and XOF fixtures use explicit policies rather than defaults;
- decimal fractions and rounding boundaries remain deterministic;
- malformed source, missing fields, hash drift, envelope/payload identity drift, arithmetic drift, direction drift, and missing explanation block;
- missing, malformed, unapproved, ineffective, expired, currency-mismatched, invalid-threshold, and enforce-mode policies block;
- policy identity and source hash are pinned in triggered evidence;
- safe wording contains no fraud or theft accusation;
- source code contains no `Number`, `parseFloat`, or numeric coercion in money evaluation.

Required commands:

```text
npm test -- --runInBand services/leakage/__tests__/pos-shift-cash-shortage-evaluator.test.ts
npx eslint services/leakage/pos-shift-cash-shortage-contracts.ts services/leakage/pos-shift-cash-shortage-evaluator.ts services/leakage/__tests__/pos-shift-cash-shortage-evaluator.test.ts
npm run typecheck
npm run service:boundary:fail
npm run module:surface:fail
```

The relevant business-event and POS shift-close tests must also remain green because the evaluator relies on those contracts.

## Stop Conditions

Stop and return to the war room if:

- the accepted POS source cannot be represented without changing its payload;
- deterministic evaluation requires a guessed threshold or implicit currency rule;
- the evaluator needs database writes, incident creation, notification, or UI;
- amount evaluation requires JavaScript floating-point conversion;
- current source evidence must be rewritten or backfilled;
- implementation requires deploying the pending HRIS or assurance migration;
- unrelated dirty-worktree changes cannot be preserved.

## Selection Outcome

Phase 3 / Slice 4 is **selected for implementation** under `stoquify-cash-leakage-radar`, limited to the strict observe-only cash-shortage rule contract and pure evaluator.

After focused certification, return to `/stoquify-referral-war-room`. The war room must separately decide policy persistence/approval, event loading and scheduling, incident integration, and resolution lifecycle hardening.
