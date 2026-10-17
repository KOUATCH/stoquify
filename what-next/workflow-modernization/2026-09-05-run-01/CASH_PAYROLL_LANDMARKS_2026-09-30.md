# Payroll landmarks and keyboard handoff

FA-CASH-COMMAND remains active. This correction covers its payroll run/register handoff, while the separate statutory calculation dependency remains open.

## Delivered correction

The authenticated dashboard layout already owns the main landmark. `PayrollRunWorkbench.tsx` and `PayrollRegisterTieOut.tsx` each added a nested main. Actual EN/FR browser inspection reproduced two main landmarks per route. Their outer containers now use div elements while retaining headings, structure, styling and content. Screen-reader landmark navigation can identify the shell's single main content area on these two populated routes.

The screenshots also showed dark default focus outlines. Navigation links in these two components now explicitly use a two-pixel outline with the existing `--dash-brand` token. No financial, permission, approval, read-model or service code changed. Prior unrelated edits remain intact.

## Verification scope

The final source-bound review, `evidence/cash-payroll-landmarks-review-2026-09-30.json`, indexes the before/after browser receipts, screenshots, focused component tests, lint and TypeScript output. The browser matrix covers EN and FR, widths 320/768/1440, and both `/dashboard/payroll/runs` and `/dashboard/payroll/register`: twelve views. It checks a single main landmark, one level-one heading inside main, focus ownership and the computed brand-token outline on the primary handoff link. Enter on the run's Register link navigates to the real register. The existing synthetic posted fixture is reused; the browser creates only a local reader identity/role.

The first baseline attempt incorrectly asserted one h1 across the entire shell. The navbar also has a heading. The corrected assertion is explicitly scoped to main; this is not a claim that the shell has only one h1. That failed receipt and the passing baseline are retained. An intermediate landmark-only matrix is also retained; the final matrix binds the subsequent focus-color correction.

These checks do not establish native screen-reader speech, browser-chrome zoom, full contrast conformance, all table keyboard interactions or a successful payroll financial lifecycle. The screenshots still show English payroll headings on the French route: wider localization remains open. Other payroll workbenches and shared denied/loading states require their own landmark assessment. Recorded development timings include rendering and verification work; they are not comparable production performance measurements.

## Use and recovery

Open `/en/dashboard/payroll/runs` or `/fr/dashboard/payroll/runs`, then use the Register link. The register's settlement-evidence link retains its locale-aware payment destination. Keyboard users see the brand outline on these handoff controls. No new user inputs or approvals are required for this correction.

There is no migration. Deploy the two components through the ordinary release process. A component rollback changes presentation only and leaves business records untouched. No deployment occurred during verification.

## Review and remaining work

Frontend/accessibility/product: reuse the shell landmark and focus token without adding UI or workflow steps. Architecture/backend/data/security/finance: no business-contract changes; existing protected route and action boundaries remain. QA/SRE: focused existing tests and actual local browser evidence, no certification or performance claim. Commercial packaging, statutory calculations, external providers, inventory/POS, purchasing and AI are not applicable to this markup correction because their behavior and data are unchanged.

Next: complete the remaining Cash accessibility/reflow and latency criteria, including wider payroll localization and table interactions. Preserve the country-pack review dependency and successful proof lifecycle requirements. No workflow is newly closed by this patch.
