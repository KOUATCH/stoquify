# AF09 opening position preview: verified

AF09 implements separate immutable financial-opening staging, mappings to existing client records, exact AR/AP/stock/ledger tie-out against separately supplied controls, and independent preview review. The EN/FR flow is available through the firm portfolio.

The bounded technical pilot is CM/XAF at 1 October 2026, with 100 source rows, 100,000 bytes per file, 200 active master choices per category and 100 retained revisions. Changed source/mappings supersede review; changed mapped records make it stale. Duplicate datasets and exact command retries do not create duplicate revisions.

Verification includes 101 focused pure/component tests, eight real PostgreSQL scenarios, focused types, schema validation, all 103 migrations on a fresh synthetic database and a populated 102→103 upgrade/replay with nine operational table hashes unchanged. The authenticated browser verified upload/mapping, independent password-confirmed review, EN/FR desktop/mobile layouts, four scoped axe scans without violations, staleness and access denial.

No operational balances, journals or stock movements were applied. Existing master onboarding and opening-readiness restrictions remain unchanged. AR/AP opening writers, stock/ledger ownership without duplicate posting, and a governed cutover orchestrator remain AF10 blockers. AF16 release qualification is still open; no production rollout occurred.

Read the [canonical AF09 result](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF09/RESULT.md>), [input and review contract](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF09/CUTOVER_CONTRACT.md>), [controlled domain write plan](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF09/DOMAIN_WRITE_PLAN.md>), and [roadmap status](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/STATUS.md>).

If financial migration is required next, execute AF10 from the verified manifest and missing writer contracts. Keep all apply paths blocked until domain ownership, independent approval, exact idempotency, recovery and post-apply reconciliation are proven. Existing-client pilots need not activate migration.
