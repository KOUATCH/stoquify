# Purchasing / AP workflow modernization — initial lane record

Evidence date: 2026-09-05. Branch `codex/migration-control-plane-release-2026-08-29`, base commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. Current source includes preserved unrelated dirty changes. This lane remains **in progress**.

## Inventory and current boundary

`WORKFLOW_REGISTER.json` contains 31 discovered business journeys, including normal, exceptional, retained-record and downstream paths. It counts workflows, not pages. PA-020/021/030 reference the customer/supplier lane for destination and external-acknowledgment ownership; the parent register must link those overlaps rather than double-count them. Entry points or complete controls that have not been traced are marked pending.

Graph hints: purchase-order action community 2; legacy goods-receipt facade community 68; draft editor community 46; AP workbench community 25. Graphs date from earlier source and were used only to find current implementations. `newPOActions.ts` now re-exports the canonical action module. Referenced old `hooks/purchaseOrderWorkflowHooks` and `usePayablesData.ts` are absent despite historical tsconfig exclusions.

The current transaction chain is:

`guarded route → native editor → useUpdatePurchaseOrder → scoped action/schema → purchase-order.service → tenant records/audit`.

Receiving already locks its tenant purchase-order row and binds idempotent requests to payload hashes. Its accepted and held-inspection branches must be verified independently; the initial editor correction does not certify receiving or AP controls.

## Findings

| ID | Priority | Evidence and consequence | Status |
| --- | --- | --- | --- |
| PA-F01 | High | The old editor rebuilt taxRate as taxAmount / gross while the service divides percentages by 100. A stored 19.25% became 0.1925% on no-op save. It also used itemName as line notes and subtracted the aggregate line discount again in its preview. | Corrected; model/component/real-service-calculation tests passed. Browser persistence proof pending. |
| PA-F02 | High | The update action returns success:false for rejection, but the old form treated every resolved mutation as success and navigated away. The hook merged write DTOs into the differently shaped authoritative detail cache before confirmation. | Corrected: explicit result check, retained draft, focused persistent alert, no automatic uncertain retry, no optimistic authority projection; confirmed saves invalidate detail/list/summary. |
| PA-F03 | Medium | Order number, reference, shipping method, internal notes and aggregate order discount were editable without a corresponding persistence contract. Cost suggestions expected sellingPrice while the service returns costPrice; amounts were hardcoded in dollars. | Corrected: read-only assigned number, unsupported inputs removed, actual line discounts/notes/rates editable, current currency supplied by service, zero values retained. |
| PA-F04 | High | updatePurchaseOrder reads editability before the transaction; approval and several status changes also check then write. Service accepts SUBMITTED while route/capability permit only DRAFT. There is no submitted preview/version binding for edits. | Open required next batch: reproduce stale edit/approval and align locked/CAS behavior with authoritative lifecycle. |
| PA-F05 | High | prepare/post invoice, matching exception, supplier payment approval/release, returns/credits/reversals have server actions but no production UI callers found in app/components/hooks. APControlWorkbench is intentionally read-only. | Open required implementation: real EN/FR forms, authorized decisions, progress/retry and owner-service evidence. Do not treat read-only queues as a completed procure-to-pay journey. |
| PA-F06 | High | clonePurchaseOrder assigns override supplier/location IDs directly, without the tenant relationship validation used by ordinary create/update; selected active status also needs enforcement for new orders. | Corrected in the clone batch: same-tenant active/nondeleted supplier/location/items checked before numbering/writes; six original regression cases failed before correction. Real detail control now calls the protected action and opens the returned draft. Final tests/browser proof recorded separately. |
| PA-F07 | Medium | Editing-route catch-all changed a database/transport failure into notFound. Partial update action also substituted zero when shippingCost was omitted. | Corrected; query errors propagate to the existing error boundary, genuine not-found stays404, omission preserves stored shipping. |
| PA-F08 | High | Service recalculates order totals only when orderLines is supplied. A shipping-only partial service update can change shippingCost while retaining the old total. Current corrected editor sends all lines. | Open required service correction with shipping-only and zero-shipping cases. |
| PA-F09 | Medium | Implicit Enter submission could reach save before the final review step. | Corrected; final nine-case component suite and scoped lint passed. |
| PA-F10 | Review required | Reconstructed status history uses current order timestamps/receipts, not a complete durable transition log; clone/source defaults, archive transitions and bulk cancellation need deeper concurrency/evidence review. | Open; no claim of complete audit-history certification. |

## First implementation slice

Changed source: `components/purchase-orders/ModernEditPurchaseOrderForm.tsx`, new `purchase-order-edit-model.ts`, `hooks/useRecentPurchaseOrderQueries.ts`, canonical purchase-order action, existing edit route, additive `purchaseOrderEdit` EN/FR namespace. Existing master data/auth/RBAC/schema and unrelated changes were preserved.

The four-step editor uses existing Form/Input/Select/Textarea/Card/Button/Dialog primitives and inherited dashboard tokens. Selection/progress uses brand treatment with textual step numbers; it does not imply approval. The discard dialog restores focus to the invoking Back control. Current supplier/item business names remain server-provided source content; the new instructions, controls, validation and failure messages are EN/FR.

The monetary preview follows the current service rule: percentage tax on gross line amount, monetary line discount once, shipping once. It is an estimate and the service remains authoritative. This is a code-contract correction, not an accounting or tax opinion. No tax convention, ledger recipe or country-pack policy was changed.

All form values survive a rejected or unknown save while the page stays open. An unknown outcome links to the saved order in another tab so the user can compare before resubmission. Back navigation prompts before discarding a dirty draft; browser unload warns. This is not durable recovery after browser loss, and unrelated application navigation is not intercepted.

## Verification

- `evidence/jest-edit-final.json`: six focused suites, **50 tests passed**, including payload → existing service calculation, EN/FR failure retention, duplicate-submit protection, monetary zeros/currency precision, cache behavior, tenant action identity and route failure propagation.
- `evidence/lint-edit.log`: changed-file lint passed, exit0.
- Attempts01/02 failed before component execution on external ESM dependencies; test-only mocks corrected them. Attempt03 ran seven component cases successfully and failed one assertion on normalized nonbreaking whitespace; no production monetary defect was indicated. All attempt artifacts retained.
- Enter-review follow-up, genuine browser/persisted-data checks, full typecheck and broader lane runtime assurance are not claimed by these initial receipts. Parent/verifier owns those runs.

No live supplier communication, payment, provider submission, approval fabrication, schema change or production mutation occurred.

## Review lenses

Architecture, services/data, security/tenant control, UI/accessibility/localization, purchasing/AP/financial integrity, audit and release quality are material and represented in the findings. Infrastructure/cost changes are not applicable to this initial editor slice: no hosting or worker configuration changed. Payroll, AI-agent behavior and tax/country-pack interpretation are not applicable to this slice: their behavior was not modified. Production release, accessibility, accounting, privacy and statutory certification are not asserted.

## Final editor follow-up

The implicit Enter guard passed all nine component cases at the final source version; targeted lint of the final component/test files also passed. See `evidence/jest-edit-enter.json`, `evidence/lint-edit-enter.log` and `evidence/edit-correction-receipt.json` for exact current source/test hashes. The earlier six-suite/50-test proof remains preserved, with this follow-up recording the final scoped delta. Browser and aggregate typecheck results remain owned by the parent/verifier and are not asserted here.
## Clone batch and further caller trace

The former detail-page Clone button only opened `/new?clone=<id>`; the new-order route did not consume that parameter. Both header and quick-action buttons now share one controller and invoke the existing protected clone command. The quick-action copy also uses the authoritative capability. Current server update authority selects the real draft editor; create/read users open the real draft detail.

Before numbering or writes, the clone transaction checks inherited and overridden suppliers/locations plus every copied item for the same tenant and active, nondeleted state. The source order is tenant-filtered. Original quoted amounts, header notes and line notes are preserved; receiving quantities start at zero; no stock, ledger or payment effect is created. Header notes previously changed to a cloning message and are now retained when present.

The client disables concurrent triggers and automatic mutation retry. Confirmed creation alone invalidates list/summary and navigates. Denied/unavailable/stopped outcomes retain the source and show a focused EN/FR alert. Unknown outcomes explain that a draft may already exist, offer the saved-order list in a new tab, and block further sends from this page. There is no durable clone idempotency key across browser sessions; this remaining boundary is explicit rather than hidden by an automatic retry.

Only allowlisted presentation reasons and canonical error codes cross the action catch boundary. Internal exception text/metadata are not returned. Existing fresh identity, tenant checks, purchasing admission and independent approval controls remain effective.

Further code-only caller searches corrected initial inventory labels: PA-008 bulk status and PA-012 held-inspection resolution have backend commands without a production interactive caller. Their required implementation remains open alongside AP invoice, matching, payment and correction workflows. This batch does not clear those gaps or PA-F04 edit/approval concurrency and PA-F08 shipping-only totals.

## Final clone focused verification

Six baseline scope tests reproduced the original defect before correction. The first post-check passed 52 cases and failed 2 strict mutation-boundary cases: the query library's second mutation-context argument was being passed to the server action. The explicit one-payload adapter corrected that real transport issue; the assertion was retained.

Final result: **5 suites / 54 tests passed**, including current tenant/reference checks, preserved amounts and notes, module stop, protected action authority, safe error transport, duplicate local triggers, actual returned draft navigation and EN/FR focused recovery alerts. Changed-file lint passed for9 source/test files. EN/FR clone dictionaries parse with matching keys. Exact current source/test hashes and commands are in `evidence/clone-correction-receipt.json`. No genuine browser or database-persistence claim is made by this receipt; the shared verifier records those separately.

PA-F11 (high, corrected): both old clone controls navigated to an unconsumed new-form query parameter instead of executing the real clone workflow, and the quick-action control did not use the server-projected capability. Both now share the protected controller and current capability.

## Typed clone transport follow-up

The parent aggregate typecheck found that the legacy purchase-order response permits only the FORBIDDEN code. The final clone handler emits that exact literal only under the matching guard; other known/unknown outcomes use the narrow presentation reason. The response union and private metadata exposure were not broadened. The final canonical action suite passed 21/21 and scoped action lint passed. The separate evidence/clone-transport-followup-receipt.json records the final action hash and preserves the earlier 54-test receipt as historical evidence. Parent aggregate typecheck and browser results are recorded separately.

## Genuine browser corrections and current presentation

The first EN/FR browser pass found a premature save when Continue became the same DOM node as Save; the French screenshot captured the resulting detail navigation. Neither pass reached the intended explicit save/clone/cancel sequence. The original fixture fields remained unchanged, which does not make the premature mutation acceptable. This failed proof is retained in the environment receipt.

The editor now cancels the continuation click default action and renders distinct keyed Continue/Save nodes. Five new baseline regressions failed as expected before correction. The current complete editor/monetary suites pass 23/23, and scoped lint passes for 5 files. Only an explicit Save starts the expected form submission in these component tests; the native browser owner must still confirm zero update requests before that action.

The authenticated shell owns navigation and identity but does not define the dashboard token scope around child pages. The editor now has the same local dashboard-landing-theme wrapper used by adjacent purchase-order screens, without another sidebar/topbar/organization context. Existing portal primitives retain their floating surface treatment.

ISO XAF formatting previously hid stored fractional amounts (38.50 became 39 and 243.50 became 244). A small purchase-order-only formatter now keeps at least 2 stored decimal places and higher ISO precision such as KWD with three decimals; editor and resulting detail share it. Global formatter, financial calculations and storage are untouched. Admissibility/rounding of fractional XAF records is an open domain-policy review, not certified by presentation fixes.

Exact final source/test hashes, retained failed baseline, final 23-test command and lint are in evidence/editor-browser-followup-receipt.json. Native browser rerun and combined typecheck remain separate owner evidence.

## Delayed server refresh after rejected save

The next genuine browser pass proved both locales perform zero updates during Continue, preserve exact no-op financial fields and create a real same-tenant clone with zero received quantities and no ledger/receipt effects. It then found a distinct recovery failure: after intentional concurrent cancellation, the initial localized rejection briefly appeared before the edit route replaced the form with notFound. The French failure was already visible before viewport resize. The exact refresh trigger was not instrumented; resize is not claimed as the cause.

The route's existing-non-DRAFT notFound branch was the destructive render path. It now retains the same editor, keyed to current tenant/actor/order, with server-derived status controlling read-only presentation. Same-object form values are preserved; saving is blocked in controls, form submission and the save function. Read-only inputs remain focusable for copying, and step navigation remains available. Missing/foreign lookups and permission denial still stop before form data.

The raw English toast came from the shared MutationCache interpreting a resolved failure. This editor opts out through existing per-mutation notification flags because it supplies persistent EN/FR feedback; all other update-hook callers retain their defaults. No global error-handler, authentication or financial service was changed.

The final three focused suites pass32/32 and scoped lint passes6 files. An earlier run also passed32 assertions but exited1 when JSON output was denied; that attempt remains explicit. The actual browser baseline, source hashes, commands, test output and limitations are in evidence/editor-recovery-receipt.json. Recovery-only real browser proof and combined typecheck are owned separately and pending at receipt creation.
