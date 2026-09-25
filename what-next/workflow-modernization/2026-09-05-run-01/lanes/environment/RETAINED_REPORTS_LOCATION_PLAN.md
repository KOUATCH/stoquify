# Prepared PostgreSQL verification — awaiting execution release

Prepared helper: `verify-retained-reports-location.cjs`. It has been syntax-checked; neither preflight nor mutation mode has run. The build retains CPU priority. No application source was changed.

## Target and boundaries

Only `stoquify_local_modern_modules_controls_20260905_01` on loopback is permitted. The helper reuses the existing controls target resolver and checks `current_database()`, every organization's ownership prefix/source, and all required already-applied migrations. It never creates a database, migrates, seeds broad application data, disables constraints/triggers, changes grants/stops, calls a provider or edits previous fixtures. Both database URLs bind to that exact target.

Execution would create two new organizations under `org_modules_service_smoke_retained_<unique-id>_…`, four synthetic identities, two open accounting periods, leaf accounts and local journals/locations. Existing cancelled purchase orders and consumed verification identities are in a different database and are not read or changed. Completed fixture history would be retained with its receipt; no automatic cleanup/deletion or uncertain retry is implemented.

Posting and reversal use the real sensitive-action evaluator, separate maker/poster identities, canonical permission inputs and fresh timestamps. These are explicitly synthetic service-control inputs. They do not prove real sign-in, human approval, professional authority, application action authorization or a live-customer release decision. No session is manufactured.

## Retained-account report proof

Real entry points:

- `createChartAccount` and `archiveChartAccount` in `services/accounting/accounts.service.ts`.
- `ensureDefaultJournals` and `createManualJournalEntry` in `services/accounting/journals.service.ts`.
- `postJournalEntry` and `reverseJournalEntry` in `services/accounting/posting.service.ts`.
- `getTrialBalance` and `getGeneralLedger` in `services/accounting/reports.service.ts`.
- `getFinancialStatements` in `services/accounting/financial-statements.service.ts`.

The planned fixture uses actual open May/June periods and active leaf cash571, equity101, revenue701 and expense601 accounts. The owner creates and posts balanced entries; no row is directly marked POSTED or REVERSED by the test.

| Date | Real service operation | Debit | Credit |
| --- | --- | ---: | ---: |
| May5 | Opening activity | Cash500 | Equity500 |
| June10 | Current activity | Cash120 | Revenue120 |
| June15 | Expense | Expense30 | Cash30 |
| June20 | Correctable activity | Cash40 | Revenue40 |
| June25 | Real reversal of June20 | Revenue40 | Cash40 |

A separate balanced777 draft is deliberately left unposted, proving its exclusion. Expected cumulative activity is730 debit/credit, June activity230 debit/credit, revenue120, expenses30, net income90, assets590 and equity500 plus accumulated earnings90. The cash general ledger has five posted/reversed source lines and ends at590. A same-maker posting attempt must fail before the distinct poster succeeds.

After those nonzero results are established, the real archive service archives all four accounts. Reports must retain exactly the same amounts, descriptors, filters and source history, excluding only report-render `generatedAt`. Journal line count must not decrease. A new manual draft using archived accounts must be rejected; archived history does not reopen new-post eligibility.

Foreign/missing account IDs must be rejected by the real draft owner without a journal mutation. A foreign tenant's general-ledger request for the main account must return no lines, and a foreign tenant's financial-statement request for the main period must reject it. These are scoped service checks; they do not claim malformed historical-account evidence was injected and rejected. Missing/foreign historical account objects remain covered by focused unit evidence unless a further strictly isolated negative fixture is specifically approved. No constraint is weakened to manufacture corruption.

## Location-manager proof

Use real `createLocationForManagement` to create one owned location in each new tenant, then test the corrected `updateLegacyLocationByIdForOrg` in `services/location/location.service.ts`.

- Foreign, inactive and missing managers must reject both manager and accompanying name changes.
- A foreign location ID must be unavailable under the main organization.
- An active same-tenant manager, including surrounding whitespace in its submitted ID, must succeed.
- Omitted manager preserves the existing assignment; null and empty-string requests explicitly clear it.
- A foreign `organizationId` embedded in the update DTO must not move the location out of its trusted caller scope.

This verifies the actual service transaction and persisted outcomes. No concurrent user-tenant move, UI permission, role authorization or location-manager business power is inferred.

## Execution after parent release

Use the inspected bundled Node runtime to run the helper first with `preflight`; inspect its read-only receipt. Only then use `run` after the parent confirms the exact isolated fixture scope and CPU slot. Both modes produce unique source-bound JSON receipts. Failure preserves the named fixture state and stops subsequent dependent work; inspect that state before any retry.

These are internal engineering fixtures and report checks. They do not certify OHADA accounting, tax treatment, statutory filing, or a production migration/release.
