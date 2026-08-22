# POS + Purchase Audit Gates — Jira-ready Execution Pack
**As of:** 2026-08-18  
**Scope:** POS Enterprise Sales-to-Cash and Purchase-to-Pay readiness (as reported in yesterday’s POS + Purchase audit outputs)  
**Status:** Cross-domain P0/P1 gaps remain; report is execution-grade, not yet implementation complete.

## 1) How useful is this Jira report?

### Short answer
Very useful for execution planning: **8.7/10**

### Why it is useful
- It translates audit findings into concrete work items with explicit dependencies, boundaries, and test commands.  
- It preserves audit evidence traceability by linking each P0/P1 item to evidence files and validation commands.  
- It identifies risk hotspots that should gate release and clarifies sequencing (tenant boundaries and provider-truth first, then billing/integrations).

### What it currently misses (so it is not 10/10 yet)
- It is not a direct Jira CSV import artifact (no Jira project keys, issue IDs, field-mapping metadata, or sprint/team assignment baked in yet).  
- Some acceptance criteria need owner-level sign-off on who owns fiscal/provider/operator evidence (currently inferred from domain ownership).  
- A few P0s are policy- and operations-driven, so the full pass requires external artifacts (country pack approvals, fiscal device contracts, operator/cashier enablement attestations) before close.

---

## 2) Jira-ready ticket pack (POS + Purchase)

### 2.1 POS delivery-to-cash slice (P0/P1)

| Epic | Jira Issue Key (proposed) | Priority | Summary | Acceptance (must-have) | Owner |
|---|---|---|---|---|---|
| O2C-GOV-POS | O2C-1 | P0 | Enforce tenant-scoped `clientCommitId` replay + conflict-safe dedupe for POS commits | Duplicate POS commit attempts with same tenant key are idempotent; duplicate command for same `clientCommitId` returns existing commit result and never double-posts stock/accounting | POS Platform + API Platform |
| O2C-GOV-POS | O2C-2 | P0 | Lock provider-authoritative tender truth pipeline | Provider tender truth (cash/momo/card) is source of payment correctness; POS cash truth is read-only mirror with reconciliation checks and provider token checks | Payments + Accounting |
| O2C-GOV-POS | O2C-3 | P0 | Enforce immutable receipt/fiscal proof lineage for POS sales | Every sale has immutable chain: raw tender event → verification/validation result → fiscal token chain → accounting output | Fiscal Engine + Accounting |
| O2C-GOV-POS | O2C-4 | P0 | Standardize access-boundary checks across POS commit and payment surfaces | Tenant and tenant-role authorization is validated at command, workflow, and API boundaries for all command entry points | Security/Platform |
| O2C-GOV-POS | O2C-5 | P0 | Add release evidence package for concurrency, provider, offline close, and fiscal safety | Produce release evidence for runbook-defined production checks (concurrency, provider, offline sync close, fiscal signing, and replay safety) | QA + DevOps + PM |
| O2C-DEL | O2C-6 | P1 | Create controlled delivery/fulfillment command for scoped reservation and goods issue | Delivery command creates scoped reservation, records reservation/issue state transitions, writes outbox + inventory movement + workflow proof | Inventory + POS Workflow |
| O2C-DEL | O2C-7 | P1 | Generate invoice/AR from delivered quantities + reversal-safe lifecycle | Billing AR command uses delivered quantities only, emits inverse entry on reversal, and preserves tenant isolation | Accounting + Billing |
| O2C-DEL | O2C-8 | P1 | Add tenant-safe duplicate-command guard for delivery, reversal, billing flows | Re-issuing any of commit/reconciliation commands returns idempotent existing result; no double-inventory or double-AR | Platform + Workflow |
| O2C-DEL | O2C-9 | P1 | Add delivery closure and controller-grade audit artifacts | Close/reopen/exception actions produce structured audit artifacts with actor, reason, previous state, and replay metadata | Workflow Team + QA |

### 2.2 Purchase-to-pay governance slice (P0/P1)

| Epic | Jira Issue Key (proposed) | Priority | Summary | Acceptance (must-have) | Owner |
|---|---|---|---|---|---|
| P2P-GOV | P2P-1 | P0 | Enforce GRNI control and receipt sequencing | GRNI lifecycle cannot skip creation, sequence cannot be bypassed, and missing checkpoints block commit | Purchase + Accounting |
| P2P-GOV | P2P-2 | P0 | Add operator identity boundary controls for material movements | Only authorized operators can receive/inspect/adjust GRNs; unauthorized actions hard-blocked with audited denial | Purchase + Security |
| P2P-GOV | P2P-3 | P0 | Implement inspection event policy and inspection-must-have path | Inbound receive flow captures inspection outcomes; exceptions route to hold state with explicit resolution path | Supply Chain + QA |
| P2P-GOV | P2P-4 | P0 | Add unmatched/exception handling for goods receipt reconciliation | Receipt matching exceptions produce explicit discrepancy entities and closure evidence | AP & Reconciliation |
| P2P-GOV | P2P-5 | P0 | Add return/credit and document evidence integrity boundaries | Return/credit requires source doc reference and immutable evidence linkage; adjustments must be auditable by tenant | AP + Procurement |
| P2P-GOV | P2P-6 | P1 | Normalize inventory boundary checks for purchase workflows | Purchase workflows cannot mutate unauthorized inventory pathways (fixture/seed/test code excluded from production checks) | Inventory Governance |
| P2P-GOV | P2P-7 | P1 | Add workflow assurance/runtime evidence for service boundary proof | Add test/evidence proving workflow tables and boundary gates are respected for receive, match, invoice, reversal | Assurance Team |

### 2.3 Cross-cutting hardening

| Epic | Jira Issue Key (proposed) | Priority | Summary | Acceptance (must-have) | Owner |
|---|---|---|---|---|---|
| O2C-ENABLE | O2C-10 | P0 | Preserve immediate POS commit behavior while adding scoped delivery slice | `commitPOSSale` command path remains unchanged; new delivery/fulfillment path isolated behind explicit command model and outbox events | Architecture Lead |
| O2C-ENABLE | O2C-11 | P1 | Integrate provider capture and reconciliation in one lifecycle contract | Provider evidence captured once, reused by payment truth, receipt token, and AR output | Payments + Accounting |
| O2C-ENABLE | O2C-12 | P1 | Add duplicate-command and tenant-scope regression pack | Test matrix runs unauthorized tenant/duplicate scenario commands against command services, actions, and API surfaces | QA Platform |

---

## 3) Risk register (owners + deadlines)

| Risk | Impact | Likelihood | Owner | Deadline | Mitigation | Severity |
|---|---|---|---|---|---|---|
| Missing tenant isolation in any command path | Double billing, data leak | High | Platform Security | **D+2** | Add tenant guard tests at command + action boundaries; fail closed | P0 |
| POS provider truth drift from direct provider calls | False payment truth, reconciliation drift | High | Payment Team | **D+3** | Enforce provider-authoritative schema validation + immutable provider event capture | P0 |
| Inventory movement created outside scoped fulfillment path | Stock mismatch and untraceable cost flow | Medium | Inventory Team | **D+5** | Gate all receive/issue paths through reservation and scoped command flow | P0 |
| GRNI and inspection missing on PO receive | Contractual and audit non-compliance | High | Procurement/Accounting | **D+5** | Mandatory workflow state machine + hard validation + exception queue | P0 |
| Test duplication and rollback gaps | Hidden regression risk in production | High | QA Automation | **D+7** | Add duplicate command tests, reversal tests, and replay tests as first-class CI jobs | P1 |
| Lack of production evidence artifacts (offline, signature, concurrency) | Release block | Medium | Release/Compliance | **D+7** | Capture operator and platform evidence bundle in release gate runbook | P0 |
| Document evidence and sequence continuity gaps | Audit rejection at close | Medium | Compliance | **D+10** | Evidence index with document IDs + automated completeness checks | P1 |
| Country-pack/legal review not attached to acceptance | Hard close dependency unresolved | Medium | Ops/Legal | **D+12** | Include statutory pack and review sign-off as preconditions in acceptance matrix | P1 |

### Suggested sequencing
1. **P0 core (48–72h):** O2C-1..O2C-5 + P2P-1..P2P-5  
2. **Evidence closure (2–3 days):** O2C-5, P2P-6, P2P-7 + offline/fiscal/reversal evidence  
3. **Stabilization (1–2 days):** O2C-6..O2C-9 + O2C-10..12 + release-ready run

---

## 4) Acceptance matrix (single matrix for P0/P1)

| Item | Priority | Required evidence file(s) | Primary validation command(s) |
|---|---|---|---|
| O2C-1 Tenant-scoped commit replay | P0 | `docs/pos-enterprise-grade-audit/EXECUTION_02_CLIENT_COMMIT_REPLAY_GATE.md`; `docs/enterprise-readiness-audit/STOQUIFY_UNRESOLVED_EVIDENCE_AND_APPROVAL_REGISTER_20260817.md` | `npm run test -- services/pos/__tests__/pos-commit-result.postgres.test.ts`; `npm run test -- services/pos/__tests__/pos.service.test.ts` |
| O2C-2 Provider-capture authoritative truth | P0 | `docs/pos-enterprise-grade-audit/EXECUTION_02_PAYMENT_CASH_TRUTH_GATE.md`; `docs/enterprise-readiness-audit/STOQUIFY_UNRESOLVED_EVIDENCE_AND_APPROVAL_REGISTER_20260817.md` | `npm run payment:cash-truth:gate`; `npm run test -- services/pos/__tests__/pos-commit-result.postgres.test.ts` |
| O2C-3 Immutable receipt/fiscal chain | P0 | `docs/pos-enterprise-grade-audit/EXECUTION_04_G0_BASELINE_GATE_EVIDENCE.json`; `docs/pos-enterprise-grade-audit/EXECUTION_05_G0_FINAL_REASSESSMENT_GATE_EVIDENCE.json` | `npm run receipt:token:config-gate`; `npm run offline:pos:replay:gate` |
| O2C-4 Access-boundary normalization | P0 | `docs/enterprise-readiness-audit/STOQUIFY_UNRESOLVED_EVIDENCE_AND_APPROVAL_REGISTER_20260817.md`; `docs/pos-enterprise-grade-audit/EXECUTION_07_G2_G9_GATE_CLOSURE_PROGRAM.md` | `npm run test -- actions/pos/__tests__/tender.actions.test.ts`; `npm run test -- services/pos/__tests__/pos.service.test.ts` |
| O2C-5 Release closure evidence (concurrency/provider/offline/fiscal) | P0 | `docs/pos-enterprise-grade-audit/EXECUTION_03_M2_DATABASE_CERTIFICATION_PREFLIGHT.md`; `docs/pos-enterprise-grade-audit/EXECUTION_05_G0_FINAL_REASSESSMENT_GATE_EVIDENCE.json` | `npm run offline:pos:replay:gate`; `npm run payment:cash-truth:gate`; `npm run receipt:token:config-gate` |
| O2C-6 Controlled delivery/fulfillment command path | P1 | `docs/pos-enterprise-grade-audit/STOQUIFY_ENTERPRISE_SALES_TO_CASH_IMPLEMENTATION_ROADMAP_2026-08-17.md`; `docs/pos-enterprise-grade-audit/STOQUIFY_ENTERPRISE_SALES_TO_CASH_AUDIT_AND_MODERNIZATION_2026-08-16.md` | `npm run test -- actions/pos --runInBand`; `npm run test -- services/pos/__tests__/pos.service.test.ts` |
| O2C-7 Delivered-qty AR generation + reversal safety | P1 | `docs/pos-enterprise-grade-audit/STOQUIFY_ENTERPRISE_SALES_TO_CASH_READINESS_2026-08-16.md`; `docs/enterprise-readiness-audit/STOQUIFY_UNRESOLVED_EVIDENCE_AND_APPROVAL_REGISTER_20260817.md` | `npm run test -- services/accounting`; `npm run test -- services/pos --runInBand` |
| O2C-8 Duplicate command guard (delivery/billing/reversal) | P1 | `docs/pos-enterprise-grade-audit/EXECUTION_02_M2_CLIENT_COMMIT_REPLAY_REPORT.md`; `docs/pos-enterprise-grade-audit/EXECUTION_02_OFFLINE_POS_REPLAY_GATE.md` | `npm run test -- services/pos/__tests__/pos-commit-result.postgres.test.ts`; `npm run test -- actions/pos/__tests__/tender.actions.test.ts` |
| O2C-9 Delivery closure/closeout artifacts | P1 | `docs/pos-enterprise-grade-audit/EXECUTION_07_G2_G9_GATE_CLOSURE_PROGRAM.md`; `docs/pos-enterprise-grade-audit/EXECUTION_02_M2_CLIENT_COMMIT_REPLAY_REPORT.md` | `npm run test -- services/pos/__tests__/pos.service.test.ts`; `npm run test -- actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts` |
| P2P-1 GRNI sequencing | P0 | `docs/purchase-enterprise-grade-audit/STOQUIFY_ENTERPRISE_PROCURE_TO_PAY_READINESS_2026-08-17.md`; `docs/purchase-enterprise-grade-audit/STOQUIFY_ENTERPRISE_PROCURE_TO_PAY_AUDIT_AND_MODERNIZATION_2026-08-17.md` | `npm run test -- services/purchase-order/__tests__/purchase-order-receive-batch.service.test.ts` |
| P2P-2 / P2P-3 Inspection + operator control | P0 | `docs/purchase-enterprise-grade-audit/03-evidence-and-verification-ledger.md`; `docs/enterprise-readiness-audit/STOQUIFY_UNRESOLVED_EVIDENCE_AND_APPROVAL_REGISTER_20260817.md` | `node scripts/workflow-assurance-runtime-table-check.js --mode fail`; `npm run test -- services/purchase-order/__tests__/purchase-order-receive-batch.service.test.ts` |
| P2P-4 Match exceptions | P0 | `docs/purchase-enterprise-grade-audit/STOQUIFY_ENTERPRISE_PROCURE_TO_PAY_VERIFICATION_2026-08-17.md`; `docs/purchase-enterprise-grade-audit/03-evidence-and-verification-ledger.md` | `node scripts/ap-fraud-control-readiness.js --mode fail`; `node scripts/purchasing-ap-consolidation-gate.js --mode fail` |
| P2P-5 Return/credit + document evidence | P0 | `docs/purchase-enterprise-grade-audit/03-evidence-and-verification-ledger.md`; `docs/purchase-enterprise-grade-audit/STOQUIFY_ENTERPRISE_PROCURE_TO_PAY_AUDIT_AND_MODERNIZATION_2026-08-17.md` | `npm run test -- services/purchasing/__tests__/ap-control.service.test.ts`; `npm run test -- actions/purchasing/__tests__/ap-control.actions.test.ts` |
| P2P-6 Boundary violation checks | P1 | `docs/purchase-enterprise-grade-audit/evidence/inventory-boundary-readiness.md`; `docs/purchase-enterprise-grade-audit/evidence/inventory-boundary-readiness.json`; `docs/enterprise-readiness-audit/STOQUIFY_UNRESOLVED_EVIDENCE_AND_APPROVAL_REGISTER_20260817.md` | `node scripts/inventory-boundary-gate.js --mode fail` |
| P2P-7 Service/workflow boundary assurance | P1 | `docs/purchase-enterprise-grade-audit/STOQUIFY_ENTERPRISE_PROCURE_TO_PAY_VERIFICATION_2026-08-17.md`; `docs/pos-enterprise-grade-audit/EXECUTION_03_M2_DATABASE_CERTIFICATION_PREFLIGHT.md` | `node scripts/service-boundary-gate.js --mode fail`; `node scripts/workflow-assurance-runtime-table-check.js --mode fail` |

---

## 5) What to do next (immediate)

1. **Import this as parent epics + linked stories in Jira** (copy each ticket row into Jira CSV/import tool, then assign real issue keys and sprint owners).  
2. **Run a 30-minute “P0 bridge” slice** on: O2C-1, O2C-2, O2C-3, O2C-4, P2P-1, P2P-3, P2P-5.  
3. **Publish evidence index updates in one place** (single JSON/MD registry under `docs/pos-purchase-audit-gates`) so each acceptance command points to current artifact snapshots.  
4. **Only then run P1s** (delivery/billing and inventory operator hardening) to keep release risk bounded.
