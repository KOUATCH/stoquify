# Payroll, payslips, obligations and payment: review and plan of action

**Prepared:** 8 September 2026. **Package:** PRL. **Status:** SOURCE_REVIEW_AND_FOCUSED_VERIFICATION; implementation not started by this run.

## 1. Assessment and scope

This is a source review and focused local verification, not a full runtime certification. Database clients in the selected tests are mocked or injected. No deployed database, authenticated browser, live provider, production telemetry, restore rehearsal or qualified statutory approval was inspected in this run. Unexecuted scenarios below are acceptance requirements, not test results. No application code, migration, business record or deployment is changed by this report.

**Accountable roles:** Payroll engineering, payroll controller and qualified country reviewer. **Catalog coverage:** payroll

**Selected verification:** 46 passed, 0 failed in the selected suite. [Test source](<E:/ohada saas/Focused projects/stoquify/services/payroll/__tests__/payroll-control.service.test.ts>). This package owns or consumes PM-CACHE-001.

The highest-risk review questions are calculation tests do not establish statutory acceptance; test partial/repeated payment, rejected destinations and retro corrections; restrict personal payroll exports and preserve source snapshots.

## 2. Source and architecture map

The source inventory contains 137 matching files, including tests and supporting files. 6 sources were hashed and indexed for targeted review. Prefix inventory counts are discovery aids, not reviewed-file counts. The full list and source hashes are in [the source manifest](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/source-manifest.json>).

| Layer | Current source/navigation anchor | Evidence boundary |
|---|---|---|
| services | [services/payroll/payroll-control.service.ts](<E:/ohada saas/Focused projects/stoquify/services/payroll/payroll-control.service.ts:1>) | 10975 lines; SHA-256 dbb45a8daf27… |
| hooks | [hooks/payroll/usePayrollWorkbench.ts](<E:/ohada saas/Focused projects/stoquify/hooks/payroll/usePayrollWorkbench.ts:3>) | 101 lines; SHA-256 6fc19e3dafe7… |
| actions | [actions/payroll/payroll-setup.actions.ts](<E:/ohada saas/Focused projects/stoquify/actions/payroll/payroll-setup.actions.ts:3>) | 376 lines; SHA-256 0ca4c9385fcc… |
| actions | [actions/payroll/payroll-register.actions.ts](<E:/ohada saas/Focused projects/stoquify/actions/payroll/payroll-register.actions.ts:3>) | 87 lines; SHA-256 5a4f3330b9ad… |
| components | [components/payroll/PayrollSetupControlPlane.tsx](<E:/ohada saas/Focused projects/stoquify/components/payroll/PayrollSetupControlPlane.tsx:3>) | 873 lines; SHA-256 8c681fd33906… |
| components | [components/payroll/PayrollRunWorkbench.tsx](<E:/ohada saas/Focused projects/stoquify/components/payroll/PayrollRunWorkbench.tsx:3>) | 736 lines; SHA-256 c642124403c8… |

Route/API paths must be expanded from callers; absence from the selected prefix inventory is not a declaration that none exist.

### Data declarations

| Schema model | Selected declared storage/relationship facts |
|---|---|
| [PayrollPeriod](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:3142>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); @@unique([organizationId, periodStart, periodEnd]); @@index([organizationId, status, periodStart]) |
| [PayrollAttendanceSnapshot](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:3184>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); payrollPeriod   PayrollPeriod? @relation(fields: [payrollPeriodId], references: [id], onDelete: SetNull); employee   PayrollEmployee @relation(fields: [employeeId], references: [id], onDelete: Restrict) |
| [PayrollRun](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:3504>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); payrollPeriod   PayrollPeriod @relation(fields: [payrollPeriodId], references: [id], onDelete: Restrict); grossAmount             Decimal @default(0) @db.Decimal(14, 2) |
| [PayrollRunTransition](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:3595>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict); payrollRun   PayrollRun @relation(fields: [organizationId, payrollRunId], references: [organizationId, id], onDelete: Restrict); businessEvent   BusinessEvent? @relation("PayrollRunTransitionBusinessEvent", fields: [organizationId, businessEventId], references: [organizationId, id], onDelete: Restrict) |
| [PayrollRunLine](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:3634>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); payrollRun   PayrollRun @relation(fields: [payrollRunId], references: [id], onDelete: Cascade); employee   PayrollEmployee @relation(fields: [employeeId], references: [id], onDelete: Restrict) |
| [PayrollPayslip](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:3678>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); payrollRun   PayrollRun @relation(fields: [payrollRunId], references: [id], onDelete: Restrict); runLine   PayrollRunLine @relation(fields: [runLineId], references: [id], onDelete: Restrict) |
| [PayrollDeclaration](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:3761>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); payrollRun   PayrollRun @relation(fields: [payrollRunId], references: [id], onDelete: Restrict); amount      Decimal @default(0) @db.Decimal(14, 2) |
| [PayrollPaymentBatch](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:3845>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); payrollRun   PayrollRun @relation(fields: [payrollRunId], references: [id], onDelete: Restrict); amount      Decimal                   @db.Decimal(14, 2) |
| [PayrollPaymentAllocation](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:3894>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); payrollPaymentBatch   PayrollPaymentBatch @relation(fields: [payrollPaymentBatchId], references: [id], onDelete: Cascade); employee   PayrollEmployee @relation(fields: [employeeId], references: [id], onDelete: Restrict) |
| [PayrollEmployeeBalanceCase](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:3921>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); employee   PayrollEmployee @relation(fields: [employeeId], references: [id], onDelete: Restrict); payrollRun   PayrollRun @relation(fields: [payrollRunId], references: [id], onDelete: Restrict) |

These are schema declarations. Exact migration application, actual constraints/indexes, row populations, query plans and direct-write bypasses remain unverified. See the platform package for migration/restore ownership.

### Workflow trace and handoffs

The diagram is the review boundary and required end-to-end trace. Source links and selected tests substantiate only the portions described in this report; it does not claim every edge was exercised.

```mermaid
flowchart LR
  A["Business trigger / source"] --> B["Fresh tenant and role authority"]
  B --> C["PRL: owning domain service"]
  C --> D["Transaction and source evidence"]
  D --> E["Event / dependent workflow"]
  D --> F["Read model / query scope"]
  F --> G["UI / export / recovery"]
  E --> H["Reconciliation / assurance"]
```

| Workflow | Expected outcome | Evidence disposition |
|---|---|---|
| PRL-FLOW-1 | Freeze eligible input snapshots and calculate a reviewed country/version profile | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| PRL-FLOW-2 | Approve and post reproducible gross-to-net and liabilities | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| PRL-FLOW-3 | Issue payslips, reconcile payments/declarations and preserve correction history | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |

**Integration contracts:** [HR — HRIS, presence, contracts and self-service](hris-presence-review-and-action-plan-2026-09-08.md); [CMP — Fiscal documents, compliance and country packs](compliance-country-packs-review-and-action-plan-2026-09-08.md); [PAY — Providers, statements, matching and suspense](payments-reconciliation-review-and-action-plan-2026-09-08.md); [IAM — Identity, tenant access, settings and administration](identity-settings-admin-review-and-action-plan-2026-09-08.md); [MOD — Module lifecycle, packaging and billing boundaries](module-lifecycle-billing-review-and-action-plan-2026-09-08.md); [EVT — Events, recovery, migrations and platform operations](events-platform-reliability-review-and-action-plan-2026-09-08.md). These identify validation/ownership interfaces, not permission to duplicate their implementations. Accounting remains owned by [the existing accounting roadmap](accounting-correction-execution-roadmap-2026-09-08.md).

**Graph navigation:** graph_actions.json node `payroll_payroll_register_actions_ts`, community 75 (L1); graph_actions.json node `payroll_payroll_register_actions_asrecord`, community 75 (L17); graph_components.json node `payroll_payrollrunworkbench_tsx`, community 92 (L1); graph_components.json node `payroll_payrollrunworkbench_tone`, community 92 (L33); graph_hooks.json node `payroll_usepayrollworkbench_ts`, community 15 (L1); graph_hooks.json node `payroll_usepayrollworkbench_actionerrormessage`, community 15 (L19). Graph extracts predate this review and are not runtime proof.

## 3. Controls to preserve

The following assertions passed against mocks/injected clients in this run. Preserve their contracts while extending validation; test names are not broader certification claims.

- payroll control service blocks new payroll periods before country setup or writes when admission is stopped.
- payroll control service returns an existing payroll period without readmitting new work.
- payroll control service blocks a new ordinary payroll calculation before employee reads and financial effects.
- payroll control service replays an existing calculation before admission while preserving correction proof checks.

## 4. Findings, limitations and risks

### PM-CACHE-001 — Several sensitive query families omit tenant or actor identity

**CREDIBLE_RISK_REQUIRES_RUNTIME_VALIDATION · P1.** Confidence: High for missing key dimensions; cross-session disclosure not demonstrated. Likelihood: Depends on client lifetime and identity-transition behavior; unmeasured.

**Evidence:** [hooks/payments/usePaymentReconciliationDashboard.ts:19](<E:/ohada saas/Focused projects/stoquify/hooks/payments/usePaymentReconciliationDashboard.ts:19>); [hooks/payroll/usePayrollWorkbench.ts:16](<E:/ohada saas/Focused projects/stoquify/hooks/payroll/usePayrollWorkbench.ts:16>); [hooks/finance/useFinanceDashboard.ts:7](<E:/ohada saas/Focused projects/stoquify/hooks/finance/useFinanceDashboard.ts:7>); [hooks/posHooks/useOfflineSync.ts:75](<E:/ohada saas/Focused projects/stoquify/hooks/posHooks/useOfflineSync.ts:75>); [lib/providers/query-provider.tsx:14](<E:/ohada saas/Focused projects/stoquify/lib/providers/query-provider.tsx:14>).

**Trigger:** Organization, actor, permissions or entitlements change while the QueryClient survives.

**Expected:** Scope-changing transitions cannot render old protected results; result-changing scope belongs in cache identity with cancellation/removal where necessary.

**Observed:** Payment and payroll keys use fixed prefixes (and limits/IDs); finance/offline keys include filters but no explicit tenant/actor. QueryProvider creates one client with useState. This review did not execute every identity-change path or establish whether navigation remounts/clears it.

**Cause / uncertainty:** Server-inferred authority is not represented explicitly in these client keys.

**Consequences:** Stale financial or personnel data may be shown in the wrong context if the client survives. Severity justifies early validation, but this is not a confirmed disclosure incident.

**Existing mitigation:** Server actions retain authorization and some keys have location/run filters; full reloads could clear caches but are not a complete demonstrated contract.

**Correction:** Trace every switch/logout/revocation path, then centralize scoped keys and query cancellation/removal; avoid retaining previous protected data across authority changes.

**Acceptance:** Same-browser two-tenant/actor tests show no old values during loading, errors or revocation; all impacted views refresh after writes.

**Owner / estimate:** Shared frontend/IAM owner plus affected module owners; 2–3 days to validate; 3–7 engineering days if shared lifecycle correction is required. Estimates are planning judgments, not booked capacity.

**Data and rollout:** No data mutation required; assess exposure only if runtime reproduction identifies it.

**Related earlier work:** ACC-010, ACR-22


### Additional module scenarios still requiring verification

- **PRL-VERIFY-1:** Calculation tests do not establish statutory acceptance. Owner: Payroll engineering, payroll controller and qualified country reviewer. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **PRL-VERIFY-2:** Test partial/repeated payment, rejected destinations and retro corrections. Owner: Payroll engineering, payroll controller and qualified country reviewer. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **PRL-VERIFY-3:** Restrict personal payroll exports and preserve source snapshots. Owner: Payroll engineering, payroll controller and qualified country reviewer. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.

## 5. Layer and reviewer dispositions

| Lens | Current disposition and remaining proof |
|---|---|
| Architecture, backend and integrations | Sources/call boundaries inventoried; selected service assertions above. Trace alternate entry points and every handoff before whole-domain approval. |
| Database, migration and integrity | Named schema models indexed. Deployment, tenant-consistent foreign keys, locking, rollback, scale and backfill/restore not verified. |
| IAM, privacy, fraud and controls | Apply direct denied-no-read/no-write, role revocation, maker-checker and export redaction tests. A server guard or hidden button alone is insufficient. |
| Frontend, queries and design system | Client/action entry above inspected statically where present; cache identity, mutation effects and source truth must be traced into actual screens. |
| UX, accessibility, EN/FR and content | Authenticated role tasks, keyboard/focus, mobile and localized state behavior not executed; no accessibility claim. |
| Product and business process | Three explicit workflows and supported-scope decisions above; measure task completion and support burden before redesign. |
| Accounting and financial controls | Source/amount/quantity/period/currency tie-outs and correction ownership apply; reuse ACC/ACR controls. |
| Statutory and country review | Applicable; qualified jurisdiction/version approval is external and unverified. This report makes no legal rule or compliance determination. |
| QA and release | 46 passed, 0 failed in the selected suite. linked test source. Unit results do not replace integrated evidence. |
| SRE, performance and cost | No latency/load/restore measurements; establish bounded reads, worker age/error metrics, alerts, retries and support ownership before rollout. |
| AI and agent authority | AI model behavior is not applicable unless a connected agent consumes this module; review that access contract without adding AI features. |
| Packaging, billing and operations | Confirm actual catalog/entitlement scope and mandatory retained obligations. Provider billing, adoption and customer outcomes are unverified. |

## 6. Ordered execution plan

### PM-PRL-01 — Bind current scope, owners and candidate

**Status:** READY. **Owner:** Payroll engineering, payroll controller and qualified country reviewer. **Effort:** 1–2 reviewer days.

**Deliverable:** Confirm every listed workflow, supported variant and relevant prior ACC/ACR or STQ-RM item; hash current sources, map entry points and name a domain reviewer.

**Acceptance:** All material paths have active/legacy/deferred status; no existing change is overwritten.

**Prerequisite:** Candidate/owner availability; existing historical evidence is a lead.. 

### PM-PRL-02 — Reproduce priority risks and freeze contracts

**Status:** PLANNED. **Owner:** Payroll engineering, payroll controller and qualified country reviewer. **Effort:** 2–4 reviewer/QA days; isolated environments may extend elapsed time.

**Deliverable:** Calculation tests do not establish statutory acceptance; Test partial/repeated payment, rejected destinations and retro corrections; Restrict personal payroll exports and preserve source snapshots. Reproduce all linked findings before prescribing data repair.

**Acceptance:** A scenario ledger records expected/observed behavior, source IDs, denied side effects and remaining blockers.

**Prerequisite:** PM-PRL-01. 

### PM-PRL-03 — Implement verified corrections and investigate affected data

**Status:** CONDITIONAL_ON_CONFIRMED_FINDINGS. **Owner:** Payroll engineering, payroll controller and qualified country reviewer. **Effort:** Use linked finding estimates; otherwise estimate after diagnosis.

**Deliverable:** Correct the smallest owning boundary; preserve domain history, shared controls and public contracts. Investigate historical impact separately and design reversible repair only if needed.

**Acceptance:** Focused regression, cross-module tie-out and review prove the correction; no speculative implementation or silent historical rewrite.

**Prerequisite:** PM-PRL-02. If no defect is confirmed, record a reviewed no-change disposition; this satisfies the decision step without speculative work.

### PM-PRL-04 — Verify integrated release and controlled rollout

**Status:** PLANNED. **Owner:** Payroll engineering, payroll controller and qualified country reviewer. **Effort:** 2–3 reviewer/QA days plus the real operational cycle.

**Deliverable:** Run isolated DB failure/concurrency scenarios, authenticated role/locale/cache tests, representative performance/export checks and recovery rehearsal. Pilot the agreed supported scope.

**Acceptance:** No unexplained material mismatch, unauthorized effect or stale evidence claim; domain reviewer and operations owner accept scoped results.

**Prerequisite:** PM-PRL-03. 

Existing accounting and enterprise roadmap estimates must be deduplicated: PM findings linked to ACC/ACR or STQ-RM reuse the owning task. Reviewer-day estimates here are not engineering effort for a complete rewrite and must not be summed with the accounting roadmap as if independent.

## 7. Data correction, rollout and completion

Investigate exposure using source IDs, time/currency scope, counts and reconciled totals before proposing any repair. Preserve original records, hashes and exports; use reviewed corrective transactions or versioned migration only where necessary. Rehearse backup/restore and rollback in a disposable environment. Code correction and historical reconciliation are separate acceptance items. A query/display issue alone does not justify rewriting financial history.

Start with an agreed eligible pilot and observe a complete relevant cycle (sale/refund/shift; receiving/invoice/payment; payroll period; or close). Stop expansion on unauthorized effects, unexplained material mismatches, duplicate effects or stale proof. Record incident owner, recovery route and the data needed for investigation. No pilot or release is authorized or completed by this document.

Completion requires disposition for every workflow, current-source evidence for each significant claim, tested or explicit blocked failure scenarios, domain-reviewed corrective work and an understood operational handoff. [The tailored audit prompt](payroll-audit-execution-prompt-2026-09-08.md) provides the full repeatable execution brief.

## 8. Evidence and provenance

Commit: `a05a41ef66cd5d98fd69ae3df18225795f912232`; branch: `codex/migration-control-plane-release-2026-08-29`. Initial capture: 2026-09-08T14:41:48.494Z. Dirty workspace preserved; claims bind to file hashes, not clean HEAD. Unit command: 2026-09-08T14:43:08.844Z to 2026-09-08T14:44:14.458Z; exit 1. See [exact command](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-command.json>), [assertion results](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.json>), [test log](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.log>) and [shared evidence index](platform-module-evidence-index-2026-09-08.md). Historical reports were used for navigation and work deduplication; their earlier pass counts are not included in this run.
