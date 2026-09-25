# Accounting control-center stacked layout

Date: 2026-09-21
Route: `/en/dashboard/accounting/control-center`

Changed the two section grids in `components/accounting/AccountingControlCenter.tsx` to a single column at every breakpoint:

- Readiness checklist followed by setup-lock control.
- Account mappings followed by default journals.

Each panel now receives the full available width, consistent with the existing control-plane and posting-rules tables. Existing table search, pagination, content, actions, and summary tiles are unchanged.

Verification: scoped ESLint and `git diff --check` passed. No tests were added for this two-class layout change. Browser verification was attempted, but the development server returned a Next.js clientReferenceManifest invariant error, followed by a connection reset. No listener on port 3000 was found during the subsequent check, so the final rendered layout could not be verified. The temporary browser viewport override was reset.

## Follow-up live verification

The development server subsequently served the updated page successfully. At a wide desktop viewport, all seven main panels had the same measured width (1052 CSS pixels) and left edge, and each began below the preceding panel. Account mappings ended at y=4145 and default journals began at y=4165, confirming a vertical stack with a 20-pixel gap. The readiness and setup-lock pair also occupied separate full-width rows.

After resetting the temporary viewport override, all four tables still had equal-width panels (648 CSS pixels) in the order Control plane status, Account mappings, Default journals, and Posting rules status. The earlier layout change is present in both the source and live page; this follow-up required no further production-code change.
