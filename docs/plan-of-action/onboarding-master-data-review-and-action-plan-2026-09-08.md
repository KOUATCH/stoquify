# Onboarding, imports and migration readiness: review and plan of action

**Prepared:** 8 September 2026. **Package:** ONB. **Status:** SOURCE_REVIEW_AND_FOCUSED_VERIFICATION; implementation not started by this run.

## 1. Assessment and scope

This is a source review and focused local verification, not a full runtime certification. Database clients in the selected tests are mocked or injected. No deployed database, authenticated browser, live provider, production telemetry, restore rehearsal or qualified statutory approval was inspected in this run. Unexecuted scenarios below are acceptance requirements, not test results. No application code, migration, business record or deployment is changed by this report.

**Accountable roles:** Migration engineering and onboarding operations. **Catalog coverage:** Cross-module workflow; not a standalone catalog promise.

**Selected verification:** 9 passed, 0 failed in the selected suite. [Test source](<E:/ohada saas/Focused projects/stoquify/services/onboarding/__tests__/master-data-import-guards.test.ts>). No additional defect was confirmed in the selected slice; that is not evidence that the complete module is correct.

The highest-risk review questions are master-data import is not full financial migration or opening-balance cutover; test retries, changed evidence and partial commit recovery; preserve originals and rehearse restore before historical financial repair.

## 2. Source and architecture map

The source inventory contains 28 matching files, including tests and supporting files. 3 sources were hashed and indexed for targeted review. Prefix inventory counts are discovery aids, not reviewed-file counts. The full list and source hashes are in [the source manifest](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/source-manifest.json>).

| Layer | Current source/navigation anchor | Evidence boundary |
|---|---|---|
| services | [services/onboarding/master-data-import.service.ts](<E:/ohada saas/Focused projects/stoquify/services/onboarding/master-data-import.service.ts:1>) | 1175 lines; SHA-256 1ea6dc2cab1e… |
| components | [components/onboarding/MasterDataOnboardingWorkbench.tsx](<E:/ohada saas/Focused projects/stoquify/components/onboarding/MasterDataOnboardingWorkbench.tsx:3>) | 425 lines; SHA-256 08dee8981356… |
| actions | [actions/onboarding/master-data-onboarding.actions.ts](<E:/ohada saas/Focused projects/stoquify/actions/onboarding/master-data-onboarding.actions.ts:3>) | 179 lines; SHA-256 972dd5bacf05… |

Route/API paths must be expanded from callers; absence from the selected prefix inventory is not a declaration that none exist.

### Data declarations

| Schema model | Selected declared storage/relationship facts |
|---|---|
| [OnboardingImportMapping](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1242>) | organization   Organization           @relation(fields: [organizationId], references: [id], onDelete: Cascade); @@unique([organizationId, target, version]); @@index([organizationId, target, createdAt]) |
| [OnboardingImportBatch](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1261>) | organization              Organization              @relation(fields: [organizationId], references: [id], onDelete: Cascade); mapping                   OnboardingImportMapping   @relation(fields: [mappingId], references: [id], onDelete: Restrict); @@unique([organizationId, target, contentHash, mappingVersion]) |
| [OnboardingImportRow](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1313>) | organization      Organization          @relation(fields: [organizationId], references: [id], onDelete: Cascade); batch             OnboardingImportBatch @relation(fields: [batchId], references: [id], onDelete: Cascade); @@unique([batchId, rowNumber]) |
| [OnboardingImportIssue](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1338>) | organization   Organization                  @relation(fields: [organizationId], references: [id], onDelete: Cascade); batch          OnboardingImportBatch         @relation(fields: [batchId], references: [id], onDelete: Cascade); row            OnboardingImportRow?          @relation(fields: [rowId], references: [id], onDelete: Cascade) |
| [OnboardingReadinessMilestone](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1358>) | organization      Organization             @relation(fields: [organizationId], references: [id], onDelete: Cascade); @@unique([organizationId, target]); @@index([organizationId, state]) |
| [Item](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:784>) | weight     Decimal? @db.Decimal(12, 3); costPrice    Decimal  @default(0) @db.Decimal(12, 2); sellingPrice Decimal  @default(0) @db.Decimal(12, 2) |
| [Supplier](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1061>) | creditLimit   Decimal? @db.Decimal(14, 2); currentBalance Decimal @default(0) @db.Decimal(14, 2); organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade) |
| [Customer](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1137>) | creditLimit  Decimal? @db.Decimal(14, 2); currentBalance Decimal @default(0) @db.Decimal(14, 2); organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade) |

These are schema declarations. Exact migration application, actual constraints/indexes, row populations, query plans and direct-write bypasses remain unverified. See the platform package for migration/restore ownership.

### Workflow trace and handoffs

The diagram is the review boundary and required end-to-end trace. Source links and selected tests substantiate only the portions described in this report; it does not claim every edge was exercised.

```mermaid
flowchart LR
  A["Business trigger / source"] --> B["Fresh tenant and role authority"]
  B --> C["ONB: owning domain service"]
  C --> D["Transaction and source evidence"]
  D --> E["Event / dependent workflow"]
  D --> F["Read model / query scope"]
  F --> G["UI / export / recovery"]
  E --> H["Reconciliation / assurance"]
```

| Workflow | Expected outcome | Evidence disposition |
|---|---|---|
| ONB-FLOW-1 | Map/stage a tenant CSV with row-level validation | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| ONB-FLOW-2 | Approve current dry-run evidence with independent high-risk review | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| ONB-FLOW-3 | Commit through owning services and recover partial failure with reconciled counts/values | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |

**Integration contracts:** [IAM — Identity, tenant access, settings and administration](identity-settings-admin-review-and-action-plan-2026-09-08.md); [MOD — Module lifecycle, packaging and billing boundaries](module-lifecycle-billing-review-and-action-plan-2026-09-08.md); [INV — Inventory, transfers, counts and valuation](inventory-valuation-review-and-action-plan-2026-09-08.md); [CUS — Customers, receivables, statements and settlement](customers-receivables-review-and-action-plan-2026-09-08.md); [PUR — Purchasing, supplier collaboration and AP](purchasing-suppliers-ap-review-and-action-plan-2026-09-08.md). These identify validation/ownership interfaces, not permission to duplicate their implementations. Accounting remains owned by [the existing accounting roadmap](accounting-correction-execution-roadmap-2026-09-08.md).

**Graph navigation:** No matching node selected; current source inventory is authoritative.. Graph extracts predate this review and are not runtime proof.

## 3. Controls to preserve

The following assertions passed against mocks/injected clients in this run. Preserve their contracts while extending validation; test names are not broader certification claims.

- master-data approval and replay guards refuses commit without a recorded explicit approval.
- master-data approval and replay guards requires a different authorized approver for a high-risk batch.
- master-data approval and replay guards records approval when a different authorized user reviews the high-risk batch.
- master-data approval and replay guards refuses a high-risk commit if stored approval evidence names the uploader.

## 4. Findings, limitations and risks

No new confirmed defect is assigned in the sampled evidence. The following scenarios remain material verification requirements; they must not be reclassified as observed incidents or accepted controls without tests.

### Additional module scenarios still requiring verification

- **ONB-VERIFY-1:** Master-data import is not full financial migration or opening-balance cutover. Owner: Migration engineering and onboarding operations. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **ONB-VERIFY-2:** Test retries, changed evidence and partial commit recovery. Owner: Migration engineering and onboarding operations. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **ONB-VERIFY-3:** Preserve originals and rehearse restore before historical financial repair. Owner: Migration engineering and onboarding operations. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.

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
| QA and release | 9 passed, 0 failed in the selected suite. linked test source. Unit results do not replace integrated evidence. |
| SRE, performance and cost | No latency/load/restore measurements; establish bounded reads, worker age/error metrics, alerts, retries and support ownership before rollout. |
| AI and agent authority | AI model behavior is not applicable unless a connected agent consumes this module; review that access contract without adding AI features. |
| Packaging, billing and operations | Confirm actual catalog/entitlement scope and mandatory retained obligations. Provider billing, adoption and customer outcomes are unverified. |

## 6. Ordered execution plan

### PM-ONB-01 — Bind current scope, owners and candidate

**Status:** READY. **Owner:** Migration engineering and onboarding operations. **Effort:** 1–2 reviewer days.

**Deliverable:** Confirm every listed workflow, supported variant and relevant prior ACC/ACR or STQ-RM item; hash current sources, map entry points and name a domain reviewer.

**Acceptance:** All material paths have active/legacy/deferred status; no existing change is overwritten.

**Prerequisite:** Candidate/owner availability; existing historical evidence is a lead.. 

### PM-ONB-02 — Reproduce priority risks and freeze contracts

**Status:** PLANNED. **Owner:** Migration engineering and onboarding operations. **Effort:** 2–4 reviewer/QA days; isolated environments may extend elapsed time.

**Deliverable:** Master-data import is not full financial migration or opening-balance cutover; Test retries, changed evidence and partial commit recovery; Preserve originals and rehearse restore before historical financial repair. Reproduce all linked findings before prescribing data repair.

**Acceptance:** A scenario ledger records expected/observed behavior, source IDs, denied side effects and remaining blockers.

**Prerequisite:** PM-ONB-01. 

### PM-ONB-03 — Implement verified corrections and investigate affected data

**Status:** CONDITIONAL_ON_CONFIRMED_FINDINGS. **Owner:** Migration engineering and onboarding operations. **Effort:** Use linked finding estimates; otherwise estimate after diagnosis.

**Deliverable:** Correct the smallest owning boundary; preserve domain history, shared controls and public contracts. Investigate historical impact separately and design reversible repair only if needed.

**Acceptance:** Focused regression, cross-module tie-out and review prove the correction; no speculative implementation or silent historical rewrite.

**Prerequisite:** PM-ONB-02. If no defect is confirmed, record a reviewed no-change disposition; this satisfies the decision step without speculative work.

### PM-ONB-04 — Verify integrated release and controlled rollout

**Status:** PLANNED. **Owner:** Migration engineering and onboarding operations. **Effort:** 2–3 reviewer/QA days plus the real operational cycle.

**Deliverable:** Run isolated DB failure/concurrency scenarios, authenticated role/locale/cache tests, representative performance/export checks and recovery rehearsal. Pilot the agreed supported scope.

**Acceptance:** No unexplained material mismatch, unauthorized effect or stale evidence claim; domain reviewer and operations owner accept scoped results.

**Prerequisite:** PM-ONB-03. 

Existing accounting and enterprise roadmap estimates must be deduplicated: PM findings linked to ACC/ACR or STQ-RM reuse the owning task. Reviewer-day estimates here are not engineering effort for a complete rewrite and must not be summed with the accounting roadmap as if independent.

## 7. Data correction, rollout and completion

Investigate exposure using source IDs, time/currency scope, counts and reconciled totals before proposing any repair. Preserve original records, hashes and exports; use reviewed corrective transactions or versioned migration only where necessary. Rehearse backup/restore and rollback in a disposable environment. Code correction and historical reconciliation are separate acceptance items. A query/display issue alone does not justify rewriting financial history.

Start with an agreed eligible pilot and observe a complete relevant cycle (sale/refund/shift; receiving/invoice/payment; payroll period; or close). Stop expansion on unauthorized effects, unexplained material mismatches, duplicate effects or stale proof. Record incident owner, recovery route and the data needed for investigation. No pilot or release is authorized or completed by this document.

Completion requires disposition for every workflow, current-source evidence for each significant claim, tested or explicit blocked failure scenarios, domain-reviewed corrective work and an understood operational handoff. [The tailored audit prompt](onboarding-master-data-audit-execution-prompt-2026-09-08.md) provides the full repeatable execution brief.

## 8. Evidence and provenance

Commit: `a05a41ef66cd5d98fd69ae3df18225795f912232`; branch: `codex/migration-control-plane-release-2026-08-29`. Initial capture: 2026-09-08T14:41:48.494Z. Dirty workspace preserved; claims bind to file hashes, not clean HEAD. Unit command: 2026-09-08T14:43:08.844Z to 2026-09-08T14:44:14.458Z; exit 1. See [exact command](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-command.json>), [assertion results](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.json>), [test log](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.log>) and [shared evidence index](platform-module-evidence-index-2026-09-08.md). Historical reports were used for navigation and work deduplication; their earlier pass counts are not included in this run.
