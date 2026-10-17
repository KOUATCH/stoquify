# Stoquify: the missing capabilities most likely to create a moat

**Assessment date:** 27 September 2026  
**Decision type:** product investment and validation; no feature implementation  
**Workspace:** `E:\ohada saas\Focused projects\stoquify`  
**Observed HEAD:** `62a56036a5ac9b37236a20c9b148052199069479`  
**Branch:** `codex/migration-control-plane-release-2026-08-29`

## 1. Investment decision

**Invest first in an accountant-led evidence-resolution workflow, using payment-to-close proof as the first repeated customer job.** Extend the existing accountant portfolio so a firm can identify which client needs work, request and review the missing evidence, resolve the underlying exception through its owning service, and deliver a traceable close package. Measure successful work and repeat use, then test whether firms bring their next client.

The platform already has much of the difficult internal foundation. The strategic gap is turning that foundation into a reliably completed, externally shared business outcome. The accountant portal, reconciliation engine, proof exports, supplier acknowledgement, customer statements, and cash command are **not absent**. Their existence changes the investment decision: finish and validate the connected customer experience before adding more modules.

Four opportunities survive this review:

| Rank | Capability to complete or add | Current gap | Investment decision |
|---|---|---|---|
| M1 | Accountant evidence work desk and repeat-client onboarding | Existing portfolio and per-client review; cross-client execution, activation outcomes, and commercial channel remain incomplete or unverified | Lead validation and bounded completion |
| M2 | Proven local payment-to-close operations | Generic ingestion and extensive reconciliation exist; named-rail operation, reliability, and customer outcomes are unverified | First operational use case for M1; complete one rail |
| M3 | Cash-constrained stock and obligation planning | No complete general scenario/forecast-versus-actual lifecycle found | Validate with a manual prototype before building |
| M4 | Repeat supplier-to-buyer transaction collaboration | PO proposals exist; dependable delivery and the broader invoice/discrepancy/remittance lifecycle remain incomplete | Narrow closed-cohort experiment after M1/M2 |

**M3 is the clearest substantial new product capability missing in the inspected source. M1 and M2 have the strongest near-term strategic fit. M4 has the strongest conditional network-effect mechanism, but the weakest near-term adoption certainty.** A fifth recommendation would dilute the decision.

The potentially defensible combination is: reviewed operating records → faster resolution with trusted local professionals → repeated client and counterparty participation → reusable, permissioned knowledge and lower delivery cost. This is a proposed mechanism, **not evidence of an existing moat**. No examined evidence establishes product-market fit, retained paid cohorts, realized network effects, or a willingness-to-pay premium.

## 2. What was examined, and what the evidence means

This assessment read the supplied prompt, root repository instructions, the docs-report-publisher skill, current source, schema, selected tests, architecture graphs, and recent strategy/review reports. Competitor primary sources were consulted on 27 September 2026. The prompt is published beside this report. A same-content dated report copy is retained under `what-next/`.

The initial successful bounded status command found **88 tracked changes and 485 untracked entries**, ignoring submodules. A later source manifest recorded **89 tracked changes and 489 untracked entries**, after publication preparation began and other workspace activity continued. These are Git status entries, not total files. Conclusions concern the inspected working tree, not HEAD alone. No unrelated changes were reverted. Twenty-one relevant source/test files were fingerprinted for a closing drift check.

Evidence labels:

- **Source-confirmed:** connected code or an explicit contract was inspected. This does not establish deployed behavior.
- **Test-confirmed:** one of the 38 selected local tests exercised the stated foundation, with mocked dependencies.
- **Bounded absence:** the workflow was not found in the specified searches and adjacent source inspection. Alternative names, private systems, and uninspected work remain possible.
- **Vendor claim:** a competitor advertises or documents a capability; no trial or customer-reference verification was performed.
- **Hypothesis:** demand, economic value, defensibility, adoption, or feasibility requiring validation.

Source discovery covered `app/`, `actions/`, `services/`, `components/`, `hooks/`, `lib/`, `config/`, and `prisma/schema.prisma`. Feature searches excluded generated graphs and test directories. Searches for general cash scenarios returned seven narrower payroll-related references. Searches for selected shared-network identity/benchmark vocabulary and retained-activation/financial-cutover vocabulary returned no matches. These results support scoped questions, not universal absence claims. Full patterns and outputs are saved in the evidence directory [E1].

No live database, provider account, customer interview, competitor demo, authenticated browser, production deployment, or external outreach was used. Prior report claims about release readiness, defects, and passed gates were not promoted to current facts. In particular, the September 6 audit's analytics defects were **not reproduced in this run** and are not asserted as current defects.

### Working customer and commercial position

Current public product copy describes connected sales, stock, purchasing, payments, people/payroll, accounting, and review workflows, with availability dependent on enabled modules, permissions, and setup [R1]. The module catalog supplies accounting, reconciliation, purchasing, finance, analytics, and other domain boundaries [R2]. This supports a modular business-operations SaaS proposition; it does not establish realized revenue or paid package uptake.

Use **Cameroon inventory-heavy retail/distribution SMEs with an accountant and several operational roles** as the initial validation segment. A pilot with approximately 1–5 locations is a design assumption, not an observed customer profile. The static regulatory registry contains Cameroon [R3]; that is not a declaration of approved production country coverage. Do not extrapolate a common accounting framework into common payroll, tax, or authority integrations.

The buyer hypothesis is the owner or finance lead; an accounting firm may become the buyer, implementation partner, or recommender. The examined public pricing component organizes adoption paths rather than establishing a verified current tariff. Interview both buyer types before deciding who pays for the collaboration layer.

## 3. Existing foundations and precise gaps

| Capability | Current classification | Evidence and investment consequence |
|---|---|---|
| Accountant access and portfolio | Source-confirmed; selected controls test-confirmed | Active, effective, unexpired grants constrain portfolio clients. The read model shows client identity and latest close readiness/blockers; the UI links into ledger evidence. It is not a complete firm-wide work-management product [R4–R6]. |
| Missing-close-evidence review | Source-confirmed | A queue already carries requests, due dates, submitted responses, review state, and delegated authority. Do not rebuild request/review from scratch [R7]. |
| Close proof export and invalidation | Source-confirmed | Draft/certified export modes and invalidation source contracts exist. Product certification labels are not independent legal or professional certification [R8]. |
| Payment ingestion | Source-confirmed; selected controls test-confirmed | HMAC adapter, signature/replay handling, duplicate checks, and tamper evidence exist. One generic adapter does not prove MTN, Orange, bank, or aggregator production interoperability [R9–R10]. |
| Reconciliation and exception closure | Source-confirmed foundation | Workbenches, matching, retained evidence, sign-off and closure services are present. The investment is verified rail operation and reduced exception-handling effort, not another reconciliation engine [R11]. |
| Cash Command / Stock-to-Cash | Source-confirmed; Cash Command controls test-confirmed | Existing composition pulls operating, payment, inventory, close and payroll evidence. Payroll cash obligations are narrower than a general cash-plan lifecycle [R12–R13]. |
| General planning and outcomes | Bounded absence | No complete saved assumptions → versioned scenario → decision → actual-versus-forecast workflow found. Supplier lead times exist, so procurement inputs are partial foundations rather than absent data [R14, E1]. |
| Supplier collaboration | Partial; authority boundary test-confirmed | Signed PO envelopes, proposals, buyer review and amendment references exist. The invite event explicitly has no outbox messages. A general external invoice/discrepancy/remittance lifecycle and reusable shared supplier identity were not established [R15–R17]. |
| Customer statement participation | Source/schema foundation | Statement snapshots, tokens, recipient actions and delivery records already exist. Treat receivables collaboration as an extension candidate, not an absent portal [R18]. |
| Referral and activation measurement | Partial | The current funnel counts prepared links, clicks, registrations and accepted invitations over ALL_TIME. It does not measure retained productive use or paid cohort quality [R19]. |
| Migration and onboarding | Partial | Master-data staging, mapping, validation and approval exist. Its explicit boundary excludes opening balances, opening stock, and historical transaction migration. Domain-specific opening operations may exist elsewhere; a coordinated, verified cutover was not established [R20]. |
| Open marketplace, cross-tenant benchmarks, lending | Not established in inspected implementation | These remain proposals or deferred options. Existing customer/supplier records and loan fields in analytics do not demonstrate these businesses [E1]. |

Recent reports had already identified accountant collaboration, payments, forecasting and supplier participation [P1–P3]. This review corroborates parts of that direction, corrects the idea that their entire foundations are missing, and raises the competitive standard with refreshed vendor evidence. The September 24 verification report is useful context but its 123 tests are separate from this run's 38 tests [P4]. The June proof-timeline artifact uses an older workspace and includes textual checks; its “ready” result is historical evidence only [P5].

### Architecture graph cross-check

The five canonical graphs contain 1,044 action nodes, 622 app nodes, 1,173 component nodes, 308 hook nodes and 72 type nodes. The documented refresh is dated August 9; current source takes precedence [E2]. Specific navigation evidence:

| Graph node | Community | Relationship checked in current source |
|---|---:|---|
| `accounting_accountant_access_actions_getaccountantportfolioaction` | 58 | Protected action calls the accountant portfolio service. |
| `accountant_portfolio_page_accountantportfoliopage` | 75 | Existing route renders the portfolio; M1 has an extension point. |
| `accounting_accountantportfolio_tsx` | 140 | Existing client cards link to the accountant portal. |
| `cash_command_page_cashcommandpage` | 38 | M3 should extend the existing cash workflow. |
| `payments_usepaymentreconciliationworkbench_usepaymentreconciliationworkbench` | 40 | Reconciliation already has a dedicated client/server workflow. |

No matching standalone type node was found in the sampled search; service-local contracts carry much of this structure. A graph omission is not a capability omission.

## 4. Current competitive pressure

All sources below were accessed on **27 September 2026**. This table reports advertised/documented functions, not independently tested performance, legal compliance, customer counts, or coverage. Undocumented functionality remains unknown.

| Alternative | Relevant evidence | Implication for Stoquify |
|---|---|---|
| Odoo | Its fiscal-localization documentation lists Cameroon and separates payroll localization. Its accounting-firm offering describes client acquisition, project/document work and invoicing [S1–S2]. | Accounting, a client portal and a professional channel are established competitive categories. Test a specific local exception-to-close job, not general feature breadth. Exact local configuration, service cost and payment coverage need a demo. |
| Sage 100 ecosystem | The official export catalog identifies an ECF OHADA offering. Its accounting-automation page describes invoice capture, approval and order matching [S3–S4]. | Document collection and approval alone are not distinctive. The automation page's French regulatory context must not be treated as Cameroon deployment coverage. |
| Omamori | Advertises local OHADA operations, Mobile Money, offline mobile use, onboarding and accounting-firm packages. Listed Solo and Équipe prices are 15,000 and 25,000 FCFA/month; the firm offer is quoted [S5]. Its application page also advertises 30/60/90-day forecasts, replenishment and budget-versus-actual [S6]. | A local all-in-one story, generic forecast, or accountant package is insufficient differentiation. Validate reliable completion and lower operating effort. Pricing comparison requires actual scope, support, fees and user counts. |
| KiboERP | Its Cameroon retail page claims payment traceability/reconciliation, integrated stock/accounting, supplier purchases and loyalty. It explicitly distinguishes tracking Mobile Money from processing it; SaaS needs connectivity while its on-premise mode uses a local network [S7]. | Do not conflate payment recording, provider settlement and offline modes in competitive claims. Treat it as a relevant advertised alternative; customer scale and operational maturity were not verified. |
| Julaya | Advertises transfers, collections, approvals, traceable transactions and accounting exports. Its site names banking relationships in Côte d'Ivoire, Senegal, Benin and Togo [S8]. | A payment-workflow substitute or possible future partner in those markets, not established Cameroon coverage. Payment convenience alone can be supplied outside an ERP. |
| Spreadsheet + accountant + calls/messages | Pilot substitute hypothesis; no prevalence study was conducted. | Measure reconciliation time, repeated requests, duplicate entry and coordination cost. Replacing a familiar process must justify onboarding effort. |

**Competitive conclusion:** no source establishes that Stoquify uniquely solves the proposed jobs. The defensible claim to test is better end-to-end execution for a narrowly selected customer and local operating context. Require like-for-like task demos, including failure and recovery, before claiming superiority.

## 5. M1 — Accountant evidence work desk and repeat-client onboarding

**Customer, recurring problem and buyer.** Accounting firms and client finance teams repeatedly chase missing records, determine which client needs intervention, and reconstruct explanations. The owner or firm pays if the time saved and improved service exceed the onboarding and subscription cost. Frequency and cost are hypotheses to measure across ordinary weekly work and monthly close.

**Current gap and confidence.** Portfolio cards expose latest close readiness and link to a client portal; a separate missing-proof review queue already has requests, due dates and responses [R4–R7]. What is not established is a usable cross-client work list connecting those states, accountable next actions, delivered requests, reviewed outcomes and repeat-client activation. The ALL_TIME referral funnel cannot prove the latter [R19]. Source confidence is high for the narrow portfolio contract; commercial confidence is low.

**First useful experience.** An accountant opens the existing portfolio, finds an overdue payment-proof request for Client A, enters that client's authorized case, reviews the submitted statement and resolution, and exports the resulting close evidence. The owner can see what was resolved and what remains uncertain. The accountant then onboards Client B with independently granted access. Reauthorize each client and each action; never combine their raw records into a universally accessible list.

**Distinctive advantage to test.** The value is a shorter and more reliable evidence-to-resolution cycle inside a local professional relationship. Odoo and Omamori already target firms [S2, S5]. A portfolio screen is easy to copy. Trusted implementers, repeatable reviewed practices, demonstrable outcomes and low-friction client onboarding take longer to establish.

**Compounding mechanism.** More completed client work → better authorized templates and onboarding practice → lower effort for the next client → more firm-led introductions. This is initially a distribution and learning advantage. It becomes a network effect only if an additional active participant measurably improves another participant's outcome; referral counts alone do not establish that. Customers retain their records and can export them.

**Six-month replication challenge.** A funded rival could copy the queue and package. It could also recruit accountants. The residual advantage would have to be an already productive local partner base and accumulated practice/outcome evidence. Without those, this remains a good feature rather than a moat.

**Feasibility and economics.** Reuse existing grants, comments, close findings, request/review actions, delivery evidence and exports. Add a bounded cross-client read projection, source-owned task transitions where missing, outcome metrics and onboarding support. Plan roughly **4–8 engineer-weeks** for a narrow slice after discovery, plus qualified accountant participation, QA, design and support; this is a rough estimate, not a quote. Test firm-paid versus client-paid packaging and measure gross contribution after onboarding and support time.

**Validation and rejection.** Propose 3 firms and 10 consenting clients for two close cycles. First time representative tasks using current tools. Continue if median request-to-reviewed-resolution time falls at least 30%, at least 2 firms bring another client without founder prompting, at least 7 clients complete a second productive cycle, and at least 2 firms or their clients accept a stated paid pilot price. These are proposed decision thresholds, not market facts. Reject or redesign if manual assistance accounts for the gain, firms resist the workflow, or value is no better than their existing system. A positive result justifies a larger cohort, not a causal growth claim.

**Cost of omission.** Stoquify could retain strong internal evidence while the accountant's daily work and customer relationship remain elsewhere. That would weaken adoption and distribution. This risk is strategically credible but not yet measured.

## 6. M2 — Proven local payment-to-close operations

**Customer and problem.** Owners and finance teams must explain differences among sales, internal payment records, provider statements, fees, reversals and settlement. They pay for reduced investigation time and fewer unresolved balances, not for an adapter count.

**Current gap and confidence.** Generic HMAC ingestion, durable evidence, reconciliation workbenches, closure and certification services exist [R9–R11]. The inspected adapter accepts a provider code; that does not prove a specific operator's protocol. This run did not establish live integration contracts, sustained named-rail operation, settlement coverage or support economics. Classify this as **implementation present, operational coverage unverified**, not wholly missing reconciliation. The selected provider-event suite passed seven tests; it does not certify a provider integration.

**First useful experience.** Start with one merchant cohort and one actual supported statement/rail format. A sale is linked to provider evidence, fees and settlement. A mismatch remains an explicit case with an owner and approved next step. A reviewed resolution updates the authoritative domain and the evidence available for close; stale proof cannot silently remain valid. Ingestion acceptance, provider confirmation and bank settlement remain distinct states.

**Defensibility.** Reliable operation across local edge cases can accumulate useful format mappings, reviewed exception playbooks, regression fixtures and provider relationships. Each resolved case can reduce the next investigation's effort. Use tenant-local patterns first; cross-tenant reuse requires appropriate rights, minimization and aggregation. Raw financial records do not become a shared training asset automatically.

**Competition and replication.** KiboERP advertises reconciliation and Julaya offers financial traceability [S7–S8]. Therefore a Mobile Money badge or matching screen is ordinary competitive functionality. A rival could copy the UI and basic rules within six months. The harder asset would be sustained reliability, correction history, provider-specific operational knowledge and cost-effective support. A provider can also internalize the feature, so avoid dependence on one commercial relationship.

**Feasibility and value.** Extend existing ingestion and reconciliation owners, retain idempotency and maker-checker controls, and instrument unresolved age, false resolutions and support effort. A bounded first-rail completion is provisionally **4–8 engineer-weeks**, with contracting, credentials and provider support on a separate and uncertain schedule. Revenue hypotheses are finance-package retention and willingness to pay for dependable operations; no payment revenue or fee margin is assumed.

**Validation and rejection.** Propose 5 merchants, 30 days and at least 1,000 permissioned transactions, plus a controlled corpus of duplicates, reversals, fees, late events and missing statements. Continue if median investigation time falls 50%, every tested resolution retains source evidence, no seeded wrong match is silently finalized, and operators can handle failures within a pre-agreed support budget. Measure unmatched and unknown cases separately. Stop expansion for unexplained financial differences, lost events, support cost above the agreed ceiling, or unavailable provider access. A pilot of this size does not establish rare-event safety.

**Cost of omission.** Users may still need a spreadsheet to establish what was actually received, limiting trust in close outputs and weakening M1. Where payment exceptions dominate observed work, this should become the first priority.

## 7. M3 — Cash-constrained stock and obligation planning

**Customer and problem.** Owners, buyers and finance leads must decide what to purchase, transfer, defer or collect while preserving cash for obligations. Stock alerts and historical balances do not answer which action is affordable across the coming weeks.

**Verified gap.** Cash Command composes current evidence and payroll obligations; Stock-to-Cash explains operating flows. Supplier lead times and inventory inputs exist [R12–R14]. No complete general lifecycle for saved cash assumptions, scenario revisions, approved choices and actual-versus-forecast review was found [E1]. Confidence is medium-high within the inspected source, not a claim that every forecast calculation is absent.

**First useful experience.** An owner opens the existing Cash Command and compares a 13-week base case with delayed customer receipts. A buyer sees that a proposed replenishment would breach a chosen cash buffer before payroll, compares a transfer or smaller order, and sends the selected proposal to the existing approval workflow. Weeks later, actual receipts and outflows are compared with the saved assumptions. Forecasts never rewrite ledger truth or execute purchases automatically.

**Competition and moat.** Omamori already advertises forecasts, replenishment and budget comparisons [S6]. The defensibility hypothesis is the connection among reliable actuals, explainable constraints, decisions and measured outcomes in a specific trade segment. Repeated local decisions could improve lead-time and collection assumptions. Begin with deterministic, inspectable calculations; an AI label adds no defensibility. Individual-tenant learning is not a network effect.

**Replication challenge.** A competitor can reproduce a 13-week spreadsheet or screen quickly. Longitudinal, high-quality decision/outcome histories and an adopted cross-role planning routine are harder to recreate. If ordinary ERP configuration or a spreadsheet produces equivalent decisions at lower cost, the proposed moat fails.

**Delivery and economics.** Reuse Cash Command, inventory, AR/AP, payroll aggregates and supplier inputs. Establish authoritative opening cash, obligation coverage, dates, currency, uncertainty and the distinction between recorded and expected receipts. Add scenario persistence only after a manual prototype proves useful. A bounded first production slice may need **8–14 engineer-weeks**, with finance design and data-quality work; full optimization is outside that estimate. Monetization could come from an advanced operations package; willingness to pay is unknown.

**Validation and rejection.** Propose an accountant-assisted prototype with 8 merchants for six weekly planning cycles, using consented exports and documented assumptions. Continue if 6 use it in at least 4 cycles, at least 4 identify a consequential decision it changes, and aggregate forecast absolute error improves 20% against a frozen simple baseline. Record errors by horizon and currency and publish missing-data rates. These small-sample thresholds are screening criteria. Reject or narrow if users cannot supply credible inputs, data preparation takes longer than current planning, or the tool adds precision without improving decisions.

**Cost of omission.** Stoquify may explain yesterday's business well while the next purchasing and cash decision happens elsewhere. That weakens daily dependence, but a broad planning build is premature until operating-data coverage and demand are demonstrated.

## 8. M4 — Repeat supplier-to-buyer transaction collaboration

**Customer and problem.** Buyers and suppliers repeatedly reconcile promised quantities/dates, accepted receipts, invoices, discrepancies and remittance. Calls and messages can separate the agreed promise from the records that determine payment.

**Current gap.** PO envelopes, signed access, proposals, review and amendment evidence exist. The supplier invite event writes `outboxMessages: []`; it does not itself enqueue delivery [R15–R17]. No complete shared supplier inbox, external invoice/discrepancy/remittance chain, or verified reusable cross-buyer identity was established. Existing internal AP, customer statements and buyer-side amendments must be preserved, not declared missing.

**First useful experience.** A known supplier receives a revocable invitation, acknowledges a PO and proposes a date change. The buyer reviews it through the purchasing owner. Later, the supplier submits evidence for an invoice discrepancy and sees a limited accepted-payment/remittance status. The same supplier can later participate with a second buyer under a separate grant, without seeing either buyer's private prices or records from the other relationship.

**Defensibility and network prerequisites.** Repeated counterparties could gain from one familiar participation workflow across buyers. More participating buyers could make supplier onboarding worthwhile; more responsive suppliers could improve buyer completion time. This requires actual relationship overlap, useful repeat work, trustworthy identity linking, consent, reliable delivery and support. An invitation counter or supplier directory is insufficient. Avoid public rankings and discovery until there is an independently useful transaction product.

**Competitive challenge.** Sage advertises order/invoice matching and other vendors provide purchasing workflows [S4, S7]. The hypothetical edge is lower cross-company coordination effort on real local trade relationships. A rival can copy forms and tokens within six months. The durable asset would have to be a repeatedly active set of overlapping relationships and demonstrated reliability; neither is proven now.

**Feasibility and business case.** Start by making the existing PO acknowledgement journey reliable, then add one discrepancy type. Keep external submissions as proposals; purchasing, inventory, AP and payment services retain authority. Add delivery recovery, limited identity/relationship contracts and support ownership before cross-buyer reuse. Estimate **6–12 engineer-weeks** for a narrow end-to-end slice, excluding an open marketplace. Buyer-paid collaboration with lightweight supplier participation is a pricing hypothesis; charging both sides early may prevent adoption.

**Validation and rejection.** First test 3 buyers and 8 known suppliers, manually verifying reachability and task value. Continue if at least 60% complete a second eligible task, median confirmation/discrepancy time improves 30%, and support effort stays within a pre-agreed ceiling. Only then recruit a cohort where at least 3 suppliers genuinely serve at least 2 participating buyers and measure whether the second relationship is easier to activate. Reject a network claim if repetition depends on founder prompting or shared participation yields no measurable benefit. Interview refusals and compare against suppliers' current systems.

**Cost of omission.** Supplier promises and disputes could remain outside the evidence chain, preserving re-entry and reconciliation costs. This is a plausible long-term lost advantage; it is less urgent than proving M1/M2 with current customers.

## 9. Prioritization and sensitivity

Scores are explicit strategic judgments, not measured ROI. Scale: 1 = weak, 5 = strong. For adoption and cost, a high score means less friction or lower delivery/operating burden. Evidence confidence is reported separately.

| Dimension, in vector order | Base weight | Rationale |
|---|---:|---|
| Pain and consequence | 20% | Solve a costly recurring job. |
| Recurrence | 10% | Create repeat useful work. |
| Fit with existing strengths | 15% | Reuse the evidence and control foundation. |
| Competitive whitespace | 10% | Reward distinction supported by comparison. |
| Compounding defensibility | 20% | Require an asset beyond copyable features. |
| Ease of adoption | 10% | Account for switching and participation effort. |
| Monetization potential | 10% | Test an identifiable buyer and sustainable value. |
| Delivery/operating affordability | 5% | Penalize uncertain integrations and support burden. |

| Option | Dimension scores in the order above | Weighted / 5 | Evidence confidence |
|---|---|---:|---|
| M1 | 5 / 4 / 5 / 3 / 5 / 3 / 4 / 4 | 4.35 | Strong narrow source evidence; low demand evidence |
| M2 | 5 / 5 / 5 / 2 / 4 / 3 / 4 / 3 | 4.10 | Strong foundation; live-rail and commercial evidence absent from this run |
| M3 | 5 / 5 / 5 / 2 / 3 / 3 / 4 / 2 | 3.85 | Bounded gap evidence; demand and planning economics untested |
| M4 | 4 / 4 / 4 / 3 / 5 / 2 / 3 / 2 | 3.70 | Strong PO boundary evidence; low network/adoption evidence |

M1/M4 receive high *potential* defensibility scores for relationship-based mechanisms, not a declaration that such assets exist. A reasonable skeptic can reduce those scores, as tested below.

Alternative weight vectors use the same dimension order: speed = 20/10/10/5/10/15/10/20; moat = 15/5/10/15/35/5/10/5; immediate cash = 30/20/15/5/10/5/10/5. All sum to 100.

| Scenario | M1 | M2 | M3 | M4 | Leading result |
|---|---:|---:|---:|---:|---|
| Base | 4.35 | 4.10 | 3.85 | 3.70 | M1 |
| Faster, cheaper delivery | 4.20 | 3.95 | 3.65 | 3.25 | M1 |
| Greater moat weight | 4.40 | 3.90 | 3.50 | 3.90 | M1; M4 rises |
| Immediate cash pain | 4.45 | 4.45 | 4.30 | 3.75 | M1/M2 tie |

If M1's defensibility score falls from 5 to 3 because firms will not repeat or refer, its base score falls to **3.95**, below M2. If it falls only to 4 and adoption to 2, its score is **4.05**, also below M2. Thus the recommendation is robust to these alternative weights but **not robust to missing partner demand**. Run M1 discovery first, and move M2 first if actual payment pain or partner refusal warrants it.

## 10. Essential prerequisites and ideas to defer

**Complete the path into trusted operation.** Master-data importing is real; it explicitly excludes opening balances and stock [R20]. Before a customer pilot depends on historical financial continuity, define a scoped cutover with domain-owned opening operations, reconciled control totals, accountant sign-off and a reversible rehearsal. This is an acquisition prerequisite and potential implementation advantage; a CSV importer alone is not a moat.

**Measure productive activation.** Extend measurement beyond prepared links and registrations: delivery known, first authorized task completed, first reviewed resolution, second productive cycle, paid continuation, support minutes and reason for abandonment. Separate unknown delivery from failure and provider acceptance from recipient receipt. Avoid collecting unnecessary personal data. The current referral funnel cannot substantiate retained growth [R19].

**Keep basic reliability and country correctness ahead of premium claims.** Verify the actual pilot's permissions, module access, source freshness, recovery, posting and country-specific configurations. The static Cameroon registry and old passing gates do not establish regulatory approval [R3, P5]. This review supplies no legal rates or filing advice.

Defer or reject these as lead moat investments:

- **Another generic AI assistant:** the repository already has AI/agent infrastructure; chat and summaries are copyable. Consider assistance only for a measured job with source-grounded outputs and human authority.
- **An open marketplace or public supplier ratings:** there is no established participation density, identity governance, moderation or dispute operation to support the economics.
- **Cross-company benchmarks:** no validated consent, comparability, cohort size or contribution incentive was established. Aggregate more tenants only after useful and lawful per-tenant operation.
- **Embedded lending or insurance:** historical evidence may eventually support consented applications, but this review did not establish underwriting partners, repayment data, permissions or unit economics. Do not build a lending business as an assumed extension of analytics.
- **Broad loyalty/CRM expansion:** potentially valuable, but competitors already offer it and it is weakly connected to the selected evidence-resolution advantage.
- **A claim of full regional compliance or more country flags:** prioritize a correctly supported, expert-reviewed local workflow. Wider scope multiplies maintenance and support before proving demand.
- **A broad offline expansion:** use field evidence to identify the next lost-work problem. Existing POS work and published competitor claims make “offline” alone insufficient differentiation.

## 11. A dependency-aware sequence

This is a proposed program, not authorization to contact customers or release software. No outreach was sent in this assessment. Assume a small delivery group with two backend/domain engineers, one frontend engineer, shared QA/design, a product owner, part-time security/SRE and a qualified accountant. Those are capacity assumptions; none were verified as staffed. Partner and provider delays can extend the schedule.

| Stage | Proposed work | Evidence required to proceed |
|---|---|---|
| Days 1–14 | Customer/firm discovery, competitor task demos, baseline timing, mock M1 queue and M3 planning worksheet; select one payment format | Repeated pain, accessible data, willing participants, narrow commercial proposition; change the ranking if evidence disagrees |
| Days 15–30 | Rehearse onboarding/control totals and M1 with existing request/review services; instrument productive activation; test M2 with authorized samples | Trustworthy source coverage, tested grants, recoverable delivery, reconciled inputs and an assigned operator |
| Days 31–60 | One bounded M1/M2 pilot; no four-module expansion | Reviewed resolution speed, repeat usage, support effort, false-resolution evidence and paid pilot interest |
| Days 61–90 | Finish the second close cycle and assess economics; run M3 manual planning experiment if data is adequate | Continue, narrow or stop each investment using its thresholds; build saved scenarios only after a positive result |
| Later, conditional | M4 PO/discrepancy pilot followed by shared-supplier participation experiment | Repeated supplier participation and useful overlap before network claims or a wider launch |

Engineering dependencies: authoritative records and access → reconciled onboarding → reliable evidence/delivery → reviewed resolution → measured repeated use → broader collaboration or planning. Keep at most one principal customer workflow in active build plus one bounded validation experiment.

For all pilots, define the economic ceiling before starting: expected subscription contribution minus provider fees, hosting, review work, onboarding amortization and support time. The acceptable ceiling depends on actual labor costs and proposed prices; neither was available here. A workflow that improves user outcomes but requires permanently unprofitable manual work needs redesign.

## 12. Review-board coverage and unresolved tradeoffs

These are the lenses applied in this assessment, not claims of independent expert approval or separately commissioned reviewers.

| Review owner / lens | Finding or constraint |
|---|---|
| Platform architecture | Reuse accountant, cash and purchasing entry points; retain domain ownership and module boundaries. |
| Backend/integration | Proposals remain separate from authoritative postings; preserve transactional idempotency and provider failure states. |
| Data/migrations | Cutover control totals and provenance precede forecasting. Do not equate identity imports with financial migration. |
| Security/IAM/privacy/fraud | Each client/counterparty needs a separately scoped, revocable grant; recheck access for detail/action/export, and keep maker-checker where applicable. |
| Frontend/design systems | Extend current workbenches with understandable pending, stale, failed, denied and reviewed states; avoid another summary dashboard. |
| Workflow/accessibility/localization | Test end-to-end completion in English/French, keyboard use and constrained connectivity. Accessibility was not evaluated in a live browser here. |
| Product/business processes | M1 depends on partner demand; M2 may outrank it if measured daily cash pain is dominant. |
| Quality/release assurance | Four suites passed, but live provider, database, browser, concurrency and recovery evidence remain necessary for a pilot release. |
| SRE/DevSecOps/cost | Assign delivery/rail operators, retry and dead-letter recovery, telemetry and cost ceilings; no uptime or capacity proof obtained. |
| SaaS packaging/growth/customer success | Test buyer and paid value; counts of registrations and accepted invitations are inadequate adoption evidence. |
| Finance/accounting/treasury/controls | M1/M2 first: retain monetary precision, reviewed resolutions, ledger source links and invalidation of stale close evidence. |
| OHADA/country/payroll specialists | Country-specific expert review is required wherever the pilot uses statutory outputs; no legal or payroll certification is claimed. |
| Audit/records/data quality | Exportable history and source-linked proof matter; retention, completeness and access must be verified for actual pilot data. |
| POS/inventory/offline | M3 must respect committed sales, stock ownership and replay status; unresolved offline work cannot silently become authoritative planning input. |
| Purchasing/AP | M4 extends proposal/approval boundaries; supplier participation must not directly change stock, payable or bank truth. |
| HRIS/payroll | Relevant only to aggregate cash obligations and country review; employee-level compensation stays within payroll authorization. |
| Payments/provider operations | Named operators and settlement evidence require operational proof beyond a generic adapter. |
| Analytics/BI | Separate predictions, facts, metrics, unknowns and cohort denominators; test observed repeat value. |
| AI/agent governance | Autonomous payments, financial postings and cross-tenant model training are not part of these recommendations. |
| API/events/import/export | Use existing protected service boundaries, outbox evidence and export controls; producer events alone do not prove delivery. |
| Change/support/training | Local professional participation and onboarding quality are necessary parts of the proposed advantage, not post-launch extras. |

The main tradeoff is channel compounding versus immediate operational pain: product strategy favors M1; finance operations can reasonably favor M2. The sensitivity analysis makes that disagreement explicit. M3 offers meaningful new utility but has more data and estimation risk. M4's stronger hypothetical network mechanism does not justify launching before its single-relationship workflow is useful.

Open questions: Who are the active paying customers today? Which firms would bring a second client? Which rail creates most unresolved work? What integrations have executed successfully outside this checkout? What is current onboarding/support cost? Which country outputs have qualified acceptance evidence? Do repeated suppliers overlap across actual customers? Can customers supply reliable opening cash and dated obligations? No examined evidence answers these with sufficient commercial certainty.

## 13. Verification and reproducibility

**Fresh result: 4 suites, 38 tests passed, zero failed or pending; Jest exited 0.** The suites covered accountant grants/portfolio, provider-event ingestion, Cash Command and the supplier authority boundary. These are focused local tests with mocks, not operational certification [E3].

Executed test command:

```powershell
node node_modules/jest/bin/jest.js --runInBand --watch=false --coverage=false --runTestsByPath services/accounting/__tests__/accountant-access.service.test.ts services/payments/__tests__/provider-event.service.test.ts services/cash-command/__tests__/cash-command.service.test.ts services/purchase-order/__tests__/supplier-po-authority-boundary.test.ts --json --outputFile=what-next/moat-evidence-2026-09-27/focused-tests.json
```

Discovery used `git status --porcelain --ignore-submodules`, `git rev-parse HEAD`, `rg --files`, focused `rg -n` searches, direct source reads and JSON graph parsing. Some initial guessed filenames/globs did not exist; discovered paths replaced them. An attempted Git ignore override using `NUL` failed and was discarded; no clean-tree conclusion was drawn from it. Initial sandbox folder/file writes were denied; approved scoped retries created only the assessment artifacts. These setup failures are not application failures.

Type checking, broad builds, migrations, live integration tests and browser checks were intentionally skipped: this task changed reports only. The final source-drift and publication checks are recorded in the evidence manifest [E4]. Publication requires a successful bundled publisher exit and a non-empty matching PDF for both Markdown artifacts.

### Local source evidence register

- **R1:** [Public workflow positioning](<E:/ohada saas/Focused projects/stoquify/components/landing/public-product-copy.ts:1>).
- **R2:** [Module catalog](<E:/ohada saas/Focused projects/stoquify/services/modules/module-catalog.service.ts:124>).
- **R3:** [Static country registry](<E:/ohada saas/Focused projects/stoquify/services/regulatory/country-packs/registry.ts:4>).
- **R4:** [Portfolio service and active-client filtering](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-access.service.ts:467>).
- **R5:** [Protected portfolio action](<E:/ohada saas/Focused projects/stoquify/actions/accounting/accountant-access.actions.ts:37>).
- **R6:** [Existing portfolio cards and portal link](<E:/ohada saas/Focused projects/stoquify/components/accounting/AccountantPortfolio.tsx:23>).
- **R7:** [Existing accountant review queue contract](<E:/ohada saas/Focused projects/stoquify/services/accounting/missing-close-evidence-accountant-review-queue-contracts.ts:22>).
- **R8:** [Close export and invalidation contracts](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance-pack.service.ts:26>).
- **R9:** [Generic HMAC adapter](<E:/ohada saas/Focused projects/stoquify/services/payments/adapters/mobile-money-hmac.adapter.ts:115>).
- **R10:** [Provider-event ingestion](<E:/ohada saas/Focused projects/stoquify/services/payments/provider-event.service.ts:107>).
- **R11:** [Payment exception closure service](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-exception-closure.service.ts:1>).
- **R12:** [Cash Command composition](<E:/ohada saas/Focused projects/stoquify/services/cash-command/cash-command.service.ts:96>) and [payroll forecast cards](<E:/ohada saas/Focused projects/stoquify/services/cash-command/cash-command.service.ts:395>).
- **R13:** [Stock-to-Cash composition](<E:/ohada saas/Focused projects/stoquify/services/stock-to-cash/stock-to-cash-flow.service.ts:57>).
- **R14:** [Item-supplier data and lead time](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1135>).
- **R15:** [Supplier invite event and empty outbox](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/supplier-po-acknowledgement.service.ts:601>).
- **R16:** [Supplier proposal buyer review](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/supplier-po-acknowledgement.service.ts:1190>).
- **R17:** [Public supplier proposal API boundary](<E:/ohada saas/Focused projects/stoquify/app/api/supplier-po-envelopes/[envelopeId]/proposals/route.ts:1>).
- **R18:** [Existing customer statement schema](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:6437>).
- **R19:** [Referral funnel definition](<E:/ohada saas/Focused projects/stoquify/services/referrals/referral-funnel-read-model.service.ts:14>).
- **R20:** [Explicit master-data import boundary](<E:/ohada saas/Focused projects/stoquify/services/onboarding/master-data-import.service.ts:33>).

### Prior context, not current verification

- **P1:** [September 6 competitive audit](<E:/ohada saas/Focused projects/stoquify/what-next/2026-09-06-ohada-product-competitive-audit.md>).
- **P2:** [August 29 network strategy](<E:/ohada saas/Focused projects/stoquify/docs/network/STOQUIFY_ANALYTICS_MARKETPLACE_NETWORK_EFFECT_STRATEGY_2026-08-29.md>).
- **P3:** [August 14 capability strategy](<E:/ohada saas/Focused projects/stoquify/docs/stoquify-expansion/stoquify-five-vital-capabilities-strategy-review-2026-08-14.md>).
- **P4:** [September 24 verification publication](<E:/ohada saas/Focused projects/stoquify/docs/platform-evaluation/stoquify-platform-evaluation-verification-report.md>).
- **P5:** [June proof-timeline gate artifact](<E:/ohada saas/Focused projects/stoquify/innovation/KONTAVA_PAYMENT_TRANSACTION_PROOF_TIMELINE_MOAT_RELEASE_GATE_2026-06-24.json>).

### Primary competitor sources

Access date for all: 27 September 2026. Search-index content was used where a direct Odoo page fetch failed; scope is the published offering, not tested implementation.

- **S1:** [Odoo 19 fiscal localizations](https://www.odoo.com/documentation/19.0/fr/applications/finance/fiscal_localizations.html).
- **S2:** [Odoo accounting-firm offering](https://www.odoo.com/industries/accounting-firm).
- **S3:** [Sage official export product catalog](https://www.sage.com/fr-fr/-/media/files/sagedotcom/france/documents/terms_and_conditions/current/cgu/guide-produits-et-tarifs_export.pdf).
- **S4:** [Sage 100 accounting automation](https://www.sage.com/fr-fr/produits/sage-100/sage-automatisation-comptable/).
- **S5:** [Omamori product, customer segments and pricing](https://www.omamori.cm/).
- **S6:** [Omamori mobile application capabilities](https://www.omamori.cm/application).
- **S7:** [KiboERP Cameroon retail offering](https://kiboerp.com/erp/boutique/cameroun).
- **S8:** [Julaya business payment offering](https://julaya.co/).

### Evidence artifacts

- **E1:** [Search register](<E:/ohada saas/Focused projects/stoquify/what-next/moat-evidence-2026-09-27/search-register.json>); adjacent `search-*.txt` files preserve results and scope.
- **E2:** [Graph summary](<E:/ohada saas/Focused projects/stoquify/what-next/moat-evidence-2026-09-27/graph-summary.json>).
- **E3:** [Fresh focused test results](<E:/ohada saas/Focused projects/stoquify/what-next/moat-evidence-2026-09-27/focused-tests.json>).
- **E4:** [Publication and source-drift verification](<E:/ohada saas/Focused projects/stoquify/what-next/moat-evidence-2026-09-27/publication-verification.json>).
- [Source fingerprint manifest](<E:/ohada saas/Focused projects/stoquify/what-next/moat-evidence-2026-09-27/source-manifest.json>).

## Final investment recommendation

Fund a narrow **M1 accountant workflow validation**, anchored on **M2 payment-proof resolution**. Require repeated productive use, a credible paid buyer and acceptable support cost before broad rollout. If firm demand fails or payment exceptions dominate the observed need, lead with M2. Validate M3 through a simple planning prototype; defer M4's network expansion until repeat supplier participation is demonstrated.

The opportunity is to make trusted operating evidence materially easier to act on with the people who already influence business decisions. Without that completed and adopted workflow, a large feature catalog will provide limited protection from competitors.
