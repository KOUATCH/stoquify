# R00 decision workbook

R00 WORKBOOK | Revision 1.0 | 7 October 2026

DRAFT — AWAITING HUMAN VALIDATION

Organization or project legal owner: [To complete]

D01 Product scope and first customers

Canonical definition: Initial segment, locations, currencies, enabled modules and capability promises. [S1]

Choose who the first supported product is for and what you will promise them. A country choice alone does not select the customer type or authorize a live launch.

Already confirmed

Cameroon first, later CEMAC expansion, pre-production/demo data and phased implementation are confirmed. Customer sector, entity type, site count, currencies and first-release modules are not yet selected. [S3]

Proposal for your review

Proposed: select one defined Cameroon customer cohort and qualify online workflows first. Treat accounting and HR/payroll as separately gated capabilities. Use synthetic demonstrations until the relevant acceptance evidence is available.

Alternatives and consequences

A narrow cohort limits test combinations and support cost. Multiple sectors/sites at launch increase configuration, training and regression coverage. Do not assume every implemented module is promised.

Evidence to inspect

Customer needs or pilot brief; entity and location inventory; capability matrix; current package acceptance and exclusions. [S1, S2, S8]

Decision timing and deferral

Individual capabilities may be excluded with a reason and owner. The target cohort and explicit release boundary cannot remain ambiguous when R00 is accepted.

Accountable roles: Product owner + delivery lead. Review: QA lead; domain owners for every promised capability.

Due gate: R00 before the release-scope baseline; R33 still controls actual release.

D01 response and validation

<!-- page break -->

DRAFT. Complete this page, attach supporting evidence, and use document 04 for the actual decision and signature. A recommendation is not selected until you record it here.

| Question to answer | Your answer or evidence reference |

| --- | --- |

| D01.1 Customer and entity<br>Which sector, business/entity type and intended customer cohort? | ________________________________________________<br>________________________________________________ |

| D01.2 Sites and users<br>Which locations, number of sites and user roles? | ________________________________________________<br>________________________________________________ |

| D01.3 Currency scope<br>Which transaction, functional and reporting currencies? Refer the policy to D02. | ________________________________________________<br>________________________________________________ |

| D01.4 Online modules<br>Which modules are required for the first cohort? List each. | ________________________________________________<br>________________________________________________ |

| D01.5 Regulated capabilities<br>Which accounting/payroll/tax outputs are promised, conditional or excluded? | ________________________________________________<br>________________________________________________ |

| D01.6 Delivery boundary<br>What is demo only, controlled pilot, later release or out of scope? | ________________________________________________<br>________________________________________________ |

Exact selected proposal or changes: _______________________________________
______________________________________________________________________

Reason and material consequences: ________________________________________
______________________________________________________________________

Conditions or unresolved items and restrictions: _____________________________
______________________________________________________________________

Named owner: __________________  Required reviewers: _____________________

Evidence versions/locations: __________________  Due gate/date: ______________

Decision outcome is recorded separately in document 04. Reopen on a change to scope, policy, applicable law/rules, evidence or authority relevant to this decision.

D02 Accounting policy choices

<!-- page break -->

Canonical definition: Functional currency, rate/rounding, partial-year, close and year-end policies. [S1]

Agree the accounting rules against which the implementation and reports will be assessed. A green test is not an accountant approving the underlying policy.

Already confirmed

Cameroon is the first jurisdiction. No functional-currency policy, rate source, rounding method, fiscal calendar or close policy has been approved in this pack. [S3, S4]

Proposal for your review

Proposed: have the accounting owner and qualified accountant document the policy for the selected entity and reporting framework, using explicit examples. Keep unsupported currency/reporting cases unavailable until mappings and source amounts are verified.

Alternatives and consequences

Single-currency scope reduces conversion cases. Multi-currency scope requires approved rate authority, dates, missing-rate handling and reproducible conversion/rounding. Close-only locking and professionally qualified close have different evidence requirements.

Evidence to inspect

Entity/framework applicability; rate-source evidence; calculation examples; fiscal-year setup; journal/report tie-outs; close, reopening and correction controls. [S1, S2, S4]

Decision timing and deferral

The detailed policy may remain pending during development, with a named reviewer and due gate. Affected financial outputs cannot be represented as qualified.

Accountable roles: Accounting owner + qualified accountant. Review: Qualified accountant; engineering verifies the implementation against approved examples.

Due gate: R02, R06, R07 and R20 before financial implementation acceptance.

D02 response and validation

<!-- page break -->

DRAFT. Complete this page, attach supporting evidence, and use document 04 for the actual decision and signature. A recommendation is not selected until you record it here.

| Question to answer | Your answer or evidence reference |

| --- | --- |

| D02.1 Entity and framework<br>What entity/sector and accounting/reporting framework applies? | ________________________________________________<br>________________________________________________ |

| D02.2 Currencies and rates<br>Functional/reporting currencies; FX source, rate date and missing-rate rule? | ________________________________________________<br>________________________________________________ |

| D02.3 Rounding<br>Precision and rounding method at line, tax, journal and report levels? | ________________________________________________<br>________________________________________________ |

| D02.4 Financial calendar<br>Year start/end; first partial year and period boundaries? | ________________________________________________<br>________________________________________________ |

| D02.5 Close and correction<br>What blocks close; who locks/reopens; how are corrections and reversals handled? | ________________________________________________<br>________________________________________________ |

| D02.6 Year end<br>Required adjustments, opening balances and statements; attach reviewed examples. | ________________________________________________<br>________________________________________________ |

Exact selected proposal or changes: _______________________________________
______________________________________________________________________

Reason and material consequences: ________________________________________
______________________________________________________________________

Conditions or unresolved items and restrictions: _____________________________
______________________________________________________________________

Named owner: __________________  Required reviewers: _____________________

Evidence versions/locations: __________________  Due gate/date: ______________

Decision outcome is recorded separately in document 04. Reopen on a change to scope, policy, applicable law/rules, evidence or authority relevant to this decision.

D03 Offline operating limits

<!-- page break -->

Canonical definition: Offline devices, storage/eviction, supported tenders, fiscal limits and recovery. [S1]

Decide whether offline selling is in scope and the exact devices, payments and recovery limits that must be proven before admitting it.

Already confirmed

The current continuation does not qualify a complete offline pilot. No supported device/tender matrix is approved here. [S2, S3]

Proposal for your review

Proposed: defer live offline admission until R04/R05 data-conservation evidence and R32 device/pilot criteria pass. Continue controlled engineering tests with synthetic data.

Alternatives and consequences

Online-only admission has a narrower recovery surface. A controlled offline pilot adds device enrollment, storage loss, retries, uncertain payments, fiscal and support obligations. Browser storage alone is not a durability guarantee.

Evidence to inspect

Browser/OS/device matrix; capacity and eviction tests; replay/conservation tests; tender/provider/fiscal review; operator recovery drill. [S1, S2]

Decision timing and deferral

If offline is excluded, record that decision and prohibit offline capability promises/admission. Reopen D03 before enabling it; do not mark the capability verified.

Accountable roles: POS/product + security + country owner. Review: Security owner and country owner; QA and support for device/recovery evidence.

Due gate: R04/R05 design; finalize before R32 offline admission.

D03 response and validation

<!-- page break -->

DRAFT. Complete this page, attach supporting evidence, and use document 04 for the actual decision and signature. A recommendation is not selected until you record it here.

| Question to answer | Your answer or evidence reference |

| --- | --- |

| D03.1 Admission choice<br>Defer offline, controlled pilot, or request qualified release? | ________________________________________________<br>________________________________________________ |

| D03.2 Devices<br>Exact device models, OS and browser versions; enrollment/revocation owner? | ________________________________________________<br>________________________________________________ |

| D03.3 Storage<br>Queue/capacity limits, eviction detection, older-client shutdown and export policy? | ________________________________________________<br>________________________________________________ |

| D03.4 Payments<br>Which tenders are allowed offline; how are uncertain outcomes resolved? | ________________________________________________<br>________________________________________________ |

| D03.5 Fiscal limits<br>Which local fiscal/numbering restrictions need country review? | ________________________________________________<br>________________________________________________ |

| D03.6 Recovery<br>Lost device, interrupted sync, duplicate/lost-response recovery and support steps? | ________________________________________________<br>________________________________________________ |

Exact selected proposal or changes: _______________________________________
______________________________________________________________________

Reason and material consequences: ________________________________________
______________________________________________________________________

Conditions or unresolved items and restrictions: _____________________________
______________________________________________________________________

Named owner: __________________  Required reviewers: _____________________

Evidence versions/locations: __________________  Due gate/date: ______________

Decision outcome is recorded separately in document 04. Reopen on a change to scope, policy, applicable law/rules, evidence or authority relevant to this decision.

D04 Access privacy and retention

<!-- page break -->

Canonical definition: Role matrix, legal holds, retention and HR/workforce disclosure. [S1]

Specify who can see and change each class of data, what must be retained, and how sensitive workforce information is protected.

Already confirmed

Current work uses test/demo data. No production retention schedule, complete access matrix or employee disclosure policy is approved in this pack. [S3]

Proposal for your review

Proposed: use minimum role-based access, explicit employee/manager/accountant scopes and controlled export permissions. Keep payroll details restricted and define legal-hold precedence before adopting deletion schedules.

Alternatives and consequences

Broad convenience access increases disclosure risk and review burden. More granular access requires role testing and support procedures. Retention periods must follow entity/data applicability review, not a guessed universal duration.

Evidence to inspect

Data inventory and classification; role/tenant/action matrix; employee disclosure rules; retention and hold sources; export and access-revocation tests. [S1, S2]

Decision timing and deferral

Missing policy blocks affected sensitive use or deletion. Record the exact restricted data/actions and reviewer due date; pre-production status alone does not prove every record is synthetic.

Accountable roles: Privacy/records + HR + AppSec. Review: Application security; qualified legal/privacy advice for applicable retention and disclosure duties.

Due gate: R08, R10, R16 and R28 before enforcement acceptance and sensitive launch.

D04 response and validation

<!-- page break -->

DRAFT. Complete this page, attach supporting evidence, and use document 04 for the actual decision and signature. A recommendation is not selected until you record it here.

| Question to answer | Your answer or evidence reference |

| --- | --- |

| D04.1 Access matrix<br>For each role: view/change/approve/export rights and organization/employee scope? | ________________________________________________<br>________________________________________________ |

| D04.2 Sensitive data<br>Who may see salary, identity, health/leave documents and bank details? | ________________________________________________<br>________________________________________________ |

| D04.3 Self service<br>What can employees, managers, HR and delegated accountants access? | ________________________________________________<br>________________________________________________ |

| D04.4 Retention<br>Schedule by record class, authority source, start trigger and archive owner? | ________________________________________________<br>________________________________________________ |

| D04.5 Holds and deletion<br>Who imposes/releases holds; how do holds override deletion and backups? | ________________________________________________<br>________________________________________________ |

| D04.6 Disclosure<br>Permitted recipients, purpose, masking, audit trail and revocation process? | ________________________________________________<br>________________________________________________ |

Exact selected proposal or changes: _______________________________________
______________________________________________________________________

Reason and material consequences: ________________________________________
______________________________________________________________________

Conditions or unresolved items and restrictions: _____________________________
______________________________________________________________________

Named owner: __________________  Required reviewers: _____________________

Evidence versions/locations: __________________  Due gate/date: ______________

Decision outcome is recorded separately in document 04. Reopen on a change to scope, policy, applicable law/rules, evidence or authority relevant to this decision.

D05 Country review and external authority

<!-- page break -->

Canonical definition: Named country experts, rule versions, providers and submission authority. [S1]

Name qualified people to review each regulated capability and identify who can authorize real provider operations or statutory submissions.

Already confirmed

Cameroon-first source research exists, with unresolved current-law interpretation and reviewer requirements. Source discovery is not statutory approval. No expert appointments or provider/submission authority are confirmed here. [S4]

Proposal for your review

Proposed: review accounting, tax, payroll/labour, social insurance and fiscal/declaration capabilities separately. Bind each approval to a rule version, applicable entity/employee cases and independent expected examples.

Alternatives and consequences

Prepare exports for authorized human review, or later qualify direct submission through a named provider/authority. These are distinct capabilities; approving one does not authorize the other.

Evidence to inspect

Qualifications and appointments; current source snapshots; rule/version/effective-date map; reviewed fixtures; provider acceptance and submission mandates. [S1, S4, S5, S6]

Decision timing and deferral

Record missing experts/sources/providers as unresolved. Keep that regulated capability or real submission unavailable; independent engineering may continue.

Accountable roles: Country/integration leads + business approvers. Review: Qualified Cameroon accounting, tax, payroll/labour and social-insurance expertise as applicable; independent technical reviewer.

Due gate: Begin appointments at R00; complete per capability at R18/R19 before activation.

D05 response and validation

<!-- page break -->

DRAFT. Complete this page, attach supporting evidence, and use document 04 for the actual decision and signature. A recommendation is not selected until you record it here.

| Question to answer | Your answer or evidence reference |

| --- | --- |

| D05.1 Capability coverage<br>Which accounting, payroll, tax, CNPS, fiscal or declaration capabilities? | ________________________________________________<br>________________________________________________ |

| D05.2 Experts<br>For each capability: real reviewer, qualification, Cameroon scope and independence? | ________________________________________________<br>________________________________________________ |

| D05.3 Rule versions<br>Exact pack/rule version, sources, effective dates and customer applicability? | ________________________________________________<br>________________________________________________ |

| D05.4 Expected results<br>Who independently checks normal, boundary and exception examples? | ________________________________________________<br>________________________________________________ |

| D05.5 Providers<br>Provider/account/capability and sandbox/live environment; credential reference only? | ________________________________________________<br>________________________________________________ |

| D05.6 Submission mandate<br>Who may prepare, approve and execute each real payment or filing? | ________________________________________________<br>________________________________________________ |

Exact selected proposal or changes: _______________________________________
______________________________________________________________________

Reason and material consequences: ________________________________________
______________________________________________________________________

Conditions or unresolved items and restrictions: _____________________________
______________________________________________________________________

Named owner: __________________  Required reviewers: _____________________

Evidence versions/locations: __________________  Due gate/date: ______________

Decision outcome is recorded separately in document 04. Reopen on a change to scope, policy, applicable law/rules, evidence or authority relevant to this decision.

D06 Optional feature priorities

<!-- page break -->

Canonical definition: Which optional lot/landed-cost/assets/budget/cohort features are required. [S1]

Choose which optional extensions are justified by an actual customer need. A promised optional feature becomes required for that cohort.

Already confirmed

No acceptance of R34–R37 optional capabilities is established by the general modernization request. [S1, S8]

Proposal for your review

Proposed: assess each feature independently and defer those without a named customer decision, usable source data and measurable acceptance scenario.

Alternatives and consequences

A bounded extension can satisfy a real sector requirement but adds implementation and assurance work. Deferral protects delivery focus; it also forbids promising that feature for the selected cohort.

Evidence to inspect

Customer requirement, source-data assessment, bounded feature definition, cost/effort review and acceptance example. [S1, S8]

Decision timing and deferral

Required / deferred / not applicable must be recorded for each feature, with reason and reassessment trigger. Do not treat all optional features as one yes/no decision.

Accountable roles: Product + actual customer + domain owner. Review: Relevant inventory/accounting/finance/data domain owner.

Due gate: R34–R37 before committing implementation capacity; earlier if promised to the first cohort.

D06 response and validation

<!-- page break -->

DRAFT. Complete this page, attach supporting evidence, and use document 04 for the actual decision and signature. A recommendation is not selected until you record it here.

| Question to answer | Your answer or evidence reference |

| --- | --- |

| D06.1 Traceability<br>Lot/serial/expiry and unit conversion: required, deferred or not applicable; why? | ________________________________________________<br>________________________________________________ |

| D06.2 Inventory economics<br>Landed cost and replenishment: scope, customer need and source quality? | ________________________________________________<br>________________________________________________ |

| D06.3 Fixed assets<br>Asset subledger/automation: material customer requirement and accounting owner? | ________________________________________________<br>________________________________________________ |

| D06.4 Planning<br>Budgets and scenario cash forecasting: decisions supported and data required? | ________________________________________________<br>________________________________________________ |

| D06.5 Customer analysis<br>Cohort/retention analytics: business purpose and identity/consent constraints? | ________________________________________________<br>________________________________________________ |

| D06.6 Commitment<br>For each accepted feature: cohort, owner, acceptance example, effort and due gate? | ________________________________________________<br>________________________________________________ |

Exact selected proposal or changes: _______________________________________
______________________________________________________________________

Reason and material consequences: ________________________________________
______________________________________________________________________

Conditions or unresolved items and restrictions: _____________________________
______________________________________________________________________

Named owner: __________________  Required reviewers: _____________________

Evidence versions/locations: __________________  Due gate/date: ______________

Decision outcome is recorded separately in document 04. Reopen on a change to scope, policy, applicable law/rules, evidence or authority relevant to this decision.

D07 Operational service objectives

<!-- page break -->

Canonical definition: Deployment workload, latency, error, backlog, cost, RPO/RTO and alert objectives. [S1]

Agree the operating conditions and measurable service limits before judging operational readiness. RPO means acceptable data-loss window; RTO means acceptable recovery time.

Already confirmed

Current evidence does not qualify a fresh integrated build/package, complete browser journeys or production recovery. No measured production service objectives are approved here. [S2, S3]

Proposal for your review

Proposed: first measure representative workloads in a controlled environment, then agree explicit thresholds and measurement windows with product, finance and SRE. Do not publish unmeasured service promises.

Alternatives and consequences

Tighter latency/recovery targets generally require more capacity, recovery automation and support expenditure. A smaller bounded cohort may reduce the initial operating envelope but still needs measured acceptance.

Evidence to inspect

Deployment topology; workload model; reproducible baseline measurements; restore drill; worker/backlog monitoring; alert delivery and cost model. [S1, S2]

Decision timing and deferral

Leave unknown thresholds blank with a measurement owner/date. That service promise remains unqualified. Record zero silent event loss, duplicate economic effects and unauthorized access as proposed invariants, not measured achievements.

Accountable roles: SRE + product + finance. Review: Product owner and finance owner; independent QA/technical evidence review.

Due gate: R23/R30 before measuring operational acceptance against agreed limits.

D07 response and validation

<!-- page break -->

DRAFT. Complete this page, attach supporting evidence, and use document 04 for the actual decision and signature. A recommendation is not selected until you record it here.

| Question to answer | Your answer or evidence reference |

| --- | --- |

| D07.1 Environment and workload<br>Hosting/topology; tenant/user concurrency, data volume and peak transactions? | ________________________________________________<br>________________________________________________ |

| D07.2 Latency and errors<br>Critical journeys, percentile/window, acceptable latency and error-rate thresholds? | ________________________________________________<br>________________________________________________ |

| D07.3 Workers<br>Queue age/backlog/throughput targets and escalation conditions? | ________________________________________________<br>________________________________________________ |

| D07.4 Recovery<br>RPO and RTO per service/data class; how will restore be measured? | ________________________________________________<br>________________________________________________ |

| D07.5 Cost and alerts<br>Budget, measurement unit/window, alert recipient and escalation response? | ________________________________________________<br>________________________________________________ |

| D07.6 Acceptance method<br>Test dataset, duration, observer, evidence location and remeasurement trigger? | ________________________________________________<br>________________________________________________ |

Exact selected proposal or changes: _______________________________________
______________________________________________________________________

Reason and material consequences: ________________________________________
______________________________________________________________________

Conditions or unresolved items and restrictions: _____________________________
______________________________________________________________________

Named owner: __________________  Required reviewers: _____________________

Evidence versions/locations: __________________  Due gate/date: ______________

Decision outcome is recorded separately in document 04. Reopen on a change to scope, policy, applicable law/rules, evidence or authority relevant to this decision.

D08 Pilot admission and observation

<!-- page break -->

Canonical definition: Pilot cohorts, minimum volume, business-cycle coverage and observation window. [S1]

Define a fair pilot test in advance: participants, duration, business cycles, acceptance evidence and stop conditions.

Already confirmed

Cameroon is prioritized. No named pilot customer, transaction-volume threshold, observation window or pilot authorization has been confirmed. [S3]

Proposal for your review

Proposed: admit a bounded cohort only after its applicable security, data, country and provider gates pass. Agree the pilot criteria before seeing the results; keep online and offline admission distinct.

Alternatives and consequences

A shorter/narrower pilot costs less but cannot demonstrate unobserved business cycles. Broader admission needs more support and evidence. A synthetic rehearsal is useful but does not establish real-customer pilot performance.

Evidence to inspect

Named cohort and permitted capabilities; signed criteria; support/rollback plan; representative business-cycle evidence; gate matrix and independent review. [S1, S2]

Decision timing and deferral

Pilot may be deferred while engineering continues. No admission or release approval follows from a draft plan or successful rehearsal.

Accountable roles: Release owner + pilot operations. Review: Product, QA and relevant domain owners; country/provider reviewers for regulated or external capabilities.

Due gate: Before R32/R33; criteria must not be invented after results.

D08 response and validation

<!-- page break -->

DRAFT. Complete this page, attach supporting evidence, and use document 04 for the actual decision and signature. A recommendation is not selected until you record it here.

| Question to answer | Your answer or evidence reference |

| --- | --- |

| D08.1 Cohort<br>Customers/sites/users/devices, contacts and online/offline capabilities? | ________________________________________________<br>________________________________________________ |

| D08.2 Entry criteria<br>Which R packages and country/provider approvals must pass first? | ________________________________________________<br>________________________________________________ |

| D08.3 Coverage<br>Which sales, returns, close, payroll and reporting cycles must be observed? | ________________________________________________<br>________________________________________________ |

| D08.4 Volume and time<br>Minimum volume per workflow, duration/window and who sets the threshold? | ________________________________________________<br>________________________________________________ |

| D08.5 Stop and recovery<br>Stop criteria, incident owner, data reconciliation and rollback/support plan? | ________________________________________________<br>________________________________________________ |

| D08.6 Exit authority<br>Who reviews results, accepts residual limits and separately authorizes release? | ________________________________________________<br>________________________________________________ |

Exact selected proposal or changes: _______________________________________
______________________________________________________________________

Reason and material consequences: ________________________________________
______________________________________________________________________

Conditions or unresolved items and restrictions: _____________________________
______________________________________________________________________

Named owner: __________________  Required reviewers: _____________________

Evidence versions/locations: __________________  Due gate/date: ______________

Decision outcome is recorded separately in document 04. Reopen on a change to scope, policy, applicable law/rules, evidence or authority relevant to this decision.
