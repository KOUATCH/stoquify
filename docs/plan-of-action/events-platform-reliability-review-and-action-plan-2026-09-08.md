# Events, recovery, migrations and platform operations: review and plan of action

**Prepared:** 8 September 2026. **Package:** EVT. **Status:** SOURCE_REVIEW_AND_FOCUSED_VERIFICATION; implementation not started by this run.

## 1. Assessment and scope

This is a source review and focused local verification, not a full runtime certification. Database clients in the selected tests are mocked or injected. No deployed database, authenticated browser, live provider, production telemetry, restore rehearsal or qualified statutory approval was inspected in this run. Unexecuted scenarios below are acceptance requirements, not test results. No application code, migration, business record or deployment is changed by this report.

**Accountable roles:** Platform/database engineering and SRE. **Catalog coverage:** Cross-module workflow; not a standalone catalog promise.

**Selected verification:** 7 passed, 0 failed in the selected suite. [Test source](<E:/ohada saas/Focused projects/stoquify/services/events/__tests__/business-event-outbox.service.test.ts>). This package owns or consumes PM-INV-001.

The highest-risk review questions are deduplication hashes alone do not prove concurrent/external exactly-once effects; preserve conflict evidence across rollback and fence stale workers; repository migrations do not establish deployed constraints; inspect scripts before execution.

## 2. Source and architecture map

The source inventory contains 52 matching files, including tests and supporting files. 2 sources were hashed and indexed for targeted review. Prefix inventory counts are discovery aids, not reviewed-file counts. The full list and source hashes are in [the source manifest](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/source-manifest.json>).

| Layer | Current source/navigation anchor | Evidence boundary |
|---|---|---|
| services | [services/events/business-event-outbox.service.ts](<E:/ohada saas/Focused projects/stoquify/services/events/business-event-outbox.service.ts:1>) | 487 lines; SHA-256 3a5aaab68614… |
| services | [services/events/business-event.service.ts](<E:/ohada saas/Focused projects/stoquify/services/events/business-event.service.ts:1>) | 384 lines; SHA-256 a38323f20b71… |

Route/API paths must be expanded from callers; absence from the selected prefix inventory is not a declaration that none exist.

### Data declarations

| Schema model | Selected declared storage/relationship facts |
|---|---|
| [BusinessEvent](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:8023>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); @@unique([organizationId, eventSource, idempotencyKey]); @@unique([organizationId, id]) |
| [BusinessEventOutbox](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:8083>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); businessEvent   BusinessEvent @relation(fields: [businessEventId], references: [id], onDelete: Cascade); @@unique([organizationId, channel, idempotencyKey]) |
| [BusinessEventAudit](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:8125>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); businessEvent   BusinessEvent @relation(fields: [businessEventId], references: [id], onDelete: Cascade); @@index([organizationId, createdAt]) |
| [BusinessEventAnomaly](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:8150>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); businessEvent   BusinessEvent @relation(fields: [businessEventId], references: [id], onDelete: Cascade); @@unique([organizationId, businessEventId, anomalyType, fingerprint]) |
| [AuditLog](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:9258>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); @@index([entityType, entityId, createdAt]) // entity history view; @@index([organizationId, createdAt]) |

These are schema declarations. Exact migration application, actual constraints/indexes, row populations, query plans and direct-write bypasses remain unverified. See the platform package for migration/restore ownership.

### Workflow trace and handoffs

The diagram is the review boundary and required end-to-end trace. Source links and selected tests substantiate only the portions described in this report; it does not claim every edge was exercised.

```mermaid
flowchart LR
  A["Business trigger / source"] --> B["Fresh tenant and role authority"]
  B --> C["EVT: owning domain service"]
  C --> D["Transaction and source evidence"]
  D --> E["Event / dependent workflow"]
  D --> F["Read model / query scope"]
  F --> G["UI / export / recovery"]
  E --> H["Reconciliation / assurance"]
```

| Workflow | Expected outcome | Evidence disposition |
|---|---|---|
| EVT-FLOW-1 | Persist source, event and intended delivery in the owning transaction | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| EVT-FLOW-2 | Lease, retry, quarantine and replay while preserving one intended effect | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| EVT-FLOW-3 | Rehearse migrations, deployment, restore, alerts and incident response | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |

**Integration contracts:** [IAM — Identity, tenant access, settings and administration](identity-settings-admin-review-and-action-plan-2026-09-08.md). These identify validation/ownership interfaces, not permission to duplicate their implementations. Accounting remains owned by [the existing accounting roadmap](accounting-correction-execution-roadmap-2026-09-08.md).

**Graph navigation:** No matching node selected; current source inventory is authoritative.. Graph extracts predate this review and are not runtime proof.

## 3. Controls to preserve

The following assertions passed against mocks/injected clients in this run. Preserve their contracts while extending validation; test names are not broader certification claims.

- business event outbox gateway claims only tenant-scoped messages with a bounded lease attempt.
- business event outbox gateway dead-letters an exhausted candidate instead of leasing it again.
- business event outbox gateway completes delivery and audit evidence in the same transaction.
- business event outbox gateway retries a safe typed failure without persisting raw unknown error details.

## 4. Findings, limitations and risks

### PM-INV-001 — Inventory idempotency-conflict test fails while recording anomaly evidence

**CONFIRMED_VERIFICATION_FAILURE · P1.** Confidence: High for failing test; deployed defect not established. Likelihood: Reproduced in the local fixture; deployed frequency unknown.

**Evidence:** [services/inventory/__tests__/inventory-stock-event.service.test.ts:431](<E:/ohada saas/Focused projects/stoquify/services/inventory/__tests__/inventory-stock-event.service.test.ts:431>); [services/events/business-event-anomaly.service.ts:119](<E:/ohada saas/Focused projects/stoquify/services/events/business-event-anomaly.service.ts:119>); [services/inventory/inventory-stock-event.service.ts:692](<E:/ohada saas/Focused projects/stoquify/services/inventory/inventory-stock-event.service.ts:692>).

**Trigger:** The focused test reuses a stock event key with a different payload hash.

**Expected:** A conflicting replay is rejected without stock mutation, and durable conflict evidence survives the required transaction outcome.

**Observed:** Expected an idempotency-key conflict; received Business-event conflict evidence could not be recorded. The later assertions about stock mutation are not reached after the failed expectation.

**Cause / uncertainty:** Unresolved interaction between the fixture evidence client and the current anomaly-recording contract.

**Consequences:** The current verification packet cannot prove this financial/stock retry boundary. A stale test mock is plausible; a real evidence failure must be ruled out.

**Existing mitigation:** The operation rejects in the observed test; other stock and outbox checks pass. Rejection alone does not establish complete evidence retention.

**Correction:** Inspect injected versus independent evidence clients, update obsolete fixtures only if confirmed, and add an isolated PostgreSQL replay/rollback scenario before changing runtime logic.

**Acceptance:** Identical replay is idempotent; changed payload returns the intended safe conflict; quantities/ledger effects stay unchanged and the required conflict evidence is queryable after rollback.

**Owner / estimate:** Inventory and event-platform engineering; 1–2 engineering days for diagnosis; any runtime fix and DB validation sized after reproduction. Estimates are planning judgments, not booked capacity.

**Data and rollout:** No stock backfill justified by this test alone. If a real defect is confirmed, investigate source IDs and quantities before authorizing repair.

**Related earlier work:** ACC-015


### Additional module scenarios still requiring verification

- **EVT-VERIFY-1:** Deduplication hashes alone do not prove concurrent/external exactly-once effects. Owner: Platform/database engineering and SRE. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **EVT-VERIFY-2:** Preserve conflict evidence across rollback and fence stale workers. Owner: Platform/database engineering and SRE. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **EVT-VERIFY-3:** Repository migrations do not establish deployed constraints; inspect scripts before execution. Owner: Platform/database engineering and SRE. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.

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
| QA and release | 7 passed, 0 failed in the selected suite. linked test source. Unit results do not replace integrated evidence. |
| SRE, performance and cost | No latency/load/restore measurements; establish bounded reads, worker age/error metrics, alerts, retries and support ownership before rollout. |
| AI and agent authority | AI model behavior is not applicable unless a connected agent consumes this module; review that access contract without adding AI features. |
| Packaging, billing and operations | Confirm actual catalog/entitlement scope and mandatory retained obligations. Provider billing, adoption and customer outcomes are unverified. |

## 6. Ordered execution plan

### PM-EVT-01 — Bind current scope, owners and candidate

**Status:** READY. **Owner:** Platform/database engineering and SRE. **Effort:** 1–2 reviewer days.

**Deliverable:** Confirm every listed workflow, supported variant and relevant prior ACC/ACR or STQ-RM item; hash current sources, map entry points and name a domain reviewer.

**Acceptance:** All material paths have active/legacy/deferred status; no existing change is overwritten.

**Prerequisite:** Candidate/owner availability; existing historical evidence is a lead.. 

### PM-EVT-02 — Reproduce priority risks and freeze contracts

**Status:** PLANNED. **Owner:** Platform/database engineering and SRE. **Effort:** 2–4 reviewer/QA days; isolated environments may extend elapsed time.

**Deliverable:** Deduplication hashes alone do not prove concurrent/external exactly-once effects; Preserve conflict evidence across rollback and fence stale workers; Repository migrations do not establish deployed constraints; inspect scripts before execution. Reproduce all linked findings before prescribing data repair.

**Acceptance:** A scenario ledger records expected/observed behavior, source IDs, denied side effects and remaining blockers.

**Prerequisite:** PM-EVT-01. 

### PM-EVT-03 — Implement verified corrections and investigate affected data

**Status:** CONDITIONAL_ON_CONFIRMED_FINDINGS. **Owner:** Platform/database engineering and SRE. **Effort:** Use linked finding estimates; otherwise estimate after diagnosis.

**Deliverable:** Correct the smallest owning boundary; preserve domain history, shared controls and public contracts. Investigate historical impact separately and design reversible repair only if needed.

**Acceptance:** Focused regression, cross-module tie-out and review prove the correction; no speculative implementation or silent historical rewrite.

**Prerequisite:** PM-EVT-02. If no defect is confirmed, record a reviewed no-change disposition; this satisfies the decision step without speculative work.

### PM-EVT-04 — Verify integrated release and controlled rollout

**Status:** PLANNED. **Owner:** Platform/database engineering and SRE. **Effort:** 2–3 reviewer/QA days plus the real operational cycle.

**Deliverable:** Run isolated DB failure/concurrency scenarios, authenticated role/locale/cache tests, representative performance/export checks and recovery rehearsal. Pilot the agreed supported scope.

**Acceptance:** No unexplained material mismatch, unauthorized effect or stale evidence claim; domain reviewer and operations owner accept scoped results.

**Prerequisite:** PM-EVT-03. 

Existing accounting and enterprise roadmap estimates must be deduplicated: PM findings linked to ACC/ACR or STQ-RM reuse the owning task. Reviewer-day estimates here are not engineering effort for a complete rewrite and must not be summed with the accounting roadmap as if independent.

## 7. Data correction, rollout and completion

Investigate exposure using source IDs, time/currency scope, counts and reconciled totals before proposing any repair. Preserve original records, hashes and exports; use reviewed corrective transactions or versioned migration only where necessary. Rehearse backup/restore and rollback in a disposable environment. Code correction and historical reconciliation are separate acceptance items. A query/display issue alone does not justify rewriting financial history.

Start with an agreed eligible pilot and observe a complete relevant cycle (sale/refund/shift; receiving/invoice/payment; payroll period; or close). Stop expansion on unauthorized effects, unexplained material mismatches, duplicate effects or stale proof. Record incident owner, recovery route and the data needed for investigation. No pilot or release is authorized or completed by this document.

Completion requires disposition for every workflow, current-source evidence for each significant claim, tested or explicit blocked failure scenarios, domain-reviewed corrective work and an understood operational handoff. [The tailored audit prompt](events-platform-reliability-audit-execution-prompt-2026-09-08.md) provides the full repeatable execution brief.

## 8. Evidence and provenance

Commit: `a05a41ef66cd5d98fd69ae3df18225795f912232`; branch: `codex/migration-control-plane-release-2026-08-29`. Initial capture: 2026-09-08T14:41:48.494Z. Dirty workspace preserved; claims bind to file hashes, not clean HEAD. Unit command: 2026-09-08T14:43:08.844Z to 2026-09-08T14:44:14.458Z; exit 1. See [exact command](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-command.json>), [assertion results](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.json>), [test log](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.log>) and [shared evidence index](platform-module-evidence-index-2026-09-08.md). Historical reports were used for navigation and work deduplication; their earlier pass counts are not included in this run.
