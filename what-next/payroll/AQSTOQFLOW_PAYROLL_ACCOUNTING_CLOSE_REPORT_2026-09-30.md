# Payroll accounting and close — scoped integration checkpoint

Skill applied: `aqstoqflow-payroll-accounting-close`. This checkpoint supports FA-CASH-COMMAND; it does not close the full Phase 7 or payroll workflow.

Real isolated review/approval/emission/posting exposed and corrected an emitted-payslip insertion-order defect. The existing immutable database boundary remains enforced. Settled batches no longer inflate upcoming cash; partial balances are explicitly withheld pending a canonical remaining-obligation contract.

See [implementation, verification, inputs and recovery](../workflow-modernization/2026-09-05-run-01/CASH_PAYROLL_POSTING_AND_SETTLEMENT_2026-09-30.md) and its source-bound review. 136 focused tests, lint, TypeScript and three actual EN/FR posted-proof browser views pass. Synthetic calculated inputs are not statutory or country-pack approval. No production change, bank transfer, declaration submission or migration was performed. Full upstream calculation, payment/declaration, partial-settlement and close lifecycle verification remain open.
