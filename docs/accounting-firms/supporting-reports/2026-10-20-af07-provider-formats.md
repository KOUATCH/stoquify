# AF07 provider formats and account coverage: verified

20 October 2026.

[Canonical result](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF07/RESULT.md>) · [Format profiles](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF07/SUPPORTED_FORMATS.md>).

AF07 reuses the existing statement importer, receipts, source manifest, account coverage and no-activity services. It adds strict bounded pilot CSV/JSON parsing, historical fingerprint/replay compatibility, changed-identity duplicate holds and current signed-evidence checks.

Verification: 112 pure/mocked tests, nine real PostgreSQL scenarios, focused TypeScript and the final workflow check pass. The synthetic 1,000-row import completed in approximately 1.78 seconds with the application's normal transaction timeout. No UI change or live provider connectivity was claimed.

The next scoped execution is AF08: review workpapers and readable close deliverables. Reuse AF06 requests/reviews and AF07 source/coverage results; preserve existing journal, reconciliation and independent-approval boundaries. Do not convert missing, stale or unavailable proof into a successful deliverable.

AF16 remains the release/pilot gate. Official provider dialects, production load and live integration require separate evidence. No production migration, deployment, commit or real client enrollment was performed.
