# Kontava Moat Execution Skill Prompts

Date: 2026-06-19

Purpose: provide copy-ready prompts for the installed Kontava execution skills created from the Kontava Moat Foundation Execution Roadmap and the Kontava Cross-Boundary Innovation and Moat Proposal.

Installed skill location:

```text
C:\Users\J COMPUTER\.codex\skills
```

Staged repo copy:

```text
E:\ohada saas\newStockFlow\aqstoqflow\.codex-skill-staging
```

## Recommended Execution Order

1. `kontava-moat-execution-orchestrator`
2. `kontava-foundation-governance`
3. `kontava-evidence-proof-trail`
4. `kontava-snapshot-read-models`
5. `kontava-module-control-plane`
6. `kontava-business-signals-action-queue`
7. `kontava-security-redaction-guard`
8. `kontava-seed-backfill-release-gate`
9. `kontava-owner-war-room-mvp`

## Universal Safety Clause

Append this clause to any execution prompt when the work touches code:

```text
Before editing, inspect the existing system carefully. Keep changes surgical and aligned with current architecture. Do not break tenant isolation, RBAC, module entitlements, auditability, ledger-first accounting, OHADA compliance, reconciliation, POS, inventory, purchasing, payroll, finance, close assurance, existing user workflows, seed data, or current tests. Prefer server-side services and guards over client-side hiding. Verify with focused tests, typecheck, lint, and Prisma validation where relevant.
```

## 1. Orchestrator Prompt

Skill:

```text
kontava-moat-execution-orchestrator
```

Copy-ready prompt:

```text
Use the kontava-moat-execution-orchestrator skill to begin the Kontava moat foundation execution program.

Read the Kontava Moat Foundation Execution Roadmap, the Kontava Cross-Boundary Innovation and Moat Proposal, and the Kontava Technical Readiness Before Moat Execution report if available.

Determine the correct next execution phase, verify prerequisites, identify risks, define release gates, and recommend the next skill to run. Do not start advanced features such as AI Copilot, Partner Evidence API, full Business Evidence Graph, broad Compliance Readiness Radar, or hard module enforcement until the required foundations are complete.

Produce:
- Current execution status.
- Next safest skill.
- Preconditions.
- Files/areas to inspect.
- Release gates.
- Validation commands.
- Risks and rollback notes.
- Clear recommendation for the next implementation step.
```

## 2. Foundation Governance Prompt

Skill:

```text
kontava-foundation-governance
```

Copy-ready prompt:

```text
Use the kontava-foundation-governance skill to execute Phase 0 of the Kontava moat foundation roadmap.

Create the shared governance foundation required before implementation:
- Module vocabulary ADR.
- Canonical module slug list.
- Module ownership map for routes, sidebar links, services, server actions, reports, exports, background jobs, seed scenarios, and tests.
- Evidence-grade ADR defining Raw, Operational, Posted, Reconciled, Certified, and Blocked.
- Product language rules for trust labels.
- Proof-trail contract ADR.
- Module entitlement observe-mode ADR.
- Snapshot strategy ADR.
- Redaction and sensitive-data policy ADR.
- Release-gate checklist.

Do not add hard module enforcement. Do not rename existing routes or modules. Do not introduce schema changes unless required and explicitly justified.

Save the governance artifacts in an appropriate docs or what-next folder, and summarize the next safe implementation skill.
```

## 3. Evidence Proof Trail Prompt

Skill:

```text
kontava-evidence-proof-trail
```

Copy-ready prompt:

```text
Use the kontava-evidence-proof-trail skill to implement the first technical trust layer for Kontava.

Build or refine:
- Evidence-grade contracts.
- Evidence-grade service.
- Proof-trail service.
- Evidence blockers.
- Evidence redaction hooks.
- Guarded proof-trail server action or API.
- EvidenceGradeBadge component.
- ProofTrailDrawer component.

Start with the safest MVP subjects:
- journal.entry
- reconciliation.run
- close.run

Then identify the next expansion subjects:
- pos.sale
- payment.transaction
- purchase.order
- goods.receipt
- ledger.posting.batch
- fiscal.document

Every proof trail must be tenant-scoped, RBAC-guarded, conservative in evidence grade, redaction-aware, and server-controlled. Certified must only be used when explicit certification evidence exists.

Add or update tests for grade transitions, tenant isolation, RBAC denial, redaction, and direct action/API denial.
```

## 4. Snapshot Read Models Prompt

Skill:

```text
kontava-snapshot-read-models
```

Copy-ready prompt:

```text
Use the kontava-snapshot-read-models skill to design and implement the snapshot/read-model foundation for Kontava cross-module command centers.

Create stable service contracts for:
- TenantDailyOperatingSnapshot.
- BranchDailyOperatingSnapshot.
- PaymentTruthSnapshot.
- InventoryCashSnapshot.
- CloseReadinessSnapshot.
- SnapshotBuildRun.

Each snapshot result must include tenant scope, optional branch scope, period, status, freshness, evidence grade, source hash, generated time, source modules, metrics, blockers, redactions, and metadata.

Do not build broad dashboards from unbounded live joins. Do not hide stale, partial, blocked, or redacted data. Add nullable schema only if necessary and keep existing dashboards functional if snapshot generation fails.

Add tests for tenant isolation, stale/fresh/partial/blocked states, rebuild idempotency, source hash stability, and performance budget where practical.
```

## 5. Module Control Plane Prompt

Skill:

```text
kontava-module-control-plane
```

Copy-ready prompt:

```text
Use the kontava-module-control-plane skill to implement Kontava's module-oriented SaaS control plane safely.

Build the foundations for:
- Canonical module catalog.
- Module dependency map.
- Tenant module entitlements.
- Observe-mode entitlement service.
- Would-block decision logs.
- Route/action/API/report/export/job entitlement guards.
- Module Control Center for owners/admins.
- Controlled upgrade/request surfaces.

Keep observe mode first. Do not enable global hard enforcement. Preserve existing tenants by granting default legacy entitlements where needed.

Make clear that subscription entitlement does not grant RBAC permission, and RBAC permission does not grant subscription entitlement. Admin wildcard permissions must not bypass module entitlement, consent, fresh auth, maker-checker, or certification rules.

Add tests for direct URL bypass, server action/API bypass, export/report/job bypass, RBAC plus entitlement, wildcard denial, observe-mode logging, and legacy/default entitlement migration.
```

## 6. Business Signals Action Queue Prompt

Skill:

```text
kontava-business-signals-action-queue
```

Copy-ready prompt:

```text
Use the kontava-business-signals-action-queue skill to turn cross-module evidence into deduped, evidence-linked actions.

Build or refine:
- BusinessSignal contracts.
- BusinessSignal service.
- Business signal rules.
- ActionItem and ActionItemEvent workflow.
- Signal severity mapping.
- Dedupe keys.
- Signal expiry and stale state.
- Assignment and resolution audit.
- Permission-filtered action paths.
- Owner/accountant action queue UI.

Start with MVP signal types:
- Cash drawer variance.
- Open payment suspense.
- Duplicate provider reference.
- Refund or void spike.
- Stockout or low-stock risk.
- Dead-stock cash exposure.
- Purchase order receiving delay.
- Close blocker.

Do not build predictive fraud, staff risk scoring, AI commentary, or automated financial decisions yet. Avoid noisy alerts by requiring severity, dedupe, expiry, evidence grade, and an action path.

Add tests for dedupe, severity, expiry, assignment, audit, redaction, permission-filtered links, and tenant isolation.
```

## 7. Security Redaction Guard Prompt

Skill:

```text
kontava-security-redaction-guard
```

Copy-ready prompt:

```text
Use the kontava-security-redaction-guard skill to harden Kontava cross-module intelligence before broad dashboard, export, partner, or AI exposure.

Build or refine:
- Central redaction policy service.
- Export safety service.
- Composite moat guard service.
- Sensitive action extensions.
- Consent boundaries.
- Audit events for allow, deny, export, consent, and redaction decisions.

Composite guards must check session, tenant scope, module entitlement, RBAC permission, fresh auth when sensitive, maker-checker where required, consent where partner/export-related, redaction before returning JSON, and audit logging.

Protect sensitive data:
- Payroll person-level amounts.
- Supplier bank details.
- Payment provider references.
- Reconciliation suspense details.
- Close certification evidence.
- Partner/export data.

Do not rely on UI hiding for security. Do not allow wildcard permissions to bypass entitlements, consent, fresh auth, maker-checker, or certification.

Add tests for payroll redaction, supplier bank redaction, provider reference masking, export fresh-auth, wildcard denial, maker-checker separation, denied sensitive-action audit, and JSON redaction leakage.
```

## 8. Seed Backfill Release Gate Prompt

Skill:

```text
kontava-seed-backfill-release-gate
```

Copy-ready prompt:

```text
Use the kontava-seed-backfill-release-gate skill to create the demo, seed, migration, backfill, validation, rollback, and release-gate foundation for Kontava moat execution.

Create or extend seed scenarios for:
- Full evidence chain: sale to payment to ledger to reconciliation to close to trust pack.
- Cash leakage: drawer variance, duplicate provider reference, refund spike, open suspense.
- Inventory cash risk: dead stock, low stock, supplier obligation, reorder affordability.
- Payroll exposure: payroll approved or posted but unreconciled or unpaid.
- Accountant multi-client: accountant sees several tenants with trust grades and close blockers.
- Limited modules: POS plus inventory only, finance/payroll hidden.
- Suspended/read-only: allowed history visible, mutations denied.
- Partner consent: future lender/fintech export consent and revocation.

Build idempotent tenant-scoped backfills for evidence classification, source-link coverage, missing source links, failed business events, payment evidence gaps, close evidence coverage, and tenant-level data quality reports.

Do not reset or reseed production. Do not mark legacy unsupported data Certified by default. Add rollback notes for migrations and release gates for tenant isolation, RBAC, entitlements, evidence, redaction, snapshots, signals, exports, and existing regression tests.
```

## 9. Owner War Room MVP Prompt

Skill:

```text
kontava-owner-war-room-mvp
```

Copy-ready prompt:

```text
Use the kontava-owner-war-room-mvp skill to build the first safe, read-only, evidence-backed owner/admin command center for Kontava.

Only proceed broadly if these foundations exist or are explicitly mocked as contracts:
- Evidence-grade service.
- Proof-trail service or drawer contract.
- Snapshot/read-model contracts.
- Module entitlement observe mode.
- BusinessSignal/action queue MVP.
- Redaction policy.

Build MVP cards for:
- Cash at risk.
- Reconciliation exceptions.
- Stock cash exposure.
- Supplier commitments.
- Payroll exposure.
- Close readiness.
- Action queue.
- Module observe/upgrade prompt for owners/admins.

Integrate:
- Evidence-grade badges.
- Proof Trail drawer.
- Cash Leakage Radar MVP.
- Close Autopilot strip.
- Owner action cards.

Every card must support loading, empty, partial, stale, blocked, redacted, permission denied, module unavailable, upgrade/request, and safe error states.

Match existing dashboard color semantics and design tokens. Do not expose sensitive payroll, supplier bank, provider, close, or partner data without redaction. Do not create mutation actions unless their service guards already exist. Add English and French strings together.
```

## One-Shot Program Start Prompt

Use this when starting execution from zero:

```text
Use kontava-moat-execution-orchestrator to start the Kontava moat execution program. Read the Kontava Moat Foundation Execution Roadmap and the Kontava Cross-Boundary Innovation and Moat Proposal. Confirm the current repo baseline, then run the Phase 0 path by applying kontava-foundation-governance.

Produce the module vocabulary ADR, evidence-grade ADR, module ownership map, product language rules, proof-trail contract ADR, module entitlement observe-mode ADR, snapshot strategy ADR, redaction policy ADR, and release-gate checklist.

Do not add hard module enforcement, broad Owner War Room, AI copilot, Partner Evidence API, or full Business Evidence Graph yet. Keep changes surgical, document-first unless code is clearly required, and verify with git diff check, typecheck, and lint where relevant.
```

## First Code-Build Prompt

Use this after Phase 0 governance is complete:

```text
Use kontava-evidence-proof-trail to implement the first buildable foundation slice: evidence-grade service, proof-trail service, and guarded read-only proof-trail action for journal entries, reconciliation runs, and close runs.

Reuse existing accounting source links, ledger posting batches, reconciliation evidence, close evidence, business events, tenant scope guards, RBAC permissions, and audit patterns. Add conservative grade transitions and redaction hooks. Add focused tests for grade transitions, tenant isolation, RBAC denial, and redaction.

Do not persist EvidenceSnapshot tables unless the service contract requires it. Do not mark unsupported legacy records Certified.
```
