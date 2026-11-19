# AF10 — Cutover, recovery and correction runbook

**20 October 2026. Scope:** the verified CM/XAF, 1 October 2026 opening pilot for a financially empty client. This runbook does not authorize a production cutover. See [RESULT.md](RESULT.md) for the actual evidence and exclusions.

## Before approval

1. Confirm the client, country, currency and cutover instant: 1 October 2026, 00:00 Africa/Douala, or 30 September 2026, 23:00 UTC.
2. Ensure the additive AF10 migration and matching generated client are deployed through the normal release process. Retain a migration/backup plan; never reset a populated database to enable opening import.
3. Finish master identity/catalogue onboarding through the existing importer. Do not put opening balances into customer/supplier master fields or create sales/purchases to imitate historical documents.
4. Use separate source and independently prepared control JSON documents within AF09's limits. Map every source key to an active client master. Confirm document dates, original amounts, historical settlements, outstanding balances, stock units and account coverage.
5. Obtain independent AF09 preview review. A reviewed preview is still not financial authorization. Stage a new revision and repeat review if the source, mappings or selected master meaning changed.
6. Configure an active AN opening journal and an open period containing the cutover instant. The financial operator needs the existing client-local permissions and modules listed in RESULT.md. A firm REVIEWER/PREPARER assignment is not enough.
7. Confirm the financial client is empty. Existing journals or posting batches, stock movements, AR/AP documents/ledger entries, balances or pending stock quantities block this pilot. Investigate existing history; do not delete it to satisfy the check.

## Approval and apply

Open `/{locale}/dashboard/accounting/opening-position` for the selected client. The preview and controlled financial apply are distinct sections.

The client financial operator selects **Load / recover cutover**, compares the reviewed source digest and independent totals, and supplies a financial approval conclusion. The source maker cannot approve. Fresh password verification may be required; after verifying, explicitly retry the retained approval command.

Approval binds the current source revision, digest, period ID/version and approving operator. It lasts 30 minutes and posts no money. Review the approval's identity and expiry. The same approving operator checks the explicit financial confirmation and selects **Apply approved opening**, with current permissions and password assurance within five minutes.

The server locks/rechecks current authority, serializes cutovers, verifies the reviewed source and accounting period, and rejects any existing financial activity. It posts one opening journal, opening receivables/payables and stock through their domain writers. It reconciles actual persisted details and retains operation receipts before recording `ACTIVE` and the activation event/outbox in the same transaction.

For the canonical fixture, success means one journal/batch, stock quantity 2.500/value 25.00, customer outstanding 100.00, supplier outstanding 50.00, GL debit/credit 150.00, and four immutable domain receipts. Other valid files must match their own approved controls exactly.

## Recovery decisions

| Observed state | Operator action | What must remain true |
|---|---|---|
| No approval; preview not reviewed | Stage/review the latest evidence first | No financial effect is inferred from master import or a balanced draft |
| `APPROVED`, current and unexpired | Confirm the exact reviewed source; the approving operator may apply | Current financial permissions, fresh auth and unchanged period/source are required again |
| Response lost or timeout | Load recovery; inspect the original execution. If necessary retry the same retained command | Do not generate a new key, stage a replacement merely to bypass recovery, or manually duplicate stock/balances |
| `ACTIVE` after an uncertain response | Read the retained reconciliation and receipts | The committed transaction already happened; exact retry returns that result without reposting |
| Apply failed before commit; still `APPROVED` | Resolve the reported dependency and retry the same command while approval is valid | All financial writes, operations and activation from that failed transaction rolled back |
| Fresh-auth failure | Verify the current client operator's password, then explicitly retry | Step-up does not automatically execute a financial command |
| Approval expired | Cancel the unapplied approval, recheck current evidence, obtain a new approval | Never extend or edit the old approval's expiry |
| Source/mapping/master changed | Cancel the old unapplied approval; stage and independently review current evidence; approve again | Old approval and review remain retained |
| Period closed/reopened/version changed | Use the existing period-control workflow where appropriate, then cancel/reapprove | Reopening a period does not revive an old approval version |
| Permissions, module or mandate revoked | An authorized administrator investigates current access; an authorized reader inspects recovery | Historical access, cached UI or a firm label cannot authorize a write |
| Approving operator unavailable | Another currently authorized client financial operator may cancel an unapplied approval and approve the reviewed source anew | Another operator cannot take over the old apply identity |
| `CANCELLED` | Retain the cancellation reason; obtain a new approval if work should continue | No financial apply is allowed on the cancelled execution |
| Existing client financial activity | Stop this pilot for that client and assess a separately designed migration/correction | Do not clear journals, balances, stock or receipts |
| Unexpected committed operation without activation | Stop admission and investigate database integrity using retained identities | Normal AF10 cannot commit partial effects; never mark activation manually |

Repeated read operations are safe. Mutating retries must preserve their original command identity and payload. A changed key after a completed execution is a conflict, not another apply. A revoked actor may be unable to replay; another authorized reader can still inspect the execution.

## State retention and observability

`FinancialOpeningExecution` retains approval evidence and exactly one terminal transition to `ACTIVE` or `CANCELLED`. An active scope key reserves the client/cutover throughout approval and after activation. Cancellation releases the reservation without removing evidence.

`FinancialOpeningOperation` retains `(execution, domain, source row)` identity, source hash, receipt and receipt hash. Ledger/AR/AP/stock adapters derive values from the approved retained source. Update/delete triggers prevent rewriting committed receipts. AR opening documents remain immutable; AP opening source identity and original terms are protected while normal payment balance/status updates remain possible.

Use the existing safe-action error/correlation response and audit trail:

- `OPENING_CUTOVER_APPROVED` and `OPENING_CUTOVER_CANCELLED`;
- `OPENING_APPLY_BEFORE_*` / `OPENING_APPLY_AFTER_*` transaction markers;
- `OPENING_CUTOVER_ACTIVATED`, `financial.opening.activated`, and its existing outbox record;
- posting batch/source link, ledger audit, domain events and close-source invalidation.

Markers from a rolled-back apply are rolled back too. Their absence is not proof that no request was attempted. No external notification delivery was exercised or promised; outbox creation is part of the atomic database transaction.

Do not expose session tokens or passwords in exported incident evidence. Browser credentials used during verification are synthetic and retained outside repository reports.

## Corrections after activation

An `ACTIVE` receipt describes the opening at commit, not an ongoing certification of current balances. Later ordinary transactions can change balances. The tested existing customer collection/reversal workflow accepts opening receivables; AP payment balance calculation uses the retained historical paid amount.

There is no whole-cutover undo command in this release. Cancellation after activation is denied. Generic reversal of a source-owned opening journal is also denied by the existing journal service.

If the imported opening itself is wrong:

1. Stop further cutovers through the designated operator's existing financial permissions/module controls. Preserve authorized recovery reads. Consider the effect on other operations before restricting a shared role.
2. Retain the approved source/control files, revision/digest, execution/operation receipts, journal/source links, domain documents/movements and all activity since cutover.
3. Have the responsible accounting/domain owners determine the exact correction and its effect on later collections, payments, inventory movements and close evidence.
4. Prepare a narrowly scoped correction using the applicable existing domain lifecycle/adjustment and accounting controls. Any missing source-owned correction adapter must be implemented and verified before execution. Do not substitute a journal-only adjustment for an unresolved subledger correction.
5. Obtain independent approval and fresh authentication at the relevant financial boundary. Retain compensating evidence and downstream close invalidation; never delete or overwrite the opening history.
6. Reconcile corrected subledgers and the GL, retain the correction manifest, and separately assess current close readiness.

The real DB evidence validates reversal of a subsequent customer collection, not automatic reversal of the original opening. Full supplier-payment release and source-wide correction automation remain outside the verified scope.

## Application rollback and next qualification

Preserve all additive tables/columns and financial data if rolling back UI admission. Older code that requires a sales order on every receivable/allocation is not compatible with newly created opening documents. Keep the compatible read/payment layer until data-dependent rollback has been reviewed.

The retained synthetic cluster and run artifacts can support investigation without touching a real client. Follow the explicit guarded helper definitions; they refuse inferred or existing creation targets. Do not run a reset, destructive cleanup or schema promotion as a substitute for recovery.

Before real migration rollout, AF16 must assess the selected release scope, country/accounting expert review, deployment/migration operations, production capacity, monitoring, access training and correction arrangements. Passing this local pilot is not approval to cut over a real client's books.
