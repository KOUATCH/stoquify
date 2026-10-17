# Stoquify roadmap execution register

Updated: 2026-09-30T22:32:49.287Z

**Execution is in progress. The 38-package roadmap is not complete and no release is approved.**

The first implementation batch addresses the audit’s financial correctness, offline durability, close control and verification failures. Historical data findings prevent treating these source fixes as an immediately releasable financial system.

## Material data findings

- Local snapshot only: 120 of 364 posted/reversed lines lack both base amounts; 24 of 137 entries cannot be checked for base balance.
- 22 of 137 entries fall outside their assigned accounting periods. All missing-base and date-mismatch candidates carry four seed markers; the original seed function independently reproduces the exact population fingerprint.
- The future seed generator is corrected. Existing historical records remain intact, and their reviewed disposition is still pending.
- The 244 complete-base lines match their stored conversion rates; 113 complete-base entries balance. Zero candidates on those subsets does not cover missing evidence.
- Source migration names/checksums match 87/87; the source was scanned in a read-only repeatable-read transaction and rolled back. New guard migrations are verified only on newly created disposable databases.

## Package status

| ID | Package | Status | Next concrete action |
|---|---|---|---|
| R00 | Establish the execution baseline and release scope | PARTIAL | Confirm D01–D08 and assign accountable reviewers before any release decision. |
| R01 | Restore a reproducible test, typecheck and policy-gate baseline | PARTIAL | Qualify a fresh stable integrated candidate through the normal build and isolated runtime path; expand route checks into panel-level and full business workflows. |
| R02 | Correct currency authority, FX conversion and locked settings | PARTIAL | Review historical missing amounts and rate provenance policy; do not release affected reports before R09 disposition. |
| R03 | Enforce source-owned corrections and compensating effects | PARTIAL | Prove each supported source-owned compensating workflow and PostgreSQL duplicate/failure races. |
| R04 | Make the offline queue durable and migrate existing records safely | PARTIAL | Qualify supported devices, eviction policy, older-client shutdown and operator recovery/export before pilot. |
| R05 | Recover interrupted sync and reconcile uncertain outcomes | PARTIAL | Prove one sale/stock/journal effect jointly in a browser and disposable PostgreSQL after lost response; implement governed recovery UI. |
| R06 | Correct fiscal boundaries and general-ledger balances | PARTIAL | Complete independent accountant/browser acceptance and disposition the 22 historical entry/period date candidates. |
| R07 | Unify period close, assurance, invalidation and certified exports | PARTIAL | Complete a shared writer/close locking contract and late-evidence policy, then prove all PostgreSQL interleavings and fresh source coverage. |
| R08 | Strengthen database integrity and records retention | PARTIAL | Complete posted-header/late-insert/parent-retention boundaries, reciprocal tenant guards, draft-post races and deployed least-privilege verification. |
| R09 | Assess and correct historical data without rewriting evidence | PARTIAL | Review fixture regeneration on a separate disposable database; preserve original evidence. For any business/mixed-provenance population, prepare source-owned corrections with independently reviewed historical evidence. |
| R10 | Prove access, tenant isolation and privacy across entry points | NOT_STARTED | Build a role/tenant/module/action matrix for browser routes, actions, APIs, exports, uploads, workers and delegated accountant access. |
| R11 | Validate master data, onboarding, imports and media lifecycle | NOT_STARTED | Validate setup completeness, unique external identities, versioned tax/unit references and location ownership before admitting transactions. |
| R12 | Prove online POS, inventory and end-of-day control | NOT_STARTED | Run shift open, sale, stock issue, tender, return/disposition, refund status, drawer count and daily-close flows. |
| R13 | Complete order-to-cash, customer credit and returns evidence | NOT_STARTED | Exercise order approval, partial fulfillment, delivery, invoice/credit, customer settlement allocation and overdue balance. |
| R14 | Complete purchasing, three-way match and AP finalization | NOT_STARTED | Run PO approval, supplier acknowledgement, partial/over receipt, invoice matching, approved exceptions, credit/return and payment allocation. |
| R15 | Prove payment finality, reconciliation and suspense clearance | NOT_STARTED | Exercise cash/bank/mobile-money initiation, pending/failed/uncertain states, authenticated callbacks, imports, matching and explicit suspense. |
| R16 | Prove HRIS source records, effective scope and employee service | NOT_STARTED | Run joiner, contract change, transfer, manager change, compensation approval, leave/attendance correction and leaver journeys. |
| R17 | Complete payroll calculation, payment, declaration and close proof | PARTIAL | Complete source-to-payroll, payment, declaration and GL application-level acceptance with independently qualified country rules. |
| R18 | Qualify versioned country, payroll, tax and fiscal capabilities | NOT_STARTED | Refresh official 2026 sources and record effective dates, versions, applicability and reviewer decisions without presuming existing rates are wrong. |
| R19 | Qualify payment, billing and authority integrations | NOT_STARTED | Build an integration matrix of country, provider, account, capability, environment, limits, credentials owner and acceptance evidence. |
| R20 | Complete expenses, accruals and year-end accounting workflow | NOT_STARTED | Confirm supported expense approval, accrual/prepayment, periodic reversal, adjusting entry, closing and opening-balance workflows. |
| R21 | Verify entitlement, deactivation, billing and package behavior | NOT_STARTED | Exercise activate, upgrade, downgrade, suspend, resume and deactivation across UI/action/API/worker entry points. |
| R22 | Complete customer/accountant access, consent and delivery evidence | NOT_STARTED | Exercise statement generation, signed access, expiry/revocation, recipient scope and accountant grant changes. |
| R23 | Prove event, outbox and worker recovery in deployment | NOT_STARTED | Inventory each worker/outbox producer, event version, schedule, authorization, ordering and idempotency contract. |
| R24 | Validate complete EN/FR, accessible and mobile user journeys | NOT_STARTED | Create a route/persona/locale/device matrix; verify loading, empty, error, denied, partial, stale, offline, uncertain and recovery states. |
| R25 | Create versioned BI metric contracts and source lineage | NOT_STARTED | Adopt the K01–K19 definitions from the audit and resolve owners, grain, source events, denomination, business timezone and as-of/known-at cutoffs. |
| R26 | Complete operational commerce, cash and control BI | NOT_STARTED | Deliver K01/K03/K04/K05/K07/K08/K10/K11/K17 with explicit activity/correction meaning, scoped drill-through and actionable exceptions. |
| R27 | Complete financial statements, margin, aging and cash-flow BI | NOT_STARTED | Implement net realized sales, frozen COGS and margin including disposition-aware returns; connect AR/AP aging and working capital. |
| R28 | Complete privacy-scoped workforce and payroll BI | NOT_STARTED | Define headcount/FTE inclusion, approved payroll cost, employer charges, attendance/leave denominators and effective organization scope. |
| R29 | Validate AI assistance, security posture and cost controls | NOT_STARTED | Test prompt injection in business documents/tool output, stale authority, forged proposal evidence, denied tools and cross-tenant retrieval. |
| R30 | Rehearse recovery, refresh runbooks and measure service limits | PARTIAL | Complete recovered business/worker/offline workflows and agreed measured recovery objectives before production qualification. |
| R31 | Assemble independent end-to-end release evidence | NOT_STARTED | Freeze an exact release candidate and migration/toolchain manifest; rerun required commands without the audit-only adapter. |
| R32 | Run a controlled offline POS pilot and validate recovery | NOT_STARTED | Specify explicit device enrollment, revocation, queue limits, tender policy, fiscal obligations, conflict review and support procedures. |
| R33 | Release by qualified cohort and transfer ongoing ownership | NOT_STARTED | Approve a capability-by-country/provider/tenant matrix; require R32 for offline, R18 for regulated functions and R19 for real external integrations. |
| R34 | Qualify inventory extensions, landed cost and replenishment | CONDITIONAL_NOT_STARTED | Decide requirements independently for lot/serial/expiry, unit conversion, landed cost and replenishment; split accepted work into bounded tickets. |
| R35 | Add a fixed-asset subledger when professional scope requires it | CONDITIONAL_NOT_STARTED | Decide material asset needs, accounting methods, categories, useful lives, opening assets and required reports. |
| R36 | Add governed budgets and scenario cash forecasting | CONDITIONAL_NOT_STARTED | Define budget grain, versions, approval, currencies and ownership; connect actuals to the same account/period basis. |
| R37 | Add consent-aware customer retention and cohort analytics | CONDITIONAL_NOT_STARTED | Define repeat customer, cohort membership, observation window, identity merge/split and treatment of returns/anonymous transactions. |

## Evidence and completion rules

See execution-register.json for dependency edges, acceptance criteria, role assignments, evidence paths and timestamped verification attempts. Failed/time-limited attempts remain in the record. Repeated or overlapping test runs must not be summed as unique coverage.

Code-level corrections are PARTIAL until all acceptance conditions in the published roadmap are met. NOT_STARTED means this batch has not completed or revalidated that package; it does not imply the application has no existing implementation.

The immediate dependency sequence is: qualify a stable integrated candidate through the ordinary build and isolated runtime checks (the Windows standalone build and packaging recovery both failed); resolve R07 source/close concurrency; complete R08 database boundaries; disposition R09 historical data; then finalize domain integration, BI source contracts and customer/device pilots. Work that needs expert or business decisions remains explicit.

No source-database migration, historical repair, external payment, production rollout or offline replay enablement is authorized by a green static gate.
