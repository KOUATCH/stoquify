# Cash Command private source admission

2026-09-28T09:47:52.724Z. Workflow FA-CASH-COMMAND remains In progress. Previous goal turn was progress: source reuse was implemented and verified. This turn completes the drawer/diagnostics portion of pre-query admission; the full source boundary remains open.

## Delivered correction

Cash Command reads only organization name/currency after tenant authority, before private source queries. Drawer read requires CASH_DRAWER_READ and enforced current cash_drawer read admission, including dependencies. Full module diagnostics require MANAGE_SYSTEM_SETTINGS. Nullable contracts suppress unqueried drawer cards, changes, risks, trust, totals and signals; projection retains explicit source restrictions. Existing snapshot calculations, currency and payroll proof contracts, domain services, proof actions and UI presentation remain unchanged.

Previously these services ran for every admitted Cash Command visitor and their results were discarded by the browser projection. The new path avoids unauthorized source access altogether. Name/currency no longer depend on loading drawer or module administration details. An unavailable organization rejects before business reads. Query or module-lookup failures remain failures; no empty success is substituted. Fresh requests recheck admission.

## Verification

- evidence/cash-private-checks-6584ea53-f92b-4437-aa12-f8aac7e4b45e.json: 63 tests/four suites, changed-file lint and full TypeScript passed. Coverage includes source ordering, missing permission, module denial, retained reads, unavailable organization, failed admission/query and fresh retry; independent related-source failure and prior currency/proof/UI tests remain covered.
- lanes/environment/cash-private-82358d34-39e8-4ecb-9ec8-a08989cfe03b.json: ten actual EN/FR browser views (desktop EN, 320px FR), with real PostgreSQL source admission and real module policies. States: required sales dependency suspended, authorized, permission revoked, cash_drawer suspended and retained read. Direct service instrumentation counted zero drawer calls for denied cases and one for permitted cases; module diagnostics were not queried without settings permission. An additional authorized settings call queried diagnostics exactly once. No module decision was mocked.
- Own synthetic drawer variance 7,654,321 was returned only when allowed; foreign 3,456,789 remained absent. Denied totals and drawer state were null, with no drawer card or confidence signal. Actual response inspection and the EN/FR unavailable-not-zero notice passed. No horizontal overflow. Synthetic drawer rows and transaction counts were unchanged during reads.
- FR suspended screenshot inspected: drawer information is absent and the French limitation remains visible. Remaining English server copy and broader Cash Command translation defects stay open; this is not full EN/FR closure.

Failed attempt cash-private-22ff2620-e84e-4f6c-ba33-eee20ef9e7ca expected an allowed read with a fixture missing the required sales grant. The real policy denied it correctly. The fixture was corrected, and dependency denial became an explicit matrix case. Initial verifier file generation failed with Windows EPERM, then the attempted execution reported missing module; no runtime verification occurred until the scoped write succeeded. No automatic approval-review rejection occurred.

## Operating guidance and recovery

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command. The organization administrator must provide CASH_DRAWER_READ plus a valid cash_drawer module and its required dependency grants for drawer evidence. Retained read permits viewing, not cash operations. Settings diagnostics require MANAGE_SYSTEM_SETTINGS. Obtain these values from the current organization role and module configuration; no new form or external approval is introduced. A missing source is unavailable, not a zero balance. Retry a failed source read after the source/module service recovers.

No schema migration, production deployment, live activation, cash transaction, payment or external message occurred. Preserve the pre-query checks during recovery; reverting them would restore unauthorized source loads. The existing isolated fixtures are clearly synthetic and retained as test evidence.

## Remaining work and review

Mixed tenant/payment/inventory/close snapshots still load before their domain output permissions. Replace them with independently authorized source reads and domain-specific provenance; preserve payroll proof/currency and failed-query contracts. Cash Command handoffs, complete server-authored EN/FR, remaining proof types and genuinely posted payroll lifecycle remain open.

Security/backend: actual current permission/module admission precedes source calls. Data/finance/audit: null semantics, tenant isolation and business-row invariance; no financial certification. Architecture/frontend: existing composition supports absent sources without fake snapshots, existing UI reused. Quality/SRE: focused tests and actual isolated runtime, no production budget claim. Product/operations: existing roles/modules retained, no packaging change. Statutory, external providers, offline, AI and migrations: not applicable to this bounded correction. Full workflow original requirements remain active.
