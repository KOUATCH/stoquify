# Receipt replay and invoice capacity after returns

Primary workflow: **FA-CASH-COMMAND**, In progress. These corrections advance its purchasing/accounting handoff; they do not close the parent workflow or enable automatic receipt accounting. Branch `codex/migration-control-plane-release-2026-08-29`; HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Shared unrelated edits are preserved. Skills: purchasing/AP controls 011 and accounting control center 005.

## Acceptance and correction

An exact applied stock replay must preserve a receipt's existing accounting batch, journal and stock. A changed payload or new stock event against a finalized batch must reject without changing financial or inventory effects. Failed or unprocessed retained events must not be presented as applied replays.

The inventory service previously marked its accounting batch FAILED and replaced metadata before checking the retained business event. Eight focused regression cases reproduced the resulting failure. It now locks and identifies the existing batch first, uses the canonical business-event conflict checks, and creates the review blocker only for a genuinely new event on an unfinished batch. Existing APPLIED replays leave the batch unchanged. POSTED/REVERSED batches reject novel stock events. A payload conflict still records the existing independent audit/anomaly evidence; that evidence is not a duplicate economic effect.

Invoice capacity must exclude goods returned before invoicing. The correct calculation is **received quantity − non-cancelled invoice reservations − net uninvoiced returned quantity**. Invoiced returns are already represented by the invoice reservation and must not be subtracted twice. The shared capacity reader checks tenant/supplier/source identity, quantity portions and exact whole-return reversal linkage and values. An invalid reversal cannot increase capacity. Read failures propagate rather than becoming zero returns.

Preparation, correction, direct posting and approval use the authoritative line planner. Receipt share locks remain held through validation and writes, serializing against new returns' receipt update lock. Duplicate invoice lines accumulate against the same remaining quantity. Both preparation and correction source lists use the same net-return calculation; correction excludes its own invoice reservation. Source lists may become stale under concurrent work, so submission revalidates. A concurrent reversal only restores capacity; a reader observing the older state can conservatively reject but cannot grant excess quantity.

## User and operator guidance

Open `/{locale}/dashboard/purchases/payables/prepare` to prepare a supplier invoice. After receiving ten units and returning three before invoicing, seven remain available. An invoice for eight must be reduced or reconciled with the source evidence. Source quantities come from the receipt and immutable return records; no new operator evidence field was added.

For a draft prepared before a return, open `/{locale}/dashboard/purchases/payables/correct`, retain the actual supplier-document reference/hash, explain the correction and review the remaining quantity. Existing authority and fresh authentication continue to apply. Correcting a draft does not approve it, post a journal or release payment. Existing approval remains at `/{locale}/dashboard/purchases/payables/approve`.

An invalid return/reversal record needs source investigation by the purchasing/accounting owner. Do not delete evidence, create a replacement receipt, or forge a reversal to restore invoice capacity. An unprocessed retained stock event still requires explicit processing review. Replay is not a journal-recovery mechanism.

## Direct dependency review

The concurrent `accounting-settings.service.ts` change that prevented the previous register refresh was reconstructed against its exact prior source. Only its error import, initialization and settings-update declarations changed: initialization uses the organization's denomination, and changing an established denomination requires controlled migration. Readiness, mappings, purpose selection and sensitive-action readiness controls are byte-identical. This task preserved that author's implementation and checked its relevant currency/readiness regressions. See `evidence/accounting-settings-currency-declaration-impact-2026-09-30.json` for exact reconstruction inputs and limitations; source inspection alone is not runtime evidence.

## Remaining receipt-accounting work

- Produce one versioned whole-receipt source/hash after every accepted stock line exists, including an explicit accepted/effective date for held receipts.
- Preserve the chosen effective date during recovery; do not move a closed-period transaction to a convenient date.
- Enforce actual INVENTORY/GRNI account effects and distinguish non-stock items before activating receipt accounting.
- Complete source-owned return cost/accrual release and reversal allocations. Existing uninvoiced-return rules can debit GRNI without proving an original accrual; this is still an engineering defect. The recognized-receipt invoice resolver's return restriction remains effective.
- Derive return-posting currency from verified tenant/source accounting. The current return producer still passes a hardcoded XAF currency; the present XAF fixtures do not establish other-denomination correctness.
- Define safe legacy cutover. Do not retro-accrue a receipt already recognized by legacy invoices.
- Continue the remaining close/payroll, accessibility and latency acceptance criteria in the workflow register.

## Verification

The final combined check passed **192 tests across ten suites**, changed-file lint and TypeScript, with stable source hashes: `evidence/receipt-capacity-checks-fb8a1e10-de71-4d02-a032-7d3015f0df27.json`. This includes the relevant unchanged accounting-readiness tests and current currency regressions. Initial combined-test failures came from the new externally supplied transaction fixture: it first omitted the period-lock result, then incorrectly expected no separate conflict-audit transaction. Both failed receipts are retained; only test fixtures/assertions were corrected to match inspected production contracts.

All **ten actual owned PostgreSQL scenarios** passed: `lanes/environment/receipt-invoice-capacity-8fb85d0e-91ec-4a30-b1fe-76179361628e.json`. They cover uninvoiced/invoiced/mixed returns, source-list consistency, stale preparation and approval, actual eight-to-seven correction followed by independent posting, exact reversal/replay restoration, fractional/duplicate lines, concurrent return/preparation, retained recognized-receipt restrictions, and posted stock replay/conflict/novel-event behavior. The corrected invoice created exactly one 17,500 supplier liability. Denials preserved economic state; the mismatched stock replay produced only expected independent conflict evidence. No payments were created; checked records outside fixture organizations were unchanged. Return accounting was explicitly setup-blocked, and the one recognized-receipt case used the labelled canonical-kernel fixture.

All four actual application journeys passed: English desktop (1440px) and French mobile (320px), each covering preparation and correction. The final receipt is `lanes/environment/receipt-capacity-browser-c71ea2e8-44fa-491d-87c0-fc2ac5485b7f.json`. Each journey displayed seven available units, denied eight without invoice effects, retained the draft after reload, verified keyboard review/focus return, and saved seven as MATCHED without approval, journal, supplier liability or payment. Both correction journeys exercised actual password verification. Source hashes stayed stable and checked records outside fixture organizations were unchanged. Sixteen screenshots are retained.

| Journey | Route and draft interaction | Save confirmation |
|---|---:|---:|
| EN preparation | 8,755 ms | 1,636 ms |
| EN correction | 10,319 ms | 3,780 ms |
| FR preparation | 8,925 ms | 2,243 ms |
| FR correction | 16,851 ms | 3,699 ms |

These local measurements include scripted draft interactions and are not isolated server latency or production-budget certification. No page errors or document-wide horizontal overflow occurred. Visual inspection of the English preparation review and French correction result confirmed the amount, capacity and unapproved-state language. It also identified a remaining layout defect: the long synthetic supplier reference extends beyond the English review dialog's right edge. Document-width assertions do not detect that local overflow. This remains recorded UX work; passing these focused journeys does not establish full accessibility or responsive certification.

The first browser attempt was stopped after two observed harness failures: keyboard selection raced the file-hashing disabled state, and a screenshot write was denied by the runtime sandbox. The partial record `lanes/environment/receipt-capacity-browser-attempt-55ba415d-4f5c-4c51-8cd0-c1d3c5355ad2.json` explicitly does not certify final source or outside-organization state. Both owned processes were confirmed stopped before retry. The runner now waits for the checkbox to be enabled/focused and uses scoped permission to write screenshots; no product change was made for those failures.

The second attempt reached the expected capacity in all four journeys but failed because an unscoped alert selector also matched the application's route announcer. Its complete failed receipt and eight screenshots remain at `lanes/environment/receipt-capacity-browser-df880e98-9a84-4bde-9060-b307d6dcd6b7.json`. The final runner scopes the role assertion to the expected localized denial text and still checks visibility, draft retention and absence of economic effects. No product change was made for this harness correction.

## Rollout, recovery and review responsibilities

No schema migration, data backfill, deployment, live activation or payment is introduced. Ordinary invoice and return controls remain effective. Existing inconsistent return evidence requires investigation; these changes do not rewrite it. Reverting the capacity guard would permit overbilling returned goods, and reverting the replay guard could damage accounting status, so stop affected operations for investigation instead of bypassing these checks.

| Responsibility | Assessment |
|---|---|
| Architecture/backend/data | Shared capacity calculation; existing immutable returns; transaction locks and canonical event identity |
| Finance/purchasing/audit | No overbilling of uninvoiced returns; no double subtraction; no replay overwrite of posted accounting |
| IAM/privacy/security | Existing source, tenant, maker/checker and fresh-auth controls retained; scoped reads; no new authority |
| Frontend/UX/localization | Existing EN/FR preparation/correction controls and error behavior reused; no new visual system |
| Quality/SRE/operations | Focused regressions, owned-database effects, application recovery and source bindings; no production performance claim |
| Product/support/packaging | Existing employee workflow and commercial eligibility retained; actual source records explain capacity |
| Statutory/country | No statutory approval or new account treatment certified; existing country/period requirements retained |
| POS/offline | Shared stock kernel changed; applicable existing focused movement tests included; complete POS/offline workflow closure not claimed |
| Payroll/AI/providers | Not applicable to this correction: no changes to producers, decisions, declarations or external transport |

Next work remains within skill 011 with accounting skill 005 support. Numbered-suite progression to payroll skill 012 does not supersede the active workflow or its unresolved prerequisites.
