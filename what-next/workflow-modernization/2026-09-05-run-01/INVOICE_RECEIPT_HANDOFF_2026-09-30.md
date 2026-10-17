# Receipt accrual consumed by supplier invoices

Primary workflow: **FA-CASH-COMMAND**, still In progress. This is a bounded correction to its purchasing/accounting handoff, not a new workflow closure. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`; unrelated working-tree changes preserved. Applied purchasing/AP controls skill 011 and the existing accounting review responsibilities.

## Acceptance boundary

Verify that an approved supplier invoice consumes a corroborated receipt accrual once, with partial quantities, retained allocation evidence, legacy compatibility, independent approval, stale-review rejection and ledger-only recovery. Preserve existing supplier liability, receipt stock, period and tenant controls. Do not enable automatic receipt recognition until producer, return and cutover contracts are complete.

## Correction and benefit

Previously both invoice posting paths always supplied the invoice subtotal as inventory cost. The default invoice rule debited INVENTORY regardless of any existing goods-receipt journal. Posting a receipt as inventory/GRNI before that invoice would recognize inventory twice and leave the accrual outstanding.

The shared recognition resolver verifies each source receipt against actual stock movements, applied event payloads, one posted journal, source linkage, currency, inventory debit and GRNI credit. A failed receipt batch without accounting effects retains the legacy invoice treatment. Ambiguous, reversed or inconsistent accounting evidence requires review.

Recognized portions clear GRNI at receipt cost. Unrecognized portions retain invoice-based inventory recognition. Price differences use the existing INVENTORY_VARIANCE mapping with an explicit debit or credit direction. Partial quantities allocate rounded cumulative receipt cost; this avoids creating or stranding cents by rounding every invoice independently.

The invoice stores a versioned allocation proof, its approval event binds that proof's hash, and the ledger request binds the same hash. Approved invoices with blocked journals reserve their allocation. Recovery reuses that frozen allocation even after later invoices; it neither repeats stock nor creates another supplier liability.

The immediate internal posting path previously omitted approval identities and matching state required by ledger recovery. An owned-database probe reproduced the mismatch. Its event now copies persisted maker, approver and match state and derives the independent-evidence flag from their agreement. It adds no new lifecycle admission gate and does not repair historical approval events.

Both approval and recovery previews bind the recognition result into their revision. The posting kernel checks the resolved accounts and amounts, not only rule labels or balance. An old inventory-only rule cannot post an accrued invoice; the approved payable and its blocked journal remain recoverable through the existing review process. Existing tenant rules are not silently replaced. The updated default is a configurable template, not an organizational or statutory approval.

## Deliberately retained engineering limits

- Production receiving still creates a review-required accounting batch. The verification fixture posts a receipt through the canonical ledger kernel explicitly; it does not prove an automatic receipt producer.
- Stock-event replay currently creates its ledger blocker before replay detection and could overwrite posting state. Ledger recovery must not rerun stock.
- Held acceptance retains the original receipt date while stock is accepted later. Its accounting date/period contract requires correction before producer activation.
- Receipt returns and their reversals require allocation review. The new recognized-receipt path denies these cases. Existing invoice quantity planning does not fully subtract uninvoiced returns; this remains engineering work.
- Late recognition of a receipt already used by legacy approved invoices is rejected. Historical invoices and journal history are not rewritten.
- CASH_DRAWER_CLOSE and EXPENSE_APPROVAL setup applicability, eligible close certification, remaining payroll lifecycles, complete accessibility and representative latency remain open. No release, accounting, security or statutory certification is claimed.

## Operator procedure

Use `/{locale}/dashboard/purchases/payables/approve` for independent invoice approval and `/{locale}/dashboard/purchases/payables/recovery` for posting recovery. For a blocked accrued invoice, an authorized accounting owner must review the active supplier-invoice rule and mappings for inventory, GRNI, variance, input VAT and AP. Obtain actual receipt/invoice evidence from the receiving and invoice records, and authority from the organization's current role assignments. Refresh the preview after configuration changes, then use the existing ledger-recovery action. An earlier approval is retained; do not create a replacement invoice or receive the goods again.

No schema migration or data backfill is introduced. Rollout requires an isolated cohort with reviewed accounting setup. If reverting this consumer, keep automatic receipt recognition disabled and stop affected invoice posting/recovery pending reconciliation; restoring an old inventory-only rule would reintroduce duplicate recognition. Do not delete journals, sources or allocation history.

## Review responsibilities

| Responsibility | Assessment |
|---|---|
| Architecture/backend/data | One service-owned resolver for both posting paths, preview and recovery; existing transaction/lock order and source-owned metadata |
| Finance/ledger/purchasing | Inventory recognized once, accrued cost cleared, explicit price variance, legacy and return restrictions |
| IAM/privacy/audit | Existing authority/fresh-auth/maker-checker boundary retained; tenant-scoped sources and immutable approval hash; no secrets in evidence |
| Frontend/UX/localization | Existing EN/FR approval and recovery components reused; no second UI or technical configuration flow for employees |
| Quality/SRE/release | Focused tests and isolated database/application verification; evidence below; no deployment or migration |
| Product/support/packaging | Existing entitlement and commercial packaging unchanged; unresolved setup remains explicit |
| Statutory/country | Existing resolution gates preserved; variance account treatment requires organization/expert review, not this engineering report |
| POS/offline/payroll/AI/providers | Not applicable to this patch: no change to their producers, decisions, payments or transports |

## Verification

The frozen implementation passed **157 tests across nine suites** and changed-file lint. Six owned PostgreSQL scenarios passed: partial 6+4 clearing, legacy receipts, mixed receipts, incompatible-rule recovery, concurrent exact approval and changed-receipt denial. The separate immediate-path probe verified genuine stored identities/state and recovery without a duplicate liability. Receipt recognition itself remains an explicitly labelled canonical-kernel fixture.

Actual browser approval passed in EN at 1440px and FR at 320px, including password step-up, keyboard review/focus containment/return, posted history, no document overflow, no page errors and matching persisted balances. The EN and FR posted screenshots were visually inspected. Other organizations' checked records stayed unchanged and no payments were created. Native screen-reader, browser zoom, full contrast and all responsive states are not certified by these samples.

| Development observation | EN desktop | FR mobile |
|---|---:|---:|
| Navigation, invoice selection and first screenshot | 190,895 ms | 32,520 ms |
| Confirm/password verification through recorded outcome | 7,064 ms | 4,245 ms |

These are local development observations, including application/test interaction overhead. They are not isolated service benchmarks or production-budget results. Route latency remains open; no cause or improvement is inferred from these two samples.

Final source-bound receipts are recorded in `evidence/invoice-receipt-handoff-review-2026-09-30.json`. The final TypeScript recheck passed. Initial TypeScript check identified an unregistered error-code literal; it was changed to the existing `INVOICE_EVIDENCE_REQUIRED` contract rather than introducing an untranslated error category. The first full check passed its commands but overlapped a final source change, so its receipt is retained as superseded and the frozen source was checked again.

A later whole-project TypeScript run reported six nullable-Decimal errors in `services/accounting/reports.service.ts`, which was changed concurrently outside this patch. That file was preserved. The final TypeScript receipt records the subsequent recheck; the matching passing unit/lint receipt is reused with exact source hashes rather than rerunning unaffected checks.

Automatic approval review rejected two immediate-path metadata proposals: constant approval assertions lacked a derivation, and a proposed admission guard needed verified lifecycle semantics. Neither rejected patch was applied. The owned lifecycle probe established the persisted state and reproduced failed recovery. Automatic review then accepted the narrower derived audit-only correction, which was verified by actual recovery with one supplier liability.

- Checks: `evidence/invoice-receipt-handoff-checks-5584987b-61fe-4de2-b426-b5f11077cbdc.json` (exactly bound unit/lint reuse and current TypeScript).
- Six final-source scenarios: `lanes/environment/invoice-receipt-handoff-9df4b1ae-88db-4201-81f7-b66aa80493b9.json`.
- Immediate posting/recovery: `lanes/environment/direct-invoice-lifecycle-915987a4-06aa-4b80-b86a-3fcdc3a481a0.json`.
- Actual application: `lanes/environment/invoice-receipt-handoff-browser-95f2a0df-ffbc-41d4-ab17-8e327f1207c3.json` and its eight screenshots.
