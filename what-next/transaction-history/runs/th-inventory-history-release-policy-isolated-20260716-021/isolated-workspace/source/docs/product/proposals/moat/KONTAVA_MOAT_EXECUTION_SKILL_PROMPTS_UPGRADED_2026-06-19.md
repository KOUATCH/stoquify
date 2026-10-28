# Kontava Moat Execution Skill Prompts - Upgraded Pack

Date: 2026-06-19

Source document:

```text
moat proposals/KONTAVA_MOAT_EXECUTION_SKILL_PROMPTS_2026-06-19.md
```

Supporting blueprint:

```text
moat proposals/KONTAVA_MOAT_EXECUTION_SKILL_BLUEPRINT_2026-06-19.md
```

Purpose: strengthen the Kontava execution prompts so each skill can drive serious product, technical, architectural, UX, security, data, testing, rollout, and business work. The upgraded prompts are designed to help Kontava become an indispensable, evidence-backed, ledger-first, module-oriented OHADA SMB operating system that users recommend organically because it protects cash, explains proof, reduces chaos, improves close readiness, and gives owners one operating truth.

## Executive Summary

The existing prompt pack correctly identifies the nine execution skills and their order, but most prompts are too light for the ambition. They list outputs, but they do not consistently force:

- Deep inspection before modification.
- Stakeholder transformation.
- Cross-module business value.
- Strong UX expectations.
- Data-quality contracts.
- Security and compliance guardrails.
- Route/action/API/export/job protection.
- Migration and rollback discipline.
- Release gates that prove enterprise-grade readiness.
- Referral and adoption outcomes.

The upgraded prompts below convert each skill prompt from a task reminder into a complete execution brief. They still remain executable: each prompt tells Codex what to inspect, what to build, what to avoid, how to verify, and how to know the work actually moved Kontava toward a defensible operating-system moat.

## Prompt Suite Critique

### What Is Missing

The current pack needs stronger detail in these areas:

- Stakeholder value: owners, accountants, managers, stockkeepers, finance teams, payroll teams, staff, advisors, and partners need explicit value outcomes.
- Business transformation: each skill should explain how the work improves trust, retention, willingness to pay, daily usage, and referrals.
- Engineering specificity: prompts should name services, schemas, guards, actions, hooks, reports, jobs, tests, and release surfaces.
- UX completeness: prompts should require loading, empty, stale, partial, blocked, redacted, module-unavailable, permission-denied, and upgrade states.
- Data contracts: prompts should require evidence grade, freshness, source modules, blockers, redactions, source hash, and next action where relevant.
- Security controls: prompts should explicitly combine tenant scope, RBAC, module entitlements, redaction, fresh auth, maker-checker, consent, export safety, and audit trails.
- Rollback: prompts should require feature flags, nullable schemas, observe mode, fallback behavior, and no destructive production reset.
- Organic growth: prompts should require each feature to explain why users would recommend Kontava to peers.

### Which Prompts Were Too Shallow

All nine prompts were directionally correct, but the thinnest were:

- `kontava-moat-execution-orchestrator`: needed stronger program governance and "stop conditions".
- `kontava-foundation-governance`: needed stronger product language, stakeholder acceptance, and inventory discipline.
- `kontava-business-signals-action-queue`: needed stronger alert-quality, adoption, and actionability rules.
- `kontava-owner-war-room-mvp`: needed stronger business transformation, command-center UX, and referral logic.

### Stronger Execution Philosophy

The upgraded pack uses this principle:

```text
Every implementation slice must either increase trust, reduce leakage, improve close readiness, protect sensitive data, simplify owner decisions, improve accountant adoption, or make the module operating system easier to buy and expand.
```

If a slice does not do one of those things, it should be delayed or reframed.

## Refined Master Execution Prompt

```text
Use the Kontava moat execution skill suite to transform Kontava into a world-class, enterprise-grade, secure, modern, robust, ledger-first, evidence-backed, module-oriented OHADA SMB operating system.

Primary objective:
Build the foundation that makes Kontava indispensable to SMB owners, accountants, finance teams, cashiers, stockkeepers, purchasing teams, payroll teams, partners, and advisors. The system should help users trust business facts, detect leakage, understand cash and stock pressure, prepare close and compliance evidence, protect sensitive data, and act from one connected operating truth.

Before editing:
- Read the Kontava Moat Execution Skill Prompts, the Kontava Moat Execution Skill Blueprint, the Kontava Moat Foundation Execution Roadmap, and the Kontava Cross-Boundary Innovation and Moat Proposal when available.
- Inspect the current codebase with rg before proposing or editing.
- Identify existing services, actions, hooks, schemas, permissions, tests, dashboard patterns, seed scenarios, and release gates that can be reused.
- Name what already exists, what must be extended, what must be created, and what must wait.

Execution rules:
- Keep changes surgical and compatible with the existing system.
- Preserve tenant isolation, RBAC, ledger-first accounting, OHADA compliance, auditability, reconciliation, close assurance, POS, inventory, purchasing, payroll, finance, and existing user workflows.
- Prefer server-side services, actions, guards, and read models over client-side hiding.
- Treat module entitlements and RBAC as separate requirements.
- Treat evidence grades conservatively. Never call data Certified without explicit certification evidence.
- Keep module entitlement enforcement in observe mode until would-block reports and migration validation are clean.
- Add or update English and French strings together for user-facing UI.
- Never expose payroll, supplier bank, payment provider, close certification, partner, export, or sensitive proof data without redaction and permission checks.

For each skill:
- State the stakeholder value.
- State the technical scope.
- State the UX surface and states.
- State the security and compliance controls.
- State the data contracts.
- Implement or plan in the smallest safe slice.
- Add tests matching the risk.
- Run focused validation.
- Provide rollback notes.
- Explain the moat/referral impact.

Final output required:
- Work completed.
- Files changed.
- Validation commands and results.
- Release gates passed or remaining.
- Risks and rollback.
- Next recommended skill.
```

## Skill 1: `kontava-moat-execution-orchestrator`

### Upgraded Prompt

```text
Use the kontava-moat-execution-orchestrator skill to govern the full Kontava moat execution program.

Mission:
Turn the roadmap into a disciplined execution system that prevents premature feature building, protects existing workflows, and ensures every phase moves Kontava closer to becoming an indispensable SMB operating system.

Business transformation:
Kontava should stop behaving like a collection of modules and start behaving like a trusted operating spine. This skill must make sure the team builds in the right order: proof before dashboards, snapshots before war rooms, observe mode before enforcement, redaction before broad intelligence, seed/backfill before production rollout, and actionability before automation.

Stakeholder value:
- Owners get safer, more useful features instead of fragile dashboards.
- Accountants get source-linked, close-ready, reviewable evidence.
- Staff get workflows that do not break unexpectedly.
- Finance teams get reliable cash, payment, AP, payroll, and close foundations.
- Partners eventually get consented, evidence-backed data only after controls are safe.
- The business gets a product path that increases trust, pricing power, retention, and referrals.

Inspect first:
- Read the moat roadmap, cross-boundary innovation report, technical readiness report, skill blueprint, and current skill prompt pack.
- Inspect current git status.
- Inspect existing module, RBAC, service, action, dashboard, seed, and test architecture.
- Identify whether the current request belongs to governance, evidence, snapshots, module control, signals, redaction, seed/release, or Owner War Room.

Execution workflow:
1. Determine the current execution phase.
2. Confirm prerequisites.
3. Identify the next safest skill.
4. Define the exact implementation slice.
5. Define files and layers to inspect.
6. Define what must not be touched.
7. Define validation commands.
8. Define release gates.
9. Define rollback path.
10. Stop any work that attempts advanced features before foundations are ready.

Stop conditions:
- Stop AI, partner API, full Business Evidence Graph, hard module enforcement, or broad Compliance Readiness Radar if evidence, redaction, entitlements, and seed validation are incomplete.
- Stop any task that relies only on sidebar hiding for module control.
- Stop any dashboard that reads sensitive data without server-side redaction.
- Stop any implementation that marks old or unsupported data as Certified.

Completion criteria:
- The next skill is unambiguous.
- Preconditions are known.
- The implementation slice is small enough to verify.
- Validation and rollback are defined.
- The work protects existing workflows while increasing Kontava's moat.

Moat/referral impact:
This orchestration prevents chaotic execution. A stable, reliable, proof-first product earns trust; trust is the source of accountant adoption, owner retention, and organic peer recommendation.
```

## Skill 2: `kontava-foundation-governance`

### Upgraded Prompt

```text
Use the kontava-foundation-governance skill to execute Phase 0: the shared language, ownership, and delivery governance for the Kontava moat foundation.

Mission:
Create the decision framework that every future technical and product feature must obey. The goal is to remove ambiguity before implementation begins.

Business transformation:
SMBs trust software when the product uses clear language and behaves consistently. Governance must make Kontava speak in terms owners and accountants understand: cash at risk, proof trail, evidence grade, reconciliation readiness, close blocker, module access, and next action.

Stakeholder value:
- Owners understand what is trusted, risky, blocked, or actionable.
- Accountants understand what is raw, posted, reconciled, certified, or blocked.
- Staff understand what they can access and what requires another role.
- Engineering knows which module owns each route, action, service, report, export, job, and seed.
- Sales can explain Kontava as a proof-backed operating system, not a module pile.

Inspect first:
- `config/sidebar.ts`
- `config/permissions.ts`
- `lib/security/rbac.ts`
- `lib/security/rbac-permissions.ts`
- `services/_shared/protect.ts`
- `services`
- `actions`
- `app/[locale]/(dashboard)/dashboard`
- `prisma/schema.prisma`
- `messages/en.json`
- `messages/fr.json`
- Existing moat reports and roadmap docs.

Build governance artifacts:
- Module vocabulary ADR.
- Canonical module slug registry.
- Module dependency map.
- Route ownership map.
- Server action ownership map.
- Service ownership map.
- Report/export/job ownership map.
- Seed scenario ownership map.
- Evidence-grade ADR.
- Product language rules.
- Proof-trail contract ADR.
- Snapshot strategy ADR.
- Module entitlement observe-mode ADR.
- Redaction and sensitive-data ADR.
- Release-gate checklist.

Required module slugs:
- pos
- inventory
- purchasing
- accounting
- finance
- payments
- reconciliation
- payroll
- compliance
- close
- analytics
- controls
- partners

Evidence language:
- Raw means captured but not operationally confirmed.
- Operational means completed in its source module.
- Posted means linked to ledger posting.
- Reconciled means backed by reconciliation evidence.
- Certified means explicitly signed, exported, closed, or certified by a server-side workflow.
- Blocked means contradictions, missing links, failed events, open suspense, failed close checks, or unresolved blockers exist.

UX and product language requirements:
- Every trust-sensitive UI must use text labels, not color only.
- Every blocked or redacted state must explain what is missing and what role/action is needed.
- Every module unavailable state must be calm, professional, and upgrade-aware for owners/admins only.

Security and compliance rules:
- Permission is user-level.
- Entitlement is tenant-level.
- Certification is workflow-level.
- Audit is evidence-level.
- Wildcard permission must not bypass entitlement, consent, fresh auth, maker-checker, or certification rules.

Must not break:
- Existing navigation.
- Existing permissions.
- Existing tenant flows.
- Existing registration and requested module data.
- Existing accounting/reconciliation/close vocabulary unless mapped clearly.

Validation:
- `git diff --check`
- `npm run typecheck` if TypeScript/docs imports changed.
- `npm run lint` if code/config changed.

Completion criteria:
- Every module has a definition, owner, dependencies, and route/action/service/report/job mapping.
- Evidence grades have allowed and forbidden usage.
- Release gates are specific enough for later skills.
- Product, engineering, security, QA, and design could all work from the same document.

Moat/referral impact:
Consistent language creates confidence. When owners and accountants can explain Kontava's proof language to peers, the product becomes easier to trust, sell, and recommend.
```

## Skill 3: `kontava-evidence-proof-trail`

### Upgraded Prompt

```text
Use the kontava-evidence-proof-trail skill to build Kontava's first technical trust layer.

Mission:
Make every important business fact explainable. A user should be able to ask: where did this number come from, who touched it, is it posted, is it reconciled, is it certified, and what blocks trust?

Business transformation:
Most SMB software records events. Kontava must prove events. Proof trails turn ordinary records into accountant-ready, owner-trusted, partner-defensible evidence.

Stakeholder value:
- Owners see why a sale, payment, stock movement, supplier bill, payroll run, or close blocker is trustworthy or risky.
- Accountants reduce cleanup because source links, ledger entries, reconciliation evidence, and close evidence are visible.
- Finance teams can trace payment truth and suspense.
- Staff are protected by a clear record of what happened.
- Partners eventually receive permissioned proof packs instead of self-reported claims.

Inspect first:
- `services/accounting/source-link.service.ts`
- `services/accounting/data-trust.service.ts`
- `services/events/business-event.service.ts`
- Ledger posting services and journal entry services.
- Payment reconciliation services, provider events, statement lines, suspense, match records, and runs.
- Close assurance services and close evidence.
- Fiscal document and compliance evidence services.
- `services/_shared/protect.ts`
- `lib/security/rbac-permissions.ts`
- `prisma/schema.prisma`
- Existing accounting, reconciliation, close, RBAC, and tenant tests.

Technical scope:
- Evidence DTO contracts.
- Evidence grade enum and grade transition rules.
- Proof-trail service.
- Blocker service.
- Redaction hooks.
- Guarded server action or API.
- EvidenceGradeBadge.
- ProofTrailDrawer.
- Audit events for sensitive proof access.
- Optional durable snapshots only after the service contract stabilizes.

MVP subjects:
- journal.entry
- reconciliation.run
- close.run

Expansion subjects:
- pos.sale
- payment.transaction
- purchase.order
- goods.receipt
- ledger.posting.batch
- fiscal.document

Data contract:
Every proof trail response must include:
- subjectType
- subjectId
- organizationId resolved server-side
- evidenceGrade
- freshness
- sourceModules
- nodes
- edges
- blockers
- redactions
- nextActions
- audit/sensitive flag when applicable

Security requirements:
- Require session.
- Resolve tenant server-side.
- Check subject-specific RBAC permission.
- Check module entitlement observe decision when module control exists.
- Apply redaction before JSON returns.
- Audit sensitive proof access.
- Deny direct action/API access without permission.

UX requirements:
- Badge must show text labels.
- Drawer must show source chain, blockers, redactions, and next actions.
- Redaction must explain what is hidden and why.
- Blocked state must not shame staff; it must explain what evidence is missing.

Testing:
- Unit tests for grade transitions.
- Service tests for supported subjects.
- Tenant isolation tests.
- RBAC denial tests.
- Redaction tests.
- Missing source link/blocker tests.
- Failed business event tests.
- Reconciliation and close certification tests.
- Direct action/API denial tests.

Must not break:
- Ledger posting.
- Accounting source links.
- Reconciliation certification.
- Close assurance.
- Existing reports.
- Existing dashboards.
- Tenant boundaries.

Completion criteria:
- MVP subjects return guarded proof trails with deterministic grades.
- Blockers and redactions are visible.
- No sensitive data leaks in denied or redacted payloads.
- Tests prove Raw, Operational, Posted, Reconciled, Certified, and Blocked behavior.

Moat/referral impact:
Proof is the core moat. When owners can show accountants, lenders, or partners why the numbers are trustworthy, Kontava becomes a platform they recommend because it reduces arguments and protects the business.
```

## Skill 4: `kontava-snapshot-read-models`

### Upgraded Prompt

```text
Use the kontava-snapshot-read-models skill to build fast, stable, evidence-graded read models for cross-module intelligence.

Mission:
Make future command centers fast and trustworthy without forcing live joins across accounting, POS, inventory, purchasing, payroll, finance, reconciliation, compliance, close, and audit data.

Business transformation:
Owners do not need twenty dashboards. They need one reliable view that answers: where is cash at risk, what stock is trapping cash, which payments are unresolved, which supplier or payroll obligations are coming, and what blocks close?

Stakeholder value:
- Owners get fast daily operating truth.
- Managers compare branches without waiting for heavy reports.
- Accountants see close readiness and evidence gaps.
- Finance teams see cash/reconciliation pressure.
- Stockkeepers and purchasing teams see inventory cash risk.
- Payroll teams see payroll exposure without leaking person-level details.

Inspect first:
- `services/dashboard/dashboard-read-model.service.ts`
- Existing analytics/dashboard services.
- Payment reconciliation and provider data services.
- Inventory valuation and stock movement services.
- Purchasing/AP and goods receipt services.
- Payroll run and payment services.
- Close assurance services.
- Compliance/fiscal document services.
- `prisma/schema.prisma`
- Existing tests for dashboards, reconciliation, inventory, close, payroll, and tenant scope.

Snapshot contracts:
- TenantDailyOperatingSnapshot.
- BranchDailyOperatingSnapshot.
- PaymentTruthSnapshot.
- InventoryCashSnapshot.
- CloseReadinessSnapshot.
- SnapshotBuildRun.

Each snapshot must include:
- organizationId
- optional locationId
- periodStart/periodEnd or snapshotDate
- status
- freshness
- evidenceGrade
- sourceHash
- generatedAt
- sourceModules
- metrics
- blockers
- redactions
- nextActions
- metadata

Technical scope:
- Snapshot contracts.
- Read services.
- Optional rebuild services/jobs.
- Optional nullable Prisma tables.
- Guarded server actions.
- Freshness helpers.
- Stale/partial/blocked UI contract.

UX requirements:
- Show stale state.
- Show partial state.
- Show blocked state.
- Show redacted state.
- Never make weak data look precise.
- Let users drill into proof trails where available.

Security requirements:
- Every snapshot must be tenant-scoped.
- Role-specific redaction must happen server-side.
- Module entitlement observe/enforce decisions must be considered.
- Payroll, supplier bank, provider reference, close certification, and partner data must be masked unless allowed.

Testing:
- Contract tests.
- Tenant isolation tests.
- Fresh/stale/partial/blocked tests.
- Rebuild idempotency tests.
- Source hash tests.
- Performance-budget tests where practical.
- Regression tests for existing dashboard read models.

Must not break:
- Existing dashboards.
- Existing live read services.
- Existing close/reconciliation/inventory calculations.
- Existing tenant payload shapes unless intentionally versioned.

Completion criteria:
- Snapshot services return safe, stable, evidence-graded contracts.
- Future Owner War Room can consume snapshots without knowing module internals.
- Stale/partial data is visible, not hidden.

Moat/referral impact:
Fast proof-backed snapshots make Kontava feel like a serious control room. Owners recommend software that tells them what is happening quickly and reliably.
```

## Skill 5: `kontava-module-control-plane`

### Upgraded Prompt

```text
Use the kontava-module-control-plane skill to implement the safe foundation for Kontava as a module-oriented SaaS operating system.

Mission:
Let each business see and use only the modules it subscribes to, while preserving one unified operating system and avoiding broken workflows.

Business transformation:
Kontava becomes easier to buy, sell, onboard, expand, and support. SMBs can start with the modules they need, then upgrade when the system reveals workflow gaps, cash risk, close blockers, or operational pain.

Stakeholder value:
- Owners buy confidently and understand upgrade value.
- Staff see only tools relevant to their work.
- Admins can request modules without confusion.
- Sales can sell bundles based on actual workflow needs.
- Partners and accountants can recommend module packages.
- Support can explain why a module is hidden, blocked, or unavailable.

Inspect first:
- Registration flow and `Organization.requestedModules`.
- Auth/session module claims.
- Sidebar config and dashboard navigation.
- RBAC permission catalog.
- `services/_shared/protect.ts`.
- Existing server actions and APIs.
- Reports, exports, jobs, and dashboards.
- Seeds and tests.

Technical scope:
- ModuleCatalog.
- ModuleDependency.
- SubscriptionPlan.
- PlanModule.
- TenantModuleEntitlement.
- ModuleEntitlementDecisionLog.
- ModuleUsageSignal.
- Entitlement decision service.
- Observe-mode logging.
- Page/action/API/report/export/job guard helpers.
- Module Control Center.
- Upgrade/request surfaces.

Execution workflow:
1. Define canonical module catalog.
2. Map routes/actions/services/reports/jobs to modules.
3. Create entitlement contract.
4. Add observe-mode decision service.
5. Log would-blocks without denying access.
6. Add owner/admin diagnostics.
7. Add UI hiding for normal users.
8. Add server-side guards to narrow low-risk surfaces.
9. Delay hard enforcement until clean observe reports.

Security requirements:
- Entitlement does not grant permission.
- Permission does not grant entitlement.
- Admin wildcard cannot bypass module entitlement.
- Module entitlement cannot bypass fresh auth, maker-checker, consent, or certification.
- Direct URL, server action, API, report, export, and job bypasses must be protected.

UX requirements:
- Normal users should not see unavailable modules.
- Owners/admins may see upgrade/request surfaces.
- Unavailable states must explain business value without exposing hidden data.
- Module dependencies must be explained in business language.
- Upgrade prompts should feel like workflow help, not ads.

Testing:
- Entitlement decision tests.
- Observe-mode logging tests.
- Sidebar visibility tests.
- Direct URL denial tests.
- Server action/API denial tests.
- Report/export/job denial tests.
- RBAC plus entitlement tests.
- Wildcard denial tests.
- Legacy/default entitlement migration tests.

Must not break:
- Existing tenants.
- Existing registration data.
- Existing admin workflows.
- Existing permissions.
- Existing module routes before observe reports are clean.

Completion criteria:
- Module access is represented server-side.
- Observe logs show what would be blocked.
- Normal users see only subscribed modules.
- Owners/admins understand upgrade paths.
- No global hard enforcement happens prematurely.

Moat/referral impact:
Module control makes Kontava commercially scalable. Businesses can start small and grow naturally; satisfied owners recommend the right bundle to peers with similar pains.
```

## Skill 6: `kontava-business-signals-action-queue`

### Upgraded Prompt

```text
Use the kontava-business-signals-action-queue skill to transform cross-module evidence into prioritized actions.

Mission:
Make Kontava tell users what needs attention, why it matters, who should act, and what the next safe step is.

Business transformation:
Ordinary software stores data. Kontava should reduce owner stress by turning data into decisions: investigate this variance, reconcile this payment, review this stock risk, follow up this supplier delay, resolve this close blocker.

Stakeholder value:
- Owners get one action queue instead of chasing reports.
- Accountants see evidence-linked client blockers.
- Finance teams prioritize cash and reconciliation exceptions.
- Stockkeepers see stock actions tied to cash impact.
- Purchasing teams see supplier and receiving risks.
- Payroll teams see payroll exposure without leaking person-level data.
- Managers assign work and track resolution.

Inspect first:
- Dashboard and analytics services.
- Payment reconciliation exceptions and suspense.
- POS cash drawer services.
- Inventory levels, valuation, stock counts, transfers, adjustments, write-offs.
- Purchase orders, goods receipts, supplier invoices, AP.
- Payroll runs and payment batches.
- Close assurance findings.
- Existing notifications.
- RBAC and audit patterns.

Technical scope:
- BusinessSignal.
- BusinessSignalEvent.
- BusinessSignalRule.
- ActionItem.
- ActionItemEvent.
- NotificationPreference.
- Signal service.
- Rule engine.
- Dedupe logic.
- Severity scoring.
- Expiry/freshness.
- Assignment/resolution workflow.
- Notification/digest integration.
- Signal inbox UI.
- Owner action cards.

MVP signals:
- Cash drawer variance.
- Open payment suspense.
- Duplicate provider reference.
- Refund or void spike.
- Stockout risk.
- Dead-stock cash exposure.
- Purchase order receiving delay.
- Payroll exposure.
- Close blocker.

Data contract:
Every signal must include:
- organizationId
- moduleSlug
- subjectType
- subjectId
- evidenceGrade
- severity
- dedupeKey
- freshness
- expiry
- assignedRole or assignee
- actionPath
- blockers
- redactions
- audit trail

UX requirements:
- Signals must be actionable, not noisy.
- Show evidence and business impact.
- Show owner/accountant/staff responsibility clearly.
- Show stale or expired signals.
- Provide empty states that build confidence.
- Provide redaction chips where sensitive data is hidden.

Security requirements:
- Permission-filter every action path.
- Do not leak sensitive payloads.
- Prevent cross-tenant assignment or resolution.
- Audit assignment, resolution, dismissal, and bulk actions.
- Require fresh auth for sensitive bulk resolution where needed.

Testing:
- Dedupe tests.
- Severity tests.
- Expiry/stale tests.
- Assignment audit tests.
- Tenant isolation tests.
- Redaction tests.
- Permission-filtered action tests.
- Notification preference tests.

Must not break:
- Existing dashboard data.
- Existing reconciliation workflows.
- Existing POS/inventory/payroll/close workflows.
- Existing notification behavior.

Completion criteria:
- MVP signals are deduped, evidence-linked, permission-filtered, and actionable.
- Owners can see what matters without alert fatigue.
- Teams can assign and resolve work with auditability.

Moat/referral impact:
Business signals create daily habit. Users recommend systems that catch problems before losses become painful.
```

## Skill 7: `kontava-security-redaction-guard`

### Upgraded Prompt

```text
Use the kontava-security-redaction-guard skill to harden all cross-module intelligence before broad exposure.

Mission:
Make Kontava safe enough to show powerful connected business intelligence without exposing the wrong data to the wrong person.

Business transformation:
Trust is lost instantly when payroll, supplier bank, payment provider, close, partner, or export-sensitive data leaks. This skill makes Kontava feel enterprise-grade because it protects users while still delivering useful insight.

Stakeholder value:
- Owners get high-level control without accidental sensitive exposure.
- Staff see only what they should see.
- Accountants see audit-ready evidence by permission.
- Finance teams can manage exports safely.
- Partners only receive consented, scoped, watermarked evidence.
- Regulators and auditors see strong access discipline.

Inspect first:
- `services/_shared/protect.ts`
- `lib/security/rbac.ts`
- `lib/security/rbac-permissions.ts`
- `lib/security/auth-session.ts`
- `services/controls/sensitive-action.service.ts`
- Existing export controls.
- Supplier bank workflows.
- Payroll approval/payment workflows.
- Reconciliation override/sign/export workflows.
- Close certification/export workflows.
- Audit services.

Technical scope:
- Redaction policy service.
- Export safety service.
- Composite moat guard service.
- Sensitive action extensions.
- Consent boundary contracts.
- Watermarking/export audit hooks.
- Redaction chips and denied-state UI contracts.
- Security tests.

Composite guard:
Every sensitive cross-module access must check:
- session
- tenant scope
- module entitlement
- RBAC permission
- fresh auth when sensitive
- maker-checker where required
- consent where partner/export-related
- redaction before JSON return
- audit event for allow, deny, export, consent, and redaction

Sensitive defaults:
- Payroll person-level values: redact unless payroll entitlement and permission pass.
- Supplier bank details: redact unless permission and fresh auth pass.
- Provider references: mask unless payment/reconciliation permission passes.
- Suspense detail: redact unless exception permission passes.
- Close certification evidence: summary only unless close/audit permission passes.
- Partner exports: require consent, scope, watermark, revocation, and audit.

UX requirements:
- Redaction must be visible and explainable.
- Denied states must be professional and non-technical.
- Owners/admins should understand what permission or module is needed.
- Sensitive export flows must feel controlled and serious.

Testing:
- Payroll redaction by role.
- Supplier bank redaction by role.
- Provider reference masking.
- Close evidence summary vs detail.
- Export fresh-auth requirement.
- Wildcard cannot bypass entitlement.
- Wildcard cannot bypass consent.
- Maker-checker separation.
- JSON leakage tests.
- Audit event tests.

Must not break:
- Existing protect wrappers.
- Existing RBAC permissions.
- Existing sensitive action flows.
- Existing exports.
- Existing maker-checker controls.

Completion criteria:
- Sensitive cross-module data is guarded and redacted server-side.
- Wildcard bypass is explicitly tested.
- Exports have fresh auth, scope, watermark, and audit where needed.
- Denied and redacted states are usable, not confusing.

Moat/referral impact:
Enterprise trust is a growth engine. Accountants and advisors recommend platforms they can trust with sensitive client data.
```

## Skill 8: `kontava-seed-backfill-release-gate`

### Upgraded Prompt

```text
Use the kontava-seed-backfill-release-gate skill to make Kontava's moat foundation provable, demoable, migratable, and releasable.

Mission:
Create realistic seed tenants, idempotent backfills, validation reports, rollback notes, and release gates that prove the system is safe before production rollout.

Business transformation:
Great product claims need proof. Seed and validation scenarios let sales demo the moat, QA verify it, engineering protect migrations, and leadership trust rollout decisions.

Stakeholder value:
- Sales gets credible demos: cash leakage, evidence chain, close readiness, limited modules, accountant views.
- QA gets repeatable scenarios.
- Engineering gets migration confidence.
- Support gets diagnostic examples.
- Owners and accountants eventually experience fewer surprises.

Inspect first:
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `prisma/comprehensive-seed.ts`
- Existing migrations.
- Seed utilities.
- Release gate scripts under `scripts/`.
- `package.json` verification scripts.
- Existing service tests and policy gates.

Seed scenarios:
- Full evidence chain: sale -> payment -> ledger -> reconciliation -> close -> trust pack.
- Cash leakage: drawer variance, duplicate provider reference, refund spike, open suspense.
- Inventory cash risk: dead stock, low stock, supplier obligation, reorder affordability.
- Payroll exposure: approved/posted payroll with unresolved payment or reconciliation.
- Accountant multi-client: accountant sees several tenants with trust grades and blockers.
- Limited modules: POS plus inventory only, finance/payroll hidden.
- Suspended/read-only: historical read allowed, mutation denied.
- Partner consent: grant, scoped export, revocation.

Backfill scope:
- Evidence grade classification.
- Source-link coverage.
- Missing ledger source links.
- Failed/rejected business events.
- Payments without provider/statement/reconciliation evidence.
- Close evidence coverage.
- Module entitlement legacy defaults.
- Tenant-level data quality report.

Migration rules:
- Nullable first.
- Idempotent backfills.
- Batch processing.
- No destructive production reset.
- No legacy Certified by default.
- Observe mode before enforcement.
- Rollback notes for every migration.

Release gates:
- Tenant isolation.
- RBAC.
- Module entitlement.
- Evidence-grade transitions.
- Proof-trail redaction.
- Snapshot freshness.
- Signal dedupe.
- Export/fresh-auth.
- Seed scenario smoke tests.
- Existing accounting/reconciliation/POS/inventory/payroll/compliance regressions.

Testing:
- Seed smoke.
- Backfill idempotency.
- Data quality correctness.
- Migration rollback rehearsal.
- Tenant separation.
- Limited-module visibility.
- Read-only/suspended mutation denial.

Must not break:
- Existing development seed usability.
- Existing test fixtures.
- Existing migrations.
- Existing demo flows.

Completion criteria:
- Seed data proves the moat story.
- Backfills are idempotent.
- Validation reports explain readiness and blockers.
- Rollback and release gates are documented and executable.

Moat/referral impact:
Demo quality drives belief. When prospects see Kontava catch real SMB pain in realistic scenarios, they remember it and recommend it.
```

## Skill 9: `kontava-owner-war-room-mvp`

### Upgraded Prompt

```text
Use the kontava-owner-war-room-mvp skill to build the first safe, read-only, evidence-backed owner/admin command center.

Mission:
Give owners one professional screen that answers: what needs my attention today, where is money leaking, what stock traps cash, what blocks reconciliation or close, and who needs to act?

Business transformation:
This is the first visible moat surface. It should make Kontava feel unlike ordinary accounting, POS, inventory, payroll, or finance software. It should turn operations into owner decisions.

Stakeholder value:
- Owners see cash at risk, stock exposure, branch issues, supplier pressure, payroll exposure, reconciliation exceptions, close readiness, and action queue.
- Accountants see trust and close blockers.
- Finance teams see payment truth and suspense.
- Stockkeepers see inventory cash exposure.
- Managers see branch/cashier/terminal risk without sensitive overexposure.
- Sales gets one screen that explains Kontava's value in minutes.

Preconditions:
Do not implement broad production UI unless these exist or are mocked through stable contracts:
- Evidence-grade service.
- Proof-trail contract.
- Snapshot/read-model contracts.
- Module entitlement observe mode.
- BusinessSignal/action queue MVP.
- Redaction policy.

Inspect first:
- Dashboard shell and visual tokens.
- Existing analytics and finance dashboards.
- Sidebar and role navigation.
- Snapshot services.
- Business signal services.
- Evidence badge/proof drawer components.
- RBAC shell permission hooks.
- English/French messages.
- Existing dashboard tests.

MVP cards:
- Cash at risk.
- Reconciliation exceptions.
- Stock cash exposure.
- Supplier commitments.
- Payroll exposure.
- Close readiness.
- Action queue.
- Module observe/upgrade prompt for owners/admins.

UX states:
Every card must support:
- loading
- empty
- partial
- stale
- blocked
- redacted
- permission denied
- module unavailable
- upgrade/request
- safe error

Design requirements:
- Match existing dashboard color semantics.
- Use dense, enterprise-grade layout.
- Use badges with text labels.
- Use proof drawers for drill-in.
- Use owner-friendly business language.
- Avoid decorative marketing layouts.
- Keep sensitive values redacted by role.
- Add English and French strings together.

Security requirements:
- Read-only by default.
- Server-side role and entitlement checks.
- Redaction before payload returns.
- No mutation actions unless fully guarded.
- Direct URL access tested.
- No payroll/supplier bank/provider/close/partner leak.

Testing:
- Role-specific visibility.
- Direct URL denial.
- Module unavailable states.
- Snapshot stale/partial states.
- Proof drawer access.
- Redaction payload tests.
- i18n strings.
- Accessibility labels.
- E2E smoke if auth/dev server fixture exists.

Must not break:
- Existing dashboards.
- Existing analytics pages.
- Existing finance/POS/inventory/payroll/reconciliation pages.
- Existing color semantics.
- Existing navigation.

Completion criteria:
- Owner/admin sees a read-only command center connecting cash, stock, payroll, purchasing, reconciliation, close, and module state.
- Every card has evidence grade or explains why evidence is missing.
- Sensitive data is redacted.
- The screen is demo-ready and operationally useful.

Moat/referral impact:
The Owner War Room is the product's referral engine. If it helps owners catch leakage, act faster, and feel in control, they will naturally tell peer business owners about it.
```

## Recommended Execution Order And Why

1. `kontava-moat-execution-orchestrator`
   - Prevents chaotic execution and selects the right next skill.
2. `kontava-foundation-governance`
   - Locks vocabulary, ownership, and release gates before code.
3. `kontava-evidence-proof-trail`
   - Creates trust primitives before dashboards.
4. `kontava-snapshot-read-models`
   - Makes future command centers fast and stable.
5. `kontava-module-control-plane`
   - Adds safe observe-mode module access before commercial enforcement.
6. `kontava-security-redaction-guard`
   - Should run before broad cross-module intelligence is exposed.
7. `kontava-business-signals-action-queue`
   - Converts evidence and snapshots into action.
8. `kontava-seed-backfill-release-gate`
   - Proves the foundation with demo and migration confidence.
9. `kontava-owner-war-room-mvp`
   - Exposes the moat visibly only after proof, snapshots, redaction, entitlements, and signals are ready.

If security-sensitive data is touched earlier, run `kontava-security-redaction-guard` before the relevant skill.

## Validation Gates Per Skill

| Skill | Minimum Gate | Extra Gate |
|---|---|---|
| Orchestrator | Current phase and next skill identified | Stop conditions documented |
| Foundation governance | `git diff --check` | `npm run typecheck` and `npm run lint` if code/config changed |
| Evidence proof trail | `npm run typecheck`, `npm run lint` | Evidence, RBAC, tenant, redaction tests |
| Snapshot read models | `npm run typecheck`, `npm run lint` | Snapshot service tests, Prisma validate if schema changed |
| Module control plane | `npm run typecheck`, `npm run lint` | Entitlement, direct URL, action/API/export/job bypass tests |
| Business signals | `npm run typecheck`, `npm run lint` | Dedupe, expiry, assignment, redaction, tenant tests |
| Security redaction | `npm run typecheck`, `npm run lint` | Sensitive action, wildcard denial, export, JSON leakage tests |
| Seed/backfill | `npx prisma validate`, `npm run typecheck` | Seed smoke, idempotency, rollback rehearsal |
| Owner War Room | `npm run typecheck`, `npm run lint` | Role-state, redaction, i18n, accessibility, E2E smoke |

## Stakeholder Impact Map

| Stakeholder | What The Prompt Pack Must Drive |
|---|---|
| Owners | One trusted view of cash risk, stock exposure, payroll pressure, supplier obligations, reconciliation issues, and close readiness. |
| Accountants | Source-linked, evidence-graded, close-ready data that reduces cleanup and improves client review. |
| Finance teams | Payment truth, suspense control, AP/payroll pressure, export safety, and reconciliation confidence. |
| Cashiers and staff | Clear workflows, less blame, and proof of what happened during shifts. |
| Stockkeepers | Stock actions connected to cash impact, reorder pressure, and supplier reality. |
| Payroll/HR | Payroll readiness and exposure without leaking sensitive person-level data. |
| Managers | Branch, cashier, terminal, and team accountability through evidence, not hearsay. |
| Partners | Future consented evidence APIs grounded in proof, scope, revocation, and audit. |
| Sales | A product story based on leakage prevention, trust, close readiness, and owner control. |

## Organic Growth And Referral Impact Map

Kontava earns organic referrals when it creates visible relief:

- Cash leakage caught before it becomes a larger loss.
- A close process finished faster because blockers were visible.
- An accountant trusts client books because proof trails exist.
- A branch manager resolves variance with evidence, not guesswork.
- An owner sees stock cash trapped before making another bad purchase.
- A finance user reconciles mobile money or bank statements faster.
- A limited-module customer upgrades because Kontava shows the missing workflow value.
- A lender or partner trusts evidence-backed operating data.

Each skill must therefore connect implementation work to one of these referral triggers.

## Risk Register

| Risk | Severity | Mitigation |
|---|---:|---|
| Prompts become too broad to execute | High | Keep each prompt phase-bounded and require a first safe slice. |
| Product starts with dashboards before proof | High | Run evidence and snapshots before Owner War Room. |
| Hard module enforcement breaks tenants | Critical | Use observe mode and would-block reports first. |
| Sensitive data leaks through cross-module views | Critical | Run redaction guard before broad UI or exports. |
| Signals create alert fatigue | Medium | Require dedupe, severity, expiry, and action path. |
| Legacy data is over-certified | High | Old unsupported records default to Operational or Blocked, not Certified. |
| Validation is superficial | High | Require tests based on risk, not only typecheck. |
| Sales demos overpromise future features | Medium | Tie demo claims to current evidence grades and release gates. |

## Final Recommendation

Start execution with this prompt:

```text
Use kontava-moat-execution-orchestrator to start the Kontava moat execution program. Read the upgraded prompt pack, the skill blueprint, the foundation roadmap, and the cross-boundary innovation proposal. Determine the current execution phase, confirm prerequisites, and begin with kontava-foundation-governance unless a stronger blocker is found.

Produce the Phase 0 governance artifacts: module vocabulary ADR, evidence-grade ADR, module ownership map, proof-trail contract ADR, module entitlement observe-mode ADR, snapshot strategy ADR, redaction and sensitive-data ADR, and release-gate checklist.

Do not build Owner War Room, AI Copilot, Partner Evidence API, full Business Evidence Graph, broad Compliance Readiness Radar, or hard module enforcement yet. Keep changes surgical, document-first unless code is clearly required, and define the validation gate for the first code-build slice.
```

Then use this as the first technical build prompt:

```text
Use kontava-evidence-proof-trail to build the first safe technical slice: evidence-grade contracts, evidence-grade service, proof-trail service, and guarded read-only proof-trail action for journal entries, reconciliation runs, and close runs.

Reuse existing accounting source links, ledger posting batches, business events, reconciliation evidence, close evidence, tenant scope guards, RBAC permissions, and audit patterns. Add conservative grade transitions, blockers, redaction hooks, and focused tests for grade transitions, tenant isolation, RBAC denial, redaction, and direct action/API denial.

Do not persist EvidenceSnapshot tables unless the service contract requires it. Do not mark unsupported legacy records Certified. Produce validation results and the next recommended skill.
```
