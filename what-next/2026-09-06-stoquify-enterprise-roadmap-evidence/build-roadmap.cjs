const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd(),out=__dirname,date='2026-09-06',prefix=`what-next/${date}-stoquify-enterprise-`;
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const baseline=JSON.parse(read(`${path.relative(root,out)}/baseline.json`));
const tests=JSON.parse(read(`${path.relative(root,out)}/focused-tests.json`));
const id=n=>`STQ-RM-${String(n).padStart(3,'0')}`;
const split=s=>s?s.split('|').map(x=>x.trim()):[];
const packages=[];
function P(n,title,phase,refs,deps,effort,owner,files,testFiles,job,scope,accept,missing,data,metric,counter,stop,opts={}) {
 packages.push({id:id(n),number:n,title,phase,source_references:split(refs),hard:deps,effort,owner,files:split(files),tests:split(testFiles),job,scope:split(scope),accept:split(accept),missing:split(missing),data,metric,counter,stop,...opts});
}
P(1,'Correct authoritative sales metrics and organization context','P0','F1',[],[3,4,6],'Analytics engineering',
 'services/analytics/sales-analytics.service.ts|services/analytics/analytical-context-contracts.ts|services/analytics/daily-sales-read.service.ts|services/analytics/daily-sales-period.ts|services/pos/pos.service.ts',
 'services/analytics/__tests__/business-pulse.service.test.ts|services/analytics/__tests__/analytical-context-contracts.test.ts|services/analytics/__tests__/daily-sales-read.test.ts',
 'An owner can reconcile displayed sales to finalized source facts in the correct local period and currency.',
 'Bind the existing analytical context contract to Business Pulse and its sales/cashier/product callers|Document finalized POS sales separately from other order recognition; distinguish returns, refunds and cash|Use decimal source aggregation and tenant/location permission scope; invalidate stale projections',
 'Completed POS sale 100 plus draft 900 and cancelled 700 returns 100 and one finalized transaction|Gross 100, accepted return 20 and separate cash refund are explained without double subtraction; late returns use the declared effective period|XAF/XOF remain separate; Douala midnight and DST fixtures use half-open local periods; unconfigured context blocks truthful totals|Foreign location, stale snapshot and duplicate finalization do not leak or inflate totals',
 'Business Pulse query-to-source recognition/return tie-out; existing tests cover shape rather than this defect|Caller consistency and large-decimal regression fixtures; database snapshot consistency',
 'Projection correction only unless source discovery proves a missing authoritative fact. Preserve transaction history; version metric policy and rebuild only derived caches with old/new reconciliation.',
 'Zero unexplained source-to-display differences on reviewed fixtures and sampled pilot periods','Excluded legitimate transactions; source-query latency','Stop exposure on any unexplained monetary difference.',{review:['Finance controls','Analytics','Database'],soft:[3],shared:[],external:['B07'],confidence:'medium'});
P(2,'Enforce analytics module authority at every relevant entry','P0','F2',[],[2,3,5],'Platform access engineering',
 'app/[locale]/(dashboard)/dashboard/analytics/analytics-route-access.tsx|app/[locale]/(dashboard)/dashboard/analytics/analytics-route-data-access.ts|services/modules/module-entitlement.service.ts|services/modules/module-navigation.service.ts|lib/security/server-authz.ts',
 'services/modules/__tests__/module-entitlement.service.test.ts|services/modules/__tests__/module-transport.integration.test.ts',
 'Direct analytics links, actions and exports honor the same durable module authority as navigation.',
 'Map the three catalog surfaces to supported module slugs and their feeding actions/exports|Invoke existing server guards before reading data; specify retained read-only and expiry policy|Keep provider/billing events behind governed grants; scope this change to inventoried entries',
 'Enabled, absent, disabled, expired, read-only and wildcard-RBAC scenarios match the access matrix|Every denied route/action/export invokes zero downstream reads; organization switch and stale session are denied correctly|Disabling analytics does not remove lawful retained exports from their separate authorized workflow|Billing replay alone cannot grant access; existing managed-grant negative tests remain green',
 'Route-wrapper denial integration test and authenticated route/action/export matrix|Lifecycle cache invalidation and explicit retained-access contract cases',
 'Reuse persisted module configuration/grants; no new entitlement schema expected. Roll back UI routing safely; never restore a known access bypass or globally flip observe mode.',
 'Zero unauthorized reads in the complete three-surface entry matrix','Legitimate users blocked; support tickets after plan transitions','Pause rollout on bypass or unexplained legitimate denial.',{review:['Security/IAM/privacy','SaaS packaging','Backend/integration'],external:['B07'],confidence:'high'});
P(3,'Prepare qualified Cameroon review and supported-scope decision','P0','F3|O7',[],[0.5,1,2],'Payroll product owner',
 'services/regulatory/country-packs/registry.ts|services/payroll/payroll-tax-rule-evaluator.ts|scripts/statutory-country-pack-production-gate.js',
 'services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts',
 'The team and buyer know precisely which employer profile, dates and country rules can be supported.',
 'Assemble versioned sources and unresolved questions for a qualified Cameroon payroll/statutory reviewer|Define one employer/profile and two-cycle rehearsal scope, unsupported cases and maintenance owner|Inventory deployed packs only in an authorized environment; prepare provider/declaration evidence checklist',
 'Review packet names effective dates, rule versions, expected examples, reviewer qualifications and outstanding issues|Absent or rejected approval leaves automation blocked and support copy explicit|No seeded identity or source-check flag is represented as expert approval',
 'Expert-reviewed boundary examples and signed version-specific decision; this is external evidence, not an invented unit test',
 'No country-pack promotion in this package. Preserve original source documents and access-controlled approval provenance.',
 'All supported rules have a named review owner and version-specific decision','Review rework and unsupported cases hidden','Do not widen geography before one reviewed cycle scope is supportable.',{kind:'discovery',review:['Country statutory','HRIS/payroll','Audit/evidence'],external:['B01','B06'],wait:[2,4,8],specialist:{country_review_days:[5,10,20]},confidence:'low'});
P(4,'Baseline role tasks and adopt existing workflow/design contracts','P0','F4|O1|O2|O9|O10',[],[1,2,3],'Product and workflow design',
 'config/sidebar.ts|services/daily-habit/daily-habit-digest.service.ts|services/manager-action-center/manager-action-center.service.ts|components/hris/HrisApprovalInbox.tsx|what-next/analytics-network-program/SURFACE_OWNERSHIP_AND_DUPLICATION_MAP.md',
 'services/hris/__tests__/self-service.service.test.ts',
 'Users and implementers agree on one starting point and the exact tasks that should become easier.',
 'Observe five owners and five managers; recruit three accountant firms and early employee/migration samples|Reuse the existing 12-surface/53-KPI ownership design; map specialist deep links before retirement|Specify EN/FR terminology, dense-table states, mobile tasks and useful outcome baselines',
 'Every priority task has a source owner, baseline denominator and authorized next action|Screen retirement is conditional on task success; history, exports and specialist routes remain reachable|Consent for research and telemetry is recorded; missing recruitment is labeled missing',
 'Unassisted task observation; normal-phone screen-reader/keyboard baseline; current terminal-state captures',
 'Research recordings minimized and retained for a declared period; no production records copied into artifacts.',
 'Baseline and completion rubric for every initial role task','Coached success; sampling bias; participant burden','Revise proposed navigation if specialist task success falls.',{kind:'discovery',review:['UX/accessibility/localization','Frontend/design','Product','Change/support'],external:['B05','B06'],wait:[1,2,4],confidence:'medium'});
P(5,'Complete consented transactional delivery and recovery','P1','F5|O1|O4|O6', [2],[3,4,6],'Integration engineering',
 'services/accounting/accountant-client-invite.service.ts|services/accounting/customer-statement-delivery.service.ts|services/purchase-order/supplier-po-acknowledgement.service.ts|services/communication/whatsapp-receipt.provider.ts',
 'services/accounting/__tests__/accountant-client-invite.service.test.ts|services/purchase-order/__tests__/supplier-po-proposal-retry.test.ts',
 'A permitted recipient reliably receives one useful invitation and can recover from delivery failure.',
 'Extend existing outbox/delivery primitives for one verified transactional channel; retain copy-link sharing|Purpose, destination verification, expiry, revocation, suppression, throttles and attachment redaction|Bounded retry, unknown-delivery state, dedupe, dead-letter recovery and operator audit',
 'Accepted provider submission is distinct from delivered; timeout is unknown until reconciled|Replay and concurrent workers create one invitation effect; revoked/expired/wrong-purpose links disclose no records|Wrong recipient can report/suppress; no automatic marketing use; controlled retry retains history',
 'Provider sandbox receipt/timeout/retry drill and real worker concurrency|End-to-end no-account recipient response and negative token/attachment cases',
 'Add delivery event fields/indexes only when existing schema cannot represent the states. Retain original event IDs; never backfill old sends as delivered. Additive migration with dry-run and reversible channel disable.',
 'Successful delivery and first response per eligible invitation','Duplicate sends, complaints, cost per resolved task','Disable the channel on disclosure, unexplained duplicate or unbounded retry.',{review:['Security/IAM/privacy','APIs/events','SRE','Audit/evidence'],external:['B03','B04'],wait:[1,3,6],soft:[4],confidence:'medium'});
P(6,'Measure completed work, activation and retained cohorts','P1','F5|O1|O2|O3|O4|O6', [1,2],[2,3,5],'Analytics engineering',
 'services/referrals/referral-funnel-read-model.service.ts|services/referrals/referral-attribution.service.ts|services/daily-habit/daily-habit-digest.service.ts',
 'services/referrals/__tests__/referral-funnel-read-model.service.test.ts',
 'Product decisions use completed business work and retained cohorts instead of links and registrations.',
 'Version invitation/delivery/first-task/repeat/activation/retention events with source references|Bound period queries and aggregation; exclude staff/test tenants, scanners, replay and bot engagement|Use privacy-safe role/lane cohorts with fixed attribution and denominator rules',
 'Each meaningful completion resolves or advances an authoritative task and ties to one source event|Registration remains registration; events cannot invent delivery or productive activation|Replayed/out-of-order events remain deduplicated and privacy-scoped; historical missing events stay unknown',
 'Source-event-to-cohort reconciliation; bot/replay/time-window and missing-denominator tests|Representative volume benchmark without production PII',
 'Version event contracts; additive indexes/aggregation if justified by measured load. Backfill only reconstructible facts with provenance; do not synthesize historical retention.',
 'Auditable weekly productive organizations and week-4/week-8 retained cohorts','Missing events, biased denominators, analytics query cost','Suppress unreliable metrics; reconsider instrumentation that cannot tie to source outcomes.',{review:['Analytics','Security/IAM/privacy','Product'],soft:[4,5],external:['B05'],confidence:'medium'});
P(7,'Replace technical approval input with bound business evidence','P1','F4|O7|O9',[2],[2,3,4],'HRIS engineering',
 'components/hris/HrisApprovalInbox.tsx|services/hris/approval-inbox.service.ts|services/hris/document-evidence.service.ts|services/hris/operational-time.service.ts',
 'services/hris/__tests__/approval-inbox.service.test.ts|services/hris/__tests__/document-evidence.service.test.ts|services/hris/__tests__/operational-time.service.test.ts',
 'An authorized approver completes an ordinary decision without typing a technical hash.',
 'Select permitted source evidence or approved upload; generate digest and bind decision server-side|Reuse specialized operational-time handling; display reviewer, reason and evidence freshness in plain language|Preserve maker-checker and correction paths across general HR inbox',
 'Valid evidence permits one scoped approval without manual hash entry|Changed source after review is stale and requires rereview; forged evidence, self-approval and foreign employee are denied|Duplicate or concurrent approvals have one durable effect; correction preserves the earlier decision',
 'General inbox UI/action/service evidence binding and stale-version race|EN/FR keyboard and screen-reader approval task',
 'Retain existing hashes/history; add evidence references only if absent. No fake hash backfill. Correct through versioned decisions, not mutation of prior approvals.',
 'At least 80% unassisted approval completion in the role pilot','Invalid approvals; reviewer time; inaccessible evidence','Stop on evidence binding or separation-of-duties regression.',{review:['HRIS/payroll','Audit/evidence','Security/IAM/privacy','UX/accessibility/localization'],soft:[4],confidence:'high'});
P(8,'Deliver one role-aware daily resolution queue','P1','F4|O2',[1,2,4],[3,4,6],'Daily-work engineering',
 'services/daily-habit/daily-habit-digest.service.ts|services/manager-action-center/manager-action-center.service.ts|components/daily-habit/DailyHabitDigestDashboard.tsx|config/sidebar.ts',
 'services/analytics/__tests__/business-pulse.service.test.ts',
 'Owners and managers resolve their most important tasks from one trusted starting route.',
 'Compose service-owned payment discrepancy, receiving/stock problem and missing-close-evidence tasks|Show owner, due time, consequence, freshness and authorized drill-through; resolution updates source|Consolidate proven duplicate navigation with preserved specialist links and role distinctions',
 'Same source exception appears once; successful source action clears or advances it|Concurrent/stale action refreshes rather than silently dismissing unresolved work|Unauthorized role/location cannot see amounts or action; loading, empty, degraded and denied states are distinct',
 'Cross-source dedupe/staleness contract; role-task browser comparison and deep-link regression',
 'Reuse source snapshots; no new universal task database without demonstrated gap. Persist assignments only with version/source IDs; rollback navigation without deleting history.',
 '20% lower median task time and at least 80% unassisted completion','False urgency; duplicate tasks; opt-outs; p75 page response','Stop adding task types if completion does not improve.',{review:['Product','Frontend/design','UX/accessibility/localization','Platform'],soft:[6,7,9,10],confidence:'medium'});
P(9,'Finish the accountant-client evidence work desk','P1','O1',[2,4,5],[3,4,6],'Accounting collaboration engineering',
 'services/accounting/accountant-access.service.ts|services/accounting/accountant-client-invite.service.ts|services/accounting/missing-close-evidence-request-queue-contracts.ts|components/accounting/AccountantPortfolio.tsx',
 'services/accounting/__tests__/accountant-access.service.test.ts|services/accounting/__tests__/accountant-client-invite.service.test.ts|services/accounting/__tests__/missing-close-evidence-request-queue.service.test.ts|services/accounting/__tests__/missing-close-evidence-accountant-review-queue.service.test.ts',
 'Accountants and clients close a specific missing-evidence request without chasing files.',
 'Extend existing portfolio/request/response/review with due dates, assignment, response status and handoff summary|Keep every client grant independent; issue/revoke invitations through reviewed delivery|Do not combine currencies or create another ledger/portal',
 'Request becomes a reviewed response linked to the exact close finding and source version|Revocation/expiry/foreign-client attachment denies access, including cached portfolio and export|Duplicate response is idempotent; stale finding prompts rereview; accepted evidence never self-certifies close',
 'Accountant-to-owner end-to-end handoff with expired/revoked grant and concurrent review|Three-firm/five-clients-each four-week pilot evidence',
 'Extend existing requests only for missing assignment/due metadata. Preserve immutable responses; version references and retain export/consent history.',
 '25% faster median evidence resolution and repeat firm use over four weeks','Support minutes; unauthorized/expired access; currency mixing','Reconsider firm-wide expansion if gains disappear after assisted onboarding.',{review:['Close/accountant','Finance controls','Security/IAM/privacy','Audit/evidence'],soft:[6,8],external:['B05'],confidence:'medium'});
P(10,'Complete one statement-to-ledger reconciliation lane','P1','O3',[1,2],[4,6,9],'Payments and reconciliation engineering',
 'services/payments/statement-import.service.ts|services/payments/payment-reconciliation-workbench.service.ts|services/reconciliation/payment-reconciliation-manual-match.service.ts|services/reconciliation/payment-reconciliation-manual-read.service.ts|services/pos/pos.service.ts',
 'services/reconciliation/__tests__/payment-reconciliation-manual-match.test.ts|services/reconciliation/__tests__/payment-reconciliation-manual-candidates.test.ts|services/reconciliation/__tests__/payment-reconciliation-auto-match.test.ts',
 'A finance operator imports a supported statement, resolves exceptions and exports a reconciled proof trail.',
 'Reuse current manual-match/candidate/remaining-amount fixes; add only uncovered fee/refund/partial-settlement paths|One country/format; user-uploaded statements are the minimum lane, live rail requires separate evidence|Tie sale, supplier or payroll obligation to statement settlement, suspense resolution and sign-off',
 'Duplicate statement/line and concurrent matching cannot allocate an amount twice|Fee, refund, partial payment, reversal and unknown direction reconcile or remain explicit unresolved exceptions|Stale proof invalidates sign-off; foreign organization cannot view/match/export; no unexplained balance difference',
 'Representative provider-format golden files and real database race/rollback/tie-out|Workbench browser recovery, exact export lineage and partial provider failure drill',
 'Preserve immutable statement originals and allocation lineage. Repair via approved reversals/replay; never delete financial evidence. New format metadata is additive with dry-run reconciliation.',
 '30% lower operator minutes per reconciled period','False accepted match; unexplained residual; rail support cost','Any unexplained mismatch blocks expansion; drop a costly rail that lacks useful demand.',{review:['Payments','Finance controls','Database','Close/accountant'],soft:[5,6],external:['B02','B04'],wait:[2,4,8],confidence:'medium'});
P(11,'Establish release operations and recoverability for pilot workflows','P0','F5|O2|O3',[2],[3,4,6],'SRE and release engineering',
 'scripts/prisma-local-restore-rehearsal.js|scripts/build-app-safe.js|services/pos/offline-sync.service.ts|services/payments/payment-reconciliation-workbench.service.ts|package.json',
 'services/pos/__tests__/offline-sync.service.test.ts',
 'Operators can detect, contain and recover pilot failures with known service and data-loss targets.',
 'Inventory current deployment/worker/backup tooling before adding infrastructure|Agree per-workflow service targets, alert owner, bounded retries, tracing and cost budget|Rehearse backup/restore and release rollback in an isolated target; resolve packaging/environment failures with current evidence',
 'Database/worker interruption produces recoverable state and no duplicate financial effects|Restored data and queue replay reconcile to pre-failure source counts and totals|Alert reaches accountable operator; wrong target or missing backup proof blocks a production claim',
 'Isolated restore and post-restore ledger/stock tie-out; staging failover and bounded load evidence|Current release packaging check after inspecting safe commands, not production migrations',
 'Backup encryption, retention and restore access reviewed. RPO/RTO proposals become obligations only after business agreement and demonstrated recovery.',
 'Demonstrated agreed RPO/RTO and no silent lost business events','Alert noise; recovery labor; hosting/worker cost','Do not increase cohort until recovery and support targets can be met.',{review:['SRE','Security/IAM/privacy','Quality/release','Database'],external:['B04','B08'],soft:[4],confidence:'medium'});
P(12,'Validate and pilot the first three product workflows','P2','O1|O2|O3',[5,6,8,9,10,11],[2,3,5],'Product pilot owner',
 'what-next/2026-09-06-ohada-product-competitive-audit.md|services/accounting/accountant-access.service.ts|services/daily-habit/daily-habit-digest.service.ts|services/payments/payment-reconciliation-workbench.service.ts',
 'services/accounting/__tests__/accountant-access.service.test.ts|services/reconciliation/__tests__/payment-reconciliation-manual-match.test.ts',
 'The first cohort proves useful repeated work before adjacent features and commercial expansion.',
 'Internal rehearsal then named allowlisted cohort; consent, role onboarding and accountable support|Run initial workflow accessibility/security/recovery checks before invitation|Observe four weeks of task outcomes; distinguish validated build, pilot approval and customer value',
 'Each O1/O2/O3 job completes unassisted within its scoped role with intact proof and controls|Pilot stops on privacy incident, false accepted match or unexplained financial discrepancy|No source-only or mocked pass is represented as production or retention evidence',
 'Current-candidate browser/access/export matrix; controlled failure recovery; four-week cohort scorecard',
 'Isolate synthetic and real cohorts. Minimize event data; preserve consent and exported evidence on exit.',
 'Audit O1/O2/O3 target improvements with credible denominators','Support time, reliability incidents and coached completion','Keep valuable standalone workflows; revise collaboration hypothesis if repeated useful work is absent.',{kind:'validation',review:['Quality/release','Product','Change/support','Security/IAM/privacy','Finance controls'],external:['B04','B05'],wait:[4,4,6],confidence:'medium'});
P(13,'Extend supplier responses through receiving and invoice review','P2','F5|O4',[2,5],[3,4,6],'Purchasing/AP engineering',
 'services/purchase-order/supplier-po-acknowledgement.service.ts|components/purchase-orders/SupplierPoAcknowledgementWorkbench.tsx|services/purchase-order/purchase-order.service.ts|services/purchasing/ap-control.service.ts',
 'services/purchase-order/__tests__/supplier-po-authority-boundary.test.ts|services/purchase-order/__tests__/supplier-po-proposal-retry.test.ts',
 'A supplier confirms a PO and submits delivery/invoice evidence that the buyer can safely review.',
 'One delivery/invoice response type plus existing acknowledgement/proposal lifecycle|Map accepted buyer decisions into current inspection/receiving/AP controls; preserve no-account response|Instrument repeated order exchanges; optional multi-buyer inbox remains conditional',
 'Supplier submits response; authorized buyer reviews; only internal services post stock/AP|Revoked link, replay, stale PO version and duplicate invoice yield safe visible outcomes|Two buyers sharing supplier never see each other prices or volumes; partial receipt follows inspected quantity',
 'Supplier-to-buyer-to-receipt/AP browser and database integration|Five-buyer/ten-supplier repeat-order pilot and fields-rekeyed sample',
 'Add typed response/evidence metadata through existing proposal tables; no public identity merge. Preserve accepted/rejected decisions and originals; correction is a new reviewed proposal.',
 '25% faster acknowledgement and 50% fewer fields re-entered','Disputes; rejected/duplicate proposals; attachment cost','Do not build a cross-buyer inbox until repeat multi-buyer use appears.',{review:['Purchasing/AP','Security/IAM/privacy','Inventory/offline','APIs/events'],soft:[6,12],external:['B05'],confidence:'medium'});
P(14,'Complete customer statement dispute and promise resolution','P2','O6',[2,5,10],[3,4,6],'Receivables engineering',
 'services/accounting/customer-statement.service.ts|services/accounting/customer-statement-delivery.service.ts|services/accounting/customer-receivable-lifecycle.service.ts',
 'services/accounting/__tests__/customer-statement-recipient-action.service.test.ts|services/accounting/__tests__/customer-statement-delivery.service.test.ts|services/accounting/__tests__/customer-receivable-lifecycle.service.test.ts',
 'A customer understands a balance, disputes a line or gives a payment reference, and sees a reviewed outcome.',
 'Reuse immutable statements, recipient actions, consent and settlement/reversal services|One transactional channel; aging priorities, dispute owner, promises and receipt status|Accounts optional for narrow response; verified payment links only as a later channel decision',
 'Promise is not cash; only reviewed settlement evidence changes receivables|Duplicate reference, stale statement, reversed settlement and partial failure preserve the original balance trail|Wrong recipient, expired/revoked token and foreign-customer access disclose no statement data',
 'Extend existing statement/recipient/settlement tests only for uncovered outcomes|End-to-end dispute-to-review-to-correction and four-week comparable account groups',
 'Preserve snapshots; append outcomes, never rewrite issued statement history. Reconcile event delivery and receipts; invalidate links on revocation without deleting lawful records.',
 '20% faster dispute resolution with improved promise-kept rate','Complaints; opt-outs; incorrect balances; collector time','Stop reminders that raise complaints without measurable useful outcomes.',{review:['Finance controls','Close/accountant','Security/IAM/privacy','Change/support'],soft:[6,12],external:['B05'],confidence:'medium'});
P(15,'Complete reviewed payroll version and readiness workflow','P2','F3|O7',[2,3,7],[3,5,8],'Payroll engineering',
 'services/payroll/payroll-tax-rule-evaluator.ts|services/payroll/payroll-control.service.ts|services/hris/payroll-readiness-contract.ts|services/payroll/payment-reconciliation.service.ts',
 'services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts|services/hris/__tests__/payroll-readiness-contract.test.ts',
 'The supported employer scope has an explainable, versioned path from approved inputs to payroll obligations.',
 'Resolve qualified review findings for one Cameroon pack/profile/effective period|Tie input readiness, freeze, calculation, approval, posting, payment and declaration expectations to reviewed version|Plain-language variance/readiness and unsupported-state UX; preserve fail-closed gates',
 'Reviewed gross/net/contribution fixtures tie to approved HR inputs and ledger obligations|Stale input or changed rule version invalidates downstream approval and demands authorized correction|Duplicate/concurrent calculate/post does not duplicate obligations; self-approval and foreign employee access denied',
 'Expert fixture pack, frozen-input/version invalidation, posting race and correction lineage|No production promotion until exact source approval and current candidate proof',
 'Version effective-dated packs and inputs; immutable frozen payroll. No overwrite of prior runs; migrate/backfill only through reconciled, reviewed correction workflows.',
 'Zero unexplained reviewed calculation or ledger difference','Unreviewed cases; manual correction burden; review latency','Remain unsupported if approval or a material expected result is missing.',{review:['HRIS/payroll','Country statutory','Finance controls','Audit/evidence'],external:['B01','B04'],confidence:'low'});
P(16,'Prove two complete payroll cycles and operational ownership','P3','F3|O7',[10,11,15],[2,3,5],'Payroll release owner',
 'services/payroll/payroll-control.service.ts|services/payroll/payment-reconciliation.service.ts|services/payroll/payslip-self-service.service.ts|services/payroll/declaration-lifecycle.service.ts',
 'services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts|services/hris/__tests__/payroll-readiness-contract.test.ts',
 'Payroll users finish two reviewed cycles with correct payslips, ledger, settlement and declaration evidence.',
 'Run two parallel/rehearsal cycles with qualified reviewer and allowed evidence channels|Reconcile net pay to ledger/payment/declaration; include a corrected payslip and rejected payment|Document payroll-calendar support and manual receipt fallback for unproven submissions',
 'No unexplained net-pay, posting, settlement or declaration difference across both cycles|Duplicate settlement/declaration retry and provider timeout do not claim success without evidence|Employee sees only own payslip; changed or revoked access and stale evidence fail safely',
 'Reviewer-attested cycle workbooks plus source references, provider/receipt evidence and exception drill',
 'Retain versioned payroll/receipts under declared employment-record policy. Use reversals/correction runs; no deletion rollback of completed payroll.',
 '25% less preparation effort across two cycles with zero unexplained variance','Corrections; disputed payslips; privacy failures; support cost','Any material unexplained variance stops live expansion.',{kind:'validation',review:['Country statutory','HRIS/payroll','Payments','Quality/release','Change/support'],external:['B01','B02','B04','B05'],wait:[8,8,12],confidence:'low'});
P(17,'Deliver a deterministic 13-week cash forecast','P3','O5',[1,10,14],[4,5,7],'Finance planning engineering',
 'services/cash-command/cash-command.service.ts|services/accounting/customer-receivable-lifecycle.service.ts|services/payroll/payroll-control.service.ts',
 'services/analytics/__tests__/analytical-context-contracts.test.ts',
 'An owner can explain a future cash shortfall from dated obligations and explicit assumptions.',
 'Extend Cash Command with thirteen weekly buckets, actual/committed/expected/unknown categories|Trace AR/AP and approved payroll/tax obligations; make missing coverage conspicuous|Unsaved transparent assumptions first; saved scenario approval and predictive AI deferred',
 'Opening cash plus dated movements reconciles to closing cash in each bucket without cross-currency sum|Partial payment, changed due date and duplicate obligation do not double count|Missing payroll or stale source blocks a complete forecast claim; role access exposes aggregates only',
 'Bucket golden fixtures, coverage/unknown-state and forecast-to-actual reconciliation|Three owners/accountants compare four subsequent weekly buckets to spreadsheet baseline',
 'Derived projection with versioned inputs; preserve assumption/source snapshots. Rebuild derived results on correction; no posting or autonomous payment writes.',
 'At least 80% traceable committed outflows plus demonstrated decision usefulness','Omitted liabilities; forecast error; false confidence; support time','Reconsider if input coverage cannot sustain a meaningful forecast.',{review:['Finance controls','Analytics','Security/IAM/privacy'],soft:[15,16,21],external:['B05'],wait:[4,4,6],confidence:'low-medium'});
P(18,'Deliver cash-aware transfer and replenishment proposals','P3','O8',[1,17,22],[4,5,7],'Inventory engineering',
 'services/inventory/inventory-read.service.ts|services/stock-to-cash/stock-to-cash-flow.service.ts|services/purchase-order/purchase-order.service.ts',
 'services/pos/__tests__/offline-sync.service.test.ts',
 'A stock manager can choose transfer, purchase or wait using reliable stock and an approved cash limit.',
 'Deterministic demand/lead-time assumptions, reservations, incoming stock and confidence|Prioritize surplus transfer then bounded purchase; explain each proposed quantity|Use existing approval/stock/PO services; no automatic ordering',
 'Proposal explains available/reserved/incoming/unreliable quantities and budget consumption|Concurrent sale, transfer or receipt stales proposal and requires revalidation|Cross-location denial, duplicate acceptance and interrupted execution cannot create extra stock or commitment',
 'Inventory snapshot-to-proposal and transactional approval tests|Twenty frequently sold items/two sites shadow trial against matched baseline',
 'Keep proposals separate from stock truth; version assumption and source snapshots. Reconcile any new fields; cancel unaccepted proposals on rollback, correct accepted movements through established controls.',
 'Fewer stockout-days without higher average tied-up inventory value','Expiry; false suggestions; transfer burden','Stop expansion when bad stock data dominates recommendations.',{review:['Inventory/offline','Purchasing/AP','Finance controls','Analytics'],soft:[13,21],external:['B05'],wait:[4,4,8],confidence:'low-medium'});
P(19,'Complete mobile employee and manager self-service tasks','P2','F4|O9',[2,4,7],[2,3,5],'HRIS frontend engineering',
 'services/hris/self-service.service.ts|services/hris/manager-self-service.service.ts|services/hris/operational-time.service.ts|services/payroll/payslip-self-service.service.ts',
 'services/hris/__tests__/self-service.service.test.ts|services/hris/__tests__/manager-self-service.service.test.ts',
 'Employees request leave/time correction and read payslips; managers approve their scoped requests on ordinary phones.',
 'Improve existing low-bandwidth responsive web journeys and status recovery|Safe minimal draft recovery, current-auth sensitive approvals, account recovery/device privacy|Preserve useful leave/profile flow independently of unsupported payroll automation',
 'Ten employees/five managers complete the three chosen tasks with at least 90% unassisted success|Interrupted submission resumes without duplicate request or lost acknowledged work|Manager scope change and shared device do not reveal payroll; no offline payroll approval or sensitive local cache',
 'Normal-phone slow/interrupted-network, keyboard and screen-reader task evidence in EN/FR|Wrong-person payslip and manager reassignment tests',
 'Minimize local drafts and clear on logout/identity change; server remains authority. Preserve submitted requests and payslip export history.',
 '90% task completion and fewer HR support requests','Wrong-person access; duplicate/lost requests; manager workload','Stop rollout on privacy regression; remove pointless daily notifications.',{review:['UX/accessibility/localization','HRIS/payroll','Security/IAM/privacy','Frontend/design'],soft:[15,16],external:['B05'],confidence:'medium'});
P(20,'Prepare migration samples and source-to-target contracts','P0','O10',[],[1,2,3],'Data migration lead',
 'services/onboarding/master-data-import.service.ts|services/onboarding/master-data-csv.ts|config/master-data-onboarding.ts|services/hris/migration-backfill-pilot.service.ts',
 'services/onboarding/__tests__/master-data-import-guards.test.ts|services/onboarding/__tests__/master-data-csv.test.ts',
 'An accountant can establish whether a proposed business migration is feasible before cutover work starts.',
 'Obtain three anonymized sample exports with explicit permission; choose one spreadsheet/export format and profile|Reuse CUSTOMER/SUPPLIER/ITEM staging; map stock/AR/AP/payroll opening obligations to authoritative owners|Define rejection reasons, originals/mapping retention, reconciliation equations and cutover boundary',
 'Every mapped field has meaning, source and destination; unsupported data is reported, not silently dropped|Three sample datasets include corrupt/duplicate rows and opening quantity/balance expectations|No import, approval or sample permission is inferred from a file name',
 'Sample completeness/mapping review by accountant and domain owners; dry-run golden manifest',
 'No opening financial writes. Use anonymized samples, immutable originals/checksums and a deletion/retention schedule.',
 'Feasibility and accountable mappings for three samples','Manual cleanup hours; missing source history','Choose assisted migration if automation costs more than bounded support.',{kind:'discovery',review:['Database','Finance controls','HRIS/payroll','Change/support'],external:['B05','B06'],wait:[1,2,6],confidence:'low-medium'});
P(21,'Deliver guided opening-balance proof and reversible cutover','P3','O10',[1,2,10,20],[4,6,9],'Data migration engineering',
 'services/onboarding/master-data-import.service.ts|services/hris/migration-backfill-pilot.service.ts|services/inventory/inventory-read.service.ts|services/accounting/customer-receivable-lifecycle.service.ts',
 'services/onboarding/__tests__/master-data-import-guards.test.ts|services/onboarding/__tests__/master-data-control-boundary.test.ts|services/hris/__tests__/migration-backfill-pilot.service.test.ts',
 'A business switches with reconciled opening stock, receivables, payables and supported payroll obligations.',
 'Guide source file, validation, staging, review and authoritative opening entries|Accountant approves zero unexplained differences and preserved originals/mappings|Dry-run and cutover rehearsal with rollback/re-entry plan; templates reusable only after validation',
 'Three sample migrations reconcile every in-scope balance/quantity; unsupported records remain visible|Duplicate commit and interrupted batch resume without extra opening entries|Concurrent post-cutover activity blocks naive rollback; restore/replay or authorized reversal preserves subsequent work and exports',
 'Disposable database migration/rehearsal with record counts, sums, rejected-row manifest and recovery proof|First useful task within one working day after clean input is available',
 'Never bulk-insert accounting truth. Stage additive metadata, use domain services, freeze source boundary and preserve history. Reconcile backfills before activation; no destructive restore over later transactions.',
 'Zero unexplained differences and time-to-first-value within one working day of clean input','Correction/support hours; dropped history','Keep assisted narrow coverage when automated template support is uneconomic.',{review:['Database','Finance controls','Inventory/offline','HRIS/payroll','Audit/evidence'],soft:[15,19],external:['B04','B05'],confidence:'low-medium'});
P(22,'Verify supported offline POS and stock recovery boundaries','P2','O3|O8',[1,11],[2,3,5],'POS/inventory engineering',
 'services/pos/offline-sync.service.ts|services/pos/pos.service.ts|services/inventory/inventory-read.service.ts',
 'services/pos/__tests__/offline-sync.service.test.ts',
 'The stock and cash foundations remain reliable through documented supported connectivity failures.',
 'Inventory existing replay guarantees and explicitly list supported offline actions|Test device sequence, stale authorization, inventory conflicts and reconnect recovery|Repair only demonstrated gaps; do not add offline payroll/payment approval',
 'Repeated and out-of-order replay produces one authoritative sale/stock/ledger effect|Revoked device, stale price or insufficient stock follows declared conflict policy with visible operator recovery|Partial commit/reconnect never silently loses acknowledged work or labels pending work finalized',
 'Real supported-device/slow-network field rehearsal; transaction rollback and evidence count tie-out',
 'Preserve device/event sequence and replay history; reconcile caches to server. Quarantine ambiguous events, no blind local reset or duplicate import.',
 'No unexplained stock/ledger difference after documented replay scenarios','Unresolved queue age; operator recovery burden','Narrow supported offline scope if reliable recovery cannot be demonstrated.',{review:['Inventory/offline','Backend/integration','SRE','Finance controls'],external:['B04','B05'],confidence:'medium'});
P(23,'Verify consistent professional UX, accessibility and EN/FR','P3','F4|O1|O2|O3|O4|O5|O6|O7|O8|O9|O10',[8,9,13,14,15,17,18,19,21],[3,4,6],'UX assurance lead',
 'config/sidebar.ts|components/DataTableComponents/table-system-contract.ts|components/DataTableComponents/table-system-registry.ts|components/hris/HrisApprovalInbox.tsx',
 'services/hris/__tests__/self-service.service.test.ts',
 'All scoped jobs feel coherent and remain usable across language, device and ability.',
 'Cross-workflow acceptance audit using existing design/table primitives; fix only observed inconsistencies|Keyboard/focus/screen-reader tasks, contrast/zoom/reflow and complete EN/FR states|Verify deep links, empty/loading/denied/degraded/retry states and plain-language evidence',
 'Every scoped critical job is completed by keyboard and screen reader in EN/FR on agreed desktop/mobile matrix|Navigation consolidation preserves specialist completion, history, permissions and exports|No technical hash input is needed for routine approval; failures preserve user work and provide an actionable next step',
 'Manual accessibility task record plus appropriate automated checks; representative visual regression and terminology review|Service tests listed are baseline only and cannot pass this UX gate',
 'Preserve preferences and deep links; version any URL/state changes. Rollback a navigation change without deleting domain workflows.',
 'No unresolved critical usability/accessibility blocker for any scoped job','Task-time regression; support confusion; localization drift','Hold affected workflow expansion until the blocking task is usable.',{kind:'assurance',review:['UX/accessibility/localization','Frontend/design','Quality/release','Change/support'],soft:[4,12],external:['B04','B05'],confidence:'medium'});
P(24,'Validate packages, entitlement transitions and unit economics','P3','F2|F5|O1|O2|O3|O4|O6|O7|O9|O10',[2,6,12],[2,3,5],'SaaS product owner',
 'services/modules/module-entitlement.service.ts|services/modules/module-navigation.service.ts|services/modules/module-stop-policy.service.ts|services/referrals/referral-funnel-read-model.service.ts',
 'services/modules/__tests__/module-entitlement.service.test.ts|services/modules/__tests__/module-stop-policy.service.test.ts',
 'Buyers understand the offer and can change packages without losing control of continuing obligations.',
 'Test core daily queue, finance/reconciliation, procurement, firm/client and active-employee pricing hypotheses|Keep narrow employee/counterparty responses and lawful exports useful; price assisted migration transparently|Measure provider/delivery/support/hosting/country-maintenance cost per completed workflow',
 'Enable, downgrade, expiry, cancellation and reactivation follow durable authority and documented retained access|Billing event replay cannot grant direct access; package removal preserves evidence/continuing obligations|At least a concrete workflow/package comparison informs pricing; no invented willingness-to-pay or revenue projection',
 'Lifecycle transition matrix plus customer offer tests and support cost ledger',
 'No billing-provider schema rewrite. Version package policies and grandfathering; retain grant/event history and reversible pilot entitlements.',
 'Measured cost-to-serve and validated package comprehension','Access-related tickets; blocked narrow participation; margin erosion','Revise price/scope if useful work cannot cover ongoing support cost.',{review:['SaaS packaging','Product','Security/IAM/privacy','Change/support'],external:['B06'],soft:[13,14,16,19,21],confidence:'low-medium'});
P(25,'Finish privacy, exports, training and support operations','P3','F4|F5|O1|O3|O4|O6|O7|O9|O10',[5,11,12],[3,4,6],'Customer operations owner',
 'services/accounting/accountant-access.service.ts|services/accounting/customer-statement-delivery.service.ts|services/payroll/payslip-self-service.service.ts|services/onboarding/master-data-import.service.ts',
 'services/accounting/__tests__/accountant-access.service.test.ts|services/hris/__tests__/self-service.service.test.ts',
 'Customers can onboard, get help, recover access and export their work with accountable support.',
 'Role-based quick starts and assisted migration playbook; EN/FR payroll-calendar/provider escalation coverage|Purpose/retention/export/revocation inventory and wrong-recipient/abuse incident drill|Support rota, costs, release notes, restore contacts and authorized exit workflow',
 'Consented user retrieves authorized exports and revokes access without cross-client/employee disclosure|Support resolves a failed invitation, disputed statement and payroll exception using redacted evidence|Retention/deletion respects required audit history; incident drill records owner and actual recovery evidence',
 'Export/revoke/retention access tests and support tabletop; pilot tickets reconciled to source outcomes',
 'Document retention by data class with qualified review where required; minimize support copies. Preserve lawful records while revoking access; tested export and exit path.',
 'Support response and cost within agreed pilot capacity','PII in tickets; unresolved incidents; export failure','Pause cohort expansion if support or data-exit obligations cannot be met.',{review:['Change/support','Security/IAM/privacy','Audit/evidence','SRE'],external:['B04','B06'],soft:[16,19,21,24],confidence:'medium'});
P(26,'Test repeated collaboration and genuine network value','P3','F5|O1|O4|O6',[6,9,12,13,14,25],[2,3,5],'Product experimentation lead',
 'services/referrals/referral-funnel-read-model.service.ts|services/accounting/accountant-access.service.ts|services/purchase-order/supplier-po-acknowledgement.service.ts',
 'services/referrals/__tests__/referral-funnel-read-model.service.test.ts',
 'The team knows whether more participants improve outcomes for existing relationships.',
 'Observe at least ten real repeated collaborations and eight weeks of cohort outcomes|Within-firm and shared-supplier existing-link analysis controlling task mix, staffing and onboarding assistance|User-initiated recommendation after verified useful outcome; no automatic outreach or paid referral incentives',
 'Invitation, delivery, first task, repeat, organization activation and retention remain separate denominator-linked stages|Existing-client or existing-buyer outcomes improve as independently consented active relationships grow, or network claim is rejected|No cross-company prices, payroll or identifiable small-cohort metrics are shared; exports remain usable',
 'Preregistered cohort design, source-event reconciliation, sensitivity/confounder report and decision packet',
 'Purpose-limited aggregate research dataset; independent relationship grants, retention schedule and suppressible outputs. No global identity graph or public ranking.',
 'Improvement on existing links plus retained productive organizations','Support cost; concentration; spam; biased attribution','If only signups grow, report distribution; preserve standalone value and stop network expansion claims.',{kind:'experiment',review:['Analytics','Product','Security/IAM/privacy','SaaS packaging'],external:['B05'],wait:[8,8,12],confidence:'low'});
P(27,'Complete integrated enterprise release assurance','P4','F1|F2|F3|F4|F5|O1|O2|O3|O4|O5|O6|O7|O8|O9|O10',[16,18,19,21,22,23,24,25,26],[4,6,9],'Release assurance owner',
 'package.json|scripts/build-app-safe.js|scripts/statutory-country-pack-production-gate.js|prisma/schema.prisma|what-next/workflow-modernization/2026-09-05-run-01/COMPLETION_AUDIT.md',
 'services/modules/__tests__/module-transport.integration.test.ts|services/reconciliation/__tests__/payment-reconciliation-manual-match.test.ts|services/pos/__tests__/offline-sync.service.test.ts',
 'The defined ten-opportunity release has current-candidate correctness, security, recovery and operating evidence.',
 'Bind source, schema, config, provider/country versions and environment to every release artifact|Integrate complete workflow chain, access matrix, failure drills, migrations/restore and scoped performance checks|Reconcile overlapping modernization program evidence; resolve current failures rather than inheriting old pass/fail claims',
 'All package validation and applicable production gates have current evidence, reviewer and version|Cross-workflow interruption, duplicate/concurrent request, stale evidence, tenant isolation and corrections satisfy controls|No critical unresolved defect, missing country approval or unproven provider action is waived by date or aggregate test count',
 'Current-candidate scoped integration/database/browser/accessibility/load/restore and release packaging results|Independent controls review and per-lane production entry decision',
 'Consolidated migration rehearsal and recovery manifest; data/queue count and monetary tie-out. No irreversible switch until recovery evidence; preserve all prior artifacts.',
 'All scoped production-entry gates evidenced with accountable operating owners','Escaped critical defect; stale artifact; unresolved workflow','Hold only affected lanes when separable; full program remains incomplete while a required lane is blocked.',{kind:'assurance',review:['Quality/release','Platform','Security/IAM/privacy','Database','SRE','Finance controls','Country statutory'],external:['B01','B02','B03','B04','B08'],confidence:'medium'});
P(28,'Measure final value and transfer ongoing ownership','P4','O1|O2|O3|O4|O5|O6|O7|O8|O9|O10',[27],[1,2,3],'Product operations owner',
 'what-next/2026-09-06-ohada-product-competitive-audit.md|services/referrals/referral-funnel-read-model.service.ts',
 'services/referrals/__tests__/referral-funnel-read-model.service.test.ts',
 'Each released workflow has a value decision, support owner and sustainable next step.',
 'Review week-4/week-8 productive retention or two payroll cycles per eligible cohort|Measure opportunity-specific target, countermetric and support economics; account for unsuccessful experiments|Publish keep/improve/stop decisions, country/provider maintenance calendar and operational handover',
 'Every opportunity has observed outcome evidence or an explicit inconclusive/negative result with decision|Production readiness never substitutes for product value; network claims require package 026 evidence|Customers retain exports and useful narrow participation after pilot or package changes',
 'Final source-backed scorecard, cohort eligibility audit, support handover and decision log',
 'Archive minimized experiment evidence with provenance; retain authorized customer records and exports. Do not erase failed pilot evidence.',
 'Retained organizations complete expected work with measurable time/error benefit','Support economics; customer complaints; unsupported claims','Reconsider or stop an unsuccessful feature without declaring its value target achieved.',{kind:'experiment',review:['Product','SaaS packaging','Change/support','Analytics'],external:['B05'],wait:[4,8,12],confidence:'low'});

const gates=[
 ['G01','Candidate and source binding','Current commit plus changed-file hashes, schema/config versions and evidence timestamp; unrelated concurrent edits reconciled.','Quality/release'],
 ['G02','Business correctness','Reviewed monetary/quantity/time/recognition fixtures and source tie-out; zero unexplained differences.','Finance controls'],
 ['G03','Access and privacy','Tenant/object/role/location/module matrix including exports, revocation and denied zero reads; appropriate fresh auth and separation of duties.','Security/IAM/privacy'],
 ['G04','Complete resilient workflow','Positive, correction, duplicate, concurrent, stale-evidence and partial-failure paths pass with source-owned outcomes.','Backend/integration'],
 ['G05','External channel proof','Named country/channel configuration, destination consent, sandbox delivery/unknown/retry evidence, support and limits. Manual import/sharing does not clear a live-channel claim.','APIs/events'],
 ['G06','Qualified country scope','Version/effective-date-specific qualified review, permitted employer scope and two-cycle proof; automation only for evidenced channels.','Country statutory'],
 ['G07','Operations and recovery','Demonstrated recovery targets, current release packaging, queue/backup/restore, alerts, cost budget and accountable operator.','SRE'],
 ['G08','Usable EN/FR and accessibility','Critical scoped tasks pass manual keyboard/screen-reader and agreed device/language matrix; no unresolved task-blocking issue.','UX/accessibility/localization'],
 ['G09','Data and history','Reconciled migration/backfill where present; provenance, retention, authorized exports and safe correction/recovery.','Database'],
 ['G10','Pilot entry','Named consenting cohort, current candidate G01-G04/G07-G09 plus relevant G05/G06, first-task onboarding, limits, support and rollback owner.','Product'],
 ['G11','Commercial production entry','Pilot evidence and operational owner; scope, package transitions, support economics, current applicable gates and release decision.','SaaS packaging'],
 ['G12','Observed value','Baseline and denominator-bound outcome/countermetric, week-4/week-8 or two-cycle evidence, and keep/revise/stop decision. Negative/inconclusive evidence cannot pass a positive value target.','Product']
].map(([id,title,evidence,owner])=>({id,title,required_evidence:evidence,owner,status:'NOT_VERIFIED_BY_THIS_PLANNING_RUN'}));
const blockers=[
 ['B01','QUALIFIED_REVIEW','Country reviewer availability and approved Cameroon pack/profile','Payroll product owner with qualified country reviewer',[3,15,16,27],'Dated source/version decision, employer applicability, expected calculations and accepted evidence channels','2–8 weeks for initial review; further corrections and two monthly cycles may extend this','Keep unsupported automation blocked; preserve lawful manual evidence and operational HR utility','Prepare packet, fixtures, UX and HR/mobile work.'],
 ['B02','PROVIDER_EVIDENCE','Named payment/provider lane and settlement/declaration proof','Payments integration owner',[10,16,27],'One supported statement specification and representative signed/sanitized samples; sandbox/contract evidence before live rail','2–8 weeks assumed; no guaranteed upper bound','User-uploaded statements and independently verifiable manual receipts; do not claim live automation','Build imports, matching, exception handling and proof exports.'],
 ['B03','ENVIRONMENT_PROVIDER','Transactional delivery infrastructure and verified destinations','Integration and SRE owners',[5,9,13,14,27],'Verified channel, worker, consent, unknown/retry/delivery receipt and suppression drill','1–6 weeks assumed','Copy links/manual sharing with accurate unverified-delivery status; live delivery remains open','Build outbox state machine and synthetic recipient flows.'],
 ['B04','ENVIRONMENT','Candidate-bound test environment, operator access and representative load','QA/release and SRE owners',[5,10,11,12,15,16,21,22,23,25,27],'Isolated database, authenticated roles, fake/sandbox providers, restore target, phone/network matrix; no production credentials assumed','1–3 weeks setup estimate','Mocked and source tests only; no production gate claim','All code/contracts/design and local safe tests.'],
 ['B05','PRODUCT_EVIDENCE','Consented pilot participants, baselines and migration samples','Product/customer success owner',[4,6,9,12,13,14,16,17,18,19,20,21,22,23,26,28],'Named consenting firms/businesses/users, three anonymized migration datasets, baseline task samples and event denominators','1–6 weeks recruitment; 4–8+ weeks observation after delivery','Assisted synthetic demos; label value and network results unverified','Build independently useful workflows and measurement contracts.'],
 ['B06','BUSINESS_DECISION','Initial segment, employer scope, staffing, support and package policies','Executive sponsor/product owner',[3,4,20,24,25],'Confirm or revise Cameroon inventory-led SME assumption, team allocation, country/profile, support hours and package experiment boundaries','Decision in week 1 proposed; not an approval already granted','Plan against declared assumptions; narrow cohort or extend schedule if capacity differs','Discovery, correctness/access fixes and review-packet preparation.'],
 ['B07','PRODUCT_POLICY','Metric and retained-access policy ownership','Finance owner and platform product owner',[1,2],'Reuse AN-D03/04/11/12 inputs; choose source-recognition, currency eligibility/rounding, period policy and exact module retention rules','Target first 3 working days; review turnaround is an assumption','Implement policy-independent fixes/tests; mark disputed metrics unsupported instead of guessing','Reproduce defects, inventory entry points and prepare concrete contract diffs.'],
 ['B08','ENGINEERING_ENVIRONMENT','Current release packaging and cross-program integration evidence','Release engineering owner',[11,27],'Recheck current candidate; September 5 modernization report says Windows standalone packaging failed despite compilation; resolve actual remaining failure','1–3 weeks if reproduced; re-estimate from diagnosis','Continue scoped work and local verification; no overall release pass','All independent domain slices and pilot preparation.']
].map(([blockerId,type,title,owner,nums,evidence,lead,fallback,independent])=>({id:blockerId,type,title,owner,packages:nums.map(id),resolution_evidence:evidence,lead_time:lead,fallback,independent_work:independent,status:'OPEN_OR_UNVERIFIED'}));
const findings=[
 ['F1','CONFIRMED_OPEN','Fresh source-hashed reproduction still returns 1,000/2 for completed 100 plus draft 900. Business Pulse currency/time defaults persist. Existing context normalizer and new daily-sales service are reusable, not runtime closure of this path.',[1]],
 ['F2','CONFIRMED_OPEN','Fresh wrapper reproduction still calls downstream read for RBAC-authorized disabled analytics. The exact wrapper/catalog source hashes match the audit; durable grants/navigation already exist.',[2]],
 ['F3','CONFIRMED_OPEN','Fresh static gate is blocked; 11/12 checks and expert approval absent. Static registry CM only; deployed pack inventory and legal scope remain unverified.',[3,15,16]],
 ['F4','CONFIRMED_OPEN','Manual Approval evidence hash remains at HrisApprovalInbox.tsx:353; multiple operating entries remain. Ownership/design and table work already exists. Screen redundancy/abandonment still requires task evidence.',[4,7,8,19,23]],
 ['F5','PARTIALLY_RESOLVED','Participation tokens, buyer review, richer accountant/customer delivery and registration attribution exist. Supplier issue event still has empty outbox; referral scope remains ALL_TIME. Delivery and retained task outcome chain remain unverified.',[5,6,9,13,14,26]]
].map(([id,status,evidence,nums])=>({id,status,evidence,packages:nums.map(n=>`STQ-RM-${String(n).padStart(3,'0')}`),deployed_behavior:'UNVERIFIED'}));
const recs=[];
function R(source,suffix,outcome,nums) {recs.push({id:`${source}-${suffix}`,source,outcome,packages:nums.map(id),source_location:source.startsWith('F')?`Audit section 4 / ${source}`:source.startsWith('O')?`Audit section 5 / ${source}`:source==='S'?'Audit sections 6–9':'Execution prompt acceptance dimensions'});}
R('F1','01','Define recognized event, returns/refunds, effective dates and source lineage',[1]); R('F1','02','Use tenant currency, local period, location scope and decimal precision',[1]); R('F1','03','Correct dependent callers and prove finalized/draft/return/day-boundary fixtures',[1,27]);
R('F2','01','Bind three analytics surfaces and all feeding actions/exports to durable module authority',[2]);R('F2','02','Prove enabled/absent/disabled/expired/read-only/wildcard behavior and denied zero reads',[2]);R('F2','03','Keep provider billing separate from entitlement and preserve retained access',[2,24]);
R('F3','01','Review exact Cameroon pack, dates and supported employer profile',[3,15]);R('F3','02','Tie two payroll cycles from inputs through settlement/declaration/ledger proof',[16]);R('F3','03','Keep unsupported country/channel behavior explicit and fail closed',[3,15,16,25]);
R('F4','01','Select role-aware starting route using observed task evidence',[4,8]);R('F4','02','Replace manual hashes with server-bound source evidence',[7]);R('F4','03','Preserve reviewer identity, maker-checker, specialist routes/history/exports',[7,8,23]);R('F4','04','At least 80% unassisted role task/approval success without specialist regression',[4,7,8,23]);
R('F5','01','One consented transactional channel with delivery/unknown/retry/revocation status',[5]);R('F5','02','Separate meaningful first/repeat/retained activity from all-time registration conversion',[6,26]);R('F5','03','Bound supplier responses to proposals and buyer-reviewed outcomes',[13]);R('F5','04','Require ten repeated real collaborations and no disclosure before expansion',[26]);
R('O1','01','Reuse grants, portfolio and evidence requests; due dates/assignment/status/handoff',[9]);R('O1','02','Independent client grants, no cross-currency sum, consent/revocation',[2,9]);R('O1','03','Three firms/five clients each; 25% faster resolution and four-week repeat use',[12,26]);R('O1','04','Test firm/client offer and persistent value after assistance ends',[24,26,28]);
R('O2','01','Three initial source task types with owner, due time, consequence, freshness and action',[8]);R('O2','02','Source resolution clears queue; no second dashboard or cosmetic completion',[8]);R('O2','03','20% faster tasks, 80% unassisted success, stale/duplicate/opt-out/latency counters',[6,12]);R('O2','04','Core packaging and payroll task addition only after reviewed readiness',[15,24]);
R('O3','01','One country/provider-format lane using existing imports/match/suspense/signoff',[10]);R('O3','02','Handle fee/refund/duplicate/replay/partial settlement and trace to ledger',[10,22,27]);R('O3','03','Manual import fallback; prove named rails independently',[10,11]);R('O3','04','30% less operator effort, zero false accepted matches; support/rail cost decision',[12,24,28]);
R('O4','01','Complete delivery/invoice response mapped to inspected receiving and controlled AP',[5,13]);R('O4','02','No-account narrow access, no external stock/AP authority or cross-buyer disclosure',[13]);R('O4','03','Five buyers/ten suppliers; 25% faster acknowledgement, 50% less rekeying',[13,26]);R('O4','04','Test existing-link response improvement as supplier participation grows',[26]);
R('O5','01','13 weekly buckets from dated AR/AP/approved obligations with actual/committed/expected/unknown',[17]);R('O5','02','Source traceability, missing payroll coverage and forecast-versus-actual comparison',[17]);R('O5','03','Three owners/accountants; four weekly buckets, 80% traceable committed outflows',[17,28]);
R('O6','01','Reuse immutable statements; disputed line, promise/reference and reviewed outcome',[14]);R('O6','02','One delivery channel, aging priorities, expiry/revocation, promise never cash',[5,14]);R('O6','03','Four-week comparable groups, 20% faster disputes; complaint/opt-out/cost counters',[14,28]);
R('O7','01','Complete supported payroll lifecycle with plain-language readiness and variance',[7,15,16]);R('O7','02','Two reviewed cycles, zero unexplained variance, 25% lower preparation effort',[16]);R('O7','03','Country maintenance, payroll-calendar support and active-employee pricing experiment',[3,24,25]);
R('O8','01','Explain available/reserved/incoming/unreliable stock and deterministic demand/lead time',[18]);R('O8','02','Transfer surplus first then owner-budgeted purchase; no auto-order',[18]);R('O8','03','20 items/two sites shadow trial; fewer stockout-days without higher inventory value',[18,28]);
R('O9','01','Existing phone-based leave, time correction and scoped payslip tasks',[19]);R('O9','02','Recover interruptions safely; current auth; no offline payroll approval',[7,19]);R('O9','03','Ten employees/five managers, 90% completion, keyboard/screen reader, privacy/recovery',[19,23]);R('O9','04','Narrow employee access, account recovery and device privacy',[19,24,25]);
R('O10','01','One format/profile, original files/mappings and three sample migrations',[20,21]);R('O10','02','Authoritative opening stock/AR/AP/payroll entries and accountant-approved zero differences',[21]);R('O10','03','Reversible cutover, retained history/exports and first useful task within one working day of clean input',[21,25]);R('O10','04','Assisted onboarding economics and reusable validated templates',[20,24,25,28]);
R('S','01','Useful invitation→delivery→first task→repeat→activation→retention chain',[5,6,26]);R('S','02','Fixed denominators, bot/replay suppression and time-bounded attribution',[6]);R('S','03','Distinguish internal collaboration, referral distribution, integration coverage and true network value',[6,26,28]);R('S','04','Purpose-specific consent, revocation, private relationships and useful account-free responses',[5,9,13,14,25]);R('S','05','Request recommendations after positive outcome; no automated outreach or paid incentives',[26]);R('S','06','Role onboarding, migration help, pricing validation and support cost measurement',[4,20,21,24,25]);R('S','07','Baseline interviews across owner/accountant/supplier/payroll/employee/buyer/referrer',[4,12,19,26]);R('S','08','Weekly expected-work completion, week-4/week-8 retention and payroll-cycle denominators',[6,12,16,28]);R('S','09','Preserve service truth, history, exports and controls; avoid broad rewrites',[1,2,7,9,10,13,14,15,21,27]);R('S','10','Start qualified country review early; retain O1/O2/O3 priority and capacity discipline',[3,12]);
R('E','01','Candidate-bound security, recovery, backup/restore, alerts and service targets',[11,22,27]);R('E','02','Professional states, accessibility, bilingual workflows and responsive layouts',[4,7,8,19,23]);R('E','03','Governed data migration, retention, provenance and authorized portability',[20,21,25]);R('E','04','Separate engineering, validated behavior, pilot, production and measured-value gates',[12,16,27,28]);
const conditional=[
 ['Open marketplace / public discovery','Out of execution scope','Repeat private network usefulness; two-sided demand; identity verification, consent, moderation, dispute/support model and sustainable cost evidence','Product + security + operations','26,28'],
 ['Public supplier ratings','Out of execution scope','Independent demand, defensible review provenance, appeals/moderation and bias/abuse/privacy assessment','Product + privacy','26'],
 ['Cross-company credit scoring, lending, custody or escrow','Out of execution scope','Separate authorized business case, qualified legal/regulatory review, risk/capital/payment controls and operating capacity','Executive sponsor + qualified legal/finance','24,28'],
 ['Cross-company benchmarking','Out of execution scope','Informed opt-in; minimum cohort and repeated-query protections; purpose limits; exclusion of individual payroll; useful demand','Privacy + analytics','26'],
 ['Autonomous accountant/payroll agents','Out of execution scope','Separate risk case with deterministic evidence, human approval boundaries, adversarial evaluation and explicit product authorization','AI safety + finance/payroll','27'],
 ['General dashboards, portal/import rewrites','Reject as default','Only a specific measured task failure that cannot be fixed through existing contracts justifies a narrow redesign','Platform + UX','4,23'],
 ['Additional countries and provider rails','Conditional expansion','Reviewed country/profile/channel, qualified support owner and proven customer demand/economics; no regional payroll uniformity assumed','Country owner + integrations','3,16,24'],
 ['Multi-buyer supplier inbox / multi-merchant statements / firm-wide advisory expansion','Conditional extension','Repeated independently granted relationships already improve existing-participant outcomes; no public identity merge','Product + privacy','9,13,14,26'],
 ['Saved cash scenarios, advanced seasonality and extra competitor templates','Conditional extension','Initial deterministic forecast/replenishment/migration slice proves usefulness; actual request and data coverage justify next slice','Finance + inventory + migration product','17,18,21'],
 ['Paid referral rewards or automated promotion','Deferred','Reliable outcome attribution, abuse/economics validation and a separate explicit communications/offer decision','Growth + privacy','6,26']
].map(([idea,status,reconsider,owner,related])=>({idea,status,reconsideration_criteria:reconsider,owner,evidence_packages:related.split(',').map(Number).map(id)}));

const reviewers=[
 ['Platform','Enterprise/platform architecture',[1,2,8,9,10,13,17,21,27],'Service ownership, contract dependency and shared-file integration review'],
 ['Backend/integration','Backend, API and distributed systems',[1,2,5,7,8,9,10,13,14,15,18,22,27],'Idempotency, transaction/concurrency and correction evidence'],
 ['Database','Database, data integrity and migrations',[1,6,10,11,15,20,21,27],'Precision, schema/backfill reconciliation, restore and history'],
 ['Security/IAM/privacy','Security, IAM, privacy, fraud and abuse',[2,5,6,7,9,13,14,19,24,25,26,27],'Access matrix, consent/revocation, fresh auth, redaction and abuse controls'],
 ['Frontend/design','Frontend and design system',[4,7,8,9,13,14,17,18,19,23],'Existing primitive reuse and complete UI states'],
 ['UX/accessibility/localization','Workflow UX, accessibility and localization',[4,7,8,9,12,19,23,25],'Unassisted EN/FR keyboard/screen-reader/mobile task completion'],
 ['Product','Product strategy and business processes',[3,4,8,12,17,18,20,24,26,28],'Scope decision, baselines, useful completed work and countermetrics'],
 ['Quality/release','Quality and release assurance',[1,2,11,12,16,21,22,23,27],'Candidate-bound tests, failure/recovery, pilot and release decision'],
 ['SRE','SRE, DevSecOps, performance, resilience and cost',[5,6,10,11,22,25,27],'Alerts, recovery targets, provider/worker health and measured cost'],
 ['SaaS packaging','SaaS modularity, packaging, billing, growth and customer success',[2,6,12,24,25,26,28],'Durable authority, comprehensible offers, support economics and retained use'],
 ['Finance controls','Finance, treasury, accounting and internal controls',[1,10,12,15,16,17,18,20,21,27],'Source totals, money semantics, maker-checker and approved corrections'],
 ['Country statutory','OHADA/SYSCOHADA and country statutory, tax/payroll/labor review',[3,15,16,25,27],'Qualified dated country/profile/effective-version decision; no certification inferred'],
 ['Audit/evidence','Audit, records governance and data quality',[3,5,7,9,10,15,16,20,21,25,27],'Source lineage, immutable prior decisions, retention and defensible exports'],
 ['Inventory/offline','POS, inventory and offline consistency',[1,13,18,21,22,27],'Stock/sale/ledger replay and transfer/receipt quantities'],
 ['Purchasing/AP','Purchasing, supplier risk, AP and maker-checker',[13,17,18,21,27],'Bound supplier proposal and internal receiving/payment authority'],
 ['HRIS/payroll','HRIS, payroll, attendance and employee privacy',[3,7,15,16,19,20,21,27],'Approved inputs through payslip/payment/ledger plus scoped self-service'],
 ['Payments','Payments, mobile money and settlement',[5,10,16,17,22,27],'Named-lane evidence, fees/refunds, suspense and no false match'],
 ['Close/accountant','Close, ledger, fiscal reporting and accountant collaboration',[1,9,10,14,16,21,27],'Per-client consent, close finding resolution and journal evidence'],
 ['Analytics','Analytics, BI, metric governance and experimentation',[1,4,6,12,17,18,26,28],'Event definitions, denominators, source tie-out and network falsification'],
 ['AI safety','AI/agent safety and evaluation',[27],'Review scope to prevent financial-agent authority creep. Model implementation/certification NOT APPLICABLE: no new AI behavior is authorized.'],
 ['APIs/events','APIs, webhooks, outbox, import/export and third-party boundaries',[2,5,6,10,13,14,20,21,27],'Contract version, delivery semantics, deduplication and authority checks'],
 ['Change/support','Change management, documentation, training and operations',[4,12,16,19,20,21,23,24,25,28],'Role quick starts, assisted cutover, incident drill and support handover']
].map(([key,role,nums,evidence])=>({key,role,packages:nums.map(id),review_evidence:evidence,status:'ASSIGNED_BY_ROLE_NOT_REVIEWED'}));

const moneyPackages=[1,10,13,14,15,16,17,18,21,22,27];
const gateIdsFor=p=>[...new Set(['G01','G03',...(p.kind==='discovery'?[]:['G04','G08','G09']),...(moneyPackages.includes(p.number)?['G02']:[]),...([5,9,13,14,16].includes(p.number)?['G05']:[]),...([3,15,16,27].includes(p.number)?['G06']:[]),...([5,10,11,12,16,22,25,27].includes(p.number)?['G07']:[]),...([12,16,26,27].includes(p.number)?['G10']:[]),...([24,27].includes(p.number)?['G11']:[]),...([12,16,17,18,19,21,26,28].includes(p.number)?['G12']:[])])];
const dimensionTests={
 'business_correctness':'Source-to-projection/ledger/quantity/time tie-out and domain-reviewed golden cases; finance gate G02.',
 'complete_workflows':'Source state transition plus denial, stale evidence, duplicate, concurrent, failure and authorized correction; G04.',
 'access_privacy':'Organization/object/role/location/module matrix, fresh auth where required, revoke/expire/redaction and zero unauthorized reads; G03.',
 'professional_experience':'Unassisted role-task completion, consistent terminology/tables, clear next action and complete state handling; G08.',
 'accessibility_localization':'Actual keyboard, focus, screen-reader, zoom/reflow and EN/FR task matrix; automated scans supplement manual evidence; G08.',
 'resilience':'Transactional interruption, concurrent writer, idempotency/replay and recovery evidence; G04/G07.',
 'operational_readiness':'Owned alerts/runbooks, backup/restore, measured service targets and cost; G07.',
 'data_governance_portability':'Originals, versions, lawful retention, authorized export, migration reconciliation and preserved correction history; G09.',
 'commercial_readiness':'Comprehensible packages, durable entitlement transitions, narrow access and cost-to-serve; G11.',
 'product_value':'Source-bound completed-task baseline, countermetric, retention and falsifiable collaboration benefit; G12.'
};
for(const p of packages){
 p.status=p.hard.length?'NOT_STARTED_DEPENDENCIES_PENDING':'READY_TO_START_WITH_SCOPE_LIMITS';
 p.implementation_status='NOT_STARTED_BY_THIS_RUN';p.validation_status='NOT_RUN_FOR_PROPOSED_CHANGE';p.pilot_status='NOT_READY';p.production_status='NOT_READY';p.value_status='UNVERIFIED';
 p.dependencies={hard:p.hard.map(id),soft:(p.soft||[]).map(id),shared_foundations:(p.shared||p.hard.filter(n=>[1,2,4,5,6,7,11,20].includes(n))).map(id),external_gate_dependencies:p.external||[],concurrent_work:packages.filter(q=>q.id!==p.id&&!p.hard.includes(q.number)&&q.phase===p.phase).map(q=>q.id),concurrency_condition:'Suggestions are dependency-independent preparation only; transitive prerequisites, WIP and shared-file ownership still govern implementation.'};
 p.starting_evidence={files:p.files.map(f=>path.join(root,f)),existing_tests:p.tests.map(f=>path.join(root,f)),current_state:'Existing foundations identified in the source audit and fresh reconciliation. Test coverage is bounded; deployed behavior is unverified.',unresolved_questions:p.missing};
 p.ownership={accountable:p.owner,implementer:p.kind==='discovery'?'Domain engineer supporting product/reviewer':p.kind==='experiment'?'Product/data engineer with customer operations':p.owner,independent_reviewers:p.review,external_dependency_owner:(p.external||[]).map(b=>({blocker:b,owner:blockers.find(x=>x.id===b).owner})),file_ownership:'Claim listed source files before editing; coordinate with active modernization/analytics/module owners. Shared schema, messages, sidebar and security helpers have one integration owner.'};
 p.purpose={user_problem_and_outcome:p.job,source_ids:p.source_references};
 p.scope_definition={included:p.scope,minimum_useful_slice:p.scope[0],excluded: p.kind==='discovery'?'Application rollout and actual external approvals are outside this preparation package.': 'Unrelated rewrites, additional countries/rails, new generic dashboards, autonomous financial actions and conditional-register expansions.',definition_of_done:'Package-specific acceptance and evidence reviewed at the applicable stage. A useful internal slice does not close outstanding pilot, production or value gates.'};
 p.implementation_outline={contracts:p.scope[0],services:p.scope.slice(1),data:p.data,security:'Use existing tenant/role/location/module authority; enforce current source ownership, least privilege and stage-appropriate consent.',ui:'Reuse existing surfaces and design primitives after the source-owned contract; implement the scoped success/failure/denied/stale states.',integrations_and_operations:(p.external||[]).map(b=>blockers.find(x=>x.id===b).resolution_evidence)};
 p.data_implications={plan:p.data,schema_decision:'Inspect existing schema before proposing an additive change; do not pre-authorize a migration. Required changes, if any, need a reconciled rehearsal in the isolated target.',retention_and_compatibility:'Preserve authoritative originals and prior versions, old deep links/exports where applicable, and documented retention. Never infer that name removal alone anonymizes sensitive data.',backfill:'No silent historical fact synthesis; dry-run manifest and source count/amount reconciliation for any justified backfill.',recovery:'Disable new entry/dispatch or derived feature; preserve authoritative records. Use existing reversal/correction/replay services for accepted work.'};
 p.acceptance_criteria=p.accept.map((text,i)=>({id:`${p.id}-AC${i+1}`,behavior:text,status:'NOT_VERIFIED_FOR_PROPOSED_CHANGE'}));
 p.verification={existing_command:`node node_modules/jest/bin/jest.js --roots services --runInBand --runTestsByPath ${p.tests.join(' ')}`,command_status:'DISCOVERED_FOR_REUSE; only suites in the fresh planning receipt were run in this task',missing_checks:p.missing,environment:p.kind==='discovery'?'Read-only repository plus consented samples/reviewer workspace.':'Mocked local tests first; isolated PostgreSQL and authenticated role fixtures for integration; sandbox provider only where applicable; agreed phone/EN-FR matrix for UI.',evidence_artifacts:[`${p.id}/source-and-environment.json`,`${p.id}/verification-results.json`,`${p.id}/acceptance-and-review.md`,`${p.id}/rollback-or-correction-rehearsal.md`],production_boundary:'No past source/mock pass certifies deployment; bind fresh required checks to the actual candidate.'};
 p.estimate={engineering_person_weeks:{low:p.effort[0],base:p.effort[1],high:p.effort[2]},specialist_person_days:{qa:p.kind==='discovery'?[0.5,1,2]:p.kind==='assurance'?[5,8,12]:[1,2,4],design_research:[4,7,8,9,13,14,17,18,19,23].includes(p.number)?[1,3,5]:[0,0.5,1],security_sre:[2,5,10,11,22,25,27].includes(p.number)?[2,4,7]:[0.5,1,2],domain_review:moneyPackages.includes(p.number)?[1,3,5]:[0.5,1,2],support_product_ops:[3,4,12,16,20,24,25,26,28].includes(p.number)?[2,5,10]:[0.5,1,2],...(p.specialist||{})},external_or_observation_elapsed_weeks:p.wait||[0,0,0],waiting_rule:[12,16,17,18,26,28].includes(p.number)?'Observation begins after eligible workflow/cohort entry; cannot be replaced by engineering effort.':'External intake can overlap engineering; estimates are assumptions, not committed provider/reviewer lead times.',confidence:p.confidence||'medium',counting_rule:'Engineering includes implementation and developer tests. Specialist days are separate. Shared foundations are charged only in their owning package; do not add feature headline estimates from the audit.'};
 p.gates=gateIdsFor(p);
 p.rollout={internal_entry:'Source baseline and hard prerequisite contracts available; external discovery can start before approval. Use synthetic records until environment/consent gates permit otherwise.',internal_exit:'Package acceptance cases pass with current source binding and independent applicable review.',pilot_entry:'Applicable G01–G10 criteria with named consenting cohort, actual support and rollback owner; no global release required for a safe separable lane.',production_entry:'G11 and all applicable domain gates; expert/provider evidence is required for exact claims. Parent program stays incomplete while a required lane is blocked.',monitoring:[p.metric,p.counter,'authorization/privacy denials, stale evidence, duplicate effects and support cost'],rollback_trigger:p.stop,fallback:p.data,owner:p.owner};
 p.measurement={success_metric:p.metric,target_status:'PROPOSED_UNTIL_BASELINE_AND_CUSTOMER_EVIDENCE',countermetric:p.counter,baseline:'Capture comparable eligible tasks before intervention, define denominator/window/role, exclude staff and tests; retain unassisted versus supported cohorts. Unknown baseline is not zero.',reconsideration:p.stop};
 p.recommendation_ids=recs.filter(r=>r.packages.includes(p.id)).map(r=>r.id);
}

const totals=['low','base','high'].reduce((r,k)=>(r[k]=packages.reduce((s,p)=>s+p.estimate.engineering_person_weeks[k],0),r),{});
const byId=new Map(packages.map(p=>[p.id,p]));
const memo=new Map();
function critical(n){if(memo.has(n))return memo.get(n);const p=byId.get(n);const prev=p.dependencies.hard.map(critical).sort((a,b)=>b.finish-a.finish)[0]||{finish:0,path:[]}; const observation=[12,16,17,18,26,28].includes(p.number)?(p.wait?.[1]||0):0; const val={finish:prev.finish+p.effort[1]/1.4+observation,path:[...prev.path,p.id]};memo.set(n,val);return val;}
const criticalPath=critical(id(28));
const phaseTitles={P0:'Trust and early external preparation',P1:'Shared delivery and the first three useful workflows',P2:'Controlled pilot and complete participation/HR foundations',P3:'Planning, migration, payroll proof and measured collaboration',P4:'Integrated release and measured operating handover'};
const phasePackages=phase=>packages.filter(p=>p.phase===phase);
const link=(file,label=file)=>`[${label}](<${path.join(root,file).replaceAll('\\','/')}>)`;
const pkgList=nums=>nums.map(n=>typeof n==='number'?id(n):n).join(', ');
const table=(heads,rows)=>['| '+heads.join(' | ')+' |','| '+heads.map(()=>'---').join(' | ')+' |',...rows.map(r=>'| '+r.map(x=>String(x).replaceAll('|',' / ').replaceAll('\n',' ')).join(' | ')+' |')].join('\n');
const errors=[];
for(const p of packages){for(const f of [...p.files,...p.tests])if(!fs.existsSync(path.join(root,f)))errors.push(`${p.id}: missing ${f}`);for(const dep of [...p.dependencies.hard,...p.dependencies.soft,...p.dependencies.shared_foundations])if(!byId.has(dep)||dep===p.id)errors.push(`${p.id}: invalid dependency ${dep}`);for(const g of p.gates)if(!gates.some(x=>x.id===g))errors.push(`${p.id}: bad gate ${g}`);}
const visited=new Set(),active=new Set();function dag(n){if(active.has(n))throw Error('Dependency cycle '+n);if(visited.has(n))return;active.add(n);byId.get(n).dependencies.hard.forEach(dag);active.delete(n);visited.add(n);}packages.forEach(p=>dag(p.id));
for(const source of ['F1','F2','F3','F4','F5',...Array.from({length:10},(_,i)=>'O'+(i+1))])if(!recs.some(r=>r.source===source))errors.push('Unmapped source '+source);
for(const r of recs)if(!r.packages.length||r.packages.some(n=>!byId.has(n)))errors.push('Bad trace '+r.id);
if(new Set(packages.map(p=>p.id)).size!==packages.length||new Set(recs.map(r=>r.id)).size!==recs.length)errors.push('Duplicate identifier');
if(errors.length)throw Error(errors.join('\n'));
const registry={schema_version:'stoquify.enterprise-roadmap.v1',generated_at:new Date().toISOString(),planning_date:date,scope:'All five findings, ten bounded initial opportunity releases and supporting enterprise outcomes. Conditional ideas excluded.',candidate:{branch:baseline.branch,commit:baseline.commit,baseline_file:path.join(out,'baseline.json'),worktree_is_frozen:false},source_audit:path.join(root,'what-next/2026-09-06-ohada-product-competitive-audit.md'),status:'ROADMAP_DEFINED_IMPLEMENTATION_AND_RELEASE_NOT_COMPLETED',estimate_totals_engineering_person_weeks:totals,capacity_model:{lean:{engineers:3,focus_fraction:0.7,effective_engineering_fte:2.1,max_major_streams:2},better_staffed:{engineers:6,focus_fraction:0.7,effective_engineering_fte:4.2,max_major_streams:3},working_week_days:5,calendar_rule:'Horizon starts at mobilization; days are elapsed calendar days and sprints are 14 calendar days. Estimates are person-weeks, not elapsed commitments.'},critical_path_model:{assumption:'Dependency-only lower bound, unlimited teams each capped at 1.4 effective engineering FTE/package; observation waits included; other resource contention and external delays excluded.',...criticalPath},quality_dimensions:dimensionTests,findings,gates,blockers,conditional_register:conditional,reviewer_responsibilities:reviewers,recommendations:recs,packages};

if(process.argv.includes('--validate-only')){console.log(JSON.stringify({packages:packages.length,recommendations:recs.length,totals,criticalPath,errors},null,2));process.exit(0);}

const graph=['flowchart LR',...packages.map(p=>`  N${p.number}["${p.id}: ${p.title.replaceAll('"',"'")}"]`),...packages.flatMap(p=>p.hard.map(n=>`  N${n} --> N${p.number}`))].join('\n');
const roadmap=`# Stoquify enterprise execution roadmap

Planning date: **6 September 2026**. Scope: the five findings, all ten bounded initial opportunity releases, and their shared hardening, adoption and operating work. This is an execution package; no application code, database, external communications or deployment was changed by this run.

## Decision and next work

Start **${id(1)} sales correctness**, **${id(2)} analytics access**, and **${id(3)} qualified country-review preparation**. The first two can proceed independently; the third starts as a small preparation and external-review track, without treating expert approval as engineering output. Begin recruitment, design and migration sample collection early under packages 004 and 020. The first product wave remains **O1 accountant-client desk, O2 daily resolution queue and O3 statement-to-ledger reconciliation**.

The complete defined scope is **28 packages and 67 traceable recommendations**. Estimated engineering effort is **${totals.low}/${totals.base}/${totals.high} person-weeks (low/base/high)**, excluding specialist allocations and external waiting. A lean three-engineer team should plan around **64–80 elapsed weeks** for the base scope through final value observation. Six engineers with appropriate shared specialists should plan around **48–60 weeks**. These are planning windows, not release commitments. High workload, recruitment, provider or statutory delays can take the program beyond them.

The critical engineering path runs through trustworthy money → reconciliation → receivables → cash forecast → cash-aware stock proposals → cross-workflow UX assurance → integrated release → observed value. The country/payroll and delivery/collaboration tracks can become critical when external evidence arrives late.

## 1. Current truth and evidence boundary

Branch: \`${baseline.branch}\`. Commit: \`${baseline.commit}\`. At evidence collection, **${baseline.worktree.trackedModified} modified tracked entries and ${baseline.worktree.untrackedEntries} untracked entries** existed, including this task's evidence directory. The pre-directory snapshot had 263 untracked entries. Counts are Git status entries, not individual files. The candidate is not frozen; source hashes, rather than HEAD alone, identify what was checked.

${table(['Finding','Current state','Consequence for the plan'],findings.map(f=>[f.id,f.status,f.evidence]))}

Fresh safe verification: **${tests.numPassedTestSuites} suites / ${tests.numPassedTests} tests passed** in 9.22 seconds. Current-source synthetic reproductions still show F1/F2. All three reproduction-file hashes match the audit. The freshly evaluated static country gate remains **11/12, blocked on source-artifact expert approval**. Its report builder prints report mode; the explicit fail-mode evaluation returned blocked/exit code 1. The collection script itself completed successfully because collecting a known blocker is not a collection failure.

Tests covered Business Pulse, analytical context, the new daily-sales read service, managed entitlements/transport, manual reconciliation, referral funnel and payroll tax evaluation. They do not cover every proposed acceptance case. No new browser, screen-reader, live database, provider, restore, deployment or professional approval was exercised here. Earlier audit results and earlier local browser/database evidence remain historical and must be rebound before reuse.

Relevant ongoing work changes the starting point:

- The September 2 analytics packet already defines twelve surface families, 53 metric owners and an analytical context contract. It explicitly says Business Pulse runtime remediation remains unfinished. Reuse that design; reconcile AN-D03/04/11/12 with the actual finance owner instead of inventing approval.
- The new daily-sales service uses organization context, decimal aggregates and half-open periods, with fresh tests. It describes order aggregation with several recognized order statuses; do not copy that predicate into finalized POS-sales semantics without review.
- September 5 workflow modernization includes manual-match residual/permission/retry improvements and historical real PostgreSQL/browser evidence. Reuse those fixes in O3; prove remaining end-to-end statement/sign-off gaps. The modernization assignment is explicitly incomplete.
- The latest inspected modernization report records a Windows standalone-packaging failure after compilation. Older September 2 TypeScript failures are historical; they are not automatically current blockers. Recheck only on the actual candidate in packages 011/027.
- June Daily Digest and finance route-state notes establish existing loading/error/denied-state work. Do not rebuild those primitives. Current task and accessibility evidence is still needed.

Graph navigation was checked across six JSON files: components 1,173 nodes; actions 1,044; app 622; hooks 308; types 72; services 5,719. Relevant nodes include \`analytics_sales_analytics_service_getbusinesspulsecommandreadmodel\` (community 24), \`accounting_accountant_access_service_getaccountantportfolio\` (1), \`accounting_accountantportfolio_tsx\` (140), \`daily_habit_dailyhabitdigestdashboard_tsx\` (156), and the reconciliation-workbench hook (40). These explain existing extension points; current source is authoritative.

## 2. Scope, assumptions and program boundaries

Assume an initial Cameroon trading/distribution or retail SME cohort, approximately 10–100 employees and 1–5 locations, working with an accountant. This is a pilot-design hypothesis. A qualified reviewer must define the exact employer/profile/effective-date payroll scope. OHADA accounting coverage does not establish uniform regional payroll/tax support. No fresh market or legal research was performed for this roadmap; competitive hypotheses and dated vendor evidence are inherited from the September 6 audit.

Each opportunity is a completed initial user job. Later firm advisory expansion, extra rails/countries, multi-buyer inboxes, saved cash scenarios, seasonality and additional competitor import templates remain conditional. The conditional register also excludes public marketplace/ratings, lending/custody, cross-company credit scoring/benchmarks and autonomous financial agents. Those items have reconsideration criteria and no implementation estimates in this program.

Preserve source-owned posting, exact money, transactions, immutable evidence, bounded external proposals, independent client grants, employee privacy, exports and authorized corrections. Changes extend existing services, portals, import mechanisms and design primitives. No broad rewrite, unrelated lint work, new generic home dashboard or speculative infrastructure is included.

## 3. Full phased program

Phases group outcomes; they are not blanket locks. Start an independent package when its actual hard prerequisites, capacity and source ownership permit it. An external blocker in payroll does not halt unrelated inventory or accountant work. Shared primitives are built once.

${table(['Phase','Packages','Exit outcome','Base planning window: lean / staffed'],[
 ['P0 — Trust and preparation',pkgList(phasePackages('P0').map(p=>p.id)),'Correctness/access verified; scoped country review, task baselines and samples started; operations evidence prepared.','Weeks 1–14 / 1–7; long-lead review can remain open'],
 ['P1 — First useful workflows',pkgList(phasePackages('P1').map(p=>p.id)),'Delivery, event semantics and O1/O2/O3 complete internally; general approval evidence usability improved.','Weeks 5–24 / 3–13'],
 ['P2 — Pilots and participation',pkgList(phasePackages('P2').map(p=>p.id)),'First O1/O2/O3 pilot and safe supplier/customer responses; mobile, payroll version and supported offline paths.','Weeks 20–42 / 11–26'],
 ['P3 — Complete domain outcomes',pkgList(phasePackages('P3').map(p=>p.id)),'Two payroll cycles, forecast, stock proposals, opening balances, bilingual/accessibility assurance, sustainable support and network experiment.','Weeks 30–64 / 18–46'],
 ['P4 — Release and value',pkgList(phasePackages('P4').map(p=>p.id)),'Candidate-bound full-scope release decision and final observed-value/ownership decision.','Weeks 56–80 / 40–60']
 ])}

Wave 1 introduces a source-linked resolution desk and proof-based reconciliation. Wave 2 completes supplier/customer participation and narrow mobile HR utility. Wave 3 completes evidence-backed planning and migration plus the reviewed payroll cycle. Final assurance joins the lanes; it does not postpone ordinary per-package QA or accessibility until the end.

${table(['Package','Outcome','Source IDs','Hard prerequisites','Engineer-weeks L/B/H'],packages.map(p=>[p.id+' — '+p.title,p.job,p.source_references.join(', '),p.hard.length?pkgList(p.hard):'None; declared scope/external limits',p.effort.join(' / ')]))}

The machine-readable register contains the full executable contract for each package: current paths, tests, precise inclusion/exclusion, minimum useful delivery, owners/reviewers, hard/soft/shared dependencies, implementation/data/recovery outline, observable acceptance, missing checks, estimates, gates and measures. It is the detailed companion to this roadmap, not a list of feature names.

## 4. Dependencies, critical path and shared ownership

\`\`\`mermaid
${graph}
\`\`\`

Hard dependencies above are contractual prerequisites. Soft dependencies improve value but must not falsely block a useful safe slice. For example, mobile leave/profile work can precede payroll production approval; an incomplete payroll source must visibly limit forecast coverage. Live provider availability is separate from the manual statement lane.

At **1.4 effective engineering FTE per package**, with unlimited parallel teams and the stated observation periods, the dependency-only lower bound is **${criticalPath.finish.toFixed(1)} weeks**:

${criticalPath.path.join(' → ')}.

This is not the staffed delivery forecast: it omits shared specialist and engineering contention, provider review delays, recruitment and integration rework. Recompute from actual throughput at day 30, day 90 and each pilot gate. The payroll branch 003→015→016 and delivery→accountant/supplier→026 may overtake it; two payroll cycles and eight-week retention/network observations cannot be shortened by adding developers.

${table(['Shared area','Single accountable integration owner','Conflict policy'],[
 ['sales-analytics, analytical-context, daily-sales and cash read models','Analytics/finance lead','001 owns recognition/context; 006/008/017 consume the version. Reconcile concurrent daily-sales changes; no blind cherry-pick/rewrite.'],
 ['server-authz, module-entitlement/navigation/stop-policy','Platform access lead','002 owns the scoped enforcement contract; 024 consumes it. Billing never becomes direct authority.'],
 ['outbox/delivery, token/consent, referral events','Integration lead','005 owns dispatch semantics; 006 owns outcome definitions; 009/013/014 extend domain payloads.'],
 ['payroll-control, HRIS evidence/readiness and payslip services','Payroll lead','007 precedes 015/019 evidence consumption. Serialize shared writer changes; reviewer controls pack promotion.'],
 ['reconciliation writers/read models and workbench','Payments lead','010 rebases against ongoing manual-match fixes. 016/017 consume approved proof contracts.'],
 ['Prisma schema/migrations, sidebar, shared tables, EN/FR messages','Database lead for schema; frontend lead for shell/copy','One editor/integration queue per shared file group. Feature branches may prepare separate files; merge only after contract review.'],
 ['Release pipeline, test environment and evidence registers','QA/SRE lead','Serialize environment-changing rehearsals. Preserve previous records; never overwrite an unrelated program status file.']
 ])}

Lean WIP: two major engineering packages; country/recruitment preparation uses explicitly budgeted fractional time. Staffed WIP: three major packages, with at most one changing a given shared contract. Observation can run beside engineering but consumes QA/support/domain capacity. A blocked package releases its engineering slot after preserving a concrete handoff. The first-30-days schedule accounts for this instead of treating all 28 packages as active.

## 5. Staffing and time model

${table(['Capability','Lean allocation','Better-staffed allocation'],[
 ['Engineering','3 people: 2 backend/domain, 1 frontend with integration capability; 70% program focus = 2.1 effective FTE','6 people: 3 backend/domain, 2 frontend/full-stack, 1 data/integration; 70% = 4.2 effective FTE'],
 ['Product/program','0.5 FTE','1.0 FTE'],['Design/research/accessibility','0.5 FTE, with specialist assist for screen-reader review','0.75 FTE plus accessibility specialist as needed'],['QA/release','0.75 FTE','1.25 FTE'],['Security/privacy','0.2 FTE plus booked review sessions','0.3 FTE'],['SRE/operations','0.25 FTE','0.5 FTE'],['Accounting/payroll/country experts','0.2 FTE finance and 0.2 FTE payroll availability plus separately booked qualified review; not interchangeable with engineering','0.4 FTE combined ongoing domain review plus dedicated country review blocks'],['Support/onboarding','0.25 FTE early, 0.75 during pilots','0.5 FTE early, 1.0 during pilots']
 ])}

Engineering workload alone is **${(totals.low/2.1).toFixed(1)}/${(totals.base/2.1).toFixed(1)}/${(totals.high/2.1).toFixed(1)} elapsed weeks** at lean effective capacity, and **${(totals.low/4.2).toFixed(1)}/${(totals.base/4.2).toFixed(1)}/${(totals.high/4.2).toFixed(1)}** at staffed capacity. These are workload floors, not schedules. The dependency lower bound, external evidence and observation periods still apply.

Base planning windows are 64–80 and 48–60 weeks. Optimistic engineering/rapid-review cases may approach 50 and 42 weeks respectively; high-effort/review/recruitment cases can exceed 100 and 78 weeks. No finite maximum is guaranteed when a qualified reviewer, participant or provider is unavailable. The high package effort is not secretly contained in the base window.

Package specialist effort is separately estimated in person-days; developer tests remain in engineering effort, independent QA/research/controls work does not. At five working days per person-week, assign these days within the allocations above and reforecast at each gate. The 30% engineering focus reserve covers ordinary interruptions/reviews outside package implementation; do not add it again as a second contingency multiplier. Staffing assumptions are unconfirmed business decisions, not acquired capacity.

The August 30 **42–50-week** plan scoped analytics and controlled network phases 0–3 with about ten effective FTE across engineering and specialists, approximately six effective engineering FTE, and a two-major-package WIP limit. The September 6 audit's **six-month** sketch intentionally covered selected O1/O2/O3 and one adjacent pilot. This roadmap includes all ten initial user jobs, reviewed payroll cycles, migration, mobile work, stock planning and integrated assurance. Its six-engineer scenario has only 4.2 effective engineering FTE at the stated focus level. Do not add the old plan's estimates to the new 103 person-week total or infer that the broader scope fits six months.

## 6. Days 31–90 and continuation

Days are calendar days from mobilization; a sprint is fourteen calendar days, with five working days/week assumed and holidays excluded from this first forecast. Day 0 is an index, not a demand to start on the planning date. Capacity is approximately 9 effective engineer-weeks in days 1–30 for lean and 18 for staffed. See the separate day-30 artifact for the detailed first backlog.

${table(['Window','Lean team: priority and realistic exit','Better-staffed team: additional feasible progress'],[
 ['Days 31–44 / sprint 3','Finish remaining 004 task design and 020 sample contracts; begin 005 delivery and 006 event contracts as slots free. External intake runs throughout.','Finish 005 and advance 011; build 008 from approved 001/002/004 contracts. Begin 010 once its hard gates hold.'],
 ['Days 45–58 / sprint 4','Complete most 005 synthetic delivery behavior; progress 006; begin 008 when its assigned slot is free.','Finish 008; begin/advance 009 after delivery contract; complete 006 and 010 proof fixtures.'],
 ['Days 59–72 / sprint 5','Finish 005 internal verification and 006; continue 008. Start 011 recovery evidence after a slot frees.','Complete O1/O2/O3 internal evidence, close 011 rehearsal gaps, and finish 007 evidence UX. 012 can enter only when all its prerequisites are evidenced.'],
 ['Days 73–86 / sprint 6','Finish 008 internal task evidence; continue 011. Prepare scoped O1/O3 fixtures, without claiming delivery.','Begin 012 pilot after applicable gates; concurrently prepare 013/014 or 015 according to independent capacity and external evidence.'],
 ['Days 87–90 / checkpoint','Reforecast remaining 011 plus 009/010. O1/O3 completion and external pilot are expected after day 90 in the lean case.','First pilot may be live/observing; its four-week value result will generally extend beyond day 90. Reforecast payroll and participation branches.']
 ])}

For lean continuation, complete O1/O3 and the initial pilot around weeks 14–28; use the next free slot for 007/015/019 while 013/014 complete private trading-partner work. Start 021 once samples and reconciliation contracts are ready, and 022 before inventory planning. Build 017 then 018 only on trusted source coverage. Finish 016 whenever qualified evidence and two cycles permit. Run 023/024/025 and the eight-week 026 cohort as their prerequisites become ready, then 027/028. The staffed scenario overlaps three independent lanes, preserving identical gates and full scope.

## 7. Observable enterprise quality and staged gates

${table(['Dimension','Required evidence'],Object.entries(dimensionTests).map(([k,v])=>[k.replaceAll('_',' '),v]))}

${table(['Gate','Meaning','Evidence owner'],gates.map(g=>[g.id+' — '+g.title,g.required_evidence,g.owner]))}

All gate statuses in this plan are **not verified for the proposed release**. Package delivery uses five distinct milestones:

1. Engineering complete: scoped contract, implementation and developer tests exist on a bound candidate.
2. Behavior validated: applicable integration, failure, privacy, accessibility and correction cases pass, with independent review.
3. Pilot ready: a named cohort, consent, support, limits, recovery and exact external evidence permit the specific lane.
4. Production ready: current applicable gates, sustainable operations and a documented release decision permit supported scope.
5. Customer value observed: defined baselines/countermetrics and enough task cycles demonstrate useful retained work. Negative or inconclusive outcomes remain visible.

Package 012 makes an early O1/O2/O3 pilot possible without waiting for every later feature. Package 027 is the integrated full-scope production gate, not a substitute for per-lane gates. Package 028 makes a measured decision; a completed experiment may reject a feature's value or a network claim. That is not the same as achieving a positive target.

Proposed initial operating targets, to ratify and test in 011: no duplicate financial effects; zero unexplained balances; source tasks show freshness and accountable recovery; p75 useful interactive response ≤2 seconds on an agreed pilot device/network/load for ordinary read workflows; alerts for critical financial/authorization failures acknowledged within 15 minutes during staffed pilot hours; RPO ≤15 minutes and RTO ≤4 hours for the pilot database if the selected deployment can demonstrate them. These are design targets, not observed SLAs or promises of 24/7 coverage. Heavy exports/imports need separate asynchronous completion targets. Measure cost and adjust cohort limits before external promises.

Rollout sequence per workflow: local synthetic fixtures → isolated database/authenticated internal rehearsal → allowlisted consented pilot → supported limited production → measured expansion. A financial discrepancy, privacy leak, stale authorization acceptance, unexplained duplicate or failed recovery stops the affected lane. Disable new actions/dispatch and retain evidence; correct accepted financial work through established reversals/replay. Never roll back by deleting real payroll, ledger or stock history.

## 8. Adoption, network tests and economics

The measurement chain is **useful invitation → successful delivery → first completed task → repeated collaboration → productive organization activation → retained organization**. Count each stage separately, with an eligible denominator and source event. Define attribution windows before reporting conversion; a proposed starting policy is first useful task within 14 days of delivery, productive activation within 30 days, week-4/week-8 task retention, and two pay cycles for payroll. Report other windows as sensitivity checks. Bot previews, repeated tokens, test staff and failed delivery are not human activation.

Meaningful activity advances or closes an authoritative task. Dismissing an alert, logging in, viewing a dashboard or registering does not qualify. The recurring-value metric is organizations completing expected operating work on time, segmented by role and workflow cadence.

For O1, observe existing-client request resolution as a firm's independently granted active client count changes; control for staff capacity, task type and onboarding assistance. For O4, observe existing buyers' supplier response time/reliability as the same supplier gains independently consented active buyer relationships. Require at least ten repeated collaborations and source-backed observations; assess whether the sample can support the inference. If only acquisition improves, describe distribution. If confidence is weak, report inconclusive and keep the useful single-relationship product.

Internal employee collaboration is not a cross-company network; more connectors are integration coverage; retained history creates switching cost but is not a reason to restrict export. Optional customer consolidation and broader partner/template networks remain conditional. A business recommending Stoquify to a competitor may benefit through a shared accountant or supplier; test that reason without exposing prices, employee identities, balances or small-cohort performance.

The audit's improvement thresholds (20–30% task-time reductions, 80–90% unassisted completion, migration zero-difference and forecast source coverage) are **proposed targets**. Baselines are currently unknown. Track support minutes, onboarding corrections, country maintenance, storage/delivery/provider costs and hosting per completed workflow. Test a concrete understandable offer: core daily resolution; finance/reconciliation add-on; paid buyer procurement with useful narrow supplier access; firm/client option; employee-count payroll with narrow employee access; transparent assisted onboarding. No present revenue forecast or willingness-to-pay claim is justified.

## 9. Evidence, blockers and completion conditions

The companion traceability document maps each recommendation, reviewer and blocker. Qualified country review, named provider/delivery evidence, a candidate-bound environment, actual participants/samples and capacity/package decisions remain open. Discovery and safe implementation can proceed independently as specified; no assumed approval clears a gate.

Planning verification status: source/graph reconciliation **passed**; eight-suite focused test run **passed**; defect reproduction **reproduced F1/F2**; country production gate **blocked**; new live/database/browser/accessibility/release checks **not run**. Full build, seeds, migrations and provider operations were intentionally outside this planning run. Inspect package scripts before execution: the current \`build\` script invokes migration deployment, so it is not a harmless validation command.

Planning completion requires valid package/source/gate references, an acyclic dependency graph, all F/O IDs and supporting recommendations mapped, no duplicated shared effort, four saved artifacts and no fabricated release readiness. Engineering completion requires executing the packages and producing the stated evidence; this document does not do that work.

## Artifact index

- ${link(prefix+'work-packages.json','Machine-readable work packages, estimates, gates and reviewer register')}
- ${link(prefix+'traceability-and-blockers.md','Traceability, blockers and conditional ideas')}
- ${link(prefix+'first-30-days.md','First 30 days and first three execution briefs')}
- ${link('what-next/2026-09-06-stoquify-enterprise-roadmap-evidence/baseline.json','Source hashes, worktree and graph evidence')}
- ${link('what-next/2026-09-06-stoquify-enterprise-roadmap-evidence/focused-tests.json','Fresh focused tests')}
- ${link('what-next/2026-09-06-stoquify-enterprise-roadmap-evidence/finding-reproductions.json','Fresh isolated defect reproductions')}
- ${link('what-next/2026-09-06-stoquify-enterprise-roadmap-evidence/statutory-readiness.md','Fresh statutory readiness evidence')}
- ${link('what-next/2026-09-06-ohada-product-competitive-audit.md','Source product and competitive audit')}
- ${link('what-next/STOQUIFY_ANALYTICS_NETWORK_PHASES_0_TO_3_EXECUTION_ROADMAP_2026-08-30.md','Earlier 42–50-week analytics/network roadmap')}
- ${link('what-next/analytics-network-program/P0_02_P0_03_ACCEPTANCE_PACKET_2026-09-02.md','Existing analytics ownership/context acceptance packet')}
- ${link('what-next/workflow-modernization/2026-09-05-run-01/COMPLETION_AUDIT.md','Ongoing workflow modernization completion audit')}
`;

const trace=`# Stoquify enterprise roadmap — traceability and blockers

Date: ${date}. This register derives from the September 6 audit and its requested execution scope. Read with ${link(prefix+'execution-roadmap.md','the program roadmap')} and ${link(prefix+'work-packages.json','the full package register')}. No work package or release is certified by this planning document.

## Current-state reconciliation

${table(['ID','Classification','Current evidence','Execution ownership'],findings.map(f=>[f.id,f.status,f.evidence,f.packages.join(', ')]))}

F5 is classified PARTIALLY_RESOLVED because functioning participation/registration/delivery foundations exist; this does not claim that this planning run repaired them or that the complete funnel is operational. F4's technical-hash requirement is source-confirmed; low value of overlapping screens remains a hypothesis. None of the five findings is declared resolved or superseded. No deployed cross-tenant exploit, statutory approval or network effect was established.

## Recommendation-level coverage

Every row has a stable sub-ID. F/O IDs preserve the audit identifiers and numbering even where ranking differs. S rows cover supporting audit recommendations; E rows make the execution prompt's operating/quality requirements explicit. Conditional recommendations are below and carry no unconditional build scope. Parent and child rows share package effort; estimates are not multiplied by recommendation count.

${table(['Source recommendation','Required outcome','Current evidence / starting point','Work packages','Prerequisites','Verification / rollout'],recs.map(r=>{
 const ps=r.packages.map(n=>byId.get(n));const ev=r.source.startsWith('F')?findings.find(f=>f.id===r.source)?.status:'Existing foundations; proposed completion/value unverified';
 return [r.id+' ('+r.source_location+')',r.outcome,ev+'; '+ps[0].files[0],r.packages.join(', '),[...new Set(ps.flatMap(p=>[...p.dependencies.hard,...p.dependencies.external_gate_dependencies]))].join(', ')||'None beyond scope assumptions',ps.map(p=>p.id+' AC1–'+p.accept.length).join('; ')+'; '+[...new Set(ps.flatMap(p=>p.gates))].join(', ')+'; internal → eligible pilot → supported release'];
}))}

The acceptance IDs resolve in the JSON register, which also supplies exact existing test commands, missing coverage, environments, source files and recovery. Existing baseline tests are explicitly distinguished from the added checks needed to pass a package. The recommendation inventory includes minimum releases and supporting execution duties; later options remain in the conditional register rather than being silently dropped or built.

## Blockers and actionable gates

${table(['ID / class','Missing evidence or decision','Accountable owner','Affected packages','Resolution / lead time','Fallback and independent work'],blockers.map(b=>[b.id+' / '+b.type,b.title,b.owner,b.packages.join(', '),b.resolution_evidence+' — '+b.lead_time,b.fallback+' Independent: '+b.independent_work]))}

Engineering backlog is separate from these evidence/decision gates: F1 and F2 are confirmed actionable source defects; 005/006/007 complete known technical gaps; the remaining domain packages implement or validate explicit workflows. B08 needs current reproduction before repair. Unknown usability, demand and network outcomes require customer evidence, not speculative engineering fixes. None of the lead-time assumptions is a provider or expert commitment.

The entire program remains incomplete if an externally blocked required lane remains open. A safe separable lane may ship under its own evidence gates without hiding the unfinished full scope. Support/import/manual-evidence fallbacks must accurately describe what they establish; they do not permit automation claims.

## Responsibility and review evidence

These are assigned responsibilities, not assertions that 22 independent humans or agents reviewed this roadmap. All roles are covered; AI model implementation/certification is specifically not applicable because no new model action is in scope. Qualified professional approvals remain external evidence.

${table(['Reviewer','Packages','Required review evidence / boundary'],reviewers.map(r=>[r.role,r.packages.join(', '),r.review_evidence]))}

Accountable package owners are in the JSON register. Implementers provide evidence; the relevant reviewer evaluates it independently. Product owns scope/value decisions, finance owns money semantics, security owns access/privacy, and the qualified country reviewer owns exact country-rule evidence. A seed account, generic role or passing test cannot stand in for a named accountable decision.

## Conditional and deferred ideas

${table(['Idea','Disposition','Reconsider only when','Owner / evidence packages'],conditional.map(c=>[c.idea,c.status,c.reconsideration_criteria,c.owner+'; '+c.evidence_packages.join(', ')]))}

## Prior-program reconciliation and reuse

${table(['Prior work','Treatment in this roadmap','Owner of remaining work'],[
 ['August 29 strategy / August 30 phases 0–3','Reuse scope/metric/privacy/delivery lessons. Do not import every one of its 12 analytical screens or add its estimate to this program. Latest audit priorities O1/O2/O3 prevail.','Product/program'],
 ['P0-02 ownership and P0-03 analytical context work','Existing 12-surface/53-KPI design and normalizer are reused. Runtime context and exact policy acceptance still need source/candidate-bound closure.','001,004; finance and platform owners'],
 ['Managed module configuration/grants/navigation','Already implemented; no replacement entitlement engine. Fix precisely inventoried analytics entries.','002,024'],
 ['Manual reconciliation modernization','Existing residual arithmetic, safe retry, candidates, approvals and retained evidence are reuse points. Historical 13-case database and EN/FR browser evidence is not a fresh full-lane gate.','010,027'],
 ['Daily Digest / finance route state work','Preserve loading/error/denied primitives and specialist paths. Add only missing task states and prove user completion.','008,023'],
 ['HRIS/self-service/payroll and imports','Existing source/approval/payment/readiness chains and governed staging are reused. Country review, mobile completion and opening balance proof remain separate packages.','007,015,016,019,020,021'],
 ['Other active workflow/module/table programs','Read current owner register and source hash before editing. Do not overwrite their status or declare their wider scope complete. Count reusable fixes as reduced remaining scope on re-estimation.','Every owner; integration at 027']
 ])}

## Evidence integrity and gate status

${table(['Check','Planning result','Limits'],[
 ['Current branch, status and source hashes','PASSED','Unfrozen shared worktree; final drift check recorded separately.'],
 ['Six source graphs','PASSED','Navigation evidence only; graph age does not establish runtime behavior.'],
 ['Fresh selected Jest suites',tests.numPassedTests+' tests / '+tests.numPassedTestSuites+' suites PASSED','Mocked/contract evidence for selected existing behavior.'],
 ['F1/F2 source execution','REPRODUCED','Synthetic dependencies, no deployed request.'],
 ['Country gate','BLOCKED: 11/12','Qualified source-artifact expert approval missing.'],
 ['New live/database/browser/a11y/restore/provider checks','NOT RUN','Listed as future execution evidence.'],
 ['Broad build/seed/migration/deploy','NOT RUN','Not required or authorized by this planning assignment.'],
 ['Package IDs, coverage, graph and estimates','See validation.json','Planning structure only; no release readiness implied.']
 ])}
`;

const first30=`# Stoquify — executable first 30 days

Planning date: ${date}. Start at mobilization, not automatically on this date. This backlog is prepared for execution; **no implementation, deployment or external outreach was performed by the roadmap run**. The complete context is in ${link(prefix+'execution-roadmap.md','the roadmap')} and ${link(prefix+'work-packages.json','the work-package register')}.

## Intended day-30 result

Business Pulse correctly reports the scoped authoritative sales metric; every identified analytics entry enforces its durable module rule before reading; and the country-review packet identifies the exact supported scope, reviewer and remaining evidence. These are targets, not current passes. Early role baselines, delivery arrangements and migration samples have started. A delayed expert decision does not become an invented approval.

The first three eligible packages are 001, 002 and 003. They have no internal hard predecessor. 001/002 are engineering corrections; 003 is a bounded preparation package with external approval explicitly separated. Finance/access policy decisions B07 may block a disputed behavior but not reproduction, inventory, tests or a concrete reviewable change. Design and sample preparation under 004/020 can proceed in budgeted small slices.

## Capacity and ownership

Lean assumes 3 engineers at 70% project focus: about **9 effective engineer-weeks** over 30 calendar days. Target allocation: 001 = 4; 002 = 3; 003 = 1; initial 004 = 0.5; initial 020 = 0.5. This uses nearly all first-month capacity: high estimates or review rework move unfinished items forward. It does not claim complete 004/020 or O1/O2/O3 by day 30. QA, design, security/SRE, finance and country-review allocations are separate as stated in the roadmap.

Two major engineering packages maximum. The analytics owner coordinates current daily-sales work; platform access owns the route/guard contract. Product/payroll prepares the review packet with limited engineering support. The frontend/product owner collects source-grounded role observations and migration requirements using remaining scheduled capacity. Do not silently book the same person simultaneously to two full allocations.

With six engineers, preserve the same decisions and gates while completing more 004/020 work and beginning 005 delivery, 006 instrumentation and 011 operations. Increased staffing does not compress expert approval or customer observation periods.

## Daily sequence and review points

${table(['Days','Work and owner','Concrete handoff / exit'],[
 ['0–2','Analytics/access owners refresh Git status, source hashes and scoped findings. Product names package owners and identifies overlapping active program work. Payroll/product prepares review request; integration/SRE inventories channel/environment needs.','Bound starting candidate, file ownership, current reproductions, existing tests, decision questions and no application writes outside assigned scope.'],
 ['3–5','Finance decides or narrows recognition/currency/period policy; platform chooses concrete analytics module/retained-access rules. Engineers write meaningful failing cases. Country owner assembles versioned sources and scope questions.','Reviewable contracts and precise acceptance cases; disputed semantics explicitly unsupported. Independent source reproduction establishes the trigger.'],
 ['6–10','001 implements the smallest finalized-sales/context slice; 002 binds server enforcement across route and feeding action/export entries. Product observes initial owner/manager tasks.','Positive and denied cases passing in scoped local tests; service contract before UI changes. Country packet ready for qualified review; no source-check-to-approval substitution.'],
 ['11–15','Extend 001 to return/time/currency/decimal and caller consistency; extend 002 to lifecycle/stale/wildcard states and retained exports. QA prepares isolated authenticated proof.','Exact negative matrix, no denied downstream reads, no duplicate/mixed-currency totals. Known environment gaps assigned under B04.'],
 ['16–20','Run candidate-bound integration tests where environment permits; inspect role/currency/date render states in EN/FR. Qualified reviewer returns issues or remains pending.','Reconciled test receipts and corrected failures. Missing browser/database evidence stays open; it is not replaced with a screenshot of loading state.'],
 ['21–25','Resolve focused findings; rehearse safe feature/route rollback and history-preserving correction. Product prepares O1/O2/O3 next slices. Migration owner obtains or requests permitted anonymized samples.','Small internally validated changes and evidence packet; 004/020 partial handoffs, not imaginary completed samples.'],
 ['26–30','Independent finance/security/QA review, source-drift check and remaining-gate register. Re-estimate actual throughput and staffing.','Accept only evidenced scope; carry missing expert/provider/environment gates forward. Choose next two engineering packages from actual dependencies, normally 004/020 completion then 005/006/008/011.']
 ])}

Long-lead owner tasks start in week 1: qualified Cameroon reviewer and exact employer profile; payment statement specification/provider arrangements; transactional delivery setup; isolated database/authenticated test roles; three anonymized migration samples; normal phones and consenting employees/managers; cooperating accountant firms and owners. This roadmap does not itself send messages or enter provider arrangements. The responsible human can start those external actions, or explicitly authorize a later run to do so.

## Execution brief 1 — ${id(1)}: authoritative sales and context

**Mission.** Correct the reproduced Business Pulse projection without changing authoritative historical transactions. Preserve the existing analytical context and current daily-sales improvements. Deliver a source-linked finalized POS-sales result first, then prove remaining declared sales channels and related callers.

**Starting evidence.** ${link('services/analytics/sales-analytics.service.ts','Sales analytics service')}; ${link('services/analytics/analytical-context-contracts.ts','analytical context contract')}; ${link('services/analytics/daily-sales-read.service.ts','new daily-sales read service')}; ${link('services/analytics/daily-sales-period.ts','local-day helper')}; ${link('services/pos/pos.service.ts','authoritative POS owner')}. The source-hashed reproduction returns 1,000/2 for completed 100 plus unfinished 900, and the production composition defaults to XAF/server day. The normalizer already exists; replacing it is outside scope.

**Execute.** Refresh the listed files and current owner changes. Trace each metric to sale/payment/return event, status and effective date. Reuse AN-D04/AN-D12 policy questions and agree an explicit currency/rounding/time contract with Finance. A complete POS sale and a confirmed sales order may represent different facts; do not install a blanket status filter across every channel. Add the missing fixture, then bind the context resolver, exact aggregate and source policy in the smallest affected service/caller set. Represent missing facts as unavailable, not zero or an arbitrary currency. Update only directly affected display labels/state. Record source hashes and old/new fixture output.

**Acceptance.** Completed 100 + draft 900 + cancelled 700 = finalized POS sales 100, one transaction. Return/refund handling is explicit and cannot double-subtract. Tenant midnight/DST and cross-period corrections tie to effective source dates. XAF/XOF never mix. Decimal precision survives aggregation. Foreign locations and stale/duplicate evidence fail safely. Historic records remain unchanged. Finance reviews the declared semantics independently of the implementing engineer.

**Existing verification command, from the workspace:**

\`\`\`text
${packages[0].verification.existing_command}
\`\`\`

Add only missing recognition/return/query-boundary/integration cases. The existing Business Pulse shape tests are insufficient on their own. Save source binding, exact test receipt, reviewed metric policy and source tie-out under a new implementation evidence folder for ${id(1)}. No broad build or migration is needed for a read-model correction unless actual discovery proves otherwise.

**Completion / recovery.** Engineering completion means the bounded changes and developer tests exist. Validated means the required database/caller/permission and Finance review evidence exists. Pilot/production require the later applicable gates. Disable a misleading derived metric if necessary; do not roll back to known false totals or alter the ledger to match the dashboard. Escalate a missing authoritative event as a specific contract gap, not permission to invent one.

## Execution brief 2 — ${id(2)}: analytics access enforcement

**Mission.** Bind the three existing analytics routes and their feeding actions/exports to durable module authority before data access. Preserve the current managed grant and navigation system.

**Starting evidence.** ${link('app/[locale]/(dashboard)/dashboard/analytics/analytics-route-access.tsx','analytics wrapper')}; ${link('app/[locale]/(dashboard)/dashboard/analytics/analytics-route-data-access.ts','surface catalog')}; ${link('services/modules/module-entitlement.service.ts','entitlement authority')}; ${link('lib/security/server-authz.ts','server authorization helpers')}. The current wrapper performs RBAC and calls its data callback without the module check. The reproduction is bounded synthetic source evidence, not a live exploit.

**Execute.** Inventory the three catalog routes, direct navigation, feeding actions, APIs and exports; document the exact module slug and allowed read/write/retained behavior for each. Reuse the existing guard semantics, including current managed grants, organization scope and invalidation. Place the guard before service reads, not solely in Sidebar. Preserve lawful retained exports through their own authority. Add scoped negative tests and render useful module-locked/denied states. Never globally flip every observe-mode surface or grant access directly from a provider/billing event.

**Acceptance.** Enabled, absent, disabled, expired, read-only and wildcard-RBAC scenarios match the reviewed matrix. Every denial causes zero downstream reads and no export leakage. Organization switching and stale session/grant state cannot retain authority. Legitimate permitted behavior still works. Financial record retention survives plan changes, and billing replay cannot grant independent authority.

**Existing verification command:**

\`\`\`text
${packages[1].verification.existing_command}
\`\`\`

Add wrapper/action/export tests for the actual entries and candidate-bound authenticated negative cases in an isolated environment. Reuse the tests' real permission/tenant/module chain with mocked persistence only where appropriate; then distinguish that evidence from real deployed behavior. Record a route/action/export access matrix with exact source versions and reviewer.

**Completion / recovery.** Security and platform product review the access/retention contract. A passing module unit suite does not prove an untested route is guarded. If compatibility fails, pause the changed entry or restore a previously safe guarded path; do not restore an access bypass. Leave unrelated module lifecycle code with its active owner.

## Execution brief 3 — ${id(3)}: qualified country review preparation

**Mission.** Make the external country decision concrete and reviewable for one Cameroon employer profile and effective period. This package prepares evidence and tracks the decision; it does not grant approval or publish a pack.

**Starting evidence.** ${link('services/regulatory/country-packs/registry.ts','static country registry')}; ${link('services/payroll/payroll-tax-rule-evaluator.ts','fail-closed evaluator')}; ${link('scripts/statutory-country-pack-production-gate.js','statutory readiness check')}; ${link('what-next/2026-09-06-stoquify-enterprise-roadmap-evidence/statutory-readiness.md','fresh 11/12 blocked result')}. CM is the inspected static entry; deployed database coverage is unknown. Two captured artifacts and source hashes do not substitute for qualified approval.

**Execute.** Inventory exact rules, source documents, effective dates, exceptions, pack hashes, current review records and support assumptions without reading secrets. Prepare a rule-to-source-to-expected-result matrix and define employer/profile exclusions. Name the human qualified reviewer and internal Payroll owner when actually known; otherwise record the role and pending appointment. Include approved inputs, freeze/calculate/review/approve, net pay/payslip, posting, settlement and declaration receipt examples. Plan two cycles and a corrected payslip scenario. Start provider/sandbox evidence intake in parallel. Preserve unsupported and review-required behavior.

**Acceptance.** A complete review packet identifies source/version, scope, expected cases, unresolved questions, responsible reviewer and required decision evidence. The reviewer response is recorded only when received and bound to the reviewed version. Missing, expired or rejected approval remains blocked. A traceable preparation handoff can be complete while the external approval gate remains pending; package 015 may not claim reviewed production support until its exact external evidence exists.

**Safe existing unit baseline:**

\`\`\`text
${packages[2].verification.existing_command}
\`\`\`

For a fresh static report, inspect the script and use a **new** output directory before running:

\`\`\`text
node scripts/statutory-country-pack-production-gate.js --mode fail --out <new-evidence-directory>/statutory-readiness.md --json-out <new-evidence-directory>/statutory-readiness.json
\`\`\`

The placeholder must be replaced with the actual new implementation evidence path; it is intentionally not a command to overwrite this roadmap's evidence. A blocked result is expected until real source-artifact expert approval exists. No source-check flag, seed user, timestamp or signature may be manufactured. Save the review packet, applicability matrix, open-issue register, reviewer response when available, and two-cycle plan. Qualified review waiting time is separate from the package's 0.5/1/2 engineer-week preparation estimate.

## Day-30 review packet and next-run instructions

Each owner provides the actual diff, source/environment binding, acceptance results (passed/failed/skipped/blocked), unresolved questions, reviewer record and safe recovery procedure. Update a new execution record; preserve the audit and this planning baseline. No old passing suite or broad scan marks unvisited paths complete.

At day 30, report 001/002 independently as complete, partial or blocked with exact evidence; report 003 preparation and external approval separately. Record actual time spent and remaining estimate, recruitment/sample progress, provider/delivery status and ownership conflicts. Re-estimate days 31–90 rather than pretending slippage never occurred. Source changes made concurrently must be reconciled before the next package starts.

The next run should select the first package with satisfied hard prerequisites, required scope decisions and an available owner/WIP slot, read its full JSON contract, execute only its slice, and preserve linked validation/rollback artifacts. A source-only design package does not permit deployment. The roadmap is complete when these four planning artifacts validate; the system hardening program is complete only after execution and its required rollout/value decisions.
`;

// An evidence-preparation package contributes to country review; it does not depend on its own downstream cycle proof.
for(const p of packages){p.gate_applicability=p.gates.map(g=>({gate:g,stage:p.number===3&&g==='G06'?'CONTRIBUTION_ONLY_AT_PREPARATION; required for downstream country claims':g==='G12'?'MEASURED_VALUE':g==='G11'?'PRODUCTION_ENTRY':g==='G10'?'PILOT_ENTRY':g==='G05'||g==='G06'?'EXACT_EXTERNAL_CLAIM_OR_SUPPORTED_RELEASE':'VALIDATED_BEHAVIOR'}));}
const artifacts=[
 [prefix+'execution-roadmap.md',roadmap],
 [prefix+'work-packages.json',JSON.stringify(registry,null,2)+'\n'],
 [prefix+'traceability-and-blockers.md',trace],
 [prefix+'first-30-days.md',first30]
];
for(const [file] of artifacts)if(fs.existsSync(path.join(root,file)))throw Error('Preserving existing artifact: '+file);
for(const [file,body] of artifacts)fs.writeFileSync(path.join(root,file),body,{encoding:'utf8',flag:'wx'});
const currentSourceHashes=baseline.sources.map(s=>({...s,current_sha256:crypto.createHash('sha256').update(read(s.file)).digest('hex')}));
const validation={generatedAt:new Date().toISOString(),result:'PASSED_FOR_PLANNING_ARTIFACTS_ONLY',packages:packages.length,recommendations:recs.length,all_five_findings_mapped:true,all_ten_opportunities_mapped:true,reviewer_roles:reviewers.length,conditional_ideas:conditional.length,dependency_graph_acyclic:true,dependency_ids_valid:true,source_and_test_paths_exist:true,unique_package_and_recommendation_ids:true,shared_effort_counted_once:true,engineering_person_week_totals:totals,release_ready_packages:packages.filter(p=>p.production_status==='READY').length,all_release_gates_unverified:true,fresh_test_result:{suites:tests.numPassedTestSuites,tests:tests.numPassedTests,failures:tests.numFailedTests},critical_path:criticalPath,source_drift:currentSourceHashes.filter(s=>s.sha256!==s.current_sha256),artifacts:artifacts.map(([file,body])=>({file:path.join(root,file),bytes:Buffer.byteLength(body),sha256:crypto.createHash('sha256').update(body).digest('hex')}))};
fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(validation,null,2)+'\n');
console.log(JSON.stringify(validation,null,2));
