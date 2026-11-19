# Separate legacy payroll DELETE finding

Observed on the isolated PostgreSQL fixture run retained in `history-proof-postgres-attempt-2/`. This finding is outside the current history-proof hardening change.

`prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql` defines `payroll_run_lines_prevent_posted_mutation`. It blocks DELETE for POSTED/ARCHIVED parents, but its allowed path ends with `RETURN NEW` for every operation. In a PostgreSQL row-level BEFORE DELETE trigger, NEW is null; returning it suppresses the deletion. The two fixture DELETE calls therefore produced Prisma P2025 instead of removing their synthetic PAID run lines. This was a fixture failure, not a passing history-denial assertion.

The migration and deployed trigger remain unchanged. No trigger was disabled, no frozen evidence was rewritten, and no database control was bypassed. The current fixture instead soft-deletes its isolated synthetic PAID prior run through `payrollRun.update({ deletedAt: … })`, then independently checks that the row is absent from the validator's existing `deletedAt: null` history selection. The stale approval must be denied; a previously committed approval receipt must still replay without another transition.

The extra-history fixture also reuses the existing prior payroll period, respecting the organization's unique period-date range. These are fixture corrections. They introduce no change to history membership policy, statutory calculation, or production admission.

If the DELETE behavior is addressed separately, preserve the intended finalized-evidence retention policy and test permitted versus prohibited operations against PostgreSQL. This note does not authorize historical evidence removal.
