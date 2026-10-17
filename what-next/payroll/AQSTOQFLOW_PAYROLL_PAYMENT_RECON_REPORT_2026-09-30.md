# Phase 6 — payroll settlement checkpoint

Selected skill: `aqstoqflow-payroll-payment-recon`. Current slice: legacy transaction linkage and dependent evidence discovery. FA-CASH-COMMAND remains in progress.

The read model previously found a legacy transaction by source but omitted its matches, suspense and retry history because those queries used only explicit batch pointers. Reader map overwrite and writer findFirst could also choose among duplicate source links. Four regression cases reproduced these failures.

Changed: payment-reconciliation service and focused service tests. Reader and writer now share a unique tenant/source/batch resolver. Dependent evidence is loaded after transaction resolution. Reads do not backfill released batches. Ambiguous or contradictory links reject before settlement effects.

73 focused tests across five suites, changed-file lint and TypeScript pass. The current immutable review binds actual EN desktop/FR mobile legacy-batch settlement and lost-response replay. Release/approval fixtures are synthetic; provider authenticity, actual release and statutory certification are not claimed.

Remaining: release PAID-label semantics, actual destination approval/release/provider/declaration chain, controlled historical linkage/amount reconstruction, broader table localization/layout and full accessibility. No migration, production deployment or real payment occurred.

[Current implementation, evidence and operator guide](../workflow-modernization/2026-09-05-run-01/CASH_PAYROLL_TRANSACTION_LINKAGE_2026-09-30.md). [Previous exception handoff](../workflow-modernization/2026-09-05-run-01/CASH_PAYROLL_SETTLEMENT_HANDOFF_2026-09-30.md). Continue the same primary and supporting dependency.
