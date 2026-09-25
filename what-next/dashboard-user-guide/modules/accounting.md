# Accounting, reports and close assurance

[Guide home](../README.md) · [Shared controls](../shared-controls.md) · [Detailed control notes](../control-notes.md) · [Metric dictionary](../metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

Accounting reports derive from posted ledger evidence. Setup readiness, a draft, approval, posting, close review and certified export are different stages. This guide explains application behavior; it makes no professional or statutory certification claim.

## Pages in this chapter

- [Accountant access](#accountant-access)
- [Accountant portal](#accountant-portal)
- [Accountant client portfolio](#accountant-client-portfolio)
- [Accounting accounts](#accounting-accounts)
- [Close and assurance](#close-and-assurance)
- [Close and assurance — selected period](#close-and-assurance--selected-period)
- [Accounting control center](#accounting-control-center)
- [New journal entry](#new-journal-entry)
- [Journal entries](#journal-entries)
- [Accounting ledger](#accounting-ledger)
- [Financial statements](#financial-statements)
- [Trial balance](#trial-balance)
- [Ledger setup](#ledger-setup)

## Accountant access

**Open:** [/en/dashboard/accounting/accountant-access](http://localhost:3000/en/dashboard/accounting/accountant-access). **Reach it:** Accountant Access. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.close.accountant.invite. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Explicit accountant mandates with role, effective dates, expiry, consent evidence and revocation.

**How to use it.**

1. Enter Accountant email, firm identity, read-only/reviewer/preparer role, effective/expiry dates and consent-evidence hash, then review before Invite or grant access.
2. Revoke only the intended mandate and confirm its new state.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Give an external accountant appropriate, time-bounded access to evidence.

**Limits and recovery.** A mandate is sensitive access and may send an invitation. A role title alone does not bypass tenant or command permissions. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accountant-access/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:36>).

## Accountant portal

**Open:** [/en/dashboard/accounting/accountant-portal](http://localhost:3000/en/dashboard/accounting/accountant-portal). **Reach it:** Accountant Portal. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.audit.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Trust level, posted entries, source coverage, blockers, posted figures, evidence modules, recent links and audit trail.

**How to use it.**

1. Refresh evidence, inspect blockers and source links, then use Export trust pack when its gate permits.
2. If figures are withheld, resolve critical data-trust blockers first.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Prepare a reviewable accounting evidence package instead of collecting disconnected screenshots.

**Limits and recovery.** Critical trust blockers can suppress financial figures. No figure is better than treating unavailable evidence as zero. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accountant-portal/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:43>).

## Accountant client portfolio

**Open:** [/en/dashboard/accounting/accountant-portfolio](http://localhost:3000/en/dashboard/accounting/accountant-portfolio). **Reach it:** Accountant Portfolio. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.audit.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Only clients with active, unexpired consent mandates, with links to their ledger evidence.

**How to use it.**

1. Choose a client you are authorized to review and Open ledger evidence.
2. If no clients appear, check mandate scope/expiry with the granting organization.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Navigate client work without mixing organizations or assuming access to every tenant.

**Limits and recovery.** An empty portfolio can reflect access/expiry rather than absence of client accounting records. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accountant-portfolio/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:50>).

## Accounting accounts

**Open:** [/en/dashboard/accounting/accounts](http://localhost:3000/en/dashboard/accounting/accounts). **Reach it:** Accounts. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.accounts.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Account code, bilingual name, SYSCOHADA class/type, normal balance, currency, mapping and manual/control-account properties; active/archived rows.

**How to use it.**

1. For Create account enter code/class/names/type, DEBIT or CREDIT normal balance and currency; review mapping and manual-post/control-account options.
2. Use leaf accounts for manual entries.
3. Archive only the intended account and verify the list afterward.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Keep posting destinations and financial-statement classifications understandable and reviewable.

**Limits and recovery.** An account code or class is not evidence that a country's statutory mapping has been professionally validated. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounts/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:57>).

## Close and assurance

**Open:** [/en/dashboard/accounting/close](http://localhost:3000/en/dashboard/accounting/close). **Reach it:** Close Center. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.close.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Period close readiness, critical blockers/findings, evidence coverage/provenance/graph, accountant review and deterministic close-pack export.

**How to use it.**

1. Choose/confirm the period and Refresh or Run assessment.
2. Inspect each finding; Assign to me, add a source-linked comment or request a justified waiver where permitted.
3. Record Ready to close or Changes requested in the accountant review.
4. Export draft JSON while unresolved; use Export certified JSON only when its independent gates pass.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Keep period-end decisions tied to explicit evidence and unresolved exceptions.

**Limits and recovery.** Assignment, comment, waiver, review and assessment are persisted workflow actions. A waiver is separately reviewed; certified export and actual period closure are separate controls. Missing domains remain unavailable evidence. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/close/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:64>).

## Close and assurance — selected period

**Open:** `/en/dashboard/accounting/close/[periodId]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.close.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** Period close readiness, critical blockers/findings, evidence coverage/provenance/graph, accountant review and deterministic close-pack export.

**How to use it.**

1. Choose/confirm the period and Refresh or Run assessment.
2. Inspect each finding; Assign to me, add a source-linked comment or request a justified waiver where permitted.
3. Record Ready to close or Changes requested in the accountant review.
4. Export draft JSON while unresolved; use Export certified JSON only when its independent gates pass.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Keep period-end decisions tied to explicit evidence and unresolved exceptions.

**Limits and recovery.** Assignment, comment, waiver, review and assessment are persisted workflow actions. A waiver is separately reviewed; certified export and actual period closure are separate controls. Missing domains remain unavailable evidence. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/close/[periodId]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:71>).

## Accounting control center

**Open:** [/en/dashboard/accounting/control-center](http://localhost:3000/en/dashboard/accounting/control-center). **Reach it:** Control Center. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.setup.manage. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Setup blockers, account mappings, journals, posting rules, periods, business-event outbox and sensitive-control status.

**How to use it.**

1. Refresh readiness, read each blocker and open the relevant setup/source workflow.
2. Review permission, risk and fresh-auth requirements before Lock accounting setup.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Resolve missing accounting foundations and delivery problems before relying on automated posting.

**Limits and recovery.** A lock is a protected configuration change; it does not retroactively prove every transaction posted correctly. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/control-center/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:78>).

## New journal entry

**Open:** [/en/dashboard/accounting/journals/new](http://localhost:3000/en/dashboard/accounting/journals/new). **Reach it:** New Journal Entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.journal.create AND accounting.journal.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** A manual journal form with postable account lookups, journal, date, currency, reference, memo and debit/credit lines.

**How to use it.**

1. Wait for account/journal lookups to load successfully.
2. Select an open-period date and suitable manual journal, enter balanced lines on postable leaf accounts, review reference/memo and Create draft.
3. Verify the saved draft in Journals before a separate posting action.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Capture a supported manual accounting entry with a review point before posting.

**Limits and recovery.** Lookup failure is a blocker to entry, not an empty valid account list. Stopping new manual journals can block creation while leaving historical entries visible. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/journals/new/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:92>).

## Journal entries

**Open:** [/en/dashboard/accounting/journals](http://localhost:3000/en/dashboard/accounting/journals). **Reach it:** Journals. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.journal.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Draft and posted/reversed entry lists, entry summaries and protected Post and Reverse actions.

**How to use it.**

1. Open a draft and check its journal/date/accounts and balanced debit/credit lines.
2. Post only when ready and allowed.
3. Reverse a posted entry with the required reason and control checks; verify the reversal trail rather than deleting history.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Maintain a clear distinction between prepared entries and ledger evidence.

**Limits and recovery.** Posting and reversal affect the ledger. A reversed entry remains part of the audit trail; read reports using their documented posted/reversal treatment. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:85>).

## Accounting ledger

**Open:** [/en/dashboard/accounting](http://localhost:3000/en/dashboard/accounting). **Reach it:** Overview. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.reports.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Accounting access/setup status, accounts, open periods, draft/posted-entry counts and recent journal activity.

**How to use it.**

1. Check readiness first.
2. Open Setup or Control center for blockers, Journals for drafts/posted entries, and Reports for the posted-accounting view.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Use one consistent entry point for posting discipline and ledger reporting.

**Limits and recovery.** Draft entries and operational reports are not posted financial statements. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:29>).

## Financial statements

**Open:** [/en/dashboard/accounting/reports/financial-statements](http://localhost:3000/en/dashboard/accounting/reports/financial-statements). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.reports.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Posted-ledger profit and loss, management EBITDA bridge, net income, balance sheet, account drill-down and classification-review items.

**How to use it.**

1. Choose period/view and Apply period.
2. Inspect the performance bridge and balance check; expand a statement line to its contributing accounts.
3. Review classification warnings before relying on a subtotal.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Explain performance and position with a traceable account breakdown.

**Limits and recovery.** Management EBITDA is explicitly a management measure, not a statutory subtotal. Its bridge adds income tax, finance costs, depreciation and amortization to net income; unresolved classifications require accounting review. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/reports/financial-statements/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:100>).

## Trial balance

**Open:** [/en/dashboard/accounting/reports/trial-balance](http://localhost:3000/en/dashboard/accounting/reports/trial-balance). **Reach it:** Trial Balance. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.reports.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Ledger-derived account debit/credit activity, balances and a balance check, with account code/name/type/normal balance rows.

**How to use it.**

1. Search or filter accounts, sort the table and change page/density as needed.
2. Compare activity debit and credit; clear table filters when checking the complete report.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Find a specific account without losing sight of the full-report balance check.

**Limits and recovery.** Top report totals remain full-report totals when the local account table is filtered. This report is based on posted/reversed journal evidence, not sales-order totals. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:107>).

## Ledger setup

**Open:** [/en/dashboard/accounting/setup](http://localhost:3000/en/dashboard/accounting/setup). **Reach it:** Setup. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.setup.manage. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Country pack/base currency/fiscal-year settings, default journals, fiscal years, periods and readiness state.

**How to use it.**

1. Review Country pack, Base currency and fiscal start month/day, then Save settings if authorized.
2. Create fiscal year with name/start/end dates; Ensure defaults prepares default journals.
3. Review blockers before Mark ready.
4. Close period is consequential and must follow the intended close process.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Set accounting foundations before posting transactions so dates, journals and currency are consistent.

**Limits and recovery.** Mark ready is setup state, not professional certification. Creating a fiscal year generates periods; closing a period changes posting eligibility. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/setup/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:114>).

