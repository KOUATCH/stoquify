# Stoquify Potential Assessment

**Assessment date:** 2 November 2026  
**Target market:** SMEs across the OHADA zone, with an initial Cameroon focus  
**Stage:** Pre-launch  
**Founder-reported budget:** $1 million

**Yes. Stoquify has valuable potential that is not yet commercially proven. The strongest opportunity I found is to connect the capabilities already built into a service that helps an SME owner understand sales, stock, money received, customer debts, and what needs attention—and gives their accountant usable records.**

My recommendation is to validate that proposition with **stockholding SMEs in one reachable Cameroon city**, supported by a small number of accounting firms. Keep the wider OHADA ambition, but make expansion depend on evidence from this first market.

This assessment combines current source inspection, historical verification records, and market research checked on **2 November 2026**. Customer demand, achievable pricing, acquisition costs, and retention remain unknown.

**The biggest thing missing is a commercial proof loop.**

Parts of this strategy already exist in Stoquify’s thinking. A June document describes daily cash and stock control, accountant collaboration, and finance readiness. The August network strategy recommends accountant-led collaboration before a marketplace. These ideas deserve testing; presenting them as newly discovered features would miss the actual gap. [June strategy](<E:/ohada saas/Focused projects/stoquify/docs/go to market/AQSTOQFLOW_OHADA_MARKET_POTENTIAL_AND_ADOPTION_STRATEGY_2026-06-29.md:16>), [August strategy](<E:/ohada saas/Focused projects/stoquify/docs/network/STOQUIFY_ANALYTICS_MARKETPLACE_NETWORK_EFFECT_STRATEGY_2026-08-29.md:9>).

Some earlier material is more confident than its evidence supports. The June strategy assigns a **60–70% chance of category leadership**, without a reproducible probability model in the document. I would treat that as an opinion, not investment evidence. [Source](<E:/ohada saas/Focused projects/stoquify/docs/go to market/AQSTOQFLOW_OHADA_MARKET_POTENTIAL_AND_ADOPTION_STRATEGY_2026-06-29.md:11>).

The questions that now matter most are:

- Which customer experiences an expensive problem frequently enough to pay?
- Can that customer complete the relevant workflow reliably?
- Does Stoquify reduce total work, including implementation and support?
- Can another customer receive the same benefit without extensive customization?
- Can a repeatable channel acquire those customers economically?

More development will not answer those questions by itself.

The product foundations are substantial, with important limits:

| Capability | Evidence inspected | Commercial implication |
|---|---|---|
| Connected sales, stock valuation, and accounting | POS retains commit results and posting evidence; inventory uses a shared stock and valuation service. | A foundation for explaining what sold, what remains, and how it affects financial records. [POS](<E:/ohada saas/Focused projects/stoquify/services/pos/pos.service.ts:2172>), [inventory](<E:/ohada saas/Focused projects/stoquify/services/inventory/inventory-stock-event.service.ts:640>) |
| Payment reconciliation | Matching, ambiguous cases, suspense, and guarded sign-off exist. | Potential value for firms reconciling several collection channels. Authenticated live-provider coverage was not established. [Source](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-reconciliation-certification.service.ts:461>) |
| Customer balances and statements | Statements use retained movement evidence and reject certain incomplete or inconsistent inputs. | Useful for wholesalers selling on account. Faster collections remain a hypothesis. [Source](<E:/ohada saas/Focused projects/stoquify/services/accounting/customer-statement.service.ts:388>) |
| Accountant collaboration | Authorized client portfolios, evidence requests, workpapers, and advisory exports exist. | A possible recurring service and distribution channel. [Portfolio](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-portfolio.service.ts:81>), [work desk](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-work-desk.service.ts:33>) |
| Migration and opening setup | Controlled import and opening workflows exist, with a CM/XAF preview restriction and bounds on eligible clients. | Implementation services could reduce switching friction. Unrestricted historical migration is not established. [Opening service](<E:/ohada saas/Focused projects/stoquify/services/onboarding/opening-position.service.ts:25>), [cutover restriction](<E:/ohada saas/Focused projects/stoquify/services/onboarding/opening-cutover.service.ts:46>) |
| Daily operating brief | The inspected agent ranks permitted evidence and selects priorities deterministically. | A useful “what needs my attention?” habit. It does not demonstrate an autonomous general-purpose AI operator. [Source](<E:/ohada saas/Focused projects/stoquify/services/agents/skills/role-daily-brief.skill.ts:20>) |
| Country support | The inspected country-pack registry contains Cameroon; statutory publication and payroll calculations retain qualifications. | Cameroon is the closest starting point, but even its statutory readiness requires further qualification. [Registry](<E:/ohada saas/Focused projects/stoquify/services/regulatory/country-packs/registry.ts:5>), [Cameroon pack](<E:/ohada saas/Focused projects/stoquify/services/regulatory/country-packs/cameroon.ts:12>) |

Three findings materially constrain the launch proposition:

- **Production offline economic replay is disabled.** Current authorization requires a test environment and an explicit test flag. Offline selling cannot currently serve as a supported commercial differentiator. [Source](<E:/ohada saas/Focused projects/stoquify/services/pos/offline-sync.service.ts:1270>)
- **The inspected POS supports an on-screen, non-statutory pilot receipt.** Other receipt-delivery channels and store-credit tender are explicitly restricted. Customer receivables are a separate capability. [Source](<E:/ohada saas/Focused projects/stoquify/services/pos/pos.service.ts:97>)
- **The accountant program’s current register retains production `NO_GO`.** Passing selected development, database, and browser checks has not closed its remaining release and country-review gates. [Status updated 2 November](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/STATUS.md:11>)

A narrow customer cohort does not waive those requirements. Discovery and supervised simulations can proceed while the selected live workflow is qualified.

**Cameroon is the practical starting market. The initial SME segment still needs validation.**

Your confirmed access to businesses in Cameroon matters more for the first pilot than an attractive market-size estimate elsewhere. It gives you a chance to observe work, help people adopt the product, and investigate failures directly.

I would compare **hardware/electrical-supply wholesalers** with **FMCG distributors**, then choose one segment. Look for owner involvement, recurring stock movements, mixed collections, customer credit, and an existing accountant relationship. Check returns, units of measure, discounts, connectivity, and catalog size before committing.

| Country and customer hypothesis | Reason to investigate | Entry decision |
|---|---|---|
| **Cameroon: stockholding wholesalers/distributors** | Your operating access and the current CM/XAF implementation provide the strongest practical fit. BEAC’s report supports investigating merchant/mobile-money workflows, though its data concern 2024 activity. | **First discovery and pilot market.** [BEAC report, hosted April 2026](https://www.beac.int/wp-content/uploads/2026/04/RAPPORT-SUR-LES-SERVICES-DE-PAIEMENT-DANS-LA-CEMAC-2024-.pdf) |
| **Côte d’Ivoire: formal B2B distributors** | FNE creates a concrete integration requirement. The published editor/integrator approval procedure includes local fiscal and technical conditions. | Later candidate with an appropriate local integration and distribution partner. [DGI approval procedure, August 2025](https://www.fne.dgi.gouv.ci/uploads/communiques/pdf_689ca778df072_communique_procedure_agrement_editeurs_solution_fne_12_08_25.pdf) |
| **Senegal: accountant-supported growing SMEs** | Current institutional programs provide a reason to investigate assisted technology adoption and partner channels. | Partner-led candidate after Cameroon evidence. Program eligibility is unverified. [World Bank, October 2026](https://blogs.worldbank.org/en/psd/senegal-is-building-a-pipeline-of-growth-firms) |
| **Benin: formal wholesalers and retailers** | DGI provides invoicing tools, developer access, tests, and an approval path for proprietary systems. | Explore value beyond invoice generation. [Official e-MECeF portal](https://e-mecef.impots.bj/) |
| **DRC: formal import/distribution SMEs** | Electronic fiscal invoicing obligations create country-specific integration work. | Defer until a capable local operator and fiscal partner justify entry. [DGI communiqué, December 2025](https://dgi.gouv.cd/wp-content/uploads/2025/12/COMMUNIQUE-OFFICIEL-05-MODALITES-PRATIQUES-RELATIVES-A-LEFFECTIVITE-DE-LOBLIGATION-DEXIGENCE-ET-DE-.pdf) |

OHADA’s common framework is useful, but deployment still requires country-specific decisions about payments, currencies, taxation, payroll, filing, language, and data handling. For example, Cameroon’s personal-data framework also needs review against the proposed hosting and processing arrangements. [Official Cameroon law, December 2024](https://www.prc.cm/en/multimedia/documents/10271-law-n-2024-017-of-23-12-2024-web).

**The competitive landscape weakens a broad “all-in-one OHADA software” proposition.**

The following are **advertised offers observed during research**, not independently tested implementations. Their customer counts, service quality, and regulatory claims have not been validated.

| Alternative | Advertised overlap | Implication for Stoquify |
|---|---|---|
| **Omamori — direct Cameroon comparison** | OHADA accounting, payroll, stock, POS, mobile/offline operation and local assistance; advertised plans at 15,000 and 25,000 FCFA/month. | Locality, breadth, and offline claims already exist in competing positioning. [Vendor page](https://omamori.cm/) |
| **StockPlus — direct retail comparison** | Stock, sales, customer debts and accounting; advertised paid plans at 5,000, 12,500 and 25,000 FCFA/month. | Basic retail functionality faces low advertised price points. [Pricing](https://stockplus.app/fr/tarifs) |
| **WariUP — regional comparison** | Sales, cash, stock, purchasing and finance; advertised tiers at 19,000, 39,000 and 79,000 XOF/month. | Coherent tiered packaging is already visible. [Pricing](https://wariup.sn/pricing) |
| **Esarth — deployment alternative** | Broad OHADA ERP positioning with dedicated/on-premise deployment, advertised from 46,000 FCFA/month. | Some buyers may compare hosting control alongside features. [Vendor page](https://erp.esarth.net/) |
| **Odoo — broad platform benchmark** | Its current source includes an OHADA accounting localization; its POS documentation describes offline functions and limitations. | OHADA accounting and integrated operations alone do not establish uniqueness. [Localization source](https://github.com/odoo/odoo/blob/19.0/addons/l10n_syscohada/__manifest__.py), [POS documentation](https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale/use.html) |
| **Sage — accounting benchmark** | Its January 2026 product guide includes an ECF OHADA offering. | Test compatibility with existing accountant practices. Obtain local quotes before comparing total costs. [Official guide](https://www.sage.com/fr-fr/-/media/files/sagedotcom/france/documents/terms_and_conditions/current/cgu/guide-produits-et-tarifs-2026-01-01-sans-spc.pdf) |
| **Existing spreadsheets, messages, paper and accountant arrangements** | The customer’s current process may be familiar and flexible. | Measure Stoquify against that actual process, including switching effort. |

The defensible advantage could develop from **reliable connected records, repeatable implementation expertise, productive accountant relationships, and measurable customer outcomes**. Dashboards, module counts, and generic AI claims will be easier to copy.

**These are the opportunities I would prioritize.**

All customer-demand confidence is currently **low**. Source confidence varies by capability. Cost ranges below are preliminary experiment estimates, overlap with shared staffing, and should not be added together as independent project quotes.

| Rank | Opportunity and customer outcome | Existing assets and missing work | Commercial mechanism | Effort, risk and decision |
|---|---|---|---|---|
| **1** | **Daily sales, stock and money reconciliation:** owner understands discrepancies and unresolved balances. | Strong foundations; needs a qualified complete workflow, simple presentation and baseline measurement. | Organization/location subscription. | Medium; roughly **$15k–$35k** validation work. Reliability and capture completeness are critical. **Validate first.** |
| **2** | **Accountant-assisted monthly records service:** less document chasing and rework. | Portfolio, evidence desk and workpapers exist; partner packaging remains unstarted. | Per-client package, firm subscription or separately priced professional service. | Low–medium; **$5k–$15k**. Accountants may want the tools without becoming distributors. **Test both roles.** |
| **3** | **Paid migration and first-month setup:** customer reaches a trustworthy starting position. | Import/opening controls exist, with explicit limits. Needs repeatable delivery procedures. | Fixed, scoped implementation fee. | Low–medium; **$5k–$15k**. Bespoke cleanup can destroy margins. **Productize and measure.** |
| **4** | **Receivables follow-up:** owner knows who owes what and which balances are disputed. | Statements and movement evidence exist. Delivery and collection processes need qualification. | Included retention feature or collections package. | Medium; **$10k–$25k**. Reliable balances must precede reminders. **Pilot after record quality.** |
| **5** | **Working-capital decisions:** identify cash tied up in stock and upcoming obligations. | Stock-to-Cash and Cash Command provide inputs; a complete general forecasting workflow was not established in this inspection. | Higher-tier planning service. | Medium; **$15k–$35k**. Forecasts depend on data and explicit assumptions. **Prototype after usable records.** |
| **6** | **Provider-linked reconciliation:** reduce manual matching of payment evidence. | Reconciliation services exist; live provider access and coverage remain unproved. | Subscription uplift or qualified integration service. | Medium–high; **$25k–$60k** for a bounded experiment. Provider terms and support matter. **Partner and validate one rail.** |
| **7** | **Role-specific daily brief:** help owners and managers act on a few useful priorities. | Deterministic brief already exists. Needs relevance testing and simpler daily use. | Retention within the core subscription. | Low; **$5k–$15k**. Easily copied unless the underlying evidence is better. **Improve within the pilot.** |
| **8** | **Finance-readiness records pack:** help a business present organized, explainable records. | Close packs and exports provide foundations. Lender requirements and acceptance remain unknown. | Preparation service or qualified partner offering. | Medium; **$10k–$25k**. It must not imply guaranteed credit. **Defer until records and partner demand exist.** |

The overlooked opportunity is that **implementation and ongoing professional assistance can be part of the product’s economics**. They also create obligations: delivery must become repeatable, responsibilities must be clear, and software and service margins must be measured separately.

Your public copy already discusses quote-led pricing, migration, country setup, provider adapters, assurance and support. The next step is to validate and deliver those offers. Workspace/module configuration is also not evidence of completed paid subscription automation. [Pricing assumptions](<E:/ohada saas/Focused projects/stoquify/messages/en.json:4570>), [services copy](<E:/ohada saas/Focused projects/stoquify/messages/en.json:4590>), [module composition contract](<E:/ohada saas/Focused projects/stoquify/services/modules/module-composition-contracts.ts:49>).

There is a credible longer-term payments opportunity. BCEAO’s September 2026 API Business announcement describes enterprise services built through PI-SPI participants, including services from software suppliers. That creates a reason to investigate provider partnerships for later UEMOA expansion. It establishes neither Stoquify access nor deployment, and it concerns a different payment environment from Cameroon. [BCEAO announcement](https://www.bceao.int/fr/communique-presse/homologation-des-api-business-de-la-plateforme-interoperable-du-systeme-de).

**The top three priorities need experiments with rejection criteria.**

1. **Prove the daily operating workflow with approximately eight firms.**

   Observe a comparable baseline period, then test the selected workflow over several weeks once its applicable release gates permit live use. Include owners, cashiers, stock staff and accountants.

   Proposed decision thresholds:

   - At least six firms use the workflow on 80% of relevant trading days.
   - At least 95% of in-scope transactions are captured, checked against independent records.
   - No unexplained duplicate economic postings or lost transactions.
   - Median active reconciliation effort falls by at least 30%, counting work transferred to Stoquify staff.
   - At least five firms pay agreed terms and renew for another billing period.

   Founder/product leadership, engineering, QA, field onboarding and a qualified accountant are needed. Stop or redesign if usage depends on continual staff rescue, records are incomplete, or customers will not pay enough to cover delivery.

   These are proposed thresholds, not statistical proof of market fit. Ninety days cannot establish durable retention or lifetime value.

2. **Test the accountant channel alongside direct recruitment.**

   Work with about three firms. Ask them to bring specific eligible clients, participate in the workflow, and evaluate a defined commercial package.

   A useful early signal would be two firms each bringing at least two qualified clients, with actual package payment and reduced total review effort. Compare acquisition and support effort against directly recruited customers.

   Stop treating accountants as a distribution channel if they provide introductions without follow-through, require extensive bespoke work, or have no economic reason to participate. They may still be valuable users and professional partners.

3. **Make migration a scoped, repeatable service.**

   Test with approximately six firms in the same cohort. Record source-data condition, corrections, active labor, elapsed time and customer effort.

   Aim for most eligible firms to reach an independently reviewed opening position within five business days and a predictable labor allowance. Keep historical transactions, balances, stock openings and catalog limits explicit.

   If most attractive prospects exceed current bounds—or each migration requires unique engineering—reassess the segment and implementation investment before promising scale.

Benefits are not measured yet: the current advisory-outcomes service explicitly reports an unestablished baseline and no calculated improvement. [Source](<E:/ohada saas/Focused projects/stoquify/services/accounting/advisory-outcomes.service.ts:264>).

**I would initially authorize planning around a $150,000 ceiling and retain $850,000.**

That is a proposed maximum for evidence gathering and readiness work, not a target to spend. Team availability and supplier quotes could materially change it.

| Period | Additional ceiling | Work and release condition |
|---|---:|---|
| **Days 1–30** | **$25,000** | Observe roughly 18–24 SME workflows and speak with several accountants; choose a segment; document baselines, commercial terms and the selected workflow’s readiness gaps. |
| **Days 31–60** | **$50,000** | Address essential gaps and run supervised trials. Begin live pilots only when applicable release, receipt, payment, accounting and recovery requirements are satisfied. |
| **Days 61–90** | **$75,000** | Test paid use, renewal, repeatable onboarding and partner economics. Expand only when delivery effort and record quality support it. |
| **Retained reserve** | **$850,000** | Keep uncommitted pending customer and operational evidence. |

A provisional team could comprise you as product/discovery lead, two engineers, shared QA/reliability capacity, one field implementation lead, and part-time accounting, legal and security specialists. These are staffing assumptions.

Within the ceiling, plan roughly $65k for engineering/QA, $25k for research and onboarding, $20k for professional qualification, $15k for infrastructure/security, $10k for partner enablement and $15k contingency.

For every customer, measure contribution after hosting, provider fees, support labor, partner compensation and implementation cost. Record founder time too. A setup fee can conceal an unprofitable recurring service.

As an arithmetic illustration, **100 customers paying 25,000 XAF/month produce 2.5 million XAF/month before costs**. That is not a forecast. It shows why low-priced subscriptions cannot casually include unlimited human assistance.

**I would postpone several attractive-looking directions.**

- A simultaneous all-OHADA launch.
- An open marketplace before recurring participation and two-sided demand exist.
- Lending, credit scoring or financial guarantees before qualified partners and sufficient records exist.
- Cross-customer data products before explicit permissions and defensible governance.
- Broad autonomous AI promises.
- Additional overview screens unless they help a tested customer decision.
- Multiple unrelated industry launches at once.

Employee incentives also deserve attention. A Senegal taxi-sector experiment found that increased observability could benefit owners while discouraging adoption by drivers. Its application to other SMEs is a hypothesis, but it is a useful reminder to test each role’s benefit and workload. [FCDO research summary, May 2025](https://www.gov.uk/research-for-development-outputs/asymmetric-information-and-digital-technology-adoption-evidence-from-senegal).

A positioning hypothesis to test is:

> **Stoquify helps stockholding businesses in Cameroon reconcile sales, stock, money received and customer balances—so owners know what needs attention and accountants receive organized records.**

That promise is understandable and testable. Successful delivery could later support expansion into forecasting, provider integrations, professional services and additional countries.

For verification, **the repository workflow-contract check passed**. I inspected current source and separate historical mocked, PostgreSQL and browser evidence; I did not rerun application tests, databases or browser journeys. Historical POS recovery evidence is bounded and expressly excludes production certification. No files were changed and no customers were contacted. [Historical verification record](<E:/ohada saas/Focused projects/stoquify/docs/retention/execution/P05-P06-closure-2026-10-17/RESULT.md:3>)

**If I were accountable for Stoquify’s success with this $1M budget, my next three decisions would be:**

1. **Choose one Cameroon city and one stockholding SME segment.** I would change the choice if observation shows weak pain, poor access, or prohibitive workflow requirements.
2. **Fund one qualified, usable workflow and measure paid outcomes.** I would stop expanding investment if benefits require persistent manual rescue or customers cannot support viable economics.
3. **Test accountant-assisted distribution alongside direct sales.** I would change the channel strategy if referrals fail to produce paying, supportable customers.
