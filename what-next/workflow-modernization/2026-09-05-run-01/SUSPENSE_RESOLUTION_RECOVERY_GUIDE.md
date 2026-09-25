# Resolution recovery — v104 server implementation

A resolution or supported write-off can now be reopened by reversing its clearing journal through an independent source review. This preserves the original suspense posting and all former decisions. The item returns to `POSTED_TO_SUSPENSE`; it does not jump to a new original posting cycle. A later original-posting correction remains a separate operation.

There are no new public actions or operator controls yet. This guide describes implemented server behavior and required operator inputs for the upcoming interface. Development and isolated verification remain authorized; no live activation is implied.

## What the operator will need

| Input | Source and owner | Purpose |
| --- | --- | --- |
| Resolved suspense item | Reconciliation record, selected by scoped operator | Locate the existing allocation, original posting and clearing evidence; the client does not choose a replacement allocation |
| Reason | Proposer's explanation, reviewed by authorized finance reviewer | Explain why the final resolution needs reopening |
| Accounting date | Authorized finance reviewer, existing open-period calendar | Date on or after clearing and no later than today; service rechecks an open period |
| Independent reviewer | Existing organization roles and permissions | Must differ from both recovery proposer and clearing journal poster, hold suspense-post and journal-reverse permissions, and authenticate recently |
| Current preview/review revision and request identity | Server preview and retained client request when UI is integrated | Prevent stale approval and duplicate effects |

No new statutory approval, exchange rate or account is invented. The reversal copies the existing clearing lines exactly with debits and credits exchanged, including base amounts, currency, rate and dimensions. Current resolution evidence must pass its existing currency and source checks; changed accounting-currency settings and broader legacy provenance remain a review boundary.

## Implemented lifecycle

1. Preview current final resolution and clearing proof, consequences and open accounting period without writes.
2. Propose reopening. The resolution remains effective while awaiting review.
3. Reject and retain the final outcome, or independently approve against the reviewed revision.
4. Atomically create one compensating clearing journal, reverse its original batch, record immutable recovery/decision/audit evidence, reopen the suspense obligation and non-dismissed linked exceptions, and invalidate run/close evidence. Retain prior certificate data in the recovery receipt.
5. Retry the exact request without another journal. Subsequent correction, posting and resolution verify every historical clearing recovery.

Generic journal reversal refuses both an allocated clearing journal and a source recovery journal. Do not delete receipts, edit posted lines or remove the guard to undo recovery. A later new resolution requires a new independently posted clearing journal; its predecessor remains reserved permanently.

## Engineering review and gates

Selected skill: `009-aqstoqflow-payment-reconciliation-moat`. Files changed: recovery contract/service/evidence files, suspense ledger verification, generic accounting reversal, notification type list, focused accounting/ledger/recovery tests and owned verification fixtures. Existing schema/inbox/source-link/close infrastructure is reused; no migration or new ledger.

Passed scope: strict calendar and authority input contracts, tenant/active actor reads, fresh independent decisions, exact reversal, serializable duplicate handling, rollback, preserved history, tamper refusal and connected second posting/re-resolution in an owned local database. Typecheck and changed-file lint are recorded in the verification report. The runtime test exposed and corrected a missing posting-batch include in the generic reversal guard.

Open gates: protected transport/module checks, durable operator history and exports, EN/FR accessible responsive controls and actual browsers; broad allocation-vs-reversal races; real sign-off/export and varied country/provider/period contexts; production-scale query and storage review. Persisted notifications do not establish external delivery. No professional accounting, statutory, security or release certification.

Architecture/backend/database/security/audit/finance/close/API-event/quality/operations responsibilities apply to these changed boundaries. UX/localization/accessibility and packaging remain pending public integration. New statutory rules, HR/payroll, offline, AI, billing providers and commercial prices are not applicable to this bounded recovery change. Domain policy still needs the organization's actual authority and expert-reviewed setup at rollout.

## Rollout and next step

No production deployment, migration, X1 clearance or held notification cutover occurred. Preserve both resolution and recovery records during rollback; do not revert reversal protection while leaving allocated journals active. Keep public activation unavailable until protected actions/history/UI and connected browser verification are complete.

Next: implement one coherent operator flow for resolution and recovery, with durable history, current-authority actions, preview/review revisions, fresh-auth recovery and EN/FR failure states. The next numbered skill is 010 after this reconciliation boundary, not instead of completing it.

[Verification](SUSPENSE_RESOLUTION_RECOVERY_VERIFICATION_V104.md).
