# POS Shift Cash Shortage Rule Contract Report

Generated: 2026-07-20  
Program: Stoquify Referral-Worthy Execution Program  
Phase: Phase 3 / Slice 4  
Operating skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`

## Executive Outcome

Phase 3 / Slice 4 is **certified complete** at the product-capability level.

Stoquify now has a strict, deterministic, side-effect-free evaluator for one prospective Leakage Radar rule:

```text
pos.closed_shift_cash_shortage.review
```

The evaluator consumes one serialized `pos.shift.closed` schema-version-1 event and one caller-selected, approved, effective, currency-specific policy. It returns `blocked`, `not_triggered`, or `triggered` without database access, incident creation, notification, route exposure, or product UI.

This slice establishes the shared decision contract required for future detection-time and resolution-time source rechecks. It does not authorize a scheduler, event loader, persisted policy, Workflow Assurance definition, incident integration, dashboard, enforcement, inventory-loss behavior, AI authority, or WhatsApp authority.

## Scope Boundary

Implemented:

- strict Zod contracts for the accepted POS event, payload, policy, outcomes, and `cash_shortage/v1` evidence;
- canonical payload-hash and POS close command-hash verification;
- envelope-to-payload tenant, actor, location, terminal, source, and close-time identity checks;
- Decimal-only signed variance, direction, normalization, threshold, and severity evaluation;
- approved-policy, approval-provenance, effective-period, currency, mode, scale, rounding, and threshold gates;
- deterministic evidence pinning for source and policy identity;
- safe review wording and focused boundary certification.

Not implemented:

- event queries, polling, scheduling, or outbox consumption;
- production threshold selection, persistence, approval UI, or country defaults;
- assurance registry definition, incident upsert, assignment, acknowledgement, resolution, suppression, or notification;
- Prisma schema or migration changes;
- actions, API routes, pages, components, dashboards, or module catalog changes;
- POS, accounting, inventory, payroll, AI, copilot, or WhatsApp mutations.

## Before And After

### Before

- The certified POS close producer emitted trustworthy version-1 evidence, but no reusable shortage decision kernel consumed it.
- Existing cash-drawer alerts used aggregate read-model identities and hard-coded thresholds that were not approved, versioned policies.
- Detection-time and future resolution-time rechecks had no shared arithmetic, threshold, or evidence contract.
- Missing or malformed policy evidence could not be distinguished from a valid non-triggering result.

### After

- One pure function evaluates exactly one strict source event and one explicit policy.
- Malformed, incomplete, hash-drifted, identity-drifted, arithmetically inconsistent, or unexplained nonzero source evidence blocks rather than triggering.
- Missing, malformed, unapproved, late-approved, ineffective, expired, enforce-mode, currency-mismatched, or invalid-threshold policy evidence blocks.
- Balanced shifts, overages, and shortages below the approved review threshold return `not_triggered` with reason codes.
- Shortages at the review threshold trigger `warning`; shortages at the high threshold trigger `high`.
- Triggered evidence pins the event ID, POS session source identity, payload hash, close context, original and normalized amounts, and policy ID, version, hash, and effective period.

## Source Contract

The evaluator accepts only:

- event type `pos.shift.closed`;
- event source `POS`;
- schema and payload evidence version `1`;
- event status `RECORDED` or `APPLIED`;
- source type `CASH_DRAWER_CLOSE`;
- the exact POS producer payload, including the live 500-character explanation limit;
- canonical SHA-256 payload and close-command document hashes;
- matching organization, actor, location, terminal, session source, and close timestamp across envelope and payload;
- signed variance equal to counted balance minus expected balance;
- direction equal to the signed variance;
- a nonempty explanation for every nonzero variance.

The input is intentionally a strict serialized evidence envelope with ISO timestamp strings. A future loader must map the database record into this contract deliberately; passing an unbounded Prisma record with extra fields or raw `Date` values is not accepted.

## Policy Contract

The caller must supply one `cash_shortage_policy/v1` policy with:

- stable policy ID and positive version;
- currency, review threshold, high threshold, and minor-unit scale;
- explicit `HALF_UP` or `HALF_EVEN` rounding;
- effective-from and optional exclusive effective-to times;
- `approved` status, approver identity, and approval time no later than source close;
- `observe` mode.

The evaluator contains no XAF, XOF, or other fallback threshold. The `2000` review and `10000` high values used in tests are fixtures only and are not production configuration or approval.

## Evaluation Semantics

Money never converts through JavaScript floating point. Source arithmetic is checked with `Prisma.Decimal`; expected and counted balances are then independently rounded to the policy scale before normalized variance is calculated.

| Condition                                         | Outcome                                 |
| ------------------------------------------------- | --------------------------------------- |
| Untrustworthy source or policy                    | `blocked` with a stable code            |
| Exact balance                                     | `not_triggered: balanced`               |
| Positive variance                                 | `not_triggered: overage`                |
| Negative variance below review threshold          | `not_triggered: below_review_threshold` |
| Amount at risk equal to or above review threshold | `triggered: warning`                    |
| Amount at risk equal to or above high threshold   | `triggered: high`                       |

The triggered title is exactly `Cash shortage requiring review`. The action text requests evidence review and reconciliation without unsupported accusation.

## Verification Evidence

### Tests And Static Checks

| Check                                               | Outcome                                        |
| --------------------------------------------------- | ---------------------------------------------- |
| Focused evaluator Jest suite                        | Passed, 1 suite and 41 tests                   |
| Evaluator plus business-event and POS close suites  | Passed, 3 suites and 54 tests                  |
| Focused ESLint over all three new files             | Passed                                         |
| Prettier over the three new source files and report | Passed                                         |
| Final full `npm run typecheck`                      | Passed repository-wide                         |
| Service-boundary fail gate                          | Passed, 0 active violations                    |
| Module-surface fail gate                            | Passed and wrote 367 current workspace records |

The focused tests prove exact balance, overage, below-threshold, exact review, one minor unit above review, exact high, explicit XAF/XOF policy use, HALF_UP/HALF_EVEN behavior, accepted `APPLIED` status, producer explanation bounds, malformed source, hash drift, identity drift, arithmetic drift, direction drift, missing explanation, every policy stop condition, deterministic evidence, safe wording, and absence of floating-point money coercion.

A concurrent unrelated worktree edit in `services/accounting/close-assurance.service.ts` briefly blocked an intermediate TypeScript rerun while that edit was incomplete. This slice did not modify that file. After the unrelated edit advanced, the final full repository typecheck passed, as did the final focused tests and lint.

The module-surface command necessarily regenerated `what-next/module-surface-inventory.md` and `.json` from the entire current dirty worktree. Those workspace-wide inventory deltas are verification output, not new evaluator routes or commercial surfaces.

## Runtime And Release Constraints

- The configured database contains zero `pos.shift.closed` events, zero Workflow Assurance incidents, and zero shortage-rule definitions. This contract is prospective.
- The stable Workflow Assurance logical-identity migration remains pending behind an unrelated pending HRIS migration. Incident integration must remain off until the approved deployment path installs the stable identity key.
- No approved effective production threshold policy exists or is persisted.
- Money-protection assignment still lacks tenant and managed-location membership validation.
- Generic acknowledge still uses a read permission, and generic resolve/suppress remain immediate single-actor transitions.
- Resolution still lacks owning-source recheck and independent maker-checker approval.
- Existing aggregate drawer alerts must not be represented as durable Leakage Radar cases.
- The repository policy chain remains held by unrelated statutory source-artifact hash and expert-approval requirements.

## Files In This Slice

- `services/leakage/pos-shift-cash-shortage-contracts.ts`
- `services/leakage/pos-shift-cash-shortage-evaluator.ts`
- `services/leakage/__tests__/pos-shift-cash-shortage-evaluator.test.ts`

Program evidence:

- `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_4_SELECTION_REPORT_2026-07-20.md`
- `what-next/referrals/POS_SHIFT_CASH_SHORTAGE_RULE_CONTRACT_REPORT_2026-07-20.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Certification Decision

The POS Closed-Shift Cash-Shortage Rule Contract is certified complete within its observe-only, side-effect-free boundary. It provides a deterministic source and policy kernel suitable for later reuse, but it is not a production detector and creates no case.

Control returns to `/stoquify-referral-war-room`. The war room must review this evidence and select at most one next narrow slice. Policy persistence and approval, event loading, assurance registration and incident integration, and money-protection lifecycle hardening remain separate decisions with independent stop conditions.
