# Receipt source treatment and Cash denial acceptance

Status: bounded source-treatment and denial corrections implemented and verified on 2026-10-01. Primary FA-CASH-COMMAND remains In progress; its one supporting contract remains receipt/invoice accounting. The full workflow-modernization mission and existing closure checklist remain in force. No complete workflow closure is claimed.

## Demonstrated next requirements

Fresh mixed receipts identify stock-tracked and non-stock lines, but invoice posting currently forces all unrecognized net into INVENTORY. Non-stock alone is not a statutory account classification. The supported correction requires explicit tenant-configured posting treatment and retains the underlying source proof; it must not guess an expense account. Fresh zero-value stock receipts also lose their invoice recognition proof, preventing a subsequent return from proving its funding even though all source records are current.

## Bounded acceptance checklist

- [x] Versioned invoice evidence retains exact stock, non-stock and verified no-journal receipt sources. Existing v1/v2 proofs and all-stock positive behavior remain readable without rewriting history.
- [x] Mixed and pure non-stock invoices require explicitly configured non-stock rule lines and actual tenant-owned active leaf accounts. Control accounts cannot absorb these residuals. Missing/ambiguous treatment gives a durable actionable blocker; no inventory inflation.
- [x] Original zero-cost receipt → independently approved positive invoice → return → credit → exact reversal retains conserved values and authentic source references, without fictitious zero journals.
- [x] Existing approval, tenant/object, stale revision, idempotency, original-date and safe recovery boundaries remain effective in focused tests; scoped actual DB verification proves effects and unchanged outside-fixture records.
- [x] Cash route and service denials contain one main landmark, fully localized EN/FR copy and usable return actions; actual supported browser paths verified.
- [x] Focused tests, changed-file lint, current TypeScript and source-bound runtime receipts support this report and the scoped register update.

Weighted-average stock carrying value versus original-receipt claims remains separately unresolved; retain its existing guard. Authentic legacy reconstruction and statutory classification approvals are not invented by these corrections. This milestone does not itself close FA-CASH-COMMAND or establish release/accessibility/statutory certification.

## Parent workflow ownership

Cash Command owns truthful tenant/currency/period/completeness/freshness reads, current permission checks, actionable source links, failure/retry behavior, responsive localized presentation and current verification. It does not execute the downstream accounting or payroll lifecycle. Its complete closure still needs current evidence across the seven original checklist rows, concurrent source/authority changes, truthful successful proof/forecast admission, remaining assistive-technology/zoom/contrast checks and representative cache-enabled latency measurements.

The full mission still includes downstream work under its actual register owners: purchasing PA-010/014/016/019/024–027/031 and inventory IN-016/017; accounting FA-SETUP and FA-CLOSE-*; reconciliation PR-17/18; and the registered PY contract/destination/declaration/authority/register workflows. Wider payroll calculation/release/settlement coverage is not fully registered and remains an explicit discovery gap. No requirement is deleted or renamed to increase closure counts. Cash must reflect limitations accurately and provide an authorized handoff; each downstream owner still needs its complete original lifecycle proof.

## Setup and recovery contract

An authorized accounting owner must select the appropriate treatment; tracking status does not choose a statutory account. The existing posting-rule service records the selected rule and actor in the ledger audit. An explicit non-stock debit uses `SOURCE_AMOUNT` with condition `receiptResidualTreatment: NON_STOCK`; the resolved account must belong to the tenant, be active, undeleted, a leaf, an asset or expense with debit normal balance, and outside inventory, settlement and control accounts. GRNI clears only the verified stock accrual, VAT uses the original tax amount, AP uses invoice gross and the existing variance branch handles recognized stock price differences. No default statutory account or new chart template is supplied.

Mixed unproven legacy and non-stock amounts require separate source review because the available posting contract cannot safely assign those amounts together. Older mixed invoices are not silently upgraded to new proof. For blocked current invoices, the authorized operator uses the existing invoice posting recovery page after the accounting owner configures the rule. Recovery retains the original approval/payable, binds the reviewed setup revision and original invoice date, and keeps exact retries safe. Changing a rule requires a new preview. A blocked outcome is not posted accounting.

The independently approved commercial invoice price and the receipt-funded stock value remain different quantities. Their difference may be corrected only using the authenticated approval and return source chain; missing legacy evidence retains its review guard. This does not authorize a new price decision or reprice inventory.

## Delivered results and verification

Source baseline: branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. The shared dirty checkout and unrelated changes were preserved. Exact predecessor contents are retained in `receipt-treatment-*-before-*.json`, `receipt-price-credit-before-*.json` and `cash-denial-2026-10-01/before.json`. Graph communities 3 (AP), 9 (stock) and 1 (projection/rebuild) located affected relationships; current source confirmed the boundaries.

New v3 invoice evidence separates non-stock source quantities/net from stock accrual allocation and represents a genuine zero receipt with null batch/journal references. Positive stock-only invoices retain v2; existing v1/v2 proof bytes are not rewritten. Unproven mixed legacy sources cannot be silently classified. Commercial invoice quantities remain protected by the existing supplier-locked preparation/approval capacity checks. Credits with different nominal prices require an authenticated return invoice-proof reference plus current independent approval event, document/source/recognition hashes and consistent invoice lines. Actual return funding and remaining net/tax pools remain mandatory.

The AP kernel checks actual resolved accounts, exact residual amounts, explicit treatment and invoice-compatible account currency. Known inventory, supplier/customer receivable/payable, settlement and other control mappings cannot receive the non-stock amount; account control flags and active leaf/type checks also apply. Both unsupported rules and a missing rule retain a durable blocked posting without duplicating the payable or approval. An accounting owner still chooses the appropriate statutory treatment.

For a stock 25 + non-stock 5 receipt, actual final balances were inventory 25, GRNI 0, payable 30 and the explicitly selected non-stock account 5. Pure non-stock 5 creates no stock movement or inventory journal. A zero-cost stock receipt followed by an independently approved invoice of 5 retains zero stock value; its return is a verified no-journal outcome, the credit reverses the payable/price variance, and exact reversal restores those same amounts. The stock-only control retained v2 and inventory 25/payable 25. No payment was executed.

Cash denied routes now opt into an embedded shared state, preserving standalone consumers. Both early permission denial and later organization-authority denial use the inherited single main landmark and localized recovery copy. Mobile enlarged-text testing exposed a long-heading overflow; wrapping is limited to the embedded state. Invoice recovery provides specific EN/FR non-stock setup guidance and restores keyboard focus after closing during background list refresh, without stealing focus after the user moves elsewhere.

| Verification | Current result | Receipt |
|---|---|---|
| Accounting/service regressions | 299 unchanged service tests from the 309-test run; superseded ten UI tests excluded | `evidence/receipt-treatment-jest-455d690f-e48b-49f9-bd5d-8c930df4053e.json` |
| Final recovery UI | 11 tests, including deferred-refresh focus return | `evidence/receipt-treatment-ui-9aa055d2-8bf0-4055-992a-4b9177e2561f.json` |
| Cash states/routes | 31 tests across four suites | `evidence/cash-denial-2026-10-01/final-97cc3d03-42e4-4107-9170-ee9111c1a77f.json` |
| Changed-file lint | Passed, stable source | `evidence/receipt-treatment-lint-1a093718-100e-42db-b39b-108b5d980965.json` |
| Existing TypeScript check | Passed: `tsc --noEmit --pretty false` | `evidence/receipt-treatment-typecheck-299ffe0e-5ec8-4f1d-9da2-a4c758868f6f.json` |
| Owned database | Four journeys passed; implicit/control/receivables/currency rejection, stale preview, recovery, exact retry, approval preservation, credits/reversal and v2 control | `lanes/environment/receipt-treatment-runtime-3df3a535-6e85-47f2-990c-b04db0279773.json` |
| Cash browser | 12 journeys: two denials × EN/FR × 320/768/1440; keyboard, normal/doubled text, reduced motion, 24 screenshots | `lanes/environment/cash-denial-b2fe8efc-d70c-441f-b566-a0543fc9e021.json` |
| Recovery browser | EN1440/FR320 actual sign-in, password verification, retained blocker/guidance/history, focus containment/return and six screenshots | `lanes/environment/receipt-treatment-browser-2038aa50-f569-478a-8f18-cc74e8ba331f.json` |

The distinct current test total is 341 across 14 suites. Earlier owner runs and repeated attempts are not added. Final source bindings and financial/outside-fixture fingerprints passed. The [final input manifest](evidence/receipt-treatment-final-inputs.json) identifies the receipts consumed by the guarded final review; its output is linked from the workflow register and CURRENT_PROGRESS. Root visually inspected the actual English desktop and French mobile recovery guidance: long French copy and references wrap, the blocked state is textual and the close action remains reachable. Cash screenshots were also visually reviewed by the responsible reviewer.

All runtime work used the existing isolated database `stoquify_local_registration_20260906_01` and the owned Next listener `127.0.0.1:3110` (PID 28380, parent 12740, exact workspace/command verified). Fixtures use deliberately synthetic accounts and independent decisions, not professional/statutory approvals. No DDL, migration, seed, production activation or external dispatch occurred in this milestone. Existing migration-bearing default build was not invoked.

## Failed attempts and scope limits

The first Cash browser run passed six early-denial cases, then found the EN320 doubled-text heading clipping. The final twelve-case run passed after wrapping was corrected. Scoped axe scans returned no violations but retained incomplete contrast measurements; this is not complete accessibility proof. A development issue badge appeared despite zero captured pageerror events. Native screen reader, true browser zoom, non-text contrast and full console/hydration validation remain open; text enlargement is not mislabeled browser zoom.

The first recovery browser run showed correct localized guidance and unchanged financial effects but failed focus return in both languages. Closing during the asynchronous list refresh left the temporarily disabled review button unfocused. The component now defers focus restoration until that button becomes available and only restores it if the user has not moved focus elsewhere. Its regression and both actual browser journeys pass. The initial regression itself attempted to query an aria-hidden background control while the modal was open; capturing the existing trigger before opening corrected that test error.

Initial credit tests exposed validation-order regressions; source-line ownership checks now precede approved-price validation. An early aggregate run passed 306 tests but failed source stability while that last edit completed. The stable final runs supersede it. Cross-review then identified missing customer-receivables exclusion and account-currency checks; both were implemented and tested against real configured recipes. These failures and superseded successful runs remain retained, not rewritten as final proof.

## User and rollout guidance

Open `/en/dashboard/purchases/payables/recovery` or `/fr/dashboard/purchases/payables/recovery`. Select the retained invoice and review its original approval/date/accounting setup. Verify your password when required, then confirm. If non-stock treatment remains blocked, ask the accounting owner to select the appropriate account and configure the explicit rule through the existing authorized posting-rule service/process. Do not create a replacement invoice. Reopen and review after setup changes; stale previews are rejected. Lost responses retain exact retry requests. History distinguishes the recorded decision from current journal state.

Cash Command remains at `/en/dashboard/finance/cash-command` and its French equivalent. A user lacking route permission or organization-wide authority receives a localized explanation and keyboard-accessible return action; Cash source data is withheld. The two denial paths use real server authorization in the application.

No migration is required. Rollout must deploy readers of v3 source evidence together with its producers; do not roll back to a v1/v2-only reader after v3 approvals exist. Preserve immutable approval, return, credit and reversal records; use controlled forward correction rather than rewriting their hashes. Enable appropriate tenant accounting rules before relying on mixed/non-stock journal completion. Cash embedded-state changes are opt-in and separately reversible. Production rollout remains outside this local verification.

Architecture/backend/data review covers source-version compatibility, locks, hashes and conserved effects. Finance/audit review covers actual account roles, exact claims/payables and retained independent approval. IAM review preserves tenant/object/role and fresh-auth boundaries. Frontend/accessibility/localization review covers the two denial paths and recovery race. Quality/operations review covers source-bound local tests, retries and unchanged outside records. Statutory classification requires its authorized expert; no certification is claimed. New billing/provider/AI behavior is not applicable because this milestone changes none of those boundaries.

The next primary action is the remaining direct Cash source/failure/concurrency/proof checklist. Supporting accounting still has authentic legacy reconstruction and the demonstrated weighted-average carrying-value versus original-receipt claim conflict; its existing guard must remain until a coherent variance treatment is implemented and verified. Wider close/payroll work remains in the original mission under the owners above. Current discovery remains 270 workflows with 191 unmapped source entries and four historical recorded closures; no new closure or completion percentage is claimed.
