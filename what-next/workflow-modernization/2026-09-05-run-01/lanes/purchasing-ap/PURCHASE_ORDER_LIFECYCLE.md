# Purchase-order lifecycle corrections — service baseline v49, final source v50

Evidence date: 2026-09-07. This is a bounded implementation checkpoint in the continuing whole-platform workflow assignment. It does not complete purchasing/AP or certify a release.

## Delivered behavior and reasons

The purchase-order service now locks the tenant-scoped order before reading the state used by edits, submission, approval, cancellation, archive and completion. A competing approval therefore prevents a pending draft edit; a competing cancellation prevents a pending approval. The existing receiving workflow already locks the same aggregate row. Bulk status updates acquire order locks in sorted order and apply the same submission/completion prerequisites.

Shipping-only edits now recalculate the order total from the stored subtotal, tax, discount and new shipping amount. Removing all draft lines preserves unchanged shipping in the total. The reproduced examples were 25,050 remaining unchanged after shipping increased from 50 to 175.25, and an empty draft retaining shipping 50 while displaying total zero. Corrected stored totals are 25,175.25 and 50 respectively. Shipping-only arithmetic uses the stored Decimal values; the broader line rounding policy remains a separate open requirement.

Submitted orders can no longer be edited through the ordinary service, matching the existing draft-only editor. Empty orders cannot be submitted or approved. Completion checks actual remaining quantities, including a 0.001 remainder, and refuses held inspection receipts. Bulk changes cannot manufacture receipt or approval states; an empty selection is rejected, duplicate IDs are evaluated once, foreign IDs remain denied, and cancellation notes append to existing notes. Valid completion retains order lines. Server capability projection now suppresses approval for empty orders and completion for empty or incompletely received orders.

No schema migration, data repair, receipt posting, ledger posting or deployment is part of this checkpoint. Existing archived orders, lines, approval records and unrelated user edits remain intact.

Actual browser verification exposed overflow at a 320-pixel viewport with 200% text sizing. The form used nested spacing and minimum text widths that pushed totals, labels and buttons beyond the available width (275 pixels into a 256-pixel English form; 303 into 256 in French). The scoped editor now gives small screens more content width, allows long labels and monetary values to wrap, constrains buttons to available width and uses a single-column step list below 380 pixels. Existing dashboard tokens and shared primitives remain unchanged.

## Routes and practical procedure

Open `/{en|fr}/dashboard/purchase-orders`, choose an order, then use `/{en|fr}/dashboard/purchase-orders/<order-id>/edit` for a draft. The existing four-step editor covers order details, supplier/delivery, items/amounts and terms/review. Saving changes the draft only. Submission, independent approval and receipt processing remain separate actions.

| Situation | Information needed from you | Where to obtain it | Action |
| --- | --- | --- | --- |
| Edit shipping or terms | Supplier-confirmed shipping, delivery date, payment terms and item prices | Current supplier quotation or agreed order terms | Review all amounts, save the draft and inspect the saved order. |
| Edit rejected after another person submits/approves | Order number and your unsaved proposed changes | Current form and saved order link | Keep the form open, open the saved record separately and compare. The service preserves the submitted/approved terms. |
| Empty draft cannot progress | At least one valid item, quantity and agreed price | Item catalogue and supplier quotation | Add the missing items while the order is a draft. An empty submitted legacy record needs controlled reconciliation; do not invent a line merely to bypass the rule. |
| Approval required | A distinct authorized approver and actual review of the current order | Your organization's purchasing authority/role assignment | Use the ordinary approval action. A second synthetic user used in tests is not business approval evidence. |
| Completion refused | Accepted received quantities and inspection status | Goods receipt and inspection records for this order | Resolve actual outstanding delivery/inspection work through the owning process. Do not force receipt status with bulk actions. |
| Lost save response | Order number, approximate operation time and pending form contents | Browser form, saved record and authorized operational logs | Inspect the saved order before repeating an action. Exact request identity and general draft conflict recovery remain engineering work. |
| Persistent failure or suspected historical wrong total | Order ID, intended terms, observed total, operation time and reference to this checkpoint | Saved order and its supplier/receipt/audit records | Authorized support compares the scoped records. No automatic historical total repair is included. |

Approval and rollout still require the actual organization's authority; this correction supplies no signed product decision and does not clear X1. Ordinary local implementation has no additional external decision dependency.

## Verification and limits

See [the checkpoint receipt](../../evidence/purchase-order-lifecycle-receipt.json) for final source hashes, exact commands, database and browser results, screenshots, timings and earlier failures. The database driver uses owned synthetic orders in `stoquify_local_registration_20260906_01`. Its condition fixtures for received quantities/held receipts test completion guards; they do not prove the full receiving-to-inventory-to-AP posting journey.

The service checks include two deterministic transaction-start interleavings, simultaneous approvals, audit-failure rollback, six foreign-tenant operations, requester/checker separation, empty orders, unsafe bulk receipt/approval states, retained notes and fractional completion guards. Receiving unit regression tests are included. Real application checks use the current local app on port 3110 with real password sign-in and external traffic blocked.

Typecheck and changed-file lint passed. Full production build, native screen reader, native browser zoom and a production performance budget are not established by this checkpoint. CSS 200% text resizing is reported as text resizing. Development timings are observations only. The existing permission-denied route text remains partly English in the French route and requires localization; its screenshot is evidence of that limitation.

## Remaining engineering requirements

1. Bind ordinary draft edits to the revision actually reviewed; preserve and compare old form contents when another draft editor saves. A row lock prevents invalid lifecycle races but does not alone prevent stale draft-to-draft overwrites.
2. Add durable command identity and recovery for ordinary save/submit/approval/cancel outcomes. Concurrent approvals currently apply once and reject the second transition; this is not a replayable success receipt.
3. Revalidate current actor/session/role/module authority at the ordinary mutation boundary. These signatures still rely on action-layer permission checks; this checkpoint does not establish the stronger supplier-review authority contract for normal order commands.
4. Complete header/status audit and event continuity for ordinary edits/transitions; approval/archive evidence is already transactional. Do not infer a history record from the UI.
5. Implement a controlled approved-order amendment workflow for accepted supplier proposals. The supplier can propose three-decimal quantities; current order/receipt input schemas still use integer quantities. Do not silently round or treat buyer acceptance as order amendment or posting.
6. Verify the full receiving, inspection resolution, supplier invoice, AP approval/posting and retained-obligation handoffs, then continue the rest of the workflow register.
7. Finish current UI denied-state localization, native accessibility, full-build/release and operational monitoring evidence. These are incomplete work, not fabricated external approvals.

## Rollout and recovery

Ship the service and capability projection together after completing the remaining applicable release requirements. No migration or seed is needed for these source changes. Before a real rollout, reproduce representative draft, submitted, approved, received and held orders in an authorized staging cohort and review support guidance for rejected stale operations.

Monitor scoped invalid-transition, missing-object, transaction and audit failures. Avoid collecting private supplier terms unnecessarily. A rejected transaction should leave its order unchanged; support can compare the existing audit and order records. For rollback, restore the reviewed preceding source through the normal release process, retaining all order/receipt/evidence data. Reverting source reintroduces the demonstrated race and total defects and requires an explicit operational decision. Do not use status or evidence rewrites to recover.

## Review responsibilities

These are engineering assessments, not independent professional approvals.

| Responsibility | Assessment in this checkpoint |
| --- | --- |
| Enterprise/platform architecture | Reused the current purchase-order aggregate/service and receiving lock; no second subsystem. |
| Backend/API/distributed systems | Locked state validation, sorted bulk locks, transaction rollback and concurrent approval checked; durable command replay still open. |
| Database/data/migrations | Scoped reads/writes, retained lines and Decimal shipping arithmetic verified locally; no migration or historical repair. |
| Security/IAM/privacy/fraud | Foreign-object denial and maker/checker tested; current mutation authority/session hardening still required. Synthetic accounts and sanitized evidence only. |
| Frontend/design system | Existing editor/shell/tokens retained; server projection matches empty/incomplete lifecycle prerequisites. |
| Workflow/accessibility/localization/content | Preserve draft after rejected edit; EN/FR browser evidence scoped in receipt. Denied-route localization and native AT/zoom remain open. |
| Product/business operations | Prevent changed approved terms, wrong shipping totals and premature completion; approved-order amendments remain missing. |
| Finance/accounting/reconciliation/controls | Stored shipping total corrected, receiving regression checked, audit rollback verified; no claim of full AP/ledger/reconciliation correctness. |
| Statutory/OHADA/country packs | Not applicable to changed behavior: no statutory rule, country pack, account mapping or filing changed. Monetary posting policies remain with existing owners. |
| Audit/records | Existing approval/archive evidence stays transactional; retained lines/notes checked. General edit/transition history remains incomplete. |
| Quality/release assurance | Focused unit/action, real database and current browser receipts with failed attempts retained; no whole-platform release certification. |
| SRE/DevSecOps/performance/cost | Local timings and source bindings; no production budget or new infrastructure. Lock contention under production load unmeasured. |
| APIs/events/integrations/providers | Action entry points preserved; unsafe bulk transport bypass blocked. No external message/provider effect introduced. |
| POS/offline/edge | Not applicable to this patch: no offline replay or POS operation changed; downstream inventory handoff remains separately scoped. |
| Analytics/data governance | Order totals/status are corrected source inputs; analytics aggregation/export verification remains a separate workflow. |
| AI/agent safety | Not applicable to this patch: no AI tool, autonomous approval or model behavior changed. |
| SaaS packaging/billing/growth/customer success | No pricing or entitlement changes. Support instructions identify user inputs and avoid simulated activation/readiness. |
| HRIS/payroll | Not applicable to this boundary: no employee, contract, salary, payroll or declaration data changed. |
| Rollout/support | No live rollout; staged release and recovery instructions above, remaining engineering defects explicit. |

## Applied skill contract

- Selected skill: `011-aqstoqflow-purchasing-ap-controls`.
- Production files: `services/purchase-order/purchase-order.service.ts`, `services/purchase-order/purchase-order-capabilities.ts`, `components/purchase-orders/ModernEditPurchaseOrderForm.tsx`.
- Tests changed: the corresponding `purchase-order.service.test.ts` and `purchase-order-capabilities.test.ts` files.
- Gates verified in this slice: tenant/object scoping, lifecycle integrity, actual-quantity completion, maker/checker predicate, existing approval audit rollback, retained records and focused regressions; final browser scope is in the receipt.
- Gates still open: complete current mutation authority, command replay/revisions, all-transition evidence, full downstream financial lifecycle, native accessibility and release assurance.
- Next numbered suite recommendation: `012-aqstoqflow-payroll-presence-engine`; it is not a dependency or instruction to abandon the purchasing work. Continue the remaining purchasing handoffs and entire workflow register.
