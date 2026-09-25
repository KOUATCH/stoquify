# Close assurance, incidents and accountant collaboration: review and plan of action

**Prepared:** 8 September 2026. **Package:** CLS. **Status:** SOURCE_REVIEW_AND_FOCUSED_VERIFICATION; implementation not started by this run.

## 1. Assessment and scope

This is a source review and focused local verification, not a full runtime certification. Database clients in the selected tests are mocked or injected. No deployed database, authenticated browser, live provider, production telemetry, restore rehearsal or qualified statutory approval was inspected in this run. Unexecuted scenarios below are acceptance requirements, not test results. No application code, migration, business record or deployment is changed by this report.

**Accountable roles:** Assurance engineering and independent controller. **Catalog coverage:** close_assurance

**Selected verification:** 2 passed, 0 failed in the selected suite. [Test source](<E:/ohada saas/Focused projects/stoquify/services/assurance/__tests__/assurance-control-tower.service.test.ts>). No additional defect was confirmed in the selected slice; that is not evidence that the complete module is correct.

The highest-risk review questions are a green checklist does not prove every producer was examined; time-bound waivers must not silently become permanent; prevent stale packs and certificate reuse after source corrections.

## 2. Source and architecture map

The source inventory contains 59 matching files, including tests and supporting files. 5 sources were hashed and indexed for targeted review. Prefix inventory counts are discovery aids, not reviewed-file counts. The full list and source hashes are in [the source manifest](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/source-manifest.json>).

| Layer | Current source/navigation anchor | Evidence boundary |
|---|---|---|
| services | [services/accounting/close-assurance.service.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts:1>) | 4383 lines; SHA-256 dc721de85a3f… |
| components | [components/accounting/CloseAssuranceCenter.tsx](<E:/ohada saas/Focused projects/stoquify/components/accounting/CloseAssuranceCenter.tsx:3>) | 1386 lines; SHA-256 6b165cdf9280… |
| actions | [actions/accounting/close-assurance.actions.ts](<E:/ohada saas/Focused projects/stoquify/actions/accounting/close-assurance.actions.ts:3>) | 337 lines; SHA-256 5576796f56b0… |
| components | [components/assurance/AssuranceIncidentDetailView.tsx](<E:/ohada saas/Focused projects/stoquify/components/assurance/AssuranceIncidentDetailView.tsx:1>) | 202 lines; SHA-256 7fbf7ea530d4… |
| components | [components/assurance/AssuranceIncidentActions.tsx](<E:/ohada saas/Focused projects/stoquify/components/assurance/AssuranceIncidentActions.tsx:3>) | 512 lines; SHA-256 8b7d26f571ce… |

Route/API paths must be expanded from callers; absence from the selected prefix inventory is not a declaration that none exist.

### Data declarations

| Schema model | Selected declared storage/relationship facts |
|---|---|
| [CloseRun](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7248>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); period   AccountingPeriod @relation(fields: [periodId], references: [id], onDelete: Cascade); evidenceCoveragePct  Decimal?       @db.Decimal(5, 2) |
| [CloseChecklistItem](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7292>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); period   AccountingPeriod @relation(fields: [periodId], references: [id], onDelete: Cascade); closeRun   CloseRun @relation(fields: [closeRunId], references: [id], onDelete: Cascade) |
| [CloseAssuranceFinding](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7331>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); period   AccountingPeriod @relation(fields: [periodId], references: [id], onDelete: Cascade); closeRun   CloseRun @relation(fields: [closeRunId], references: [id], onDelete: Cascade) |
| [CloseEvidenceItem](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7386>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); period   AccountingPeriod @relation(fields: [periodId], references: [id], onDelete: Cascade); closeRun   CloseRun @relation(fields: [closeRunId], references: [id], onDelete: Cascade) |
| [ClosePackExport](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7431>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); period   AccountingPeriod @relation(fields: [periodId], references: [id], onDelete: Cascade); closeRun   CloseRun @relation(fields: [closeRunId], references: [id], onDelete: Cascade) |
| [AccountantReview](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7463>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); period   AccountingPeriod @relation(fields: [periodId], references: [id], onDelete: Cascade); closeRun   CloseRun @relation(fields: [closeRunId], references: [id], onDelete: Cascade) |
| [AccountantAccessGrant](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7535>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); @@index([organizationId, status, expiresAt]); @@index([accountantUserId, status, expiresAt]) |
| [WorkflowAssuranceIncident](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:8834>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); definition   WorkflowAssuranceCheckDefinition @relation(fields: [definitionId], references: [id], onDelete: Restrict); checkRun   WorkflowAssuranceCheckRun? @relation(fields: [checkRunId], references: [id], onDelete: SetNull) |
| [WorkflowAssuranceWaiver](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:9005>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); incident   WorkflowAssuranceIncident @relation(fields: [incidentId], references: [id], onDelete: Cascade); @@index([organizationId, incidentId, status]) |

These are schema declarations. Exact migration application, actual constraints/indexes, row populations, query plans and direct-write bypasses remain unverified. See the platform package for migration/restore ownership.

### Workflow trace and handoffs

The diagram is the review boundary and required end-to-end trace. Source links and selected tests substantiate only the portions described in this report; it does not claim every edge was exercised.

```mermaid
flowchart LR
  A["Business trigger / source"] --> B["Fresh tenant and role authority"]
  B --> C["CLS: owning domain service"]
  C --> D["Transaction and source evidence"]
  D --> E["Event / dependent workflow"]
  D --> F["Read model / query scope"]
  F --> G["UI / export / recovery"]
  E --> H["Reconciliation / assurance"]
```

| Workflow | Expected outcome | Evidence disposition |
|---|---|---|
| CLS-FLOW-1 | Collect reconciliations and route material blockers to owners | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| CLS-FLOW-2 | Review waivers and bind sign-off to evidence revision | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| CLS-FLOW-3 | Export close packs and invalidate assurance after material changes | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |

**Integration contracts:** [PAY — Providers, statements, matching and suspense](payments-reconciliation-review-and-action-plan-2026-09-08.md); [PUR — Purchasing, supplier collaboration and AP](purchasing-suppliers-ap-review-and-action-plan-2026-09-08.md); [INV — Inventory, transfers, counts and valuation](inventory-valuation-review-and-action-plan-2026-09-08.md); [PRL — Payroll, payslips, obligations and payment](payroll-review-and-action-plan-2026-09-08.md); [CMP — Fiscal documents, compliance and country packs](compliance-country-packs-review-and-action-plan-2026-09-08.md); [EVT — Events, recovery, migrations and platform operations](events-platform-reliability-review-and-action-plan-2026-09-08.md); [IAM — Identity, tenant access, settings and administration](identity-settings-admin-review-and-action-plan-2026-09-08.md). These identify validation/ownership interfaces, not permission to duplicate their implementations. Accounting remains owned by [the existing accounting roadmap](accounting-correction-execution-roadmap-2026-09-08.md).

**Graph navigation:** graph_actions.json node `accounting_close_assurance_actions_ts`, community 6 (L1); graph_actions.json node `accounting_close_assurance_actions_revalidateclosepaths`, community 6 (L64); graph_components.json node `accounting_closeassurancecenter_tsx`, community 4 (L1); graph_components.json node `accounting_closeassurancecenter_formatdate`, community 4 (L228). Graph extracts predate this review and are not runtime proof.

## 3. Controls to preserve

The following assertions passed against mocks/injected clients in this run. Preserve their contracts while extending validation; test names are not broader certification claims.

- assurance control tower service filters incidents by route permission and summarizes visible queues.
- assurance control tower service surfaces engine health as blocked when stale runs or alert failures exist.

## 4. Findings, limitations and risks

No new confirmed defect is assigned in the sampled evidence. The following scenarios remain material verification requirements; they must not be reclassified as observed incidents or accepted controls without tests.

### Additional module scenarios still requiring verification

- **CLS-VERIFY-1:** A green checklist does not prove every producer was examined. Owner: Assurance engineering and independent controller. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **CLS-VERIFY-2:** Time-bound waivers must not silently become permanent. Owner: Assurance engineering and independent controller. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **CLS-VERIFY-3:** Prevent stale packs and certificate reuse after source corrections. Owner: Assurance engineering and independent controller. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.

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
| Statutory and country review | No new statutory interpretation is made. Escalate any discovered country-specific output to CMP/qualified review. |
| QA and release | 2 passed, 0 failed in the selected suite. linked test source. Unit results do not replace integrated evidence. |
| SRE, performance and cost | No latency/load/restore measurements; establish bounded reads, worker age/error metrics, alerts, retries and support ownership before rollout. |
| AI and agent authority | AI model behavior is not applicable unless a connected agent consumes this module; review that access contract without adding AI features. |
| Packaging, billing and operations | Confirm actual catalog/entitlement scope and mandatory retained obligations. Provider billing, adoption and customer outcomes are unverified. |

## 6. Ordered execution plan

### PM-CLS-01 — Bind current scope, owners and candidate

**Status:** READY. **Owner:** Assurance engineering and independent controller. **Effort:** 1–2 reviewer days.

**Deliverable:** Confirm every listed workflow, supported variant and relevant prior ACC/ACR or STQ-RM item; hash current sources, map entry points and name a domain reviewer.

**Acceptance:** All material paths have active/legacy/deferred status; no existing change is overwritten.

**Prerequisite:** Candidate/owner availability; existing historical evidence is a lead.. 

### PM-CLS-02 — Reproduce priority risks and freeze contracts

**Status:** PLANNED. **Owner:** Assurance engineering and independent controller. **Effort:** 2–4 reviewer/QA days; isolated environments may extend elapsed time.

**Deliverable:** A green checklist does not prove every producer was examined; Time-bound waivers must not silently become permanent; Prevent stale packs and certificate reuse after source corrections. Reproduce all linked findings before prescribing data repair.

**Acceptance:** A scenario ledger records expected/observed behavior, source IDs, denied side effects and remaining blockers.

**Prerequisite:** PM-CLS-01. 

### PM-CLS-03 — Implement verified corrections and investigate affected data

**Status:** CONDITIONAL_ON_CONFIRMED_FINDINGS. **Owner:** Assurance engineering and independent controller. **Effort:** Use linked finding estimates; otherwise estimate after diagnosis.

**Deliverable:** Correct the smallest owning boundary; preserve domain history, shared controls and public contracts. Investigate historical impact separately and design reversible repair only if needed.

**Acceptance:** Focused regression, cross-module tie-out and review prove the correction; no speculative implementation or silent historical rewrite.

**Prerequisite:** PM-CLS-02. If no defect is confirmed, record a reviewed no-change disposition; this satisfies the decision step without speculative work.

### PM-CLS-04 — Verify integrated release and controlled rollout

**Status:** PLANNED. **Owner:** Assurance engineering and independent controller. **Effort:** 2–3 reviewer/QA days plus the real operational cycle.

**Deliverable:** Run isolated DB failure/concurrency scenarios, authenticated role/locale/cache tests, representative performance/export checks and recovery rehearsal. Pilot the agreed supported scope.

**Acceptance:** No unexplained material mismatch, unauthorized effect or stale evidence claim; domain reviewer and operations owner accept scoped results.

**Prerequisite:** PM-CLS-03. 

Existing accounting and enterprise roadmap estimates must be deduplicated: PM findings linked to ACC/ACR or STQ-RM reuse the owning task. Reviewer-day estimates here are not engineering effort for a complete rewrite and must not be summed with the accounting roadmap as if independent.

## 7. Data correction, rollout and completion

Investigate exposure using source IDs, time/currency scope, counts and reconciled totals before proposing any repair. Preserve original records, hashes and exports; use reviewed corrective transactions or versioned migration only where necessary. Rehearse backup/restore and rollback in a disposable environment. Code correction and historical reconciliation are separate acceptance items. A query/display issue alone does not justify rewriting financial history.

Start with an agreed eligible pilot and observe a complete relevant cycle (sale/refund/shift; receiving/invoice/payment; payroll period; or close). Stop expansion on unauthorized effects, unexplained material mismatches, duplicate effects or stale proof. Record incident owner, recovery route and the data needed for investigation. No pilot or release is authorized or completed by this document.

Completion requires disposition for every workflow, current-source evidence for each significant claim, tested or explicit blocked failure scenarios, domain-reviewed corrective work and an understood operational handoff. [The tailored audit prompt](close-assurance-audit-execution-prompt-2026-09-08.md) provides the full repeatable execution brief.

## 8. Evidence and provenance

Commit: `a05a41ef66cd5d98fd69ae3df18225795f912232`; branch: `codex/migration-control-plane-release-2026-08-29`. Initial capture: 2026-09-08T14:41:48.494Z. Dirty workspace preserved; claims bind to file hashes, not clean HEAD. Unit command: 2026-09-08T14:43:08.844Z to 2026-09-08T14:44:14.458Z; exit 1. See [exact command](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-command.json>), [assertion results](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.json>), [test log](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.log>) and [shared evidence index](platform-module-evidence-index-2026-09-08.md). Historical reports were used for navigation and work deduplication; their earlier pass counts are not included in this run.
