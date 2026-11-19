# AF08 review workpapers and readable close deliverables: verified

Updated 20 October 2026. AF08 is verified within its bounded acceptance criteria. The shared workflow-registry check currently fails outside AF08, so this result is not release certification.

## Delivered and reused

The existing Accountant Portal now has an English/French period binder for cash/settlement, receivables, payables and inventory. It reuses current ledger/support controls, AF04/AF06 locked authority, review/comment records, export safety, audit and existing PDF libraries. No replacement ledger or schema migration was introduced.

Preparation and independent review bind to exact source hashes. Source changes and new preparation invalidate previous current review. Roll-forward copies headings only. JSON retains canonical redacted evidence; readable PDF and spreadsheet-compatible CSV render the same publication with watermark/hash and fresh authorization. Missing support remains unavailable.

## Verification and boundaries

- 135 focused tests across five suites, including eight component cases.
- Nine real PostgreSQL scenarios in the main final run, plus one targeted history-cap scenario. The 101st decision is rejected without losing read, retry or export access.
- Scoped TypeScript passed.
- Real authenticated preparation, self-review denial, password step-up, independent review and three downloads passed.
- English/French at 1440px and 390px: four scoped axe scans with zero violations, readable layouts and focusable scrolling schedule tables.
- Source staleness passed. Module denial passed after correcting a synthetic fixture that had inadvertently selected legacy defaults. Failed-run evidence is retained.
- Actual five-page PDF and CSV reconcile all four ledger/support/difference columns to canonical JSON. Redaction, dates, currency separation and draft labeling pass.

The binder is limited to 50 account/currency population entries and 100 decisions per period. It requires an eligible completed-period Close assessment and existing support. It does not replace item-level operational schedules, introduce large asynchronous exports or claim statutory audit/Close certification.

The current `agent:workflow:check` reports reviewed-file drift for `test:prisma:restart` → `scripts/prisma-dev-restart.ps1`. AF08 did not modify that script or suppress the registry finding. Resolve it and rerun the shared check before release qualification.

## Canonical evidence and next action

Read [AF08 RESULT.md](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF08/RESULT.md>), [the workpaper contract](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF08/WORKPAPER_CONTRACT.md>) and [rendered evidence review](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF08/EVIDENCE_REVIEW.md>).

The archive at `docs/accounting-firms/` contains matching Markdown/PDF reports and all original phase prompts. AF09, staged opening position and tie-out preview, is the next sequential phase. AF16 remains the integration/release and measured-pilot gate. No later phase, production deployment, real enrollment, commit or push was performed.
