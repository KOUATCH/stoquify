# Referral War Room Phase 3 / Slice 6 Selection Report

Generated: 2026-07-20  
Program owner: `stoquify-referral-war-room-orchestrator`  
Execution skill: `stoquify-cash-leakage-radar`

## Decision

Select one narrow implementation slice: **POS Closed-Shift Cash-Shortage Evaluation Batch Foundation**.

Slices 2 through 5 established a trustworthy POS close event, stable code-level case identity, a strict side-effect-free evaluator, and approved tenant/currency policy governance. The next missing pipeline capability is a deterministic way to load eligible close events and compose each event with the policy effective at its close time.

Slice 6 will add a bounded, read-only, tenant-scoped batch service. It will produce one evaluation per eligible business event and stop before Workflow Assurance run persistence, registry registration, incident creation, scheduling, notification, routes, actions, or UI.

## Evidence Reviewed

- All required referral roadmap and war-plan source documents
- Current referral war-room register and Phase 3 Slice 1 through Slice 5 evidence
- Installed `stoquify-referral-war-room-orchestrator` and `stoquify-cash-leakage-radar` skills
- Current combined architecture graph, treated as historical because it predates the July 19-20 Leakage implementation
- Live business-event schema, indexes, event service, POS close producer contract, policy resolver, evaluator, assurance registry, scheduler, and incident service
- Current migration status and scoped dirty-worktree state
- Current focused leakage baseline: 3 suites and 60 tests passed

## Refreshed Runtime And Contract State

The configured database still has four pending migrations:

1. `20260719190000_hris_org_manager_scope_foundation`
2. `20260719203000_workflow_assurance_stable_case_identity`
3. `20260720090000_close_assurance_schema_foundation`
4. `20260720130000_cash_shortage_policy_governance`

The code schema contains stable assurance case identity and cash-shortage policy governance, but the configured runtime has neither migration. Slice 6 must not deploy, reorder, or mark any migration.

The assurance registry still defines one runner result, one check-run row, and at most one incident upsert per definition execution. Cash-shortage evaluation is one result per source event. Treating an aggregate result as one source case would lose per-session identity, while changing registry cardinality now would broaden the shared assurance control plane.

## Candidate Comparison

| Candidate                                   | Dependency state                                                     | Risk / breadth                                                                     | Decision                            |
| ------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| Read-only POS close event evaluation batch  | Source, evaluator, and resolver contracts are certified in code      | Narrow composition; no writes or activation                                        | **Selected**                        |
| Registry multi-result runner redesign       | Required eventually for generic registry integration                 | Shared run, incident, count, error, and scheduler semantics                        | Hold for a dedicated contract slice |
| Workflow Assurance incident integration     | Code identity exists, but runtime identity migration is absent       | Would write against an uncertified runtime key                                     | Blocked                             |
| Money-protection resolution hardening       | Still required before terminal case workflow                         | Broad shared transition, RBAC, assignee, source-recheck, and maker-checker surface | Later dedicated slice               |
| Production policy entry or configuration UI | Governance code exists, but runtime table and approved values do not | Would imply deployment and threshold authority                                     | Blocked                             |
| First inventory-loss rule                   | Requires a separate source/evidence selection                        | Opens a new domain before the first cash rule reaches composition                  | Later                               |

## Authorized Batch Contract

The implementation may add one read-only service with these guarantees:

- input is strict and tenant-scoped by `organizationId`;
- every scan has a required recorded-time window with inclusive start and exclusive end;
- the window end must be later than the start;
- page size is bounded and deterministic;
- continuation uses a structured `(recordedAt, eventId)` cursor within the same window;
- the query filters exactly `pos.shift.closed`, `POS`, schema version `1`, status `APPLIED`, and source type `CASH_DRAWER_CLOSE`;
- ordering is `recordedAt`, then event ID, ascending;
- `limit + 1` loading determines whether another page exists without writing scan state;
- database rows are serialized deliberately into the strict Slice 4 event envelope, including ISO timestamps;
- malformed source evidence returns the evaluator's blocked outcome and never triggers policy lookup or a case;
- valid source evidence resolves policy by the row tenant, payload currency, and payload close time;
- missing policy remains `POLICY_MISSING`; no default is supplied;
- policy-evidence conflicts or resolver failures reject the batch rather than being converted into a clean or non-triggered result;
- output preserves one event/source identity and one evaluator result per loaded row;
- output includes deterministic counts for blocked, not-triggered, triggered, warning, and high outcomes;
- rerunning the same static page produces the same evaluations and no side effect.

The batch is an internal service contract, not a scheduler or endpoint. It may import the certified policy resolver and evaluator, but it may not weaken or duplicate their validation.

## Pagination And Snapshot Boundary

The source scan is ordered by `BusinessEvent.recordedAt` and event ID rather than by domain occurrence time. Policy selection still uses the trusted payload `closedAt`.

The caller supplies `recordedFromInclusive` and `recordedThroughExclusive`; the latter is intended to be captured at the start of a future run. A continuation cursor is valid only inside that same window. This gives a deterministic finite page contract without adding a checkpoint table or marking events processed.

Cross-run worker checkpointing, overlapping recovery windows, transaction-commit watermark semantics, retry scheduling, and outbox consumption remain separate design decisions. Slice 6 must not imply that pagination alone is a production scheduler.

## Stop Conditions And Failure Semantics

Stop and return to the war room if:

- loading requires a guessed threshold, currency rule, or production policy;
- a malformed event must be treated as clean or silently skipped;
- a policy hash or approval-event conflict would be swallowed per item;
- deterministic pagination requires a new database column or checkpoint table;
- implementation requires modifying the shared assurance registry, scheduler, or incident service;
- implementation requires deploying a pending migration;
- implementation requires a route, action, UI, notification, or background worker;
- code changes would overlap unrelated concurrent assurance or POS work.

## Expected Files

- `services/leakage/pos-shift-cash-shortage-batch.schemas.ts`
- `services/leakage/pos-shift-cash-shortage-batch.service.ts`
- `services/leakage/__tests__/pos-shift-cash-shortage-batch.service.test.ts`
- this selection report, the status register, and one dated implementation report under `what-next/referrals/`

No Prisma schema or migration, POS service, business-event writer, assurance registry, scheduler, incident service, route, action, component, module catalog, notification, inventory workflow, AI, or WhatsApp file is authorized.

## Verification Plan

Focused tests must prove:

- strict organization, window, limit, and cursor validation;
- exact tenant/event/source/schema/status filters;
- deterministic `recordedAt`/ID ordering and `limit + 1` pagination;
- no cross-tenant event exposure;
- exact row-to-serialized-event mapping;
- malformed source blocks without policy lookup;
- valid source resolves policy using tenant, currency, and close time;
- missing policy produces `POLICY_MISSING`;
- below-threshold and triggered outcomes preserve evaluator semantics;
- policy governance conflicts reject the batch;
- per-page counts and continuation cursor are deterministic;
- no database writes, processing markers, registry calls, or incident calls occur.

Required checks:

```text
npm test -- --runInBand services/leakage/__tests__/pos-shift-cash-shortage-batch.service.test.ts
npm test -- --runInBand services/leakage/__tests__/pos-shift-cash-shortage-batch.service.test.ts services/leakage/__tests__/pos-shift-cash-shortage-evaluator.test.ts services/leakage/__tests__/cash-shortage-policy.service.test.ts services/leakage/__tests__/cash-shortage-policy-evaluator-integration.test.ts services/events/__tests__/business-event.service.test.ts services/pos/__tests__/pos-shift-close.service.test.ts
npx eslint <new Slice 6 files>
npx prettier --check <new Slice 6 files and reports>
npm run typecheck
npm run service:boundary:fail
npm run module:surface:fail
```

No PostgreSQL mutation test or migration certification is required because this slice adds no write, model, or migration. Query-shape behavior must be proved with focused service tests.

## Selection Outcome

Phase 3 / Slice 6 is **selected for implementation** under `stoquify-cash-leakage-radar`, limited to a bounded, read-only, tenant-scoped POS close event evaluation batch.

After focused certification, return to `/stoquify-referral-war-room`. Registry cardinality, check-run persistence, incident creation, worker checkpointing, scheduling, notifications, money-protection resolution, production policy entry, configuration UI, inventory-loss behavior, predictive scoring, AI authority, and WhatsApp authority remain separately gated.
