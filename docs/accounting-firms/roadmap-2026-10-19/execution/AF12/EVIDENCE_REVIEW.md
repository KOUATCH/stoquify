# AF12 evidence review

**Date:** 25 October 2026. This review distinguishes executed synthetic behavior from professional, customer and release validation. Canonical evidence is in [2026-10-25-run-01](2026-10-25-run-01/).

## Source and database evidence

The full AF12 database suite passed nine scenarios before the final freshness extension. Targeted runs then verified retained history during an incomplete assessment, reran affected source/missing-support cases, explicitly denied client attempts to perform firm commands, and checked client action-owner eligibility. Ten distinct scenarios are covered overall, including one pure duration projection. The service tests use real PostgreSQL, actual AF04 engagement enrollment and actual AF08 supporting evidence/workpaper review. The request metric test completes real request, response and independent acceptance services; its fixture publishes a synthetic assessment receipt and does not certify financial reconciliation.

The independent regression lane passed 135 tests, including eight existing workpaper component tests. These are pure/mocked/component evidence and are not counted as additional real database scenarios.

The clean database applied 118 current migrations. A populated retained AF11 upgrade fixture was cloned and upgraded from 105 to 118; replay passed. Counts and row digests matched across nine operational tables. Twelve intervening HR/command-center migrations belong to other work already present in the shared workspace; AF12 owns only its additive advisory revision migration.

## Rendered browser evidence

The real app runs from a copied, environment-isolated source directory on `http://127.0.0.1:3152`, using the guarded synthetic AF12 database and synthetic `example.invalid` accounts. Three separate authenticated identities exercise the firm preparer, independent firm reviewer and client roles. No production login, data or external messages are involved.

Executed checks cover:

- A committed draft whose response is deliberately lost, followed by identical-command retry with no duplicate revision.
- Real password step-up and denial of self-review, followed by private-state clearing.
- Independent narrative review, client agreement to owner/date actions, and authorized publication.
- Client exclusion from private firm notes and private-note absence in downloaded JSON/PDF.
- The separate firm outcome view, including null baseline/work-time and measured/eligible counts.
- English/French at 1440×1000 and 390×1000, scoped WCAG 2 A/AA and 2.1 AA axe checks, keyboard focus and no horizontal page overflow.
- Source mutation marking retained narrative for review, and live client module denial clearing displayed content.

The original four locale/viewport scans found zero violations. Final copy checks repeat those four combinations after changing the owner selector's placeholder and clarifying that draft actions still require client agreement. These are scoped automated and visual checks, not whole-product or screen-reader certification.

## Artifact and visual inspection

[sample-advisory-pack.json](2026-10-25-run-01/sample-advisory-pack.json), [CSV](2026-10-25-run-01/sample-advisory-pack.csv) and [product PDF](2026-10-25-run-01/sample-advisory-pack.pdf) derive from one public canonical export object. Database assertions verify exact equality with the selected reviewed AF08 observations, one canonical hash/retained export across formats, exclusion of private notes and no close certification side effect.

The two-page sample product PDF was extracted and rendered. Cash XAF 100.20 and receivables XAF 200.10, source hash, freshness and attribution were present; all pages had text and private notes were absent. Visual inspection found readable table content, wrapped source references and complete conclusions/actions without clipping. The second page is intentionally sparse; completeness takes precedence over compressing the evidence into smaller type.

The English desktop and French mobile screenshots were inspected. Controls and text fit the existing dashboard theme and narrow layout. The owner placeholder initially said to choose an engagement; this was corrected to choose an action owner. Draft-action wording now says the action is to be agreed with the client. Labels, evidence observation time and confidence wording remain visible in the final source.

All Markdown/PDF pairs in `docs/accounting-firms` are validated after publication for nonempty A4 PDFs and heading coverage. Original report/prompt Markdown hashes are preserved except the three authorized shared index/roadmap/status updates. The AF12 follow-up copy is checked byte-for-byte. The resulting counts and hashes are retained in `publication-verification.json`; representative pages are rendered in `publication-contact-sheet.png` for inspection.

## Limits of this evidence

Synthetic amounts and durations are functional fixtures, not pilot baselines or demonstrated customer savings. No qualified accounting opinion, country-law update, statutory filing, full production build, deployment or AF16 release qualification was performed. Source caps and partial/missing data behavior remain explicit. Retained deliveries describe what was published; users must recheck current source freshness before relying on downloaded historical files.
