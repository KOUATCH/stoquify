# Fiscal documents, compliance and country packs: review and plan of action

**Prepared:** 8 September 2026. **Package:** CMP. **Status:** SOURCE_REVIEW_AND_FOCUSED_VERIFICATION; implementation not started by this run.

## 1. Assessment and scope

This is a source review and focused local verification, not a full runtime certification. Database clients in the selected tests are mocked or injected. No deployed database, authenticated browser, live provider, production telemetry, restore rehearsal or qualified statutory approval was inspected in this run. Unexecuted scenarios below are acceptance requirements, not test results. No application code, migration, business record or deployment is changed by this report.

**Accountable roles:** Compliance engineering and qualified jurisdiction reviewer. **Catalog coverage:** compliance

**Selected verification:** 5 passed, 0 failed in the selected suite. [Test source](<E:/ohada saas/Focused projects/stoquify/services/compliance/__tests__/fiscal-document.service.test.ts>). No additional defect was confirmed in the selected slice; that is not evidence that the complete module is correct.

The highest-risk review questions are do not infer uniform regional tax/payroll rules from OHADA accounting coverage; prove sequence uniqueness and retry behavior in deployed constraints and provider sandbox; clearly block unsupported/expired packs and review mappings professionally.

## 2. Source and architecture map

The source inventory contains 45 matching files, including tests and supporting files. 5 sources were hashed and indexed for targeted review. Prefix inventory counts are discovery aids, not reviewed-file counts. The full list and source hashes are in [the source manifest](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/source-manifest.json>).

| Layer | Current source/navigation anchor | Evidence boundary |
|---|---|---|
| services | [services/compliance/fiscal-document.service.ts](<E:/ohada saas/Focused projects/stoquify/services/compliance/fiscal-document.service.ts:1>) | 608 lines; SHA-256 ca4a7cc19a66… |
| hooks | [hooks/compliance/useComplianceCenter.ts](<E:/ohada saas/Focused projects/stoquify/hooks/compliance/useComplianceCenter.ts:3>) | 72 lines; SHA-256 9620878bd853… |
| actions | [actions/compliance/country-adapter-pilot.actions.ts](<E:/ohada saas/Focused projects/stoquify/actions/compliance/country-adapter-pilot.actions.ts:3>) | 176 lines; SHA-256 cd3462aa5372… |
| actions | [actions/compliance/compliance-center.actions.ts](<E:/ohada saas/Focused projects/stoquify/actions/compliance/compliance-center.actions.ts:3>) | 135 lines; SHA-256 53446e7aa3eb… |
| components | [components/compliance/ComplianceCenterDashboard.tsx](<E:/ohada saas/Focused projects/stoquify/components/compliance/ComplianceCenterDashboard.tsx:3>) | 894 lines; SHA-256 78611feb5c26… |

Route/API paths must be expanded from callers; absence from the selected prefix inventory is not a declaration that none exist.

### Data declarations

| Schema model | Selected declared storage/relationship facts |
|---|---|
| [FiscalDocument](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:8253>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict); postingBatch   LedgerPostingBatch @relation(fields: [postingBatchId], references: [id], onDelete: Restrict); journalEntry   JournalEntry? @relation(fields: [journalEntryId], references: [id], onDelete: Restrict) |
| [FiscalDocumentLine](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:8348>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict); fiscalDocument   FiscalDocument @relation(fields: [fiscalDocumentId], references: [id], onDelete: Restrict); quantity       Decimal @db.Decimal(18, 3) |
| [FiscalSequence](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:8383>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict); @@unique([organizationId, countryCode, documentType, fiscalYear, fiscalPeriodKey, scopeKey]); @@index([organizationId, status, countryCode]) |
| [ComplianceSubmission](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:8414>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict); fiscalDocument   FiscalDocument @relation(fields: [fiscalDocumentId], references: [id], onDelete: Restrict); adapterConfig   ComplianceAdapterConfig? @relation(fields: [adapterConfigId], references: [id], onDelete: Restrict) |
| [ComplianceAdapterConfig](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:8470>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict); @@unique([organizationId, countryCode, authorityChannel, environment]); @@index([organizationId, status, countryCode]) |
| [ComplianceEvidence](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:8522>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict); fiscalDocument   FiscalDocument? @relation(fields: [fiscalDocumentId], references: [id], onDelete: Restrict); submission   ComplianceSubmission? @relation(fields: [submissionId], references: [id], onDelete: Restrict) |

These are schema declarations. Exact migration application, actual constraints/indexes, row populations, query plans and direct-write bypasses remain unverified. See the platform package for migration/restore ownership.

### Workflow trace and handoffs

The diagram is the review boundary and required end-to-end trace. Source links and selected tests substantiate only the portions described in this report; it does not claim every edge was exercised.

```mermaid
flowchart LR
  A["Business trigger / source"] --> B["Fresh tenant and role authority"]
  B --> C["CMP: owning domain service"]
  C --> D["Transaction and source evidence"]
  D --> E["Event / dependent workflow"]
  D --> F["Read model / query scope"]
  F --> G["UI / export / recovery"]
  E --> H["Reconciliation / assurance"]
```

| Workflow | Expected outcome | Evidence disposition |
|---|---|---|
| CMP-FLOW-1 | Select a supported country/regime/effective-date pack with provenance | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| CMP-FLOW-2 | Allocate fiscal sequences and issue documents from eligible posted sources | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| CMP-FLOW-3 | Submit, poll and reconcile acceptance/rejection with provider evidence | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |

**Integration contracts:** [IAM — Identity, tenant access, settings and administration](identity-settings-admin-review-and-action-plan-2026-09-08.md); [EVT — Events, recovery, migrations and platform operations](events-platform-reliability-review-and-action-plan-2026-09-08.md). These identify validation/ownership interfaces, not permission to duplicate their implementations. Accounting remains owned by [the existing accounting roadmap](accounting-correction-execution-roadmap-2026-09-08.md).

**Graph navigation:** graph_actions.json node `compliance_compliance_center_actions_ts`, community 62 (L1); graph_actions.json node `compliance_compliance_center_actions_revalidatecompliancepaths`, community 62 (L35); graph_components.json node `compliance_compliancecenterdashboard_tsx`, community 19 (L1); graph_components.json node `compliance_compliancecenterdashboard_sumcounts`, community 19 (L62); graph_hooks.json node `compliance_usecompliancecenter_ts`, community 29 (L1); graph_hooks.json node `compliance_usecompliancecenter_toactionerror`, community 29 (L30). Graph extracts predate this review and are not runtime proof.

## 3. Controls to preserve

The following assertions passed against mocks/injected clients in this run. Preserve their contracts while extending validation; test names are not broader certification claims.

- compliance fiscal document business events records fiscal document and authority submission events in the creation transaction.
- compliance fiscal document business events does not create fiscal or business-event evidence without posted ledger source.
- compliance fiscal document business events does not create fiscal evidence when the posted source has no accounting source link.
- compliance submission outbox events rejects production submissions before opening a transaction.

## 4. Findings, limitations and risks

No new confirmed defect is assigned in the sampled evidence. The following scenarios remain material verification requirements; they must not be reclassified as observed incidents or accepted controls without tests.

### Additional module scenarios still requiring verification

- **CMP-VERIFY-1:** Do not infer uniform regional tax/payroll rules from OHADA accounting coverage. Owner: Compliance engineering and qualified jurisdiction reviewer. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **CMP-VERIFY-2:** Prove sequence uniqueness and retry behavior in deployed constraints and provider sandbox. Owner: Compliance engineering and qualified jurisdiction reviewer. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **CMP-VERIFY-3:** Clearly block unsupported/expired packs and review mappings professionally. Owner: Compliance engineering and qualified jurisdiction reviewer. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.

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
| QA and release | 5 passed, 0 failed in the selected suite. linked test source. Unit results do not replace integrated evidence. |
| SRE, performance and cost | No latency/load/restore measurements; establish bounded reads, worker age/error metrics, alerts, retries and support ownership before rollout. |
| AI and agent authority | AI model behavior is not applicable unless a connected agent consumes this module; review that access contract without adding AI features. |
| Packaging, billing and operations | Confirm actual catalog/entitlement scope and mandatory retained obligations. Provider billing, adoption and customer outcomes are unverified. |

## 6. Ordered execution plan

### PM-CMP-01 — Bind current scope, owners and candidate

**Status:** READY. **Owner:** Compliance engineering and qualified jurisdiction reviewer. **Effort:** 1–2 reviewer days.

**Deliverable:** Confirm every listed workflow, supported variant and relevant prior ACC/ACR or STQ-RM item; hash current sources, map entry points and name a domain reviewer.

**Acceptance:** All material paths have active/legacy/deferred status; no existing change is overwritten.

**Prerequisite:** Candidate/owner availability; existing historical evidence is a lead.. 

### PM-CMP-02 — Reproduce priority risks and freeze contracts

**Status:** PLANNED. **Owner:** Compliance engineering and qualified jurisdiction reviewer. **Effort:** 2–4 reviewer/QA days; isolated environments may extend elapsed time.

**Deliverable:** Do not infer uniform regional tax/payroll rules from OHADA accounting coverage; Prove sequence uniqueness and retry behavior in deployed constraints and provider sandbox; Clearly block unsupported/expired packs and review mappings professionally. Reproduce all linked findings before prescribing data repair.

**Acceptance:** A scenario ledger records expected/observed behavior, source IDs, denied side effects and remaining blockers.

**Prerequisite:** PM-CMP-01. 

### PM-CMP-03 — Implement verified corrections and investigate affected data

**Status:** CONDITIONAL_ON_CONFIRMED_FINDINGS. **Owner:** Compliance engineering and qualified jurisdiction reviewer. **Effort:** Use linked finding estimates; otherwise estimate after diagnosis.

**Deliverable:** Correct the smallest owning boundary; preserve domain history, shared controls and public contracts. Investigate historical impact separately and design reversible repair only if needed.

**Acceptance:** Focused regression, cross-module tie-out and review prove the correction; no speculative implementation or silent historical rewrite.

**Prerequisite:** PM-CMP-02. If no defect is confirmed, record a reviewed no-change disposition; this satisfies the decision step without speculative work.

### PM-CMP-04 — Verify integrated release and controlled rollout

**Status:** PLANNED. **Owner:** Compliance engineering and qualified jurisdiction reviewer. **Effort:** 2–3 reviewer/QA days plus the real operational cycle.

**Deliverable:** Run isolated DB failure/concurrency scenarios, authenticated role/locale/cache tests, representative performance/export checks and recovery rehearsal. Pilot the agreed supported scope.

**Acceptance:** No unexplained material mismatch, unauthorized effect or stale evidence claim; domain reviewer and operations owner accept scoped results.

**Prerequisite:** PM-CMP-03. 

Existing accounting and enterprise roadmap estimates must be deduplicated: PM findings linked to ACC/ACR or STQ-RM reuse the owning task. Reviewer-day estimates here are not engineering effort for a complete rewrite and must not be summed with the accounting roadmap as if independent.

## 7. Data correction, rollout and completion

Investigate exposure using source IDs, time/currency scope, counts and reconciled totals before proposing any repair. Preserve original records, hashes and exports; use reviewed corrective transactions or versioned migration only where necessary. Rehearse backup/restore and rollback in a disposable environment. Code correction and historical reconciliation are separate acceptance items. A query/display issue alone does not justify rewriting financial history.

Start with an agreed eligible pilot and observe a complete relevant cycle (sale/refund/shift; receiving/invoice/payment; payroll period; or close). Stop expansion on unauthorized effects, unexplained material mismatches, duplicate effects or stale proof. Record incident owner, recovery route and the data needed for investigation. No pilot or release is authorized or completed by this document.

Completion requires disposition for every workflow, current-source evidence for each significant claim, tested or explicit blocked failure scenarios, domain-reviewed corrective work and an understood operational handoff. [The tailored audit prompt](compliance-country-packs-audit-execution-prompt-2026-09-08.md) provides the full repeatable execution brief.

## 8. Evidence and provenance

Commit: `a05a41ef66cd5d98fd69ae3df18225795f912232`; branch: `codex/migration-control-plane-release-2026-08-29`. Initial capture: 2026-09-08T14:41:48.494Z. Dirty workspace preserved; claims bind to file hashes, not clean HEAD. Unit command: 2026-09-08T14:43:08.844Z to 2026-09-08T14:44:14.458Z; exit 1. See [exact command](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-command.json>), [assertion results](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.json>), [test log](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.log>) and [shared evidence index](platform-module-evidence-index-2026-09-08.md). Historical reports were used for navigation and work deduplication; their earlier pass counts are not included in this run.
