# Feature status

| Feature | Status | Actual scope |
|---|---|---|
| Native EN/FR settings integration | Implemented | Existing protected route and dashboard shell |
| Outcomes, catalogue, recipes, search and dependencies | Implemented | Retailer/service journeys; existing canonical identifiers only |
| Authoritative impact preview | Implemented | Desired additions, kept/removed shortcuts, eligibility, setup scopes, stop consequences, obligations and preserved records |
| Request and preparation lifecycle | Implemented | Durable desired/active revisions, actual domain observations, leased resume and immutable event history |
| Accounting/reconciliation/POS preparation | Implemented | Current accounting collector, active approved provider account, active tenant terminal/location/drawer; operations still recheck their specific context |
| Payroll preparation | Implemented for selected period | Real tenant period, country, dates and dry-run checks; requires domain permission and actual inputs |
| Compliance preparation | Limited supported scope | Registered CM DGI sandbox only; production submission remains unavailable |
| Resulting workspace | Implemented | Current active configuration plus grants and role permissions drive shell/search/useful links |
| Inventory operational stop | Implemented scope | New counts/transfers/manual adjustments; exact frozen-count continuation and current domain approval controls preserved |
| Purchasing operational stop | Implemented scope | New/cloned purchase orders; existing receiving, invoices and settlement continue |
| Payroll operational stop | Implemented scope | New periods/ordinary runs; existing result replay, governed correction, payment, declaration and posting continue |
| POS/Sales operational stop | Unavailable | Offline continuation patch rejected by automatic approval review; ingestion serialization and isolated verification also required |
| Reconciliation/accounting operational stop | Unavailable | Late provider evidence requires retained-source and supplemental-run implementation; accounting is a required dependency |
| Retained history/recovery/reactivation | Implemented | Grants retained, role-appropriate historical links, current-authority retry and fresh draft/review for reactivation |
| Legacy preservation | Implemented | Effective authority snapshot, explicit empty/missing handling, unknown legacy values retained |
| EN/FR and responsive/accessibility behavior | Implemented and verified within recorded scope | Component checks and actual EN/FR desktop/mobile journeys passed; VERIFICATION.md records device/browser scope and limitations |
| New commercial grants/prices/subscriptions | External governed input | Prototype acceptance and capability selection cannot issue authority or commercial terms |
| Live rollout/X1 closure | Not performed | Synthetic verification is not customer, expert or production approval |

## Catalogue boundaries

Native destinations are mapped for dashboard, inventory, sales, POS, cash accountability, accounting, close assurance, compliance, purchasing, payroll, finance, reconciliation, analytics, reports and settings. Destination permissions and additional required route capabilities still apply. Reports use the existing analytics report destination. Presence, commercial agents and content have no supported destination in this integration. Administration remains a core control boundary. Existing grants and unknown legacy values are retained.

Standalone HRIS, assisted work, separate ledger identifiers, external-ledger modes, new billing packages and provider provisioning are proposals, not installed operational capabilities. Operational health is not inferred from a successful configuration or setup observation.

## Remaining actions

1. Review the verified isolated application and the exact supported operational scopes before selecting a real rollout target. Current lifecycle proof includes real PostgreSQL and EN/FR application journeys.
2. Before POS/Sales stopping, resolve the specific automatic-review source-change approval and finish the retained offline admission/ingestion design and negative verification. The proposal is unapplied.
3. Before reconciliation/accounting stopping, implement and verify a durable retained-source scope for late provider evidence. This is engineering work, not a signature field.
4. On an authorized rollout target, apply all four migrations, generate matching client code and retain authority/admission enforcement through any rollback.
5. Actual tenant owners supply eligible grants, accounting setup approval, provider account evidence, selected payroll inputs and reviewed country-adapter scope. No customer activation or production submission is authorized by local tests.
