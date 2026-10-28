# AqStoqFlow UI/UX Phase 04 — P0 DisplayContext Money Slice

Date: 2026-08-07

## Bounded scope

This slice migrates only the highest-risk financial totals on the inventory items page and the default authenticated dashboard. It does not claim completion of the audit's system-wide DisplayContext or hard-code ban.

## Existing source truth

- Organization currency source: `Organization.currency`, exposed by `getOrganizationSettingsForOrg` and by the dashboard read model's `dashboard.organization.currency`.
- Effective presentation locale: the server-resolved localized route locale (`pickLocale` / dashboard `locale` prop).
- The organization settings model also contains `timezone` and `defaultLocale`; this slice does not invent or duplicate them.

No target surface required an invented currency. Missing or blank organization currency now raises `OrganizationCurrencyUnavailableError` with code `ORGANIZATION_CURRENCY_UNAVAILABLE`; there is no USD or XAF fallback in the migrated path.

## Migrated occurrences

- Inventory items `Total Value` and `Profit Potential`: removed the local `en-US`/`fr-FR` mapper and literal USD calls; currency now comes from the current organization's settings record.
- Today's Operating Truth revenue and cash totals: removed the silent XAF fallback and routed summary, status, and KPI values through the shared formatter.
- Enhanced dashboard chart tooltips and top-product/location financial values: removed the component-local formatter and use the same organization-aware formatter.
- XAF and XOF precision now follows `Intl.NumberFormat` ISO currency metadata rather than an XAF-only conditional.

## Shared contract

`createOrganizationMoneyFormatter` requires:

- `organizationId` for configuration-error attribution;
- an effective locale;
- an explicit organization currency.

The contract deliberately has no default currency.

## Identified source gaps left unchanged

- `StockMovementSummary` has a monetary `valueChange` but no currency field. `StockMovementDashboard` therefore still reaches the legacy USD formatter for that total and its row values. This surface was not migrated because its read model must first carry organization/transaction currency.
- `ItemManagement` price/profit rows use the legacy hard-coded XAF formatter and do not receive locale/currency context. They are not page-level financial totals and remain outside this first slice.
- `CreateItemWizard` monetary previews still use local `en-US`/USD formatting and do not receive organization currency context. They remain outside this first totals slice.
- The item-supplier list still renders a literal `$` before unit cost and has no currency context. It remains outside this first totals slice.

These gaps must be resolved by extending their read/prop contracts with the existing organization currency source; no replacement currency should be guessed.

## Verification

- Focused Jest: 2 suites passed, 7 tests passed.
- Targeted ESLint: passed.
- TypeScript `tsc --noEmit`: passed.
- Residual scan of migrated files: no local `formatCurrency`, literal USD default, silent XAF fallback, or XAF-only precision branch remains.
- Knowledge-graph files documented in `AGENTS.md` were not present at `graphify-out/`; direct dependency tracing was used.

## Inventory boundary skill result

- Selected skill: `010-aqstoqflow-inventory-boundary-gate`.
- Scanner mode: `report`.
- Active violations: 0.
- Allowed kernel/test findings: 27.
- Classifications: no active violations.
- Inventory migrations completed: none; this was presentation-only.
- Gate result: passed in report mode.
- Next migration class: none for this slice; the legacy stock-movement read model needs a currency field before its display migration.
