# Cash Command UTC dates and drawer handoff

2026-09-30T09:05:08.716Z. FA-CASH-COMMAND remains In progress. This milestone verifies a date correction and the existing drawer handoff; it does not close the workflow.

## Findings and delivered behavior

The browser reproduction showed the same source period as Sep 28–Sep 29 on the server and Sep 27–Sep 28 in a New York browser. Cash Command omitted the shared header's timezone props and used machine-local formatting for its own metadata. Source snapshot boundaries are UTC days. The screen now uses explicit UTC for both displays and labels the period and metadata accordingly. The shared header also receives the current EN/FR language. Financial query windows, amounts, hashes and persisted records are unchanged.

The suspected drawer permission mismatch was disproved. The existing RBAC resolver accepts CASH_DRAWER_READ as an alias of finance.cash-drawer.read, which satisfies the destination's any-of rule. The redundant experimental guard was removed; production navigation and visibility files exactly match the prior reviewed hashes. Regression tests exercise both canonical and legacy read grants and removal. No permission broadening was introduced.

## Verification

- [Focused checks](evidence/cash-navigation-checks-2822c380-1434-4547-aeed-9cd7b4a7253b.json): 201 tests in seven suites, changed-file lint and full TypeScript check passed with stable source hashes. Tests cover displayed UTC days/times in EN/FR and both drawer read aliases. The existing broader source/privacy and navigation checks remain passing.
- [Browser evidence](lanes/environment/cash-drawer-34845454-4f6e-4dfc-9658-11f83957ca01.json): four authenticated EN desktop/FR 320px journeys, with New York and Pacific/Kiritimati browser timezones. Each checks initial withholding, grant, keyboard handoff to the actual drawer dashboard, Back, revocation against an already-rendered link, and withholding after refresh. No page errors, no horizontal overflow at the checked viewport, and twelve screenshots are retained. Payroll balance records, payment count and journal count remain unchanged during reads; this is not a full drawer-mutation audit.
- [Reproduction](lanes/environment/cash-drawer-5c554d14-0c2b-4ef6-9d17-a68b301cbf28.json) retains the actual date hydration diff. That run also failed because its initial assumption of an unavailable drawer link was false. The prior truncated shell hydration error lacks the full component diff; this correction is proof of the reproduced date defect, not a claim that every possible hydration error is resolved.
- Drawer fixtures contain no cash-drawer activity. These journeys establish empty-workspace navigation and access behavior; drawer opening, handling, variance, closing and reconciliation lifecycles remain with their owning workflows.
- Visual inspection of the French destination found an empty scope labeled "Caisse sous contrôle" with 100% confidence, and a browser-local period spanning two displayed dates. Record these source-meaning and timezone questions under FA-CASH-DRAWER; the Cash Command handoff does not certify that destination's operational conclusions.
- Failed tests are retained: two assertions initially assumed an extra finance permission despite the RBAC alias; later display tests exposed French accent and shared label-punctuation differences. The expectations now check the actual UTC labels, without suppressing runtime errors.
- Automatic approval review interrupted removal of the experimental guard on September 28 because of a usage limit. The same edit succeeded through normal approval review on continuation. No workaround bypass was used.

## Review and operation

Architecture/frontend/UX/localization: reuse existing shared header timezone props and canonical source UTC boundaries; no shared component changes. Security/IAM: retain current alias resolution, tenant isolation and module enforcement; withdrawal remains server-checked. Finance/data/audit: presentation-only production change, no schema or monetary transition. Quality/SRE: deterministic cross-timezone repro and actual navigation evidence; development timings are observations, not production budgets. Product/support: users can interpret the same source day consistently across offices. Statutory, payroll posting, providers, offline, billing and AI changes: not applicable to this correction. These are engineering reviews, not professional approvals.

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command. The displayed period is UTC; it does not change with the device timezone. With dashboard/finance entry authority and an available cash_drawer module, a drawer read grant exposes the indicator and existing drawer workspace. If that grant is withdrawn, refresh removes the indicator and direct destination access is denied. Administrators can verify the role's current stored grant; no additional approval record is needed for this display correction.

No migration or deployment is required. Roll back only the reviewed CashCommandDashboard date/locale hunk if necessary; preserve unrelated working-tree changes and rerun these checks. Remaining closure requirements are retained in CURRENT_PROGRESS.md and the register.
