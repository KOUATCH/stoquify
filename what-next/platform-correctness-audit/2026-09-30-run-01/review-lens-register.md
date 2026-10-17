# Multidisciplinary review coverage

All listed lenses are applicable to this broad platform audit. This table records one coordinated review, not independent professional approvals or multiple human reviewers. Where runtime, qualified review or operations evidence was unavailable, the conclusion is explicitly limited.

| Lens | Conclusion | Findings / evidence |
|---|---|---|
| Platform architecture | Distinct source owners, event/outbox, evidence and read models are present. The central consistency contract still breaks at generic reversal and close. | F02, F06; workflow maps |
| Backend / domain integration | Transactional POS commit, AP matching and payroll transitions exist; some correction and restart paths remain inconsistent. | F02–F06; 326-suite verification |
| Database / migrations | 211 models and 87 migration checksums match local catalog; older ledger integrity relies heavily on application logic. | F10; schema assessment |
| Security / IAM / privacy | Server-derived org/permission/fresh-auth boundaries and effective HR scopes inspected; full adversarial/retention verification absent. | F10, F14; verification matrix |
| Frontend / design systems | Role-aware routes, shared workbenches, explicit empty/error/blocked/redacted states and component tests exist. No live rendering inspection completed. | CAP29; browser limitation |
| Workflow / accessibility / localization | EN/FR and recovery surfaces are implemented; in-flight offline loss and close-state ambiguity affect user recovery. Keyboard, screen reader and mobile audits remain unverified. | F04, F06; supplementary tests |
| Product / business processes | Strongest evidence supports controlled online retail/stock operations. Whole ERP, production offline and fully qualified payroll claims exceed demonstrated scope. | F05, F11, F12 |
| QA / release assurance | Current source probes reveal gaps that existing green unit cohorts do not cover. Typecheck/exact-config CI and DB/browser proof are incomplete. | F13; verification-summary.md |
| SRE / DevSecOps / performance / cost | Retry/lease/dead-letter logic and migration checks exist; live schedule/alerts/load/cost/restore objectives not measured. | F14; deployment evidence register |
| SaaS packaging / billing / customer operations | Entitlements and stop-new-work admission are separate from ongoing completion/corrections; provider billing execution unverified. Scope/version disclosure must match capability status. | F05, F11, F12; CAP22 |
| Finance / internal controls | Maker-checker/evidence present in modern flows, but base currency and source reversals threaten economic truth. | F01, F02, F07, F09 |
| Statutory / country compliance | CM capability states explicitly restrict CNPS/IRPP/e-invoicing; independent qualified review remains required. | F11; external-source-register.md |
| Audit / evidence / data quality | Hashes, source versions, provenance and invalidation structures present; local data mostly drafts in AP/payroll/reconciliation. | Schema denominators; F06 |
| POS / inventory / offline | 541 movement/projection tie-outs pass; offline queue loses/strands records and replay is test-only. | F03–F05 |
| Purchasing / AP | Receipt/match/exception/approval/payment/correction structures and unit tests are substantial; posted end-to-end local sample absent. | CAP07–09; F01/F02 dependencies |
| HRIS / payroll | Effective source records, privacy and immutable snapshots/transition evidence are present; country approval and live lifecycle proof are incomplete. | F11, F13; CAP15–18 |
| Payments / reconciliation | Provider verification/authority and reconciliation/suspense ownership boundaries exist. Real provider settlement and signed-run tie-outs unverified. | CAP10–11; verification matrix |
| Accounting close | Shared/exclusive period locks improve race design; preflight omits broader assurance readiness. | F06, F08 |
| BI / data governance | Trust/freshness/redaction contracts are strong; order/sales activity is explicitly limited and financial measures are partial or incorrect. | F01, F09, F12; BI matrix |
| AI safety / evaluation / human approval | Inspected agent tool policy requires read-only risk/type and checks authority; proposals have bounded scope/TTL. Adversarial model evaluation and live cost budgets unverified. | CAP24; no autonomous financial execution claim |
| API / events / provider boundaries | Tenant-scoped idempotency, HMAC evidence, outbox recovery and source versions exist; provider/deployment proofs remain missing. | CAP10, CAP23; F04 |
| Rollout / support / training | Workbenches provide recovery states, but operational runbooks are stale and current operators have no audited end-to-end training evidence. | F14; release work package W08 |

Manufacturing/BOM, multi-entity consolidation and predictive employee scoring were not treated as mandatory product requirements: the repository/current customer brief does not establish them. Legacy production tables do not justify reintroducing a manufacturing module. See optional BI scope for the product decision.
