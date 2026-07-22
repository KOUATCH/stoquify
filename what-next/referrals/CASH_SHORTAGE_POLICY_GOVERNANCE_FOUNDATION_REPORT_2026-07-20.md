# Cash-Shortage Policy Governance Foundation Report

Generated: 2026-07-20  
Program: Stoquify Referral-Worthy Execution Program  
Phase: Phase 3 / Slice 5  
Operating skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`

## Executive Outcome

Phase 3 / Slice 5 is **certified complete** at the product-capability level.

Stoquify now has an append-only, tenant-scoped governance foundation for the approved policy required by the certified POS closed-shift cash-shortage evaluator. The implementation supports versioned draft creation, independent critical approval, immutable approval evidence, and deterministic tenant/currency/time resolution.

This capability remains prospective and observe-only. It does not install a production threshold, activate event loading or scanning, register an assurance definition, create an incident, expose a route or action, render configuration UI, or authorize AI or WhatsApp as a source of truth.

## Scope Boundary

Implemented:

- a versioned `CashShortagePolicy` persistence model scoped by organization and currency;
- decimal threshold, scale, rounding, effective-window, status, mode, maker, checker, approval-time, and document-hash fields;
- strict draft-input and approval-event schemas with exact scale representability;
- serializable draft creation with deterministic per-tenant/currency version allocation;
- independent approval under the critical `cash-shortage.policy.approve` sensitive-action policy;
- `controls.manage`, L1 assurance, fresh authentication within 300 seconds, active same-tenant actors, and maker-checker enforcement;
- overlap rejection for approved windows in the same tenant and currency;
- same-transaction audit and idempotent `cash_shortage.policy.approved` business-event evidence;
- database-level immutability for rows that are already approved;
- deterministic resolution by tenant, currency, and close time;
- verification of both the persisted policy document hash and the canonical approval event before returning evaluator input;
- migration, service, control, evaluator-integration, and release-gate tests.

Not implemented:

- seed policies, XAF/XOF defaults, inferred currency rules, or production threshold entry;
- approved-policy supersession or mutation of an open-ended approved window;
- event loading, polling, scheduling, outbox consumption, or detector activation;
- Workflow Assurance registration, incident creation, assignment, acknowledgement, resolution, or notification;
- API routes, server actions, pages, components, dashboards, or module-catalog changes;
- POS, accounting, inventory, payroll, AI, copilot, or WhatsApp behavior changes;
- deployment of this migration or any earlier pending migration.

## Before And After

### Before

- The Slice 4 evaluator failed closed unless its caller supplied one explicit approved policy.
- No cash-shortage policy table, version history, approval evidence, or deterministic resolver existed.
- A future loader or detector could not select a trustworthy tenant/currency threshold without guessing configuration.
- Test policy fixtures were contract examples only and had no production authority.

### After

- Drafts are versioned per organization and ISO currency, with thresholds stored as `Decimal(19,4)`.
- Approval is a separate, critical maker-checker command and records policy, actor, control, audit, event, and hash evidence atomically.
- Approved rows are immutable; correction requires a new version.
- Approved windows cannot overlap for the same tenant and currency.
- Resolution returns zero or one exact approved policy for the close timestamp and fails closed on duplicates, document-hash drift, missing approval events, or approval-event drift.
- Missing policy returns `null`; no default or fallback is substituted.
- The resolved contract feeds the strict Slice 4 evaluator without relaxing any source or policy check.

## Persistence And Migration Contract

The migration creates:

- `CashShortagePolicyStatus` with `DRAFT` and `APPROVED`;
- `CashShortagePolicyMode` with `OBSERVE` only;
- `CashShortageRoundingMode` with `HALF_UP` and `HALF_EVEN`;
- `cash_shortage_policies`, including tenant, maker, and checker foreign keys;
- a unique organization/currency/version key and resolution/approval indexes;
- database checks for positive versions, scale range, positive review threshold, high threshold ordering, effective-window ordering, and complete approval evidence;
- an approved-row immutability trigger.

The migration contains no policy insert, update, delete, seed, or production threshold. Application overlap protection runs inside a Serializable approval transaction; the database constraints preserve row-level structural truth.

## Command And Evidence Contract

### Draft Creation

`createCashShortagePolicyDraft`:

- validates organization, uppercase ISO currency, thresholds, exact scale, rounding mode, and effective window;
- requires `controls.manage` and an active actor in the organization;
- allocates the next organization/currency version in a Serializable transaction;
- stores only `OBSERVE` / `DRAFT` truth;
- writes `CASH_SHORTAGE_POLICY_DRAFT_CREATED` audit evidence in the same transaction.

### Approval

`approveCashShortagePolicy`:

- reloads the tenant-owned draft inside a Serializable transaction;
- validates active maker and checker membership;
- evaluates and audits `cash-shortage.policy.approve` as critical L1, fresh-auth, maker-checker control;
- rejects overlapping approved windows;
- conditionally transitions the exact draft to `APPROVED` with checker, approval time, and canonical policy hash;
- writes approval audit and the idempotent `cash_shortage.policy.approved` business event in the same transaction;
- returns committed evidence on an exact replay without duplicating event application;
- retries only expected Prisma unique or serialization conflicts once, then returns a conflict.

The event idempotency key is bound to policy ID and version. Its envelope, actor, source, occurrence time, document hash, payload hash, organization, embedded policy, and embedded policy hash are all verified by resolution.

### Resolution

`resolveApprovedCashShortagePolicy`:

- validates tenant, ISO currency, and close timestamp;
- selects an approved policy whose effective window contains the timestamp;
- returns `null` when none exists;
- rejects multiple matches rather than choosing arbitrarily;
- reconstructs the exact `cash_shortage_policy/v1` evaluator contract;
- verifies the persisted document hash;
- verifies the canonical approval business event and payload hash;
- returns no unapproved, cross-tenant, wrong-currency, ineffective, expired, or drifted policy.

## Verification Evidence

### Automated Checks

| Check                                                   | Outcome                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| Final combined Jest regression                          | Passed, 7 suites and 94 tests                                       |
| Policy service focused rerun with open-handle detection | Passed, 1 suite and 18 tests; no open handle reported               |
| Resolver-to-evaluator integration                       | Passed                                                              |
| Focused ESLint                                          | Passed                                                              |
| Full `npm run typecheck` with 6144 MB Node heap         | Passed repository-wide                                              |
| `npx prisma format`                                     | Passed                                                              |
| `npx prisma validate`                                   | Passed                                                              |
| `npx prisma generate --no-engine`                       | Passed with Prisma Client 6.19.3                                    |
| Service-boundary fail gate                              | Passed, 0 active violations                                         |
| Module-surface fail gate                                | Passed, 367 current-workspace records                               |
| Migration-safety gate                                   | Passed, 8/8 readiness checks; 23 migrations; 0 risks and 0 blockers |
| Role-cockpit fail gate                                  | Passed, 9/9 readiness checks; 0 blockers                            |

The 94-test final regression covers policy governance, the strict cash-shortage evaluator, resolver-to-evaluator integration, business-event evidence, POS close behavior, sensitive-action controls, and migration contracts.

Focused policy tests prove invalid thresholds and windows, normalization and versioning, permission and tenant-membership denial, Serializable retry, maker-checker and fresh-auth rejection, overlap rejection, successful approval, exact replay, missing resolution, exact resolution, duplicate resolution failure, document-hash drift, and missing approval-event failure.

### Disposable PostgreSQL Certification

The exact migration SQL was executed with `prisma db execute` inside a disposable PostgreSQL schema and an enclosing rollback. Certification proved:

- a valid draft can be inserted and transitioned to approved;
- invalid threshold ordering is rejected by a database constraint;
- any later update of an approved row is rejected by the immutability trigger;
- rollback removes the disposable schema and leaves the configured runtime unchanged.

The first CLI attempt omitted Prisma's required `--schema` option and failed before database execution. The corrected command passed. A follow-up database check confirmed that the disposable schema no longer existed.

## Runtime And Release Constraints

`prisma migrate status` correctly remains non-green because four migrations are pending, in order:

1. `20260719190000_hris_org_manager_scope_foundation`
2. `20260719203000_workflow_assurance_stable_case_identity`
3. `20260720090000_close_assurance_schema_foundation`
4. `20260720130000_cash_shortage_policy_governance`

No migration was deployed or marked applied. The configured runtime still has no `public.cash_shortage_policies` table and therefore no approved production policy. Incident integration remains blocked until the stable case-identity migration is installed through an approved release path.

The active local Next development process must be restarted normally before it can load the refreshed generated Prisma client. No process was killed during this slice.

The module-surface and migration-safety commands regenerated their standard Markdown and JSON artifacts from the entire dirty worktree. Those files are verification output and do not represent a new route, UI, or commercial surface.

## Files In This Slice

Product and schema:

- `prisma/schema.prisma`
- `prisma/migrations/20260720130000_cash_shortage_policy_governance/migration.sql`
- `services/leakage/cash-shortage-policy.schemas.ts`
- `services/leakage/cash-shortage-policy.service.ts`
- `services/controls/sensitive-action.service.ts`

Tests:

- `services/leakage/__tests__/cash-shortage-policy.service.test.ts`
- `services/leakage/__tests__/cash-shortage-policy-evaluator-integration.test.ts`
- `services/controls/__tests__/sensitive-action.service.test.ts`
- `scripts/__tests__/cash-shortage-policy-governance-migration.test.js`

Program evidence:

- `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_5_SELECTION_REPORT_2026-07-20.md`
- `what-next/referrals/CASH_SHORTAGE_POLICY_GOVERNANCE_FOUNDATION_REPORT_2026-07-20.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Generated release evidence:

- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `what-next/prisma-migration-deployment-readiness.md`
- `what-next/prisma-migration-deployment-readiness.json`
- `what-next/role-based-operating-cockpit-readiness.md`
- `what-next/role-based-operating-cockpit-readiness.json`

## Certification Decision

The Cash-Shortage Policy Governance Foundation is certified complete within its versioned, observe-only, tenant-scoped boundary. It supplies trustworthy policy evidence to the certified evaluator but does not activate a production detector or create a Leakage Radar case.

Control returns to `/stoquify-referral-war-room`. The war room must review this evidence and select at most one next narrow slice. Event loading, runner-contract design, registry and incident integration, money-protection lifecycle hardening, production policy entry, supersession, configuration UI, and enforce mode remain separate decisions with independent stop conditions.
