# AF06 delegated capability matrix

Updated 20 October 2026. This matrix describes the implemented evidence desk and its existing domain boundaries. An engagement, staff label, client selector or browser state never grants authority.

## Authority intersection

The server derives the actor, home organization and session from trusted authentication. An active named-accountant mandate remains necessary. An enrolled mandate also requires an active engagement and a current assignment for that person under AF04. Each read rechecks authority before returning client data. Request and acceptance writers retain their transaction-owned session, membership, mandate, engagement, assignment, module and permission checks.

The new read projection requires the firm's audit/review permissions and delegated evidence-request permission. Supervision additionally requires current finding-assignment permission. It returns a write-availability hint from both the firm's accounting module and the client's Close module; the writer checks again. Read-only module access keeps tracking available and disables submission.

## Action contract

| Action | AF06 availability | Current boundary and owner |
|---|---|---|
| READ evidence choices and tracking | Available | Trusted session, firm audit/review access, current REVIEW mandate and evidence-request permission, client-scoped periods/findings, current module access. No authority supplied by the browser. |
| Request missing evidence | Available | New protected action calls existing `requestMissingCloseEvidence`; strict required client/correlation fields; current request permission; eligible recipient; scoped original finding; future deadline for new commands. |
| Respond to request | Client workspace only | Existing `respondToMissingCloseEvidence` derives the client tenant from the respondent's own authenticated session and checks current assigned recipient and comment permission. No delegated impersonation or credential sharing. |
| Replace client response owner | Client workspace only | Existing `replaceMissingCloseEvidenceRecipient`; request plus finding-assignment authority, expected revision, eligible colleague and recorded reason. Original request, author and deadline retained; submitted responses cannot be reassigned. |
| Preview replacement source | Available in existing firm review desk | Existing replacement reader binds the same client, period, typed collector, original finding, current completed assessment and collection receipt. |
| Accept evidence response | Available to independent authorized reviewer | Existing acceptance action/service; actual persisted session and fresh authentication within 300 seconds; respondent cannot accept; source binding must still match; exact command replay. Acceptance is evidence review, not a financial sign-off. |
| Export | No new AF06 export action | Existing export capabilities retain their own permission, mandate and domain contract. A READ/REVIEW decision does not imply EXPORT. The source link is an authorized portal drill-through, not an export shortcut. |
| Correct/post/reverse journal | Unavailable through this desk | Existing journal actions require their own permissions, fresh identity and trusted tenant. AF06 adds no client-tenant override or writer. |
| Sign reconciliation | Unavailable through this desk | Existing `payments.reconciliation.sign` boundary and source/evidence revision checks remain. Recovering a collector does not sign reconciliation. |
| Release supplier payment | Unavailable through this desk | Existing `purchasing.ap.payment.release` boundary, fresh context and AP domain writer remain. |
| Release payroll payment | Unavailable through this desk | Existing `payroll.payments.release` boundary, trusted organization/actor and payroll module/domain checks remain. |
| Certify/close | Unavailable through this desk | Existing `accounting.close.certify` and financial close controls remain. Evidence acceptance cannot manufacture a certified close pack or close a period. |
| Batched reminders | Deliberately deferred | No new reviewed recipient/channel/consent contract was established. Existing outbox and publication history are reused; no delivery worker or real recipient was invoked. |

## Evidence and limits

The real SQL suite denies the five journal, reconciliation, AP, payroll and certification permission requests through the managed-accountant resolver. It also verifies expired session, revoked mandate and ended assignment denial for list/detail/pending acceptance. This is a live boundary check against synthetic data; it is not a replay of every operational financial mutation.

Source inspection separately confirms that the protected financial actions derive the tenant from their trusted context and retain their own permission/fresh-auth gates. No financial writer changed in AF06:

- [Journal posting](<E:/ohada saas/Focused projects/stoquify/actions/accounting/journals.actions.ts:105>)
- [Reconciliation signing](<E:/ohada saas/Focused projects/stoquify/actions/payments/reconciliation.actions.ts:317>)
- [Supplier release](<E:/ohada saas/Focused projects/stoquify/actions/purchasing/ap-control.actions.ts:209>)
- [Payroll release](<E:/ohada saas/Focused projects/stoquify/actions/payroll/payroll-control.actions.ts:355>)
- [Certified Close export](<E:/ohada saas/Focused projects/stoquify/actions/accounting/close-assurance.actions.ts:288>)
- [AF06 protected adapters](<E:/ohada saas/Focused projects/stoquify/actions/accounting/delegated-evidence-desk.actions.ts:10>)
- [Delegated projection](<E:/ohada saas/Focused projects/stoquify/services/accounting/delegated-evidence-desk.service.ts:28>)

See [RESULT](RESULT.md) for the acceptance register and evidence classes.
