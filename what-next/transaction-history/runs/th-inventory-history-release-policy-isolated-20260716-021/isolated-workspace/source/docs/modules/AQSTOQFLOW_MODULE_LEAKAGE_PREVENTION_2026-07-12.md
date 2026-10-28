# AqStoqFlow Module Leakage Prevention

Date: 2026-07-12
Skill: `aqstoqflow-module-leakage-prevention`
Lane: Report, export, job, webhook, analytics, BI, and proof leakage prevention
Mode: observe/report only

## Executive Verdict

AqStoqFlow must close non-page leakage paths before module hard enforcement can be trusted. Pages and actions are visible in the current inventory, but inactive-module data can still leak through reports, exports, proof trails, analytics cards, dashboards, public token flows, provider webhooks, scheduled processors, and background jobs unless every output declares its owner module, source modules, access intent, sensitivity, redaction behavior, and unavailable behavior.

The current codebase has useful pieces: `ModuleSurfaceType` already includes `report`, `export`, and `job`; `ModuleAccessIntent` includes `export` and `job`; `protect()` and `requireApiModuleAccess()` can observe/enforce module decisions; accounting exports use fresh auth; reconciliation and close-pack exports include hash/audit/redaction patterns; provider-event flows include signature/idempotency/hash evidence. But these are not yet one source-module leakage-control system.

This report defines the missing registry, guard, redaction, partial-state, and release-gate model. No hard enforcement, schema migration, runtime guard change, or inventory scanner change is made in this pass.

## Source Evidence Inspected

- `docs/modules/AQSTOQFLOW_COMPLETE_MODULE_SYSTEM_ENTERPRISE_ROADMAP_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_FULL_ARCHITECTURE_AUDIT_AND_REMEDIATION_REPORT_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_SURFACE_REGISTRY_RATCHET_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_ACCESS_GUARD_CONTRACT_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_WORKBENCH_UX_STATES_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_BILLING_PROVISIONING_BOUNDARY_2026-07-12.md`
- `docs/architecture/decisions/0004-kontava-module-vocabulary-and-ownership.md`
- `docs/architecture/decisions/0007-kontava-module-entitlement-observe-mode.md`
- `docs/architecture/decisions/0011-kontava-module-ownership-inventory.md`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `services/_shared/protect.ts`
- `lib/security/server-authz.ts`
- `actions/accounting/reports.actions.ts`
- `actions/evidence/proof-trail.actions.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/reconciliation/payment-reconciliation-certification.service.ts`
- `services/payments/provider-event.service.ts`
- `scripts/module-surface-inventory.js`
- `prisma/schema.prisma`

## Current State

- `MODULE_CONTROL_MODE` remains `observe`.
- `ModuleControlCenterData.hardEnforcementEnabled` remains `false`.
- Current inventory remains report-mode and does not enforce module entitlements.
- Latest before-lane inventory covers `sidebar`, `moduleCatalog`, `dashboardRoot`, and `actionsRoot`.
- The inventory currently records navigation, dashboard pages/layouts, server actions, and internal module services.
- The inventory script does not yet first-class scan report definitions, export services, jobs, scheduled processors, webhooks, proof surfaces, BI cards, public token flows, or provider/outbox processors.
- `ModuleSurfaceType` supports `navigation`, `page`, `action`, `api`, `report`, `export`, and `job`, but does not yet include `webhook`, `proof_surface`, `bi_card`, or `public_token_flow`.
- `ModuleAccessIntent` supports `read`, `write`, `export`, and `job`, but not explicit `webhook`, `proof`, or `administer` intent.
- `READ_ONLY_ALLOWED_SURFACES` allows `navigation`, `page`, and `report`, which means export/job behavior must stay intent-aware and cannot inherit read access by accident.
- `actions/accounting/reports.actions.ts` protects accounting reports and uses fresh auth for accounting exports, but current action wrappers do not pass a module gate or source-module policy.
- `actions/evidence/proof-trail.actions.ts` protects proof trails by subject permissions, but current wrappers do not pass a module gate or subject-to-source-module policy.
- `services/reconciliation/payment-reconciliation-certification.service.ts` and `services/accounting/close-assurance-pack.service.ts` include strong hash, audit, redaction, and export evidence patterns, but module source access is not centralized.
- `services/payments/provider-event.service.ts` contains useful provider signature/idempotency/hash patterns, but provider-event processing is not yet integrated into a module-surface leakage registry.

## What Is Working

1. The surface inventory gives a useful baseline.

   It identifies 306 surfaces, 266 mapped records, 34 unmapped records, 16 missing-permission records, and 300 enforcement candidates.

2. The module access contracts already know about high-risk intents.

   `export` and `job` are first-class access intents. `report`, `export`, and `job` are already recognized surface types.

3. Some high-risk exports already use mature evidence patterns.

   Accounting exports require fresh auth. Reconciliation certificate exports and close-pack exports use hashes, audit events, redaction notes, drift checks, and report-export evidence.

4. Provider event handling has good safety ingredients.

   Payment provider events use idempotency, raw payload hashes, signature validity, inbox records, exceptions, and audit/business-event evidence.

5. Prior roadmap artifacts already define the right direction.

   The roadmap, access-guard contract, surface-registry ratchet, Workbench states, and billing boundary all agree that reports, exports, jobs, webhooks, proof surfaces, and BI cards must obey source-module policy.

## What Is Not Working

1. Source-module access is not universal.

   Cross-module reports, exports, dashboards, and proof surfaces do not yet have one registry-backed contract that says which source modules are read, exported, redacted, or omitted.

2. Report and export leakage is not ratcheted.

   The current inventory can find actions that call report/export services, but it does not yet classify report/export outputs as first-class surfaces with output sensitivity and source modules.

3. Jobs and scheduled processors are not module-governed.

   Scripts and background-like service paths can process provider, payroll, inventory, reconciliation, close, or compliance data without appearing as module surfaces in `module:surface:inventory`.

4. Webhooks are not a module surface type.

   API module access exists for some routes, and provider safety patterns exist, but webhooks are not yet represented as inbound or outbound module surfaces with owner/source modules and signature/idempotency policy.

5. Proof surfaces are permission-protected but not module-source protected.

   Proof trails span accounting, reconciliation, close, and payment subjects. They need subject-specific source-module policy.

6. BI and dashboard aggregation can blur module boundaries.

   Analytics and executive dashboard surfaces can aggregate data from modules that may later be inactive, read-only, suspended, expired, or unavailable.

7. Read-only semantics are incomplete for exports/jobs.

   `read_only` can allow report reads, but export and job intents must be blocked unless a registry policy explicitly allows retention export or retention job behavior.

## Leakage Threat Model

| Path | Leakage risk | Required control |
|---|---|---|
| Report read | Reads inactive source-module data through an active reporting module | Owner module plus source-module read checks; partial/redacted states |
| Export | Downloads inactive or sensitive source-module data | Export intent, fresh auth, source-module checks, redaction, audit |
| Analytics/BI card | Aggregates inactive module data into dashboards | Source-module filtering; aggregate-only fallback |
| Proof trail | Reveals inactive module evidence through a cross-domain proof surface | Subject-to-source-module policy; proof access guard |
| Close pack | Includes payroll, inventory, reconciliation, or compliance evidence after a source module is inactive | Source-module retention policy; export evidence redaction |
| Scheduled job | Processes inactive module data in background | Job intent, allowed lifecycle states, retention-only mode |
| Provider webhook | Ingests or emits module-owned data without module owner policy | Webhook surface registry, signature/idempotency, owner/source module |
| Public token flow | Exposes module-owned data outside authenticated shell | Token scope, source-module policy, redaction, expiry |
| Business-event outbox | Emits inactive module data to notifications or integrations | Event owner/source modules, recipient policy, redaction |

## Target Output Registry

Create a first-class output registry under the module control plane. It can start as static metadata and report-only scans before schema persistence.

Recommended registry shape:

```ts
type ModuleOutputSurface = {
  surfaceId: string
  surfaceType:
    | "report"
    | "export"
    | "job"
    | "webhook"
    | "proof_surface"
    | "bi_card"
    | "dashboard_card"
    | "public_token_flow"
    | "business_event"
  ownerModule: CommercialModuleSlug
  sourceModules: CommercialModuleSlug[]
  writeTargetModules: CommercialModuleSlug[]
  requiredPermission: string | null
  accessIntent: "read" | "export" | "job" | "webhook" | "proof"
  dataClass:
    | "operational"
    | "financial"
    | "payroll"
    | "compliance"
    | "provider"
    | "personal"
    | "audit"
    | "aggregate"
  sensitivity: "low" | "medium" | "high" | "critical"
  allowedModuleStates: Array<"active" | "trial" | "read_only" | "system_default" | "legacy_default">
  inactiveSourceBehavior: "deny" | "omit" | "redact" | "aggregate_only" | "partial_state" | "retention_only"
  exportAllowedInReadOnly: boolean
  jobAllowedInReadOnly: boolean
  freshAuthRequired: boolean
  auditRequired: boolean
  redactionPolicy: string
  unavailableBehavior: {
    normalUser: "safe_unavailable" | "safe_partial" | "not_found"
    ownerAdmin: "diagnostic_with_next_action" | "safe_partial" | "support_required"
  }
  ownerService: string
  tests: string[]
}
```

## Source-Module Access Rules

1. Owner module is necessary but not sufficient.

   A report owned by `reports` or `analytics` must still check the source modules it reads, such as `inventory`, `sales`, `accounting`, `payroll`, `finance`, or `payment_reconciliation`.

2. Access intent must match output risk.

   A user with report read access must not automatically get export access. Exports use `export` intent. Jobs use `job` intent. Webhooks use `webhook` intent once added.

3. Read-only does not mean exportable.

   `read_only` can allow historical report reads. Export, job, webhook, and proof-pack behavior must be explicitly allowed by registry policy.

4. Inactive source modules must degrade safely.

   Depending on the surface, the result should deny, omit the source, redact values, return aggregate-only output, or show a safe partial state.

5. Cross-module dashboards must name every source.

   Dashboard cards and analytics tiles must not silently read inactive source-module data.

6. Proof surfaces must declare subject policy.

   A proof trail for a payment transaction, reconciliation run, close run, or journal entry must map to its source modules and allowed lifecycle states.

7. Jobs must declare allowed lifecycle states.

   A scheduled processor may run retention-only work for read-only modules, but cannot perform new writes, postings, submissions, exports, or external sends for suspended/expired/unavailable modules unless a module-specific policy permits it.

## Required Guard Wrappers

Extend the access-guard contract with these wrappers:

| Wrapper | Surface type | Required checks |
|---|---|---|
| `requireReportModuleAccess()` | `report` | owner module, source modules, read intent, partial/redaction policy |
| `requireExportModuleAccess()` | `export` | export intent, fresh auth, source modules, redaction, audit, retention policy |
| `requireJobModuleAccess()` | `job` | job intent, allowed lifecycle state, idempotency, write-target modules |
| `requireWebhookModuleAccess()` | `webhook` | owner/source modules, tenant scope, signature/idempotency, replay policy |
| `requireProofModuleAccess()` | `proof_surface` | subject policy, source modules, proof type, stale/certification policy |
| `requireBiModuleAccess()` | `bi_card` | source-module filtering, aggregate-only fallback, redaction |
| `requirePublicTokenModuleAccess()` | `public_token_flow` | token scope, expiry, source modules, redaction |

These wrappers should call the same authoritative entitlement service. They should not rely on sidebar visibility, session `modulesEnabled`, or provider/billing payloads.

## Output Behavior Matrix

| Source-module state | Report read | Export | Job | Webhook | BI/dashboard | Proof surface |
|---|---|---|---|---|---|---|
| `active` | allow if RBAC and source policy pass | allow if export policy and fresh auth pass | allow if job policy pass | allow if signature/scope pass | allow | allow |
| `trial` | allow with trial audit | allow only if trial export policy permits | allow only if trial job policy permits | usually observe/deny unless explicit | allow with trial label for admins | allow if proof policy permits |
| `read_only` | allow historical reads | deny unless retention export explicitly allows | retention-only jobs only | deny outbound by default | allow aggregate/history only | allow historical proof only |
| `suspended` | safe unavailable or owner/admin diagnostic | deny | stop/quarantine | deny outbound; inbound may record evidence only | omit/redact | deny or owner/admin diagnostic |
| `expired` | safe unavailable or read-only retention | deny unless archive export allowed | stop/quarantine | deny outbound | omit/redact | historical proof only if retention allows |
| `unavailable` | deny or safe partial | deny | deny | deny | omit | deny |
| `dependency_missing` | safe partial or deny | deny | deny | deny | omit dependent source | deny dependent proof |

## Redaction And Partial-State Policy

Redaction levels:

- `none`: only for low-risk internal aggregate outputs.
- `mask_identifiers`: hide provider, account, payroll, customer, supplier, and employee direct identifiers.
- `aggregate_only`: return totals/counts/trends without row-level records.
- `omit_source`: remove inactive source-module contribution and label the output partial.
- `hash_only`: expose evidence hashes, source ids, and counts without raw payloads.
- `deny`: return safe unavailable state.

Partial states must include:

- visible statement that the output is partial;
- omitted/redacted source modules for owner/admin only;
- safe normal-user message without billing/package internals;
- audit record containing actor, owner module, source modules, redaction policy, and decision reason;
- deterministic test coverage for the partial output.

## Priority Registry Candidates

| Priority | Surface | Owner module | Source modules | Notes |
|---:|---|---|---|---|
| 1 | Accounting trial balance/general ledger reports | `accounting` | `accounting` | Already RBAC-protected; add report/export source-module policy. |
| 2 | Accounting report export | `accounting` | `accounting` | Fresh auth exists; add export module intent and redaction audit contract. |
| 3 | Reconciliation certificate export | `payment_reconciliation` | `payment_reconciliation`, `finance`, `accounting` | Strong hash/audit patterns exist; add source-module gating. |
| 4 | Close pack export | `close_assurance` | `accounting`, `payment_reconciliation`, `inventory`, `payroll`, `compliance` as applicable | Redaction exists; needs source-module retention policy. |
| 5 | Proof trail actions | `close_assurance` or subject owner | `accounting`, `payment_reconciliation`, `finance`, `close_assurance` | Needs subject-to-module map. |
| 6 | Analytics financial reports | `analytics` | `reports`, `finance`, `accounting`, `sales`, `inventory` as applicable | Some actions use `reports.read`; source modules must be explicit. |
| 7 | Dashboard intelligence cards | `dashboard` or `analytics` | all contributing modules | Use partial/aggregate-only fallbacks. |
| 8 | Provider event ingestion | `payment_reconciliation` | `finance`, `payment_reconciliation` | Signature/idempotency exists; register webhook/inbox surface. |
| 9 | Payroll self-service exports | `payroll` | `payroll`, `presence`, `payment_reconciliation` where applicable | Must stay redacted and token-scoped. |
| 10 | Business-event outbox notifications | source owner | event-specific modules | Prevent inactive module data in notifications/integrations. |

## Implementation Sequence

1. Define output-surface registry contracts.

   Add static TypeScript metadata first. Do not enforce. Include report, export, job, webhook, proof surface, BI card, dashboard card, public token flow, and business event.

2. Extend module surface inventory in report mode.

   Scan registry records and known output services. Keep `module:surface:inventory` non-blocking until baselines are stable.

3. Add source-module policy to guard contract.

   Use `ownerModule`, `sourceModules`, `accessIntent`, `inactiveSourceBehavior`, and `redactionPolicy`.

4. Add report/export dry-run decisions.

   Start with accounting reports/exports and reconciliation certificate export because they already have clear owners and tests.

5. Add proof-surface subject map.

   Map proof subjects to module owners and source modules, then return safe partial/deny states where source modules are unavailable.

6. Add BI/dashboard partial states.

   Cross-module cards should omit or aggregate-only inactive source modules and show partial status.

7. Add job and webhook registry.

   Scheduled processors, inbox processors, provider event handlers, outbox events, and token flows must declare owner/source/write-target modules.

8. Add release-gate ratchets.

   Start as report mode. Then fail only new output surfaces missing owner module, source modules, permission, guard, redaction policy, or unavailable behavior.

9. Pilot one low-risk read-only reporting surface.

   Use report-only evidence first, then enforce one bounded reporting read/export path with rollback.

## Tests And Gates

Future focused tests:

- report reads deny, redact, or partialize when source module is unavailable;
- export intent is required and cannot inherit report read access;
- read-only module blocks export unless retention export policy explicitly permits;
- suspended/expired/unavailable modules block jobs and outbound webhooks;
- proof trail subject policy maps to correct source modules;
- dashboard card omits inactive source-module data and marks output partial;
- provider webhook records evidence but cannot expose inactive module data downstream;
- public token flow denies inactive source module and returns redacted safe state;
- business-event outbox redacts inactive source data;
- audit event records owner module, source modules, actor, intent, decision, redaction policy, and output id;
- wildcard/admin RBAC cannot bypass source-module entitlement.

Release gates:

- `module:surface:inventory` remains report-only until the baseline is stable.
- Add `module:output:inventory` as a report-mode companion gate.
- Ratchet new outputs first: no new report/export/job/webhook/proof/BI/public-token surface without registry metadata.
- Later fail on missing owner module, missing source modules, missing access intent, missing redaction policy, or missing unavailable behavior.
- Add a leakage pilot gate for one read-only reporting surface before broad enforcement.

## Risks And Blockers

| Risk | Severity | Mitigation |
|---|---:|---|
| Active reporting module leaks inactive source-module data | Critical | Source-module policy for every report/export/BI surface. |
| Export uses read permission only | Critical | Explicit export intent, fresh auth, redaction, audit. |
| Background jobs mutate inactive module data | Critical | Job intent, allowed lifecycle states, retention-only mode. |
| Webhooks emit inactive module data | High | Webhook registry, owner/source modules, outbound redaction policy. |
| Proof surfaces bypass module boundaries | High | Subject-to-source-module map and proof guard. |
| Public token flows bypass Workbench/guards | High | Token scope plus source-module policy. |
| Dashboard cards show stale or forbidden aggregates | High | Partial/omit/aggregate-only state. |
| Inventory misses non-action output surfaces | High | Add output registry and scanner. |
| Normal users see paid-module internals | Medium | Role-filtered unavailable/partial messages. |
| Report-only inventory becomes noisy | Medium | Ratchet only new outputs first. |

## Success Criteria

- Every report declares owner module, source modules, access intent, sensitivity, and unavailable behavior.
- Every export declares owner module, source modules, export intent, fresh-auth policy, redaction policy, and audit policy.
- Every job declares owner module, source modules, write target modules, idempotency, and allowed lifecycle states.
- Every webhook declares owner module, source modules, signature/idempotency policy, and redaction policy.
- Every proof surface declares subject type, source modules, stale/certification policy, and retention behavior.
- Every dashboard/BI card either checks source-module access or produces a safe partial/aggregate-only state.
- Read-only, suspended, expired, unavailable, and dependency-missing source states cannot leak through reports, exports, jobs, webhooks, proof, BI, public token flows, or business events.
- Release gates can prevent new unregistered output surfaces.

## Verification Result

Before this lane:

```powershell
npm run module:surface:inventory
```

Inventory evidence from `what-next/module-surface-inventory.md` before this report:

- Generated at: `2026-07-12T07:51:21.727Z`
- Catalog modules: 20
- Surfaces inventoried: 306
- Mapped: 266
- Unmapped: 34
- Missing permission: 16
- Enforcement candidates: 300
- Report mode: inventory is read-only and does not enforce module entitlements.

After this lane:

- Command: `npm run module:surface:inventory`
- Result: passed. The report-mode inventory rewrote 306 records to `what-next/module-surface-inventory.json`.
- Generated at: `2026-07-12T07:55:52.078Z`
- Catalog modules: 20
- Surfaces inventoried: 306
- Mapped: 266
- Unmapped: 34
- Missing permission: 16
- Enforcement candidates: 300
- Source coverage remained `sidebar=present`, `moduleCatalog=present`, `dashboardRoot=present`, and `actionsRoot=present`.

## Decisions Made In This Lane

- Output leakage must be controlled through source-module policy, not only owner-module policy.
- Report reads, exports, jobs, webhooks, proof surfaces, BI cards, dashboard cards, public token flows, and business events need first-class registry metadata.
- Export and job access must remain intent-specific and cannot inherit read access.
- Read-only retention can allow historical reads but should block export/job/webhook behavior unless explicitly permitted.
- Existing redaction/hash/audit patterns should be reused, but centralized module-source policy is still required.
- The next implementation should start report-only and ratchet only new output surfaces first.

## Next Handoff

Return to `aqstoqflow-module-control-plane-orchestrator`.

Recommended next lane: `aqstoqflow-module-enforcement-pilot`.

Reason: after vocabulary, entitlements, package strategy, surface registry, guard contract, Workbench states, billing boundary, and leakage-prevention policy are specified, the next safe step is a bounded enforcement pilot plan for one low-risk/read-only surface with rollback evidence.
