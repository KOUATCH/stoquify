# Reviewer coverage and limits

These are engineering review perspectives, not separate professional sign-offs. Whole-program scope remains incomplete. “Retained” is an implementation decision, not a certification.

| Reviewer responsibility | Evidence-backed finding / disposition |
| --- | --- |
| Enterprise/platform architecture | Existing modular-monolith ownership is supported by current action/service paths and the September modularity report. Eight import SCCs need type/runtime classification before changing boundaries. |
| Backend/domain/integration engineering | Cash history action retains RBAC/module checks; the service retains read and redaction authority. Repeated pure preflight presentation wrappers are consolidated without changing activation semantics. |
| Database/migration architecture | Cash and payment amounts are Decimal(14,2); grouped sums preserve that precision and bounded summary transport. No schema migration; actual query-plan validation outstanding. |
| Application security/IAM/privacy/abuse | Seven cache/permission/filter/export cases failed before changes. Identity and permission scope now participate in the cache key, and server-returned identity is checked. This is not a global security audit. |
| Frontend/design systems | Existing history shell and route contract retained; no new UI framework or duplicated component system. |
| Workflow UX/accessibility/localization | Existing translated state panels are used; selection avoids a loading transition; unauthorized export is hidden. Component evidence does not replace keyboard/screen-reader/browser testing. |
| Product/business processes | The same history, filtering, detail and export-preparation jobs remain. No features or customer capabilities were removed to improve size metrics. Full product inventory outstanding. |
| Quality/release assurance | Characterization failures saved; 996 preflight baseline tests and 5,610 serialized contract comparisons establish focused evidence. Full release validation remains a separate requirement. |
| SRE/DevSecOps/performance | Synthetic 200,000-row summary workload now returns 49 groups at unchanged query count. Mocked processing and heap deltas recorded; live latency, capacity, and operating-cost conclusions are unproven. |
| SaaS packaging/billing/growth/customer operations | Both cash_drawer and payment_reconciliation module decisions remain server-enforced. Packaging, billing providers, and growth workflows were retained and not revalidated. |
| Finance/accounting/treasury/reconciliation/controls | Decimal totals, physical-cash/electronic-tender separation, provider redaction, and event counts are protected by focused tests and differential summary comparison. Broader ledger/reconciliation invariants remain outside verified changes. |
| OHADA/SYSCOHADA/statutory/country packs | No rule, rate, jurisdictional configuration, or provenance changed. Legal/statutory conclusions are not applicable to these implementation changes; country-pack rewrite remains unperformed. |
| Audit/records/data quality | Source hashes and logs distinguish baseline from changes. Retained preflight serialized outputs and fingerprints compare identically; no evidence history was deleted. |
| POS/inventory/offline consistency | Cash history reads changed; POS posting, stock valuation, offline replay, and synchronization writers retained. Their end-to-end rewrite/validation remains outstanding. |
| Purchasing/AP/payment controls | Purchasing/AP owners retained; cash history does not gain a mutation path. Maker-checker and AP concurrency are not certified by these tests. |
| HRIS/payroll/employee privacy | Payroll's 10,974-line control service is an inventory priority, not an authorized deletion candidate. Payroll behavior and privacy controls retained; deeper review pending. |
| Payments/mobile money/settlement | Existing provider-reference redaction and electronic-tender summary formulas preserved. No provider requests, settlement changes, or money movement performed. |
| Accounting close/fiscal reporting/accountant portal | Existing source owners retained. The inventory identifies an accounting/inventory import SCC; this is not evidence that transaction or close boundaries can be removed. |
| Analytics/metric governance | Existing cash summary definitions retained and exact values compared. No new cross-currency aggregate or alternate canonical KPI owner introduced. |
| AI/agent safety | No model, agent tool, approval, prompt-injection boundary, or runtime credential changes. AI-specific evaluation is not applicable to these edits; global agent review remains outstanding. |
| API/webhook/outbox/import/export boundaries | Existing action exports and preflight exports retained. History gains additive scope metadata; export preparation retains server fresh-auth/safety checks. Webhook/outbox behavior unchanged and unverified globally. |
| Change management/documentation/support/rollout | Local before/after evidence and a dependency-ordered continuation plan are saved. No rollout, production activation, support communication, or deployment was performed. |
