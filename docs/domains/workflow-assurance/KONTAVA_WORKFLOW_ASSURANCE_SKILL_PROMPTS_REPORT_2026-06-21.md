# Kontava Workflow Assurance Skill Prompts Report

Date: 2026-06-21
Companion report: `workflow efficiency/KONTAVA_WORKFLOW_ASSURANCE_PREREQUISITES_REPORT_2026-06-21.md`
Purpose: Identify the reusable Codex skills that should be extracted from the Workflow Assurance prerequisites report and provide refined skill-creation prompts for each one.

## Executive Summary

The Workflow Assurance prerequisites report should become a focused skill suite, not one oversized skill. The report spans architecture, schema, ledger/event invariants, evidence proof, domain checks, alerting, security, scheduling, UI, testing, and release gates. These are different execution modes with different risk profiles, so they should be packaged as composable skills.

Recommended structure:

1. `kontava-workflow-assurance-orchestrator`
2. `kontava-assurance-registry-foundation`
3. `kontava-assurance-incident-spine`
4. `kontava-ledger-event-assurance-checks`
5. `kontava-domain-assurance-pack`
6. `kontava-assurance-evidence-redaction`
7. `kontava-assurance-routing-control-tower`
8. `kontava-assurance-scheduler-release-gates`

This suite keeps the system enterprise-grade because each skill handles one repeatable class of work while preserving a shared doctrine: observe-mode first, tenant-scoped, ledger-aware, evidence-backed, redacted by default, action-linked, and test-gated before enforce mode.

## Skill Extraction Criteria

An aspect from the prerequisites report deserves a skill when it is:

- Repeatable across multiple workflow modules.
- Risky enough that future agents need guardrails.
- Dependent on repo-specific doctrine, naming, or architecture.
- Likely to require many file touches across schema, service, action, UI, tests, and reports.
- Important enough that inconsistent execution would damage trust in Kontava.

An aspect should remain a reference inside a skill when it is:

- A static checklist.
- A one-time decision already captured in an ADR.
- A domain-specific example that only supports a broader implementation pattern.

## Skill Suite Map

| Skill | Converts Report Sections | Primary Output | Priority |
| --- | --- | --- | --- |
| `kontava-workflow-assurance-orchestrator` | Executive Verdict, Installation Spine, Phased Roadmap | End-to-end sequencing and handoff plan | First |
| `kontava-assurance-registry-foundation` | P0, P2, Section 1, Phase 1 | Check registry, result contract, check-run model | First |
| `kontava-assurance-incident-spine` | P1, P4, P8, Section 2, Phase 2 | Incident, incident events, alerts, waivers, upsert service | First |
| `kontava-ledger-event-assurance-checks` | Section 3, Domain First Checks | Ledger, business event, source-link invariant checks | First |
| `kontava-domain-assurance-pack` | Section 5, Phase 3 | POS, payments, AP, inventory, payroll, compliance, close checks | Medium |
| `kontava-assurance-evidence-redaction` | Section 4, P3, P8 | Proof trail, evidence grade, source hash, redaction integration | Medium |
| `kontava-assurance-routing-control-tower` | Sections 6 and 9, Phase 4 | Manager Action Center, Control Tower, notification semantics | Medium |
| `kontava-assurance-scheduler-release-gates` | Sections 8 and 10, Phases 4-5 | Scheduler/read models, tests, performance, release gates | Strategic |

## Reuse Existing Skills

The new skills should compose with existing Kontava/AqStoqFlow skills rather than replacing them:

- `ledger-first-business-events` for event, outbox, idempotency, source evidence, and balanced ledger doctrine.
- `kontava-evidence-proof-trail` and `kontava-evidence-proof-hardener` for proof trail and evidence-grade behavior.
- `kontava-security-redaction-guard` for role-aware redaction.
- `kontava-business-signals-action-queue` and `kontava-manager-action-center-foundation` for action routing.
- `kontava-snapshot-read-models` for freshness/source-hash/read-model patterns.
- `kontava-dashboard-bi-ux-primitives` for dashboard semantic tokens and manager-ready surfaces.
- `kontava-release-observability-rollback` for production monitoring and rollback thinking.

The assurance suite should add the missing cross-module control plane: registry, check runs, incidents, waivers, incident timelines, alert delivery history, and release gates.

## Refined Master Prompt

Use this prompt when you want Codex to create and install the whole skill suite:

```text
Create a focused Kontava Workflow Assurance skill suite from `workflow efficiency/KONTAVA_WORKFLOW_ASSURANCE_PREREQUISITES_REPORT_2026-06-21.md`.

Do not make one oversized skill. Create composable skills that can be triggered independently and orchestrated together. Each skill must preserve Kontava doctrine: tenant-scoped, ledger-aware, evidence-backed, server-controlled, redacted by default, observe-mode before enforce-mode, and action-linked to Manager Action Center or Control Tower.

For each skill:
1. Use a short hyphen-case name under 64 characters.
2. Write a precise frontmatter description that explains when Codex should use it.
3. Keep `SKILL.md` concise and put detailed schemas/checklists in `references/` when needed.
4. Include explicit discovery steps, implementation workflow, guardrails, verification, and final deliverables.
5. Require focused tests or release gates whenever code is changed.
6. Preserve existing services, data sources, RBAC, evidence grades, dashboard tokens, and ledger/event doctrine.
7. Do not install enforce-mode behavior until check runs, incident storage, proof trails, redaction, alert dedupe, Manager Action Center routing, and false-positive/false-negative tests are in place.

Produce a saved implementation report listing the skills created, why each exists, files created, validation performed, and any deferred references or scripts.
```

## Skill 1: Workflow Assurance Orchestrator

Recommended name: `kontava-workflow-assurance-orchestrator`

Transforms:
- Executive Verdict
- Installation Spine
- Prerequisite Matrix
- Phased Roadmap
- Do Not Install In Enforce Mode Until

Why it should be a skill:
This is the control skill that decides sequence, scope, and stop conditions. Without it, future work may jump straight to dashboards or domain checks before the registry, incident spine, and proof model exist.

Refined skill-creation prompt:

```text
Create and install a Codex skill named `kontava-workflow-assurance-orchestrator`.

Purpose:
Use this skill when planning, sequencing, or executing the Kontava Workflow Assurance Engine across architecture, schema, services, UI, tests, and release gates.

The skill must turn a broad Workflow Assurance request into a safe phase plan:
1. Read the current repo context and the saved prerequisites report.
2. Identify whether the requested work belongs to registry, incident spine, ledger/event checks, domain checks, evidence/redaction, routing/UI, scheduler/read models, or release gates.
3. Refuse to skip foundational prerequisites when enforce-mode, blocking incidents, or manager-facing claims depend on missing persistence/proof.
4. Prefer observe-mode before enforce-mode.
5. Preserve domain services as the source of truth.
6. Route outputs into existing Manager Action Center, Owner War Room, evidence, snapshot, and BI contracts where applicable.

Required operating doctrine:
- Tenant scope every read and write.
- Use existing services and data sources before inventing new ones.
- Every assurance claim must connect to source document, business event, ledger posting, proof trail, snapshot, or visible blocker.
- Engine failure must create visible assurance-health risk, never a false "all clear".
- Do not modify application code when the user only asks for an analysis/report.

Expected workflow:
1. Discover existing anchors: Prisma models, services, actions, tests, dashboard tokens, proof trail, snapshots, signals, manager action center, and release gates.
2. Classify requested work by phase.
3. Produce a short plan with dependencies and verification.
4. Execute only the scoped phase.
5. Verify with focused tests, typecheck, diff checks, and saved report when required.

Deliverables:
- Phase classification.
- Dependency checklist.
- Implementation or report artifact.
- Verification summary.
- Explicit list of deferred phases.
```

Recommended references:
- `references/prerequisite-matrix.md`
- `references/enforce-mode-gates.md`
- `references/phase-roadmap.md`

## Skill 2: Assurance Registry Foundation

Recommended name: `kontava-assurance-registry-foundation`

Transforms:
- P0 canonical vocabulary and rule registry
- P2 check run and result persistence
- Section 1 Workflow Assurance Architecture
- Phase 1 Minimum Viable Assurance Engine

Why it should be a skill:
The registry and result contract are the root of the system. Future checks must not be scattered across dashboards or domain services without a common key, owner, execution mode, severity, source scope, action route, and test plan.

Refined skill-creation prompt:

```text
Create and install a Codex skill named `kontava-assurance-registry-foundation`.

Purpose:
Use this skill when adding or repairing the Kontava Workflow Assurance check registry, deterministic result contract, check definitions, check-run persistence, observe-mode execution, or manual assurance-run server actions.

Core responsibilities:
1. Define or update canonical assurance vocabulary.
2. Add or repair check definition contracts with check key, version, workflow, module slug, invariant, owner role, severity, execution mode, required permission, source tables, and action route.
3. Add or repair deterministic result types: passed, warning, failed, blocked, skipped, error.
4. Add or repair check-run persistence and source-hash recording.
5. Keep the first implementation observe-mode unless all enforce-mode gates are satisfied.

Discovery steps:
- Inspect Prisma schema for existing assurance, business event, ledger, close, payment, and audit models.
- Inspect `services/events`, `services/snapshots`, `services/signals`, `services/evidence`, `actions/snapshots`, and manager action center actions.
- Search for existing check/run/release gate naming before adding new names.

Implementation guardrails:
- Do not create domain truth inside assurance models.
- Do not let UI submit evidence grade, source hash, or check result.
- Every check result must be deterministic and idempotent for the same source hash.
- Every check must have an owner role and action route before it can become manager-facing.
- Engine execution errors must be stored separately from failed business invariants.

Verification:
- Unit tests for check result normalization.
- Service tests for check-run persistence.
- Idempotency tests for repeated runs.
- Typecheck and focused lint.
- A report explaining which checks are observe-mode and which prerequisites block enforce mode.

Deliverables:
- Registry contract.
- Check-run service.
- Initial check definitions.
- Manual run action if in scope.
- Verification evidence.
```

Recommended references:
- `references/result-contract.md`
- `references/check-definition-fields.md`
- `references/observe-vs-enforce.md`

## Skill 3: Assurance Incident Spine

Recommended name: `kontava-assurance-incident-spine`

Transforms:
- P1 durable incident/anomaly model
- P4 alert routing and escalation model
- P8 security, RBAC, fresh-auth, redaction, waiver controls
- Section 2 Data Model Foundations
- Phase 2 Incident Model, Alert Routing, and Manager Action Center Integration

Why it should be a skill:
This is the durable control-history layer. It is too important to rebuild inconsistently each time because it governs dedupe, reopen, resolution, waiver, escalation, alert delivery, and audit history.

Refined skill-creation prompt:

```text
Create and install a Codex skill named `kontava-assurance-incident-spine`.

Purpose:
Use this skill when implementing or reviewing Workflow Assurance incidents, incident events, alert delivery history, waivers, assignment, resolution, suppression, reopen rules, and incident upsert/dedupe services.

Core responsibilities:
1. Add or repair durable tenant-scoped incident models.
2. Add incident event history for assignment, acknowledgement, status changes, resolution, waiver, suppression, reopen, and escalation.
3. Add alert delivery history for in-app and future channels.
4. Add waiver model with reason, expiry, requester, approver, status, and evidence hash.
5. Implement incident upsert using organizationId + checkId + sourceType + sourceId + fingerprint.
6. Reopen resolved incidents when the same invariant fails against a newer source hash.

Security rules:
- All reads and writes must use server-side tenant scope.
- Waiving blocking or compliance-critical incidents requires fresh auth.
- Waiver approval requires maker-checker for sensitive workflows.
- The actor who caused a sensitive incident cannot approve their own waiver.
- Admin/support roles cannot bypass redaction or module entitlements.

Implementation guardrails:
- Do not create duplicate incidents for unchanged source state.
- Do not delete incident history.
- Do not expose sensitive payloads in notifications, list rows, or support views.
- Do not mark an incident resolved without reason and evidence.
- Do not make UI the authority for status transitions.

Verification:
- Service tests for create, dedupe, reopen, resolve, waive, suppress, and assign.
- RBAC tests for tenant isolation and permission filtering.
- Fresh-auth tests for high-risk waiver and suppression.
- Redaction tests for payroll, supplier bank, provider, and compliance payloads.

Deliverables:
- Prisma models or migration plan.
- Server-only incident service.
- Guarded server actions.
- Focused tests.
- Saved implementation report.
```

Recommended references:
- `references/incident-state-machine.md`
- `references/waiver-maker-checker.md`
- `references/incident-dedupe-reopen.md`

## Skill 4: Ledger And Event Assurance Checks

Recommended name: `kontava-ledger-event-assurance-checks`

Transforms:
- Section 3 Business Event and Ledger Foundations
- Domain First Checks:
  - `ledger.posted_source_link.required`
  - `business_event.applied_or_visible`
- OHADA ledger assurance doctrine implied by the report

Why it should be a skill:
Ledger/event invariants are the most important trust checks. They determine whether BI, close, compliance, and manager decisions can be treated as source-backed rather than decorative.

Refined skill-creation prompt:

```text
Create and install a Codex skill named `kontava-ledger-event-assurance-checks`.

Purpose:
Use this skill when implementing, reviewing, or expanding Workflow Assurance checks over business events, outbox messages, ledger posting batches, journal entries, source links, period guards, source document hashes, and OHADA/SYSCOHADA ledger trust.

Core checks:
1. Business event recorded but not applied beyond SLA.
2. Business event applied but expected posting batch missing.
3. Outbox message stuck, failed, or invisible beyond SLA.
4. Posting batch posted but journal entry missing.
5. Posted journal entry missing accounting source link.
6. Journal entry not balanced.
7. Final source document missing document hash.
8. Posting attempted into locked/closed period.
9. Failed posting batch lacks manager-visible incident.
10. Financial BI snapshot must downgrade to blocked when ledger checks fail.

Discovery steps:
- Inspect `BusinessEvent`, `BusinessEventOutbox`, `LedgerPostingBatch`, `JournalEntry`, `JournalEntryLine`, `AccountingSourceLink`, fiscal document models, close models, and reconciliation services.
- Read existing business event service tests before adding new behavior.
- Find current source-link and posting services before creating new helpers.

Implementation guardrails:
- Do not infer ledger truth from operational tables alone.
- Do not certify a number without source document, business event, posting, reconciliation, or blocker.
- Use integer money and existing ledger helpers.
- Keep checks deterministic by source hash and period scope.

Verification:
- Clean seeded data creates no critical ledger incidents.
- Seeded orphan journal, missing source link, unbalanced journal, stuck outbox, and closed-period posting attempts create expected incidents.
- Focused tests prove BI trust downgrade when ledger checks fail.

Deliverables:
- Ledger/event check modules.
- Tests with clean and broken fixtures.
- Incident mappings and action routes.
- Verification summary.
```

Recommended references:
- `references/ledger-event-invariants.md`
- `references/ohada-ledger-trust.md`
- `references/seeded-broken-fixtures.md`

## Skill 5: Domain Assurance Pack

Recommended name: `kontava-domain-assurance-pack`

Transforms:
- Section 5 Workflow Coverage Prerequisites
- Phase 3 Domain-Specific Invariant Checks
- Domain First Checks for POS, payments, AP, inventory, payroll, compliance, close

Why it should be a skill:
The domain checks are numerous and easy to implement unevenly. This skill forces each workflow to have at least one quick-win check, one blocking invariant, one pre-close or trust gate, an owner role, and a direct action route.

Refined skill-creation prompt:

```text
Create and install a Codex skill named `kontava-domain-assurance-pack`.

Purpose:
Use this skill when building or auditing domain-specific Workflow Assurance checks for POS, offline POS replay, payment reconciliation, purchasing/AP, supplier bank/payment risk, inventory count/write-off/class 3, payroll, fiscal compliance, close assurance, and accounting gateway workflows.

Required domain coverage:
1. POS sale/payment/receipt/stock/ledger.
2. Offline POS replay and conflict handling.
3. Payment reconciliation, suspense, provider events, signed runs, and exceptions.
4. Purchasing/AP approvals, receipts, invoices, duplicate risk, 3-way match, and AP posting.
5. Supplier bank changes and payment release controls.
6. Inventory counts, write-offs, adjustments, valuation, projection drift, and class 3 reconciliation.
7. Payroll attendance freeze, run posting, payslips, payment release, and declarations.
8. Fiscal document generation, submission, retries, rejections, and evidence.
9. Close assurance findings, stale evidence, pack export, and certification.
10. Accounting gateway balanced journals, source links, period guards, and posting batch state.

For each workflow:
- Identify existing models, services, actions, routes, permissions, tests, and proof subjects.
- Add one quick-win check.
- Add one blocking invariant.
- Add one pre-close or trust-gating check where relevant.
- Define owner role, severity, action route, source hash, evidence grade, and incident fingerprint.

Guardrails:
- Do not duplicate domain services.
- Do not bypass existing approval, posting, reconciliation, payroll, fiscal, or close controls.
- Do not show sensitive payroll, supplier bank, provider account, or raw authority payloads without redaction.
- Prefer scheduled/after-commit checks unless a synchronous guard is needed to prevent unsafe mutation.

Verification:
- Each domain has clean-data and broken-data tests.
- Every check has an owner role, permission, action route, and proof/source link.
- Focused tests prove false positives do not fire for legitimate in-progress states.
- Focused tests prove false negatives do fire for seeded broken invariants.

Deliverables:
- Domain check modules.
- Incident mapping table.
- Tests and fixture notes.
- Report identifying remaining uncovered workflows.
```

Recommended references:
- `references/domain-check-catalog.md`
- `references/workflow-action-routes.md`
- `references/false-positive-states.md`

## Skill 6: Assurance Evidence And Redaction

Recommended name: `kontava-assurance-evidence-redaction`

Transforms:
- P3 evidence-link normalization
- Section 4 Evidence and Proof Foundations
- P8 redaction portions
- UI proof-trail requirements

Why it should be a skill:
Assurance incidents only become enterprise-grade when managers can see why a claim is blocked without exposing sensitive data. This skill keeps proof, evidence grade, source hash, and redaction behavior consistent.

Refined skill-creation prompt:

```text
Create and install a Codex skill named `kontava-assurance-evidence-redaction`.

Purpose:
Use this skill when integrating Workflow Assurance incidents with evidence grades, proof trails, source hashes, source documents, BI trust state, redaction rules, sensitive payload handling, and proof drawer drill-through.

Core responsibilities:
1. Add or map assurance incidents to proof-trail subjects.
2. Ensure every incident carries server-computed evidence grade.
3. Ensure every incident carries source hash or documented reason why not.
4. Add proof links to source workflow, document, journal, payment, suspense, close finding, fiscal submission, stock adjustment, or snapshot blocker.
5. Apply redaction before data reaches UI, notifications, support views, exports, or BI adapters.
6. Reopen or downgrade incidents when evidence becomes stale.

Evidence-grade rules:
- `blocked` when an incident invalidates trust.
- `operational` for non-financial workflow warnings.
- `posted`, `reconciled`, or `certified` only when server-side proof supports that state.
- Never accept evidence grade from the client.

Sensitive data:
- Payroll destination data.
- Supplier bank details.
- Payment provider account identifiers.
- Raw fiscal authority payloads.
- Raw audit metadata that could leak security context.

Verification:
- Tests prove unauthorized roles see redacted incident details.
- Tests prove support/admin cannot bypass redaction through broad permissions.
- Tests prove proof trail opens from incident detail and source workflow.
- Tests prove stale source hash reopens or downgrades trust.

Deliverables:
- Evidence mapping service or adapter.
- Redaction policy integration.
- Proof trail UI integration notes.
- Tests and report.
```

Recommended references:
- `references/evidence-grade-mapping.md`
- `references/redaction-matrix.md`
- `references/proof-subjects.md`

## Skill 7: Routing And Control Tower

Recommended name: `kontava-assurance-routing-control-tower`

Transforms:
- Section 6 Alerting and Notification Foundations
- Section 9 UI and Workflow Prerequisites
- Phase 4 Control Tower and Evidence-Grade BI
- Dashboard color semantics requirements

Why it should be a skill:
This skill turns incidents into manager action. It prevents the system from becoming a passive anomaly database by enforcing action links, alert dedupe, role routing, dashboard semantic tokens, and drill-through.

Refined skill-creation prompt:

```text
Create and install a Codex skill named `kontava-assurance-routing-control-tower`.

Purpose:
Use this skill when building or modernizing Workflow Assurance alert routing, notification semantics, Manager Action Center integration, Control Tower pages, incident detail pages, proof drawer links, and dashboard-token UI surfaces.

Core responsibilities:
1. Route incidents by severity, workflow, owner role, due state, and permission.
2. Dedupe alerts by incident fingerprint and source hash.
3. Record alert delivery status and acknowledgement.
4. Add Manager Action Center adapter for assurance incidents.
5. Build Control Tower summary and incident list from read models.
6. Build incident detail with timeline, proof link, source workflow, evidence grade, affected BI/close/compliance claim, assignment, resolution, waiver, and reopen history.
7. Use dashboard semantic tokens for all notification, dialog, badge, row, and button states.

Color semantics:
- success/resolved = `--dash-success`
- warning/aging = `--dash-warning` or `--dash-gold`
- danger/blocking/compliance-critical = `--dash-danger`
- info/queued/monitoring = `--dash-info`
- primary proof/action = `--dash-brand`
- cash/payment positive tone = `--dash-spruce`

Guardrails:
- Do not show incidents without action routes.
- Do not notify users who lack permission to open the incident.
- Do not leak sensitive details in notification text.
- Do not create decorative dashboards without proof and workflow drill-through.
- Control Tower must not scan all raw incidents synchronously for summary cards once read models exist.

Verification:
- UI tests or component checks for severity-token mapping.
- Service tests for notification dedupe and role routing.
- RBAC tests for incident visibility.
- Manual route smoke check when dev server is available.

Deliverables:
- Manager Action Center adapter.
- Control Tower route/page/components.
- Incident detail route/page/components.
- Notification/dialog color semantic mapping.
- Verification report.
```

Recommended references:
- `references/manager-action-routing.md`
- `references/control-tower-ui-contract.md`
- `references/dashboard-token-semantics.md`

## Skill 8: Scheduler, Performance, And Release Gates

Recommended name: `kontava-assurance-scheduler-release-gates`

Transforms:
- P6 scheduler/worker and event-driven validators
- P9 performance/index/read-model plan
- P10 test/release gates
- Section 8 Performance and Scalability Prerequisites
- Section 10 Testing and Release Prerequisites
- Phase 5 Advanced Anomaly Detection, Fraud Signals, and Enterprise Self-Verification

Why it should be a skill:
Assurance becomes dangerous if checks are slow, stale, noisy, or untested. This skill enforces incremental scanning, health incidents, read models, false-positive/false-negative fixtures, and release gates.

Refined skill-creation prompt:

```text
Create and install a Codex skill named `kontava-assurance-scheduler-release-gates`.

Purpose:
Use this skill when adding Workflow Assurance schedulers, workers, after-commit validators, incremental cursors, performance indexes, Control Tower read models, engine health checks, false-positive/false-negative tests, and release gates.

Core responsibilities:
1. Classify checks as synchronous guard, after-commit validator, scheduled scan, pre-close gate, or snapshot/BI generation guard.
2. Add incremental cursor strategy using source updatedAt, event id, source hash, period, tenant, and check definition.
3. Add indexes required for incident lists, owner queues, source lookups, check runs, and Control Tower summaries.
4. Add read models for Control Tower summary and manager queues.
5. Create engine health checks for stale runs, failed checks, scheduler failures, and notification delivery failures.
6. Create release gates that block enforce-mode if check definitions lack owner, severity, execution mode, action route, tests, or proof link.

Testing requirements:
- Unit tests for each check function.
- Service tests for incident upsert, dedupe, reopen, resolve, waive, and suppress.
- Integration tests for after-commit validators.
- Scheduler tests for incremental cursor behavior.
- RBAC tests for tenant isolation and permission filtering.
- Redaction tests for sensitive workflows.
- Notification tests for severity mapping and delivery dedupe.
- False-positive tests with legitimate in-progress states.
- False-negative tests with seeded broken invariants.
- Performance tests for large tenant scans.

Guardrails:
- Do not run broad full-table scans on hot paths.
- Do not treat scheduler failure as clean status.
- Do not enable enforce mode until release gates pass.
- Do not add release gates that cannot explain how to fix failures.

Deliverables:
- Scheduler/worker or integration plan.
- Index/read-model changes when in scope.
- Engine health checks.
- Focused test suite.
- Release gate script/check.
- Performance and verification report.
```

Recommended references:
- `references/scheduler-modes.md`
- `references/read-model-index-plan.md`
- `references/release-gate-checklist.md`

## Skills Not Recommended As Separate Initial Skills

The following aspects matter, but should not become separate skills yet:

| Aspect | Reason To Defer Or Merge |
| --- | --- |
| Fraud signal scoring | Better as an advanced reference under scheduler/release gates until core incidents are durable. |
| Support/accountant reconstruction pack | Better after incident events, proof trails, and export policies exist. |
| BI snapshot gating | Should compose with evidence/redaction and scheduler skills; avoid duplicating existing BI/snapshot skills. |
| Notification color semantics alone | Too narrow as a skill; keep inside routing/control tower and dashboard UX skills. |
| Individual domain mini-skills per workflow | Too fragmented at first; build the domain assurance pack, then split only if one workflow becomes large. |

## Suggested Installation Order

1. Install `kontava-workflow-assurance-orchestrator`.
2. Install `kontava-assurance-registry-foundation`.
3. Install `kontava-assurance-incident-spine`.
4. Install `kontava-ledger-event-assurance-checks`.
5. Install `kontava-assurance-evidence-redaction`.
6. Install `kontava-assurance-routing-control-tower`.
7. Install `kontava-domain-assurance-pack`.
8. Install `kontava-assurance-scheduler-release-gates`.

Rationale:
- Registry and incident spine come before domain checks.
- Ledger/event checks are the safest first checks because they protect trust.
- Evidence/redaction must exist before broad manager-facing incident surfaces.
- Routing/control tower can start once incidents are durable.
- Domain pack expands coverage.
- Scheduler/release gates harden scale and enforce-mode readiness.

## Acceptance Criteria For The Skill Suite

The suite is ready when:

- Each skill has clear trigger metadata.
- Each skill is concise enough for progressive disclosure.
- Shared reference files hold schemas, state machines, check catalogs, route maps, and release gates.
- Each implementation skill tells Codex what to inspect before editing.
- Each implementation skill preserves existing services and data sources.
- Each implementation skill requires focused verification.
- The orchestrator blocks unsafe sequencing.
- The suite can produce code, tests, or reports depending on the user's scope.

## Final Recommendation

Convert the report into an orchestrated eight-skill suite. The suite should make Kontava's Workflow Assurance Engine repeatable, auditable, and hard to accidentally dilute. It should teach future Codex runs to build the engine as a ledger-backed control plane, not as a dashboard layer.

The next practical step is to install the orchestrator and the two foundation skills first:

1. `kontava-workflow-assurance-orchestrator`
2. `kontava-assurance-registry-foundation`
3. `kontava-assurance-incident-spine`

Those three skills create the safe runway for all later workflow checks, Control Tower UI, and enforce-mode release gates.
