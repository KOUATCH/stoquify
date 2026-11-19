# AF11 obligation register: operational implementation, country review outstanding

**Date:** 20 October 2026. **Status:** IMPLEMENTED_UNVERIFIED for full statutory scope.

The existing accountant portal and firm work desk now expose a source-bound obligation/evidence register. It reuses firm mandates/engagements, current permissions/modules, Close pack exports, payroll declaration evidence, independent review, password step-up and audit logging. Applicability, responsibility, operational target dates, source changes and evidence decisions retain append-only history. Exact retries recover uncertain outcomes.

No statutory candidate is verified. Existing Cameroon pack labels and manual/sandbox receipts are insufficient for qualified country approval or accepted live filing. No legal deadlines, filing requests or financial declarations were sent.

Technical verification includes 112 pure/mocked tests, 26 component checks, 14 real PostgreSQL scenarios, schema validation, focused types, 105 clean migrations and populated 104→105 upgrade/replay. The authenticated browser journey passed exact retry, independent password review, payroll denial and role revocation; four EN/FR desktop/mobile scoped axe scans found no violations or panel overflow. Read the canonical result for evidence and its limits.

- [Canonical result](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF11/RESULT.md>)
- [Country-review gaps](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF11/COUNTRY_REVIEW_GAPS.md>)
- [Source refresh procedure](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF11/OBLIGATION_SOURCE_REGISTER.md>)

Next, obtain current official obligation definitions and qualified independent country review. Keep statutory entries UNKNOWN until approved definitions are implemented and reverified. AF16 release qualification and any real-client pilot remain separate. No production promotion, deployment or next phase was executed.
