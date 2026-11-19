# AF10 controlled opening apply — implementation result and next qualification

AF10 implements a bounded CM/XAF opening cutover for an empty financial client, reusing AF09 evidence and the existing accounting, inventory, AR/AP, authority and event services.

The client financial operator separately approves the latest independently reviewed source. Apply uses one transaction for the opening journal, stock, receivables/payables, immutable operation receipts, persisted reconciliation and activation. Failed applies roll back; lost responses recover through the retained result and exact replay.

Verification includes 413 focused tests, 19 real PostgreSQL scenarios, clean and populated migration/replay, a 100-row source fixture, focused types and a real authenticated browser preview→review→approval→apply→recover journey. The canonical result states the precise scope and limitations:

- [AF10 result](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF10/RESULT.md>)
- [Recovery runbook](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF10/CUTOVER_RECOVERY_RUNBOOK.md>)
- [Failure matrix](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF10/FAILURE_MATRIX.md>)
- [Roadmap status](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/STATUS.md>)

No production cutover or deployment occurred. Whole-cutover undo, migrations into existing financial activity, arbitrary dates/currencies, real supplier-payment release, production capacity and statutory expert approval are not qualified.

The next justified program step is AF16, with an explicit decision about including the optional bounded AF09/AF10 migration pilot. Do not infer release approval from this implementation result or automatically start AF11–AF15.

Suggested next prompt:

> Execute AF16 release assurance for the completed core accounting-firm journey. Explicitly assess whether to include the bounded AF09/AF10 empty-client CM/XAF migration pilot; preserve its documented limits and require the missing production, accounting-review and correction arrangements. Reuse existing implementation and evidence, verify current source and required release checks, publish RELEASE_SCOPE and GO_NO_GO with precise gaps, and update the accounting-firm Markdown/PDF reports. Do not deploy or apply opening balances to real clients.
