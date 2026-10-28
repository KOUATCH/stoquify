# Referral War Room Phase 3 / Slice 5 Selection Report

Generated: 2026-07-20  
Program owner: `stoquify-referral-war-room-orchestrator`  
Execution skill: `stoquify-cash-leakage-radar`

## Decision

Select one narrow implementation slice: **Cash-Shortage Policy Governance Foundation**.

Slice 4 certified a deterministic, side-effect-free evaluator, but that evaluator intentionally fails closed without one explicit approved policy. The live platform has no tenant policy table, no approved threshold, no policy resolver, and no policy-approval evidence. A loader or detector built now would therefore have to guess configuration or remain permanently blocked.

Slice 5 will add the smallest real governance boundary that can supply the evaluator with approved, versioned, tenant-scoped policy truth. It will not activate detection, create incidents, expose a route, or configure a production threshold.

## Evidence Reviewed

- Referral war plan, execution roadmap, installed skill-suite evidence, and current war-room register
- Phase 3 source-ownership audit, Slice 2 POS close evidence, Slice 3 stable case identity, and Slice 4 evaluator evidence
- Live `CashShortagePolicyV1` and `pos.shift.closed` contracts
- Live Prisma organization, user, business-event, audit, Workflow Assurance, and incident models
- Live sensitive-action, RBAC, business-event, registry-runner, and incident-transition services
- Current combined graph artifacts, with live code treated as authoritative because the graph predates the July 19-20 Phase 3 work
- Read-only PostgreSQL counts and migration status

## Refreshed Runtime State

| Check                              | State  | Decision                                                     |
| ---------------------------------- | ------ | ------------------------------------------------------------ |
| Accepted `pos.shift.closed` events | 0      | Policy work remains prospective; no source data is rewritten |
| Workflow Assurance incidents       | 0      | No existing case lifecycle is affected                       |
| Shortage definitions               | 0      | No hidden detector is activated                              |
| Cash-shortage policy table         | absent | Real persistence is the next missing evaluator dependency    |
| Stable case-identity runtime index | absent | Incident integration remains blocked                         |

The configured runtime has three pending migrations:

- `20260719190000_hris_org_manager_scope_foundation`
- `20260719203000_workflow_assurance_stable_case_identity`
- `20260720090000_close_assurance_schema_foundation`

Slice 5 must not deploy, reorder, or mark those migrations. Its new migration will be validated directly in disposable PostgreSQL state and remain deployment-held with the existing pending chain.

## Candidate Comparison

| Candidate                                     | Dependency state                                                                                                                     | Risk / breadth                                                 | Decision              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | --------------------- |
| Tenant policy governance and resolver         | Direct missing input to the certified evaluator                                                                                      | Narrow persistence and service boundary; no runtime activation | **Selected**          |
| Event loader or per-session scanner           | Cannot make a trustworthy decision without approved policy resolution                                                                | Would add data access before configuration truth               | Hold                  |
| Assurance registry and incident integration   | Runtime lacks the stable identity migration; registry currently emits one result per definition while shortages are per source event | Crosses pending migration and runner-contract boundaries       | Blocked               |
| Money-protection incident lifecycle hardening | Valuable, but changes shared incident behavior and does not supply the evaluator's missing policy                                    | Broader shared control surface                                 | Later dedicated slice |
| Inventory-loss rule                           | Requires a separately selected source/evidence contract                                                                              | New domain                                                     | Later                 |

## Authorized Governance Contract

The implementation may add an append-only policy family with these guarantees:

- every row is scoped by `organizationId` and ISO currency;
- versions are positive and unique per organization/currency;
- thresholds use decimal storage and are never converted through JavaScript `Number`;
- review threshold is positive and high threshold is greater than or equal to review threshold;
- minor-unit scale is explicit from 0 through 4 and amounts must already be representable at that scale;
- rounding mode is explicit (`HALF_UP` or `HALF_EVEN`);
- effective start is required and effective end, when present, is strictly later;
- only observe mode is accepted; enforce mode remains unsupported;
- draft creation and approval are separate commands;
- the maker and checker must be distinct active users in the same tenant;
- approval requires `controls.manage`, fresh authentication, and an audited critical sensitive-action decision;
- an approved policy is immutable; correction means creating another version, not editing approved truth;
- approved effective windows for the same tenant/currency may not overlap;
- approval records an idempotent `cash_shortage.policy.approved` business event, policy document hash, actor, and audit evidence in the same transaction;
- resolution by tenant/currency/close time returns at most one approved policy, reconstructs the exact `CashShortagePolicyV1`, and verifies its persisted hash before use;
- missing policy returns no substitute and no default.

An open-ended approved window deliberately prevents approval of an overlapping successor in this foundation. Explicit append-only supersession semantics require a separate review; Slice 5 must not mutate an approved document to make room for a replacement.

## No Production Defaults

No XAF, XOF, or other threshold is authorized. The migration must contain no seed policy, and tests may use fixture values only. Completing Slice 5 creates governance capability, not production configuration or detector activation.

## Expected Files

- `prisma/schema.prisma`
- one new migration under `prisma/migrations/`
- `services/leakage/cash-shortage-policy.schemas.ts`
- `services/leakage/cash-shortage-policy.service.ts`
- `services/leakage/__tests__/cash-shortage-policy.service.test.ts`
- `services/controls/sensitive-action.service.ts`
- `services/controls/__tests__/sensitive-action.service.test.ts`
- one focused migration-contract test under `scripts/__tests__/`
- this selection report, the status register, and one dated implementation report under `what-next/referrals/`

No POS service, assurance registry, incident service, route, server action, component, module catalog, scheduler, notification worker, inventory workflow, AI, or WhatsApp file is authorized.

## Verification Plan

Focused tests must prove:

- tenant/currency version allocation and actor membership validation;
- permission denial and critical approval fresh-auth enforcement;
- maker-checker rejection;
- threshold, scale, mode, and effective-window validation;
- no overlapping approved windows;
- approval idempotency and concurrent-write conflict handling;
- immutable approved truth and exact policy reconstruction;
- persisted document-hash drift fails closed;
- tenant/currency/time resolution cannot leak another tenant's policy;
- approval business event and audit evidence are transactionally requested;
- migration constraints, foreign keys, indexes, and absence of seed data;
- Slice 4 evaluator accepts a resolved approved policy without adding a default.

Required release checks include focused Jest, focused ESLint, Prettier, `npx prisma validate`, full TypeScript, service-boundary, module-surface, migration-safety, scoped diff checks, and direct disposable PostgreSQL migration certification.

## Stop Conditions

Stop and return to the war room if:

- the service needs a guessed threshold or implicit currency rule;
- approval cannot be made tenant-scoped and maker-checker controlled;
- overlap safety requires mutating an approved policy;
- deterministic resolution cannot verify the approved document hash;
- implementation requires deploying any pending migration;
- implementation requires a route, UI, detector, incident, scheduler, or notification;
- the slice would overwrite or normalize unrelated concurrent schema work;
- disposable migration certification cannot represent the intended old state safely.

## Selection Outcome

Phase 3 / Slice 5 is **selected for implementation** under `stoquify-cash-leakage-radar`, limited to versioned observe-only cash-shortage policy persistence, controlled approval, immutable evidence, and deterministic policy resolution.

After focused certification, return to `/stoquify-referral-war-room`. Event loading, scanner scheduling, registry integration, incident creation, resolution hardening, product configuration UI, production policy entry, and enforce mode each remain separately gated.
