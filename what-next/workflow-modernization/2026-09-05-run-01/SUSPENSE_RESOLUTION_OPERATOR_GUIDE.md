# Resolution and recovery — operator integration, v105

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation` in the existing authenticated application. In the suspense queue choose **Resolution and recovery / Résolution et réouverture**. For an already resolved or written-off item, open **Browse retained records / Parcourir les enregistrements**, inspect the item, then open its resolution review.

The interface reuses the dashboard shell, semantic brand/focus controls, gold evidence-review treatment, danger errors, shared buttons/inputs and inherited EN/FR language. It adds no alternate theme or modal. Review is an inline keyboard-focusable region; closing restores the opener where it remains available. Selection and preview are explicitly separate from approval.

## Resolve an item

1. An authorized accountant prepares a full, same-currency two-line manual clearing journal in **Accounting → Journals**. A different authorized person posts it. Its source reference and account must be genuine; a typed explanation is not proof of statutory authority.
2. Open the posted suspense item's resolution review. Search by journal number or source reference, then choose the clearing journal. The paginated list contains candidates, not certified eligible journals.
3. Select **Resolved** or **Written off**, supply a reason, and preview consequences. The service checks the original posting, clearing amount/currency/accounts/source links, independent posting, prior allocations and current evidence. Expense clearance requires the explicit supported write-off outcome. Partial clearing and foreign-exchange conversion remain unsupported.
4. Submit the reviewed proposal. This does not resolve the item. The independent reviewer opens the recorded proposal, reads its outcome, destination account, amount and consequences, and enters a decision reason.
5. Confirm or reject. Required password step-up does not automatically approve anything: after authentication, explicitly retry the saved request. The server recomputes permissions and evidence and applies the existing independent/fresh controls.

Resolution links existing financial evidence and creates no additional journal. Affected close evidence requires review, while related exceptions retain their separate review obligations.

## Reopen a final resolution

Select the retained final item. Explain the reason and choose a valid open accounting date, on or after clearing and no later than today. Preview the exact reversal consequences, then submit for independent review. The approving person needs both suspense-post and journal-reverse permissions and must differ from the recovery proposer and original clearing poster.

Approved recovery creates one exact clearing reversal, preserves the original suspense posting, reopens the obligation and non-dismissed linked exceptions, invalidates affected run/close evidence and retains prior decisions/certificate data. Generic accounting reversal cannot be used to bypass this process. A later new resolution needs a new clearing journal.

## Inputs, authority and recovery

| Needed information | Where to obtain it | Owner |
| --- | --- | --- |
| Suspense record | Reconciliation queue or retained history | Reconciliation operator |
| Clearing journal | Posted accounting register; search number/reference | Authorized accountant and independent journal poster |
| Resolution/write-off outcome | Actual business evidence and applicable accounting policy | Authorized finance reviewer |
| Reason | Source documents and explanation of the proposed business treatment | Proposer; independent decision reason from reviewer |
| Reversal date | Current open-period calendar and clearing date | Authorized finance reviewer |
| Permissions | Existing organization role assignments | Organization administrator; do not grant indiscriminately |
| Fresh authentication | Current user's password step-up | The actual reviewer |
| Request ID/revision | Generated and retained by the application | No manual input needed |

Browser session storage retains unsent input and exact submitted requests separately for each tenant, actor and item. Refresh does not overwrite the draft. After an uncertain response, retry the same request; the recorded decision is not repeated. To start a different review, first refresh current records and explicitly discard the local pending request. That does not cancel a server decision.

If history fails to load, the interface reports failure; it does not show a successful empty result. If authority changes, private responses are refused or hidden. The read service requires both reconciliation and accounting journal read authority. Passwords are not stored in the saved draft.

## Current implementation and remaining work

Implemented: ten protected server actions with explicit read/write reconciliation-module intent, server-derived identity, verified fresh claims for decisions, scoped journal search and paginated immutable decision summaries, EN/FR resolution/recovery controls and retained request handling. Current actions use the existing module and domain control infrastructure. History exposes selected fields rather than raw private certificate payloads.

Verification is recorded separately: [v105 evidence](SUSPENSE_RESOLUTION_OPERATOR_VERIFICATION_V105.md). No deployment or live financial approval occurred. Browser evidence uses synthetic organizations and ordinary local password sessions. No migration was needed.

Remaining engineering: durable resolution/recovery exports, broader cross-item allocation/reversal races, full genuine sign-off/export handoffs, legacy final-record provenance, changed currency-configuration recovery policy, large histories and performance, screen-reader/contrast/native zoom and additional provider/country/period variants. The UI is not platform or professional certification. The broader workflow mission stays active.

Selected skill: `009-aqstoqflow-payment-reconciliation-moat`. Architecture/backend/database/security/IAM/audit/finance/quality/operations and frontend/accessibility/localization reviews apply. Packaging review preserves current module access; no commercial change. New statutory rules, HR/payroll, offline, AI and billing-provider integrations are not applicable to this bounded interface integration. Required expert authority is not generated by the software. Next numbered skill is 010 after the reconciliation boundary; complete remaining connected work first.

For rollout, retain all immutable records and recovery guards. UI rollback can remove entry points without deleting financial history; server rollback must not allow generic reversal of allocated or recovery journals. No production rollout, X1 clearance, notification-worker cutover or external delivery is authorized by this report.


## v106 — local recovery update

Unreadable browser drafts now have an explicit reset after authoritative reload, with preservation on read failure. Closing a final record returns focus to the queue when its opener has disappeared. [Procedure and verification](SUSPENSE_LOCAL_RECOVERY_V106.md). This supersedes the earlier limited focus-return description. Remaining export and connected financial workflow work stays open.


## v107 — historical exports available

Authorized users can now download scoped resolution/reopening history with verified financial lineage, fresh authentication and exact-byte replay. [Export procedure and evidence](SUSPENSE_RESOLUTION_EXPORT_GUIDE_V107.md). This supersedes earlier exports-unimplemented statements; genuine connected sign-off and wider lifecycle evidence remain open.
