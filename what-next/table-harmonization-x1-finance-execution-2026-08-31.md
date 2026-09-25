# X1 Finance and Accounting Table Harmonization Execution

**Execution date:** 2026-08-31  
**Target:** `stoquify_replay_next_20260830`  
**Mode:** Read-only fixture verification and contract verification  
**Scope:** X1 finance/accounting only

## Decision

The technical X1 fixture and contract implementation is ready for controlled product review. The isolated replay database passed the readonly seed verifier, including required personas, inventory coverage, and finance-state coverage. The focused X1 suite passed 29 of 29 tests.

The X1 target is not yet certified. Product approval of the proposed scale budgets and authenticated EN/FR evidence for desktop, tablet, and mobile remain outstanding. No approval or authenticated evidence claim is made by this report.

## Verification results

| Check | Result | Evidence |
|---|---|---|
| Prisma schema validation | PASS | `npm run prisma:validate` |
| Migration status | PASS | 80 migrations; schema up to date |
| Readonly realistic seed verifier | PASS | `npm run seed:verify:realistic`; `READ_ONLY` mode |
| X1 contract and export tests | PASS | 7 suites, 29 tests |
| Required X1 table contracts | PASS | 13 finance/accounting contracts; all tenant-scoped and server-finalized |
| Inventory coverage | PASS | 20 active stocked items reported for every verified location |
| Finance fixture coverage | PASS | Draft/posted/reversed/voided, EUR/USD/XAF, open/closed periods, AR/AP, payments, reconciliation, cash history, close evidence, drill-to-evidence |
| Proposed performance budgets | PENDING APPROVAL | All remain `proposed-not-measured`; not an SLA |
| Authenticated EN/FR UI evidence | BLOCKED | Evidence binding requires authenticated, approved evidence; no artifacts are registered |

## Tenant and required persona identity

The following identities were read from the isolated database. Passwords and tokens are intentionally excluded.

| Tenant | Persona | Role code | User ID | Name | Account identifier |
|---|---|---|---|---|---|
| `rds_org_001` | Owner | `owner` | `rds_org_001_compliance_user_owner` | Mireille Nkoa | `owner.rds-org001@stockflow.test` |
| `rds_org_001` | Accountant | `accountant` | `rds_org_001_user_008` | Nadia Essomba | `accountant.rds-org001@stockflow.test` |
| `rds_org_001` | External accountant | `external_accountant` | `rds_org_001_compliance_user_external_accountant` | Carine Manga | `external.accountant.rds-org001@stockflow.test` |
| `rds_org_001` | Support | `support` | `rds_org_001_compliance_user_support` | Adele Ngan | `support.rds-org001@stockflow.test` |
| `rds_org_001` | Auditor | `auditor` | `rds_org_001_user_010` | Helene Mbarga | `auditor.rds-org001@stockflow.test` |
| `rds_org_002` | Owner | `owner` | `rds_org_002_compliance_user_owner` | Mireille Nkoa | `owner.rds-org002@stockflow.test` |
| `rds_org_002` | Accountant | `accountant` | `rds_org_002_user_008` | Nadia Essomba | `accountant.rds-org002@stockflow.test` |
| `rds_org_002` | External accountant | `external_accountant` | `rds_org_002_compliance_user_external_accountant` | Carine Manga | `external.accountant.rds-org002@stockflow.test` |
| `rds_org_002` | Support | `support` | `rds_org_002_compliance_user_support` | Adele Ngan | `support.rds-org002@stockflow.test` |
| `rds_org_002` | Auditor | `auditor` | `rds_org_002_user_010` | Helene Mbarga | `auditor.rds-org002@stockflow.test` |

Additional relevant control identities are present in the fixture. The database maps `Kouatchoua Mark` to `product_approver` in `rds_org_001`, `Tamen Marceline` to `maker` and `order_to_cash_product_owner`, `Tchana Nikita` to `qualified_accounting_reviewer`, and `Yongwa Eli`/`Francis Mbe` to `accounting_owner`. These mappings do not constitute a product approval or accounting qualification certification.

## Fixture evidence

- Two organizations were verified: `rds_org_001` and `rds_org_002`, both Cameroon (`CM`) and XAF base currency.
- Every reported active location had exactly 20 active stocked items.
- Each checked inventory level had non-negative on-hand, reserved, and available quantities; available quantity reconciled to on-hand minus reserved; catalog category, tax, and unit references were present.
- Each organization had draft, posted, reversed, and voided journal states.
- Each organization had EUR, USD, and XAF journal currencies.
- Each organization had both CLOSED and OPEN accounting periods.
- Each organization had 12 receivables, 12 payables, 12 payments, 12 refunds, 12 reconciled records, 12 unreconciled records, 12 cash-history records, 12 close-evidence records, and 12 drill-to-evidence links.
- Derived finance statements were reported ready by the readonly verifier.

## X1 implementation coverage

The current X1 contract covers receivables, receivables history, payables, payables history, cash history, posted journals, draft journals, trial balance, profit and loss, balance sheet, cash flow, close evidence, and close findings.

The contract enforces tenant-scoped access, frozen identity columns, right-aligned numeric columns, period/entity context, per-currency totals, drill-to-evidence behavior, separate draft versus posted journal behavior, server-finalized exports, asynchronous export operations, and bilingual EN/FR labels.

## Remaining gates

### X1-GATE-01: Product approval of scale budgets

The proposed budgets remain non-SLA and unmeasured:

- Bounded client interaction under 100 ms at p75 test hardware.
- Server feedback indication under 150 ms and useful result under 1,000 ms at p75.
- Useful page rows under 750 ms at p75 after cached shell.
- Immediate bulk-action job receipt with progress and partial result.
- No visible preference/view hydration flash.
- Bounded browser row DOM through pagination or proven virtualization.
- Export-job duration measured by dataset tier and format.

Required evidence is an approval reference, approver, date, scope, decision, and any accepted exceptions. These targets must not be called SLAs until approved and measured.

### X1-GATE-02: Authenticated EN/FR evidence

The evidence binding still requires:

- Authenticated credentials approved for the test environment.
- Approved seeded-data scope.
- English and French sessions.
- Desktop, tablet, and mobile evidence.
- Table behavior, frozen columns, numeric alignment, period/entity/currency context, drill-to-evidence, draft versus posted journals, RBAC, redaction, export, accessibility, zoom, and responsive evidence.
- Run IDs, timestamps, tenant, persona, browser/device, and artifact references.

The current evidence binding correctly reports no screenshot artifacts, no measurements, and `productionBudgetsApproved: false`.

## Safety constraints

- The verified target is a replay/disposable database by local naming and readonly-verifier policy; do not infer production isolation from its name alone.
- Do not run a destructive seed or reset against a populated target.
- Do not expose credentials.
- Do not treat persona existence as approval.
- Do not claim authenticated UI evidence until traceable artifacts exist.
- Do not certify performance from proposed targets or contract tests alone.
- Do not migrate X2, X3, or X4 tables as part of this X1 execution.

## Next controlled action

Obtain product-owner approval for the scale budgets, then capture authenticated EN/FR evidence against this approved fixture using the required personas and viewports. After those artifacts are registered, rerun the X1 evidence binding and release-readiness review.
