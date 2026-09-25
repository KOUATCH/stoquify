# Retain posted-account evidence in reports

Status: proposed, source inspected, no reporting source edits or tests executed. Prepared while the OTP browser run holds the source freeze. This is the next bounded financial correction after OA-F01.

## Demonstrated source path

1. `app/[locale]/(dashboard)/dashboard/accounting/accounts/page.tsx` calls `archiveChartAccountAction` for an active account. The action requires `accounting.accounts.manage` and fresh authentication.
2. `services/accounting/accounts.service.ts:archiveChartAccount` permits an account with journal lines to be archived. It sets both `isActive: false` and `deletedAt`, retaining the row and journal lines. It prevents an account with children from being archived.
3. `services/accounting/reports.service.ts:getTrialBalance` loads only accounts with `deletedAt: null`, but queries scoped POSTED/REVERSED lines independently. It silently skips each line whose account is missing from the account map. Totals therefore exclude the archived account's historical postings. If both sides are archived, a false zero can even remain balanced.
4. `services/accounting/financial-statements.service.ts:getFinancialStatements` filters `deletedAt: null` before passing descriptors to `buildFinancialStatementsReadModel`. The builder classifies only provided accounts; period/cumulative grouped amounts for an archived account do not appear in statements.
5. `listChartAccounts(includeInactive: true)` also retains `deletedAt: null`. The current chart UI says active and archived account nodes, but an account archived by its own service disappears. Stopping future posting and retaining historical evidence currently have different, inconsistent meanings.

## Smallest proposed correction

First correct historical read inclusion without a data migration or any change to posted entries, balances, grants or journal controls. For trial balance, populate the descriptor map with the account relation already returned on every in-scope posted/reversed line, in addition to current account rows. This retains previously archived historical accounts without an extra broad scan. It must preserve deterministic ordering, canonical account descriptors, tenant scope, date/period filters and include-zero behavior. If a referential mismatch is possible under the current database constraints, fail rather than silently discard the amount.

For financial statements, include archived descriptors only when relevant posted/reversed journal evidence exists at or before the selected period end, under the same organization. Preserve the existing statement type/classification constraints and posted-state filtering. The cumulative balance sheet requires historical pre-period postings too; a filter restricted to current-period activity is insufficient. Avoid an arbitrary current-active catalogue as the reporting authority.

Keep the archival mutation unchanged in the first read-correction slice unless tests show a required direct compatibility change. Existing archived records must be readable either way; changing future archive behavior alone cannot repair historical omission. The chart register's inactive/archived presentation can be a separate bounded follow-up with explicit terminology. Account deactivation must continue to deny new manual and automated postings through the existing domain checks.

## Proposed production ownership

- `services/accounting/reports.service.ts`: retained account descriptor inclusion in `getTrialBalance` only.
- `services/accounting/financial-statements.service.ts`: scoped descriptor query for retained period/cumulative evidence only.
- New `services/accounting/__tests__/reports-retained-accounts.service.test.ts` for direct service regressions.
- Extend `services/accounting/__tests__/financial-statements.service.test.ts` with query-sensitive archived fixtures and exact metric assertions.
- Existing `services/accounting/__tests__/reports-export.service.test.ts`, `accounts.service.test.ts`, `manual-journal.test.ts` and `posting.service.test.ts` are affected-boundary checks, selected only as needed; do not broaden unrelated suites.

No shared UI/messages/auth/schema, migration, seed, production database or POS/offline edits are proposed.

## Before/after test plan

1. Balanced posted debit and credit where one account is archived: preserve both activity and closing balance totals. Both archived: retain nonzero balanced totals, not false zero.
2. POSTED original plus REVERSED original and compensating posted entry: no dropped side and correct net balance.
3. Archived account whose only evidence is DRAFT, foreign tenant, outside selected period/date or beyond the as-of cutoff: do not include out-of-scope activity.
4. Current nondeleted zero account respects `includeZeroBalance`; archived record without in-scope evidence does not fabricate activity.
5. Financial statements with an archived asset, revenue, expense and liability: P&L and balance sheet preserve current-period and cumulative amounts, including prior-period opening evidence.
6. An actual query failure still rejects; historical absence cannot be substituted with zero-success.
7. Trial-balance export totals match the corrected read model; report metadata remains internal accounting/management reporting, without invented statutory approval.
8. Verify archive/new-post domain controls remain in force; historical inclusion does not reactivate the account.

Actual PostgreSQL/browser checks can be designed after focused reproduction and parent release. They require a guarded isolated fixture and explicit posted evidence, with no production financial mutation. Concurrency between archival/structural changes and posting is a separate previously unverified invariant; this read fix does not claim to resolve it.
