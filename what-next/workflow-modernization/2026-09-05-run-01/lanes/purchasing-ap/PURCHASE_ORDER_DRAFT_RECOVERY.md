# Purchase-order draft revision, comparison and recovery

This is an implementation checkpoint in the continuing platform workflow review. It does not certify the complete purchasing/AP workflow or release the platform. The final [receipt](../../evidence/purchase-order-edit-receipt.json) binds the commands, source, actual database checks and browser screenshots. Prior failed attempts are retained in [the attempt record](../../evidence/purchase-order-edit-attempts.md).

## What changed and why

The previous draft update path allowed two people who opened the same version to overwrite each other. It also repeated line reconciliation when a caller retried a save, and the service accepted saves after the actor's current role or session was revoked. The baseline reproduced all four behaviors against owned local records.

Draft updates now compare a server-generated revision covering the order header, money, status and line contents after locking the scoped order. A stale version cannot overwrite the current record. Current organization, purchasing eligibility, usable account, read/update permissions and the actual session are checked in the transaction. This is a routine draft save: it does not add another password or approval ceremony. Submitting or approving the order remains a separate workflow.

The browser assigns one reference to a save and preserves that exact request before sending it. A durable, applied business event records its verified result and a transactional audit records the before/after order snapshot. Retrying the same request under current authority returns the original receipt without repeating line or header effects. A different payload, order or actor cannot reuse it. Credentials are excluded from stored requests, business events and draft audits.

After a stale save, **Compare with the current order** loads the current record under current authority. Fields you did not change adopt the current saved values. If you and another editor changed the same field differently, choose which value to keep. Order lines are deliberately compared as a group; this avoids silently combining incompatible item, quantity, price, discount or tax changes. Applying the comparison creates an unsaved draft against the reviewed revision. You still review and save it; a later competing change is checked again.

An ambiguous transport result keeps the exact pending request and makes its fields read-only. **Recover previous save** resubmits that request. Reloading the same tab can restore it. A missing or mismatched result receipt is not displayed as success. If the browser cannot retain local storage, the interface says so. Confirmed completion clears the local draft and opens the saved order.

A related positive archive check exposed an existing defect: `PURCHASE_ORDER` was supplied as an accounting source enum even though that enum value does not exist. Archiving now records a non-posting event with the explicit PurchaseOrder entity in its payload. The database check verifies the retained order/lines, one archive audit and one applied event. Current archive authority, replay and historical-access completeness remain separate work.

## Buyer instructions and required inputs

Open **Purchases → Purchase Orders**, open the relevant draft, then choose its edit action. Existing routes are:

- `/en/dashboard/purchase-orders/<order-id>/edit`
- `/fr/dashboard/purchase-orders/<order-id>/edit`

The application supplies the order identifier, organization, current actor, revision and request reference. Do not type or invent these references, session values or evidence timestamps.

| Situation | Information you provide | Where to get it | What to do |
| --- | --- | --- | --- |
| Ordinary draft correction | Supplier, delivery location/date, items, quantities, quoted prices, discounts, tax rates, shipping, payment terms and notes as applicable | Current supplier quotation/agreement and the organization's purchasing instructions; supplier/item/location records already in Stoquify | Review the amounts and terms, then save. A saved draft is not an approved order or a posted payable. |
| Another editor saved first | Which of the conflicting values is now intended | Compare the displayed current values with your draft and confirm disputed terms with the responsible buyer | Keep each intended value, apply the comparison, review the resulting draft and save. Unchanged fields preserve the colleague's changes. |
| Line conflict | The complete intended set of items and their commercial terms | The current quotation and the buyer who changed the lines | Choose the current lines or your draft lines as a group. Review quantities, prices, discounts and tax before saving. |
| Save confirmation lost | No new identifier or approval | The pending request already retained in this tab | Select **Recover previous save**. It either recovers the prior committed result or executes the same still-valid request. It does not create a second save merely because the first reply was lost. |
| Session or permission no longer valid | An active account with the organization's authorized purchasing access | Your organization's user/access administrator; your normal sign-in process | Re-establish legitimate access. Keep the draft available to copy where possible; the service will not accept stale authority. A different signed-in user does not inherit this user's local draft. |
| The order was submitted, approved or otherwise left draft status | The correct purchasing decision and any approved amendment instruction | The responsible purchasing owner/approver and the actual order record | Inspect the saved record. The comparison cannot turn a non-draft order into an editable draft. Do not rewrite its status to bypass the lifecycle. |
| Browser storage unavailable | No additional business information | The inline warning identifies the limitation | Keep the tab open and retain necessary draft text through an organization-approved method before leaving. Reload recovery is not promised when the browser cannot retain it. |

Local drafts use session storage scoped to organization, actor and order. They are working copies, not business records or approvals. Closing the tab or clearing browser storage can remove them. Discarding the draft intentionally removes its local copy. The durable event/audit remains the source of truth for a committed save.

An authority change can either produce the editor's inline denial or replace the page with its server-protected access-denied view. In both cases the scoped local draft can remain in this tab. After the administrator legitimately restores your access, reopen the same order edit route and review the restored draft. No saved-record contents are fetched by bypassing the denied route. Successful save navigation uses the action's existing cache invalidation and one navigation; an immediate competing refresh was removed after the browser exposed a navigation timeout.

## Evidence and engineering boundaries

The receipt reports the final focused test, PostgreSQL, EN/FR browser, typecheck and lint results accurately. Database coverage includes concurrent revisions, identical concurrent requests, request/object/actor binding, changed-line revisions, current-role/session/account/module denial, cross-tenant reads/writes, audit/event rollback, replay after a later save and malformed/unapplied receipt rejection. Fault injection changes only the verification process's view or write behavior; it does not rewrite immutable historical events.

The browser checks use the actual local Next application, real synthetic password sign-in and its server actions. They cover two editing tabs, independent merging, explicit overlap choices, confirmation loss after server processing, reload and exact recovery, and revoked-role draft preservation. Screenshots and narrow-layout/text-resize assertions are evidence for their stated scope. A timeout or failed attempt remains a failed attempt; a later pass does not turn it into a pass.

The final set contains 16 journey screenshots plus eight unmodified viewport captures. A full-page mobile image omitted a painted region; separate captures of the actual scrolled comparison show the content correctly. Use those viewport images for that visual assessment. The original full-page capture is retained with its limitation.

Native screen-reader testing, native browser zoom, comprehensive contrast, a full production build and production performance assurance are not established here. CSS 200% text resizing is described as text resizing. Local development timing observations are not an SLA. The French route's existing denial presentation remains partly English; the new editor's draft denial/recovery messages are localized.

## Rollout, recovery and support

No migration, seed, deployment, real supplier message, payment, approval simulation or historical repair is part of this patch. The new draft event and audit reuse existing durable records. Release the action, service, DTO, route and editor together: clients now need the reviewed revision and save reference, while identity/session values are supplied on the server.

Before release, verify representative real staging roles and draft records through the organization's release process. Monitor stale/conflicting request denials, missing authority, evidence-write failures and slow saves without logging session tokens or private terms. The event type is `purchase_order.draft_updated`; its source is INTERNAL, its entity payload is PurchaseOrder and its request key begins `purchase-order-edit:`. Support can correlate the original result with `UPDATE_PURCHASE_ORDER_DRAFT` audit evidence. Access to these records must use the organization's authorized support/audit process.

If the result is unknown, recover the original request first. If the record changed, use comparison and an explicit new save. Do not fabricate an applied receipt, edit evidence hashes, delete audits or manually toggle status. If evidence cannot be verified, preserve the existing order and escalate the precise request/order reference to the responsible engineering/support owner.

Rollback restores the preceding reviewed source through the normal release process while retaining all order, event and audit data. A rollback reintroduces the demonstrated stale-save/retry/access defects; its operational consequences must be reviewed. No destructive data rollback is provided.

## Review responsibilities

These are coordinated engineering reviews, not independent professional sign-offs.

| Responsibility | Finding / scope |
| --- | --- |
| Platform architecture | Reused the existing order service, transaction, module evaluator, action and authenticated route. No second workflow or ledger. |
| Backend/API/distributed systems | Current revision under an aggregate lock, command-bound durable receipt, safe post-commit cache behavior and exact retry. Ordinary status-transition command identity remains open. |
| Database/data/migrations | Same-transaction header, lines, audit and event; real rollback and concurrency checks; no migration. |
| Security/IAM/privacy/fraud | Current tenant/account/permissions/session/module checks, scoped comparison reads and credential-free evidence. Full-platform security certification is not claimed. |
| Frontend/design system | Existing dashboard controls, brand focus/selection, attention/error feedback and semantic button hierarchy. No shell replacement. |
| UX/accessibility/localization/content | EN/FR comparison, conflict choices, pending recovery, focus movement and draft retention. Actual native AT/zoom remains unverified. |
| Product/business operations | Avoids overwritten terms and repeated saves; preserves independent colleague changes without adding approval steps to routine draft editing. |
| Finance/accounting/reconciliation/controls | Preserves authoritative order totals and line evidence; draft/archival events do not claim posting or payment. Full AP/ledger handoffs remain open. |
| OHADA/statutory/country packs | Not applicable to this correction: no statutory rule, tax treatment, country pack or filing behavior changes. |
| Audit/records | Durable before/after save audit and applied result receipt; archive enum defect corrected. General transition/history presentation still needs completion. |
| Quality/release assurance | Focused unit/action/editor, real database and real application evidence; failed attempts retained. No platform release certification. |
| SRE/DevSecOps/performance/cost | Local timing and timeout observations retained. Transaction locks and retained browser drafts have operational limits; production contention/performance unmeasured. |
| API/events/provider boundaries | Existing business-event engine reused; no outbox message or provider call introduced for draft saves/archives. |
| POS/offline/edge | Not applicable: this patch changes online purchasing draft editing, not POS or offline inventory replay. |
| Analytics/data governance | Correct source order and durable audit inputs; reporting/export verification remains a separate workflow. |
| AI/agent safety | Not applicable: no agent may approve, mutate or infer authority through this patch. No model capability changes. |
| SaaS packaging/billing/customer success | Current purchasing eligibility remains enforced; no prices or subscription promises changed. Recovery guidance supports buyers and administrators. |
| HRIS/payroll | Not applicable: no employee, contract, salary, payroll or declaration behavior changes. |
| Rollout/support | No live rollout. Exact retry and comparison instructions above; unresolved engineering work is explicit. |

## Remaining work and next boundary

1. Complete ordinary submit/approve/cancel/complete/archive commands with current mutation authority, revision/command identity and durable transition recovery/history. This draft implementation does not certify those commands.
2. Finish safe archive handling of continuing obligations and authorized historical access, beyond this positive draft/event fix.
3. Implement the controlled approved-order amendment required after buyer acceptance of a supplier proposal. Proposal quantities allow three decimal places; current order/receiving inputs still require integers. Do not silently round them.
4. Verify the connected receiving, inspection, inventory, supplier-invoice/AP approval, posting, reconciliation and retention workflows.
5. Finish the remaining localization/accessibility/release evidence and continue the entire workflow register. A discovered route or an isolated passing case is not a verified complete workflow.

## Applied skill contract

- Selected skill: `011-aqstoqflow-purchasing-ap-controls`.
- Files: final production/test source list and hashes are in the linked receipt.
- Verified gates: final receipt names the current draft authority, revision, replay, evidence, tenant and failure/recovery checks; no wider gate is inferred.
- Open gates: full ordinary transition authority/recovery, approved-order amendments, financial handoffs and release/native accessibility assurance.
- Next numbered suite recommendation: `012-aqstoqflow-payroll-presence-engine`; it is not a dependency or an instruction to abandon purchasing or the remaining platform register.
