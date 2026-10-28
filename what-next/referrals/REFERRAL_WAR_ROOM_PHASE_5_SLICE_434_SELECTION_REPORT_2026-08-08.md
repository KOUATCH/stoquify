# Phase 5 Slice 434 Selection Report

Date: 2026-08-08
Selected slice: Customer Ledger Service-Owned Balance Integrity Kernel
Status: selection complete; implementation subsequently certified

## Why This Slice

The initial customer-statement candidate was rejected after source tracing showed that the live customer ledger is not yet complete receivables truth. It records POS on-account residuals and voids, but has no production settlement writer or allocation model. Its write helper also trusts a caller-supplied running balance. A statement cannot be made trustworthy by redaction and formatting while those source conditions remain.

Slice 434 strengthens the source boundary already used by both production customer-ledger writers. It is narrow enough to verify exhaustively and foundational for the settlement and statement slices that follow.

## In Scope

- derive customer ledger balances inside the accounting service;
- resolve the customer with tenant and soft-delete scope;
- validate amount direction against customer-ledger entry type;
- enforce nonnegative balances and optional credit limits;
- update `Customer.currentBalance` with a compare-and-set claim;
- append the ledger row only after one successful claim;
- migrate POS on-account sale and POS void callers to the kernel;
- add focused tests and a fail-closed release ratchet.

## Out Of Scope

- customer settlement, invoice allocation, or new persistence models;
- customer or supplier statements;
- server actions, API routes, pages, or dashboards;
- snapshots, hashes, signed links, recipient access, disputes, promises to pay, or delivery;
- changes to the public receipt route.

## Acceptance Criteria

1. `balanceAfter` is absent from caller input and derived from the tenant customer row.
2. The customer lookup uses `id`, `organizationId`, and `deletedAt: null`.
3. Negative, zero, double-sided, unsupported-type, and wrong-polarity movements fail before mutation.
4. A resulting negative balance fails closed.
5. Sale debit credit-limit enforcement is service owned when requested by the caller.
6. The customer balance update is compare-and-set scoped by tenant, customer, prior balance, and soft-delete state.
7. A zero-row compare-and-set result throws a conflict and does not append a ledger row.
8. The persisted row uses the derived balance and tenant/source fields.
9. POS sale and void no longer update `Customer.currentBalance` separately.
10. Focused service/POS tests, release-gate mutations, typecheck, lint, syntax, and diff checks pass.

## Next Skill

Run `stoquify-statement-proof-network` under the active `stoquify-referral-war-room-orchestrator` and `/caveman full` evidence discipline. After certification, audit the customer-settlement and allocation command as the next source dependency.

## Completion Result

All ten acceptance criteria passed at the current-worktree implementation level.

- Focused kernel/POS verification: 2 suites / 38 tests.
- Report-trust verification: 1 suite / 223 tests with 11 Slice 434 mutations.
- Consolidated boundary: 6 suites / 273 tests.
- Live report-trust readiness: 28/28, zero blockers.
- Implementation evidence: `what-next/referrals/CUSTOMER_LEDGER_BALANCE_INTEGRITY_KERNEL_SLICE_434_REPORT_2026-08-08.md`.
