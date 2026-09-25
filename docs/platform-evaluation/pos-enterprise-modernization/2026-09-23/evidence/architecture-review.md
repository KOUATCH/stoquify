# POS architecture, workflow, product, and operations review

Date: 2026-09-23. Method: read-only source inspection of the execution brief, current route/component/hook/action/service files, graph exports, gate scripts, and the three recent checkout verification reports. This is source evidence, not browser, transaction, or release certification. No source files or financial records were changed by this reviewer.

## Graph evidence and current source

Graph discovery found `pos_professionalpossystem_tsx` (components community 1), `pos_cashdrawermanagementdashboard_tsx` (11), `pos_terminalmanagementdashboard_tsx` (56), `poshooks_useposoperations_ts` (hooks community 1), `pos_tender_actions_ts` (actions community 133), and `locale_dashboard_dashboard_pos_page_tsx` (app community 140). Their file/function containment links remain useful. Historical graph line positions are not current source proof, and newer checkout files are not comprehensively represented.

Current imports establish these actual paths:

| Journey | Current execution path | Authority and effect |
| --- | --- | --- |
| Open POS | localized POS page → `ProfessionalPOSSystem` → `usePosOperations`/`usePOSReadQuery` → catalog/session actions → POS services | Server authenticated organization; catalog, location, terminal, shift and customer reads. Read module checks use observe mode; write admission is a separate contract. |
| Open/close shift | `ProfessionalPOSSystem` → open/close hooks → session actions → `openPOSShift`/`closePOSShift` | Shift, terminal and drawer state; explicit counted balance, transaction/audit evidence and offline blockers. |
| Cart editing | component → cart hooks/actions → `pos.service.ts` → cart access/checkout lease/revision helpers | Server pricing/tax/quantity calculations, scoped draft and stock checks. UI monetary previews do not establish posted amounts. |
| Resume/park/recovery | component → `usePOSCheckoutLifecycle` → checkout/commit-recovery actions → `checkout.service.ts`, `checkout-state.ts`, `readPOSSaleCommitStatusInTx` | Browser ownership plus server lease; retained request, reviewed cart revision, recorded result, and closed-shift retirement are distinct states. |
| Commit cash sale | component → commit hook → `tender.actions.ts` → prepare checkout → `commitPOSSale` | Domain service imports stock issue, sale/payment posting, customer ledger/receivable documents, fiscal documents, provider-authority and business-event services. Revalidation failures are caught after the committed operation. Integration atomicity requires transaction tests, not this import map. |
| Receipt access/revocation | POS receipt panels → receipt-token actions → registry/receipt services; public GET API → `getPublicSalesReceipt` | Explicit revocation permission and scoped token registry; public API requires token. Recipient delivery is separate from financial completion. |
| Offline review | POS status strip/review/history → offline hooks/actions → sync/review/resolution services | Enrolled device/hash-chain/queue/replay/conflict evidence. Monitoring and review exist; cashier enrollment/queue/flush hooks have no runtime component callers discovered. |
| Terminal configuration | terminals page → terminal dashboard → `useTerminalManagement` → terminal actions/service | Revision-aware create/update/archive, configuration and active-session checks. |
| Drawer/history/reporting | drawer/history pages → hooks/actions → drawer/history services; sales/finance pages → analytics/finance services | Read models over POS orders, sessions, drawer movements, payments, settlement and ledger evidence. Cash-payment history explicitly distinguishes manager versus own records. |

## Workflow support and prerequisites

“Implemented” below means a concrete path exists in source. It does not mean integrated verification passed in this run.

| Workflow | Actor/prerequisites | Support and result | Failure/recovery/evidence |
| --- | --- | --- | --- |
| Terminal selection/setup | Authorized administrator/manager; active organization/location | Implemented configuration and active-session visibility | Revision conflicts and active shift prevent unsafe edits/archive; audited action/service paths. |
| Cashier shift ownership | Cashier with POS use/read and session permissions; active terminal | Implemented shift opening, lease acquisition and expiry | Other-tab ownership, missing session/module and offline blockers must be surfaced. No manual lock bypass. |
| Catalog/barcode/cart | Active organization/location/register/shift, valid lease | Search and scanner input, add/remove/change quantity, server prices and totals | Stock, stale cart and denied updates return errors; resume reviews current price/stock/customer context. Discount totals exist, but schemas expose no cashier discount or arbitrary-price setter. |
| Customer selection | POS use permission; compatible customer location | Walk-in/identified customer reads and checkout association | Credit information is displayed. On-account method exists in server schema/service but current checkout method list is only CASH; do not describe on-account as a completed cashier journey. |
| Tender/change/splits | Nonempty reviewed cart, authoritative total, positive valid amounts | Cash and multiple tender-row UI exist; exact cash/change preview | Current method list is CASH only. Electronic schema requires paymentTransactionId and service imports provider authority. This is backend support, not an available card/mobile/bank checkout UI. |
| Sale/recovery | Verified ownership and original client request identity | Durable checkout request/commit result; server revision comparison | NOT_FOUND remains uncertain. Checking/reviewing is not submitting. Preserve original identifier and recover recorded results after response loss. |
| Park/resume/handover | Current owner/active shift; queue/recovery constraints satisfied | PARK/RESUME service commands, accepted cart and stock/price revalidation | Cross-cashier transfer is not established merely by changing terminal or logging in; ownership and actor boundaries govern access. |
| Receipts | Recorded sale; scoped permission or valid public token | Receipt payload and token history/revocation paths exist | Checkout exposes NONE only. Default PRINT/EMAIL/SMS providers are explicit PENDING stubs. WhatsApp has provider/outbox integration but is not exposed by checkout. Hardware printing/delivery success is unverified. |
| Refund/void/override | `pos.transactions.refund`/`.void`, fresh authentication and service write access | Refund/void protected actions and hooks exist | No runtime component caller found for refund/void hooks. Full refunds only: service rejects on-account refund and requires fully paid unrefunded sale. No evidence of a complete supervisor approval UI or partial-item return journey. |
| Drawer/count/close | Session operator; drawer and queued-event constraints | Counted close, variance, reconciliation and history read models | Concurrent close and evidence failure need disposable PostgreSQL tests. Drawer dashboard is read-focused; do not equate it with arbitrary cash adjustment workflow. |
| Offline operations | Enrolled device/policy, signed/scoped event sequence | Queue library, sync/replay service, conflict review/history implemented | No cashier enrollment/enqueue/flush UI caller found. Provisional fiscal evidence is distinct from final server fiscalization; unresolved replay blocks close. |
| Stock/ledger/receivables | Configured inventory/posting/country rules | POS directly calls stock event and accounting/receivable/fiscal services | Need stock, journal, balance, event and result agreement under faults/concurrency. Report availability alone does not prove correctness. |
| Support/export | Appropriate read/export/revocation/control permissions | Cash-payment history/export safety, tokens, offline evidence, close/report drill-through | Record request ID, scoped status and evidence without logging bearer tokens or customer details. Avoid “clear browser storage” recovery advice. |

## Persona permissions: capabilities, not invented roles

Role assignments are organization data (`types/roles.ts`), so job titles below describe task ownership and do not grant access. Current aliases in `lib/security/rbac-permissions.ts:397` map `pos.use` to `OPERATE_POS`, `pos.read` to `NEW_POS_SESSION_READ`/`POS_STATION_READ`, session start/end to `MANAGE_POS_SESSIONS`, transaction reads to `READ_SALES_ORDERS`, refund/void to `PROCESS_REFUNDS`, cash adjust to `MANAGE_CASH_TRANSACTIONS`/`MANAGE_CASH_DRAWER`, and receipt print/reprint to `OPERATE_POS`. `pos.receipts.revoke` has no legacy alias and must remain explicit.

- Cashier: POS use plus actual read/session permissions needed by the flow. History action limits non-manager access to own records.
- Supervisor/store manager: explicit refund/void/control capabilities for applicable operation; 300-second fresh authentication on refund/void and consequential offline resolution. No assumed universal supervisor bypass.
- Inventory staff: inventory read/control capabilities for stock evidence; POS use is separate.
- Finance/reconciliation: drawer read/finance read, reconciliation read; cash-history modules cash_drawer and payment_reconciliation both enforced.
- Administrator: terminal page requires POS_STATION_READ; terminal mutations use pos.session.start. “Admin” label alone is not evidence of an explicit critical permission.
- Auditor/support: history, reports, accounting audit and receipt-revocation permissions only where assigned; no financial mutation permission implied.

## Findings handed to implementation reviewers

1. **Medium — broken terminal-to-drawer navigation.** `components/pos/TerminalManagementDashboard.tsx:734` links `/dashboard/cashDrawer`; that directory contains helpers only, no page. Actual page is `/dashboard/finance/cash-drawer`. No alias in next.config or middleware. Reproduce by opening terminals and following Cash Drawer. Correct to existing localized route; verify both languages.
2. **High candidate — drawer cache lacks actor/tenant scope.** `hooks/posHooks/useDrawerDashboard.ts` uses location/period/date only. `lib/providers/query-provider.tsx` creates one QueryClient without an auth-scope clear. Validate account/organization transition; prevent prior-scope data reuse and stale in-flight results. Parent was notified before edits; final status belongs in findings register.
3. **Low — drawer links depend on global locale cookie.** Drawer dashboard uses next/link with unprefixed links; middleware normally restores cookie locale, but another localized tab can change it. Locale-aware links avoid unintended language changes. Not a claim that every French navigation currently fails.
4. **Product limitation — methods/delivery/returns/offline capture exceed exposed UI.** Current cash/NONE choices and absent hook consumers mean backend schemas are not complete product workflows. Keep availability honest; no speculative integration should be enabled during this audit.
5. **Release evidence limitation — PostgreSQL suites are partial.** Lifecycle fixture clones nine public tables with DEFAULTS and added primary keys, not production foreign keys/indexes/triggers. Commit-registry tests exercise registry races, not full sale. Shift-close suite mocks adjacent stock/accounting/fiscal services. Passing these cannot certify the full stock-to-cash transaction.
6. **Security candidate — public receipt response headers.** Receipt GET builds JSON without explicit private/no-store/no-referrer; middleware's special bearer-route list omits receipts. Security owner notified to establish and test appropriate protection.

## Reviewer coverage and adjacent boundaries

| Reviewer | Finding / scoped decision |
| --- | --- |
| Enterprise/platform architecture | Current layers traced; new checkout lifecycle is absent from older graph coverage. Large component/service requires targeted decomposition only when correctness evidence supports it. |
| Backend/API/distributed systems | Retained request, lease, revision, authoritative commit and post-commit delivery/cache are separate contracts. |
| Database/data/migrations | Real PostgreSQL suites exist but do not jointly establish production-schema full-sale invariants; inspect isolation before enabling. |
| Security/IAM/privacy/fraud | Explicit action permissions/fresh-auth exist; drawer cache scope and public receipt headers escalated for verification. |
| Frontend/design system | Natural checkout height must remain; broken terminal link and locale dependency need correction. |
| Workflow UX/accessibility/localization | Cashier progress depends on clear blocker→recovery action; prior reports prove limited cases, not all routes/viewports. EN/FR offline text contains unaccented French and technical “evidence” wording; polish within tested scope. |
| Product/business process | Differentiate delivered cash workflow from backend-only electronic, credit, returns and offline capture capabilities. |
| QA/release assurance | Separate static gates, mocked tests, database constraints, browser checks and production release evidence. |
| SRE/DevSecOps/performance/cost | Build wrapper can clean shared .next; avoid migration-deploy build. Poll/lease concurrency and delayed responses require measured tests; no performance SLO established here. |
| SaaS/modularity/entitlement/product operations | Read observe mode versus write enforce mode is deliberate source distinction, not blanket enforcement certification; disabled-module behavior belongs in negative tests. |
| Finance/internal controls | Sale/payment/refund/void postings, drawer counts and receivable balances directly linked. Preserve independent ledger/event/source evidence. |
| OHADA/SYSCOHADA/country pack | Fiscal document and country-pack hooks are direct dependencies. No statutory rule/rate change or legal certification proposed. Qualified country evidence remains a rollout prerequisite. |
| Audit/records governance | Request/result hashes, token registry, offline conflict history and business events are operational evidence; retention/tamper assurances need database and governance validation. |
| POS/inventory/offline | Core applicable scope; provisional queue events cannot be advertised as final posted sales. |
| Purchasing/AP | Applicable only as upstream inventory/valuation and stock-to-cash snapshot dependencies; no POS action import of purchasing/AP service found. No AP workflow rewrite. |
| HRIS/payroll | Not applicable to POS mutation scope: no direct POS import found. Shared finance snapshots expose aggregate payroll obligations; user/cashier identity is not payroll integration. |
| Payments/settlement | Provider-authority service is a direct dependency for electronic tenders; browser reference strings cannot prove capture. Current cashier UI cash-only. |
| Accounting close/fiscal documents | Direct postings invalidate close evidence; branch close/close assurance/report pages are downstream read/approval surfaces. |
| Analytics/data governance | Daily-sales read model queries scoped SalesOrder/lines; finance and cash reports distinguish operational activity from posted truth. Read availability is not accounting certification. |
| AI/agent governance | Not applicable to autonomous POS mutation: no direct agent/model call in inspected POS path. Any broader AI dashboard must consume existing read evidence and cannot authorize payment. |
| APIs/webhooks/business events | POS writes use business-event gateway; public receipt GET is bearer read; payment provider authenticity belongs to payments boundary, not client declarations. |
| Training/support/operations | Provide cashier resume/ownership/recovery guidance and support runbook with request IDs; do not claim absent methods or suggest clearing retained attempts. |

## Prior evidence retained

Read `what-next/pos-charge-button/2026-09-23/verification.md`, `what-next/pos-checkout-layout/2026-09-23/verification.md`, and `what-next/pos-recovery-state/2026-09-23/verification.md`. They document the footer Resume action, natural-height checkout, and truthful reviewed state with original request retained. They explicitly disclose limited viewport/typecheck/build coverage and that no sale was submitted by those tasks. They are regression inputs, not blanket release proof.
