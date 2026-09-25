# Current feature status

| Feature | Status | Scope |
| --- | --- | --- |
| Native EN/FR module entry, outcomes, recipes, search and dependencies | Implemented | Existing authenticated settings route and application shell |
| Authoritative preview and activation | Implemented | Current grants, setup evidence, tenant/actor scope, revision binding, idempotency and real password verification |
| Preparation, failure and recovery | Implemented | Durable requested/preparing/active/failed/retained state; last verified active workspace preserved |
| Resulting workspace | Implemented | Existing canonical destinations filtered by actual configuration, grants and operation permissions |
| Legacy access | Implemented and tested | Explicit empty/missing/expired/suspended/read-only cases; unknown legacy values retained; activation does not silently narrow established rights |
| Earlier history and reopening | Implemented and browser-verified | Real PostgreSQL and UI traversed 112 records; row 107 remained usable across refresh and genuine password reopen created exactly one new draft. Scope invalidation, gap prevention and snapshot freshness are explicit |
| Inventory stop | Implemented scope | New counts/transfers/manual adjustments stop; exact existing-count continuation and mandatory stock effects retain their controls |
| Purchasing stop | Implemented scope | New/cloned purchase orders stop; existing receiving, invoice and settlement workflows continue |
| Payroll stop | Implemented scope | New periods/ordinary runs stop; controlled corrections, existing payment/declaration and posting continue |
| Accounting stop | Implemented scope | Only new manual journal creation stops; required ledger effects, posting/reversal, reconciliation and close continue |
| Manual-journal failure recovery | Implemented and browser-verified | EN/FR actual stopped submissions preserved all 29 fields and focused the localized denial; journal/line/create-audit counts unchanged. Failed setup lookup remains distinct from true empty setup |
| POS/Sales stop | Unavailable | Specific offline continuation source change rejected by automatic approval review; candidate unapplied |
| Reconciliation stop | Unavailable | Retained source-root lineage and required settlement/producer boundary remain engineering prerequisites |
| Payroll preparation | Selected-period support | Actual tenant period, dates, country and dry-run checks; current domain permission required |
| Compliance preparation | Limited supported scope | Actual registered CM DGI sandbox; production submission is not established |
| Authenticated server rendering | Corrected and browser-verified | Shared authentication hook uses Next's React renderer; optimized compilation, lint and type validation passed |
| Full application build | Environment-limited | Page collection fails on the existing invitation service's required email-provider key, excluded from the isolated build; no full-build or release pass |
| Native zoom and final browser check | Verified within recorded scope | EN/FR 200% and 400% browser zoom passed; review actions and French history paging/reopen focus remain reachable. No configuration was submitted in the zoom check. Earlier driver failures remain recorded |
| New commercial grants, pricing, live rollout | External governed inputs | Selection does not create grants, provider approval, prices, country evidence or production authority |

The original catalogue proposals are preserved as design. Standalone HRIS, assisted work, separate ledger identifiers, new provider/billing products and unsupported presence destinations have not been silently installed or relabeled as working capabilities. Operational health and professional approval are never inferred from selection or a successful configuration.
