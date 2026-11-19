# Stoquify HRIS: professional assessment and improvement roadmap

**Assessment date:** 24 October 2026. **Confirmed target:** companies with 1–200 employees across the OHADA zone, supporting office and shift workers and general-purpose HR. **Baseline:** working tree at Git HEAD `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, including existing local modifications. This is an assessment of available implementation and a limited local browser session, not a certification of a deployed release.

## Executive assessment

**Stoquify has a substantial HR and payroll control foundation, but it is not yet a complete, dependable general-purpose HRIS for the stated market. The highest-value investment is completing ordinary HR work on top of the existing services.**

Employee identity, contracts, compensation changes, reporting relationships, delegation, approvals, attendance evidence, payslips and payroll transitions already have implementations. The system explicitly preserves a single logical employee master. These are valuable assets to retain. [E01–E04, E09–E12]

The main gap is between those foundations and an HR administrator or employee successfully completing a task. Employee discovery is capped; important maintenance services lack identifiable operating screens; corrections do not consistently reach certified time inputs; document access and personal-data corrections remain unavailable; and shift administration lacks a demonstrated complete planning journey. Several correctness problems must be resolved before relying on the affected flows. [E02–E08, E13–E16]

For a small office, success means adding employees, finding contracts, managing leave, answering staff requests and preparing accurate payroll inputs without developer help. For a shift-based company, it also means publishing schedules, knowing who is expected, resolving discrepancies and closing a reliable attendance period. For 51–200 employees, complete search, scoped delegation, bulk operations and exception management become essential. Current evidence does not establish all these outcomes.

**Recommended product promise:** “One place to manage your people, their work schedules, their requests and the information needed to pay them correctly.” Build country-specific payroll and statutory operations as explicitly supported capabilities within that product.

### Decision by readiness dimension

| Dimension | Assessment | Business implication |
|---|---|---|
| Employee and control foundations | Substantial implementation | Extend existing services and employee storage; avoid a second HR master |
| Everyday HR administration | Partial | A business still needs manual work or technical assistance for important journeys |
| Office time and leave | Partial, with correctness gaps | Repair correction, balance and policy handling before broader adoption |
| Shift workforce operations | Foundations present; complete journey not demonstrated | A weekly-pattern model is insufficient evidence of a usable roster product |
| Employee and manager self-service | Partial | Useful read views and time requests exist, but employees cannot resolve several routine needs |
| Country-specific payroll | Explicitly restricted and gated | Current production admission is Cameroon/monthly; regional payroll must not be inferred |
| User experience | Consistent shell; significant workflow and language friction | Improve tasks, terminology and localization before a cosmetic redesign |
| Operational assurance | Limited current evidence | 27 mocked tests passed; no real-database concurrency or full role-based end-to-end verification performed |

No numerical maturity percentage is assigned: there is no agreed capability weighting or complete runtime acceptance dataset.

## 1. Business scope and product boundaries

The user's current 1–200 employee, OHADA-zone scope supersedes the older repository assessment's 10–250 employee Cameroon-first assumption. Office and shift workers are confirmed. First launch countries, branch count, legal-employer structure, sector agreements, attendance sources and employee device access are not yet specified.

Use one general HR core, with effective-dated country and employer policies. Do not implement a universal “OHADA payroll rule.” OHADA's official material describes labor-law harmonization as an ongoing legislative process; a common regional accounting context does not establish identical employment, leave, tax or social-contribution rules. Country-specific review remains necessary. [OHADA: labor-law harmonization](https://www.ohada.org/lharmonisation-du-droit-du-travail/)

Recommended operating profiles are design hypotheses, not discovered customer segments:

| Company size | Default experience | Complexity to reveal only when needed |
|---|---|---|
| 1–10 employees | Owner-led setup, employee list, contracts, simple leave, payroll-input handoff | Separate checker or scoped external reviewer for sensitive approvals |
| 11–50 employees | Departments, team approvals, recurring schedules, employee self-service | Delegation, time imports and approval escalation |
| 51–200 employees | Server-side search, bulk changes, branch/team filters, coverage view and exception queues | Multiple approval responsibilities, integration reconciliation and workforce reporting |

Preserve independent approval where required. A very small employer must have a workable reviewer setup; do not silently bypass separation of duties or require shared accounts. Treat an external reviewer as a separately authorized identity with bounded access, not as an assumed capability already delivered.

The initial product can deliver core HR and a validated payroll-input export even where automated local payroll is unsupported. The export must state its period, revision, limitations and recipient workflow. This is a proposed delivery boundary, not a claim that a complete export journey already exists.

## 2. Current capability matrix

“Implemented” means current implementation was found, not that the capability is production-certified. “Partial” means a known functional or delivery gap. “Not found” is limited to the stated search scope. Evidence classes: **S** source; **U** executed mocked unit/component tests; **B** limited browser observation.

| Capability and user need | Current state | Evidence | Priority and required completion |
|---|---|---|---|
| Employee identity and employment record | Implemented foundation; partial usable product | S: one HRIS-owned master backed by `PayrollEmployee`; tenant employee-number/user uniqueness. B: profile displays employment and blockers. E01–E02 | P1: guided create/edit/import, richer useful contact data where justified, complete directory and actionable profile |
| Employee search and counts | Partial; confirmed truncation | S: route limit 50, service max 100, count from returned rows; client-only filtering. B: 50 employees and five local pages. E02 | P0 for completeness claim: authorized server pagination/search/counts for 200 |
| Organization, assignments and reporting lines | Implemented models and resolver; partial administration | S/U: effective relationships and delegation; capped target membership lookup. E03 | P0 authority correction; P1 scoped maintenance and manager experience |
| Contracts and lifecycle changes | Implemented services; partial end-to-end journey | S: requests, approvals, application, frozen-evidence guards. Future dates do not defer current mutation. E04 | P0 date correctness; P1 starter/transfer/leaver screens and responsibilities |
| Compensation and payment-destination changes | Implemented controlled services | S: separate request/review/apply domains and approval inbox. E09 | P1: usable request forms and reviewer evidence capture; retain controls |
| Onboarding/offboarding tasks | Missing capability explicitly reported by read model | S: `TASK_LEDGER_NOT_CONFIGURED`. No complete task journey established. E10 | P1: checklist, owners, deadlines, assets/access handoff and completion evidence |
| Work calendars and employee schedules | Implemented foundations; partial product | S: calendar, holiday, timezone, weekly-pattern and schedule approval models. No corresponding operating callers found in targeted search. E07/E16 | P1 for shift users: schedule setup, publish/change workflow, overnight and holiday tests |
| Leave requests and balances | Partial | S/U: requests, approval and ledger exist. Manual posting lacks atomic balance/entry/audit boundary; automatic accrual consumer not found. E05/E07 | P0 reliability; P1 entitlement execution, policy choice, cancellation and reconciliation acceptance |
| Attendance import and corrections | Partial; important correctness gap | S: correction values stored but operational certification reduces original entries and fixes revision at 1. E06 | P0: correction-to-revision chain, cross-period allocation and approval-aware overtime |
| Unified approvals | Implemented projection and decision routing; partial ergonomics | S/U: six domains, separation of duties, error preservation. User enters an evidence hash. E09 | P1: human-readable evidence capture, narrow team authority and deadlines |
| Employee self-service | Partial | S: own profile, time requests, masked destination status, payslip access; profile correction not configured. E08/E11 | P1: request-and-track corrections, documents and useful request explanations |
| Document evidence and retrieval | Metadata controls implemented; original access unavailable | S: scan/retention/hold metadata; raw download explicitly denied. E08 | P1: authorized storage and retrieval, controlled uploads, expiry and acknowledgement |
| Payroll lifecycle and financial links | Substantial implementation; country readiness limited | S: reviewed transitions, certified inputs, production gate, posting/payment/declaration boundaries. E12 | Preserve; validate applicable rules and integrated cases before activating each country |
| General employee import | Readiness planning exists; commit workflow unverified | S: migration/backfill planner reports `mutationModeAvailable: false`. E13 | P1: preview, identity matching, reject reasons, controlled commit and replay |
| HR operational analytics | Partial | S/B: workforce/readiness summaries and history, with capped populations. E02/E10/E14 | P2 after counts are correct: headcount movements, absence, overtime and process delays |
| Recruitment, performance reviews, training, grievances, succession, benefit enrollment | Dedicated workflows not found in inspected HRIS domain/schema | S: targeted search of HRIS actions/services/components and schema. E17 | Defer broad suites; add bounded cases only when actual customer demand justifies them |
| Mobile, accessibility and low-connectivity resilience | Unverified beyond limited desktop/source checks | S: responsive classes and labels; B: desktop views only. E14/E15 | P1 validation of critical tasks; P2 selective offline drafts if field evidence supports need |
| Regional multilingual and country support | Partial | B: French shell with English HR content; S: payroll gate accepts CM monthly only. E12/E14 | P1 EN/FR completion; additional languages/countries by launch order |

## 3. Ranked findings

**P0 means block reliance on the affected capability until resolved. It does not mean every other HR function must stop. P1 means required to deliver the intended general-purpose HR experience. P2 means subsequent value expansion.**

### F01 — Attendance approval does not guarantee corrected payroll inputs: P0

Operational requests store proposed worked and absence minutes. Certification selects approved leave/overtime but aggregates the original validated time entries. It emits `sourceRevision: 1`, `correctionCount: 0` and a revision-1 idempotency key. The employee request panel does not submit proposed correction values. The existing certified-snapshot correction service is a useful control to reuse; it does not demonstrate connection from operational correction requests. [E06]

**Consequence:** “Approved” can describe the request while payroll preparation still uses the old time. Cross-period leave is also selected by overlap but its full requested minutes are summed, creating an attribution risk.

**Required:** preview before/after time, independently approve, apply a new source revision, invalidate affected readiness, and preserve frozen history. Verify overnight shifts, period boundaries, leave spanning two months and overtime authorization without double counting. This is source-confirmed behavior; no live incorrect pay was observed.

### F02 — Leave balances need atomic posting and concurrent-debit proof: P0

`postHrisLeaveBalanceEntry` checks the balance, creates an entry, then writes audit using the default client. Its action does not provide a transaction. A competing debit or audit failure can violate the intended all-or-nothing behavior. [E05]

The time-request decision service now claims a pending request before effects, and its focused tests pass. That is a real improvement. It does not prove that two different leave requests cannot spend the same available balance. [E07]

**Required:** transactional ledger/audit writes, a per-employee/policy concurrency strategy, deterministic replay and correction entries. Prove competing debits and rollback on disposable PostgreSQL. Existing mocked balance tests do not establish this property.

### F03 — Future employment changes can alter today's employee state: P0

Application of an approved lifecycle event assigns the target employee status and fields immediately, while storing its effective date. No due-date guard appears in the inspected application path. [E04]

**Consequence:** applying a future departure or transfer can misrepresent current employment and affect downstream selection. This is a source risk, not evidence of an observed access incident.

**Required:** distinguish approved/scheduled/effective/applied; compute current and historical state consistently; process due changes idempotently. Make access removal, assets and final obligations explicit offboarding tasks. A `TERMINATED` employee field alone is not proof that account sessions or external access were revoked.

### F04 — Workforce discovery is incomplete and manager scope is coupled to result limits: P0

The People route fetches 50 employees; the service limits reads to at most 100 and reports the returned length as the total. Table search and pagination work only over that array. The browser displayed 50 records and “1–10 of 50”; the actual tenant population was not independently counted. [E02]

The profile facade passes `limit: 1` to a resolver that limits relationship rows before checking whether the target employee is included. A valid report outside that subset can be denied. Directory authorization also omits the caller's `asOf` while the data projection can retain it. [E03]

**Required:** separate authorization membership checks from display pagination; use the same approved temporal semantics; provide stable server paging, search and scoped totals. Test employees 51, 100 and 200, a manager's second report, delegation expiry, and cross-tenant denial.

### F05 — The current regional payroll promise must remain bounded: P0 for unsupported payroll activation

The current gate explicitly requires Cameroon/monthly payroll and reviewed current rule evidence, certified inputs, statutory scenarios and matching line provenance. The bundled Cameroon configuration still labels CNPS as draft/source-checked and income-tax production calculation as unavailable pending expert review. [E12]

**Positive change:** the earlier report's absence-of-production-admission finding is stale; an admission implementation and multiple call sites now exist. Their presence is not evidence of complete statutory accuracy or proof that every adapter path is correct.

**Required:** publish an internal capability matrix per country and employer context: core HR, leave policy, payroll calculation, declaration preparation, filing and settlement. Retain blockers. Resolve financial formulas with qualified country reviewers and full-run golden cases rather than presenting a country flag as certification.

### F06 — Important services have no demonstrated everyday operating journey: P1

Targeted searches found employee-create, lifecycle-request, time-foundation, schedule, time-import and certification action exports without corresponding direct callers in app/components. The inspected payroll employee workbench is a read view. This is bounded caller evidence, not a claim that no indirect/script writer exists. [E16]

The rendered People profile shows missing contract, attendance and payment evidence but offers no direct remediation actions. The directory has no visible add/import action. [E14]

**Required:** make “add employee,” “prepare contract,” “assign schedule,” “resolve time exception” and “complete departure” executable guided journeys with named owners and clear completion states.

### F07 — General HR needs are hidden behind technical controls: P1

The approval dialog asks users for an “Approval evidence hash.” Time requests use raw minutes and automatically select the first balance's policy. Large parts of People remain English on the French route. These choices burden users who need to approve a change or book leave, rather than understand internal evidence mechanics. [E09/E14/E15]

**Required:** capture attachments/acknowledgements and review reasons through ordinary controls; generate and bind evidence server-side. Show leave in understandable days/hours while preserving minute precision internally. Offer explicit policy selection when applicable. Localize the complete task, including status and recovery instructions.

The approval component uses a custom modal. Source inspection did not establish focus trapping, Escape handling or focus return; no keyboard certification is claimed. Use the existing dialog primitives and test behavior. Clear inline feedback and focusable recovery follow W3C's form-notification guidance. [W3C: user notifications](https://www.w3.org/WAI/tutorials/forms/notifications/)

### F08 — Self-service and original documents cannot yet remove routine HR requests: P1

Own-record access and redaction are valuable, but profile correction and original document access are explicitly unavailable. Onboarding/offboarding task tracking is also marked unconfigured. [E08/E10]

**Required:** controlled requests with status, owner, expected next action and outcome; secure document retrieval; employee acknowledgement where appropriate. Keep sensitive health or grievance details outside general manager views. No such confidential case-management workflow is certified by this review.

## 4. End-to-end journey assessment

| Journey | Actors and current chain | Break or uncertainty | Completion and recovery required |
|---|---|---|---|
| Hire to first payroll | HR creates identity → contract/evidence → schedule/compensation → source certification → payroll | Creation/setup screens not demonstrated; no task ledger; country activation gated | Employee, manager and HR know missing items; all required sources trace to the first period; rejected/imported records recover without duplication |
| Employee leave to payroll impact | Linked employee requests → independent reviewer → balance debit → period certification | First-policy selection, accrual execution unproven, concurrency and cross-period allocation concerns | Policy and balance preview; explicit approval/cancellation; exact allocation by period; understandable rejection and amended-request path |
| Publish shifts to approved attendance | Schedule/calendar → actual time import → anomalies → certification | Models exist, but roster planning, publishing and exception-resolution UI are not demonstrated | Named shifts, overnight boundaries, leave conflicts, planned-vs-actual comparison, accountable supervisor and revised evidence |
| Compensation or transfer | Request → approval → application → history → payroll | Controlled domains exist; future-dated lifecycle application is unsafe; initiating UI incomplete | Preview effective date and affected payroll periods; scheduled change stays separate from current state; corrections preserve prior evidence |
| Correct a time discrepancy | Request stores proposed values → review → certification | Operational proposed values are not consumed by certification | Old/new totals shown; new revision changes the intended next input; frozen/paid periods use the existing correction-run boundary |
| Employee departure | Lifecycle request/review → contract/rubrique closure → employee status | Scheduled state issue; no demonstrated assets/access/task completion ledger | Final work/leave/pay obligations, account and external access owner, asset return, retained document policy and reopening path |
| Employee asks HR to correct personal data | Own profile → request → HR review | Profile correction explicitly not configured | Narrow request form, protected evidence, audit and notification; employee sees progress without directly rewriting approved truth |
| Payroll officer to finance | Certified inputs → run review/approval → payslips/posting → payment/declaration proof | Substantial controls, but runtime/country and provider completion unverified | Explicit prepared/sent/acknowledged/settled distinctions; amount tie-out and unresolved obligations visible to finance |

## 5. Practical proposals with measurable value

These proposals are product recommendations derived from the observed gaps. Benefits are hypotheses to validate with users; no savings or adoption numbers are asserted as measured. Effort is relative: **S** bounded screen/read-model work; **M** several connected services/screens; **L** new workflow or external integration with substantial verification.

### Proposal 1 — A guided People workspace and employee record

**Problem/persona:** an owner or HR administrator needs to add and maintain a worker without navigating payroll internals.

**Experience:** “Add employee” guides identity → employment → manager/location → contract → schedule → readiness. The employee record groups profile, employment, time/leave, documents and history. Each blocker opens its authorized remedy.

**Smallest useful delivery:** complete server search; create/edit wizard; one controlled spreadsheet preview/commit flow; actionable profile. Add only personal/contact fields required for supported work, with explicit privacy scopes.

**Reuse/dependencies:** HRIS facade, existing employee uniqueness, contract/lifecycle services, movement history, route states. Requires F03/F04 corrections and a writer inventory. Reuse existing import infrastructure only after confirming employee-specific identity and replay contracts.

**Access/tradeoff:** managers see necessary team information; HR/payroll-sensitive fields remain separate. A broad configurable form builder would delay the core task. **Effort: M–L.**

**Acceptance/metric:** all 200 employees reachable; imports preview conflicts and replay without duplicates; a new administrator completes a representative hire without developer help. Measure task success, time to first usable employee and duplicate-record incidence.

### Proposal 2 — A daily HR work queue with accountable owners

**Problem/persona:** owners and HR need to know what requires action today, not merely see totals and blocker codes.

**Experience:** a short queue presents pending approvals, starters not ready, expiring contracts/documents, time anomalies and overdue departures. Each item states why it matters, the responsible person, due date and next action.

**Smallest useful delivery:** project existing approvals and readiness into one queue; add tasks only where work is currently unrepresented. Deduplicate items and preserve source identity. Escalate overdue work according to explicit policy.

**Reuse/dependencies:** approval inbox, manager scope, movement history, business-event/outbox infrastructure and dashboard ActionQueue primitives. Notification delivery and recipient scope require validation; an outbox entry alone does not prove delivery.

**Access/tradeoff:** personalized queues must not leak salaries or confidential cases. Begin with deterministic priorities. **Effort: M.**

**Acceptance/metric:** each actionable item has a working authorized destination and becomes complete only when the underlying action completes. Track overdue items, time to approval and reopened tasks.

### Proposal 3 — A practical office-and-shift planner

**Problem/persona:** supervisors need coverage, while employees need to know when and where to work.

**Experience:** office schedules use simple recurring patterns; shift teams get a weekly board with shift templates, planned coverage, approved absences and schedule changes. Employees see their own published schedule.

**Smallest useful delivery:** day/evening/overnight templates, employee assignment, publish/version workflow and conflict indicators. Add shift swaps only after the initial schedule and approval flow works.

**Reuse/dependencies:** existing calendars, public holidays, schedules, reporting relationships, time imports and leave requests. Resolve F01/F02/F03 first for trustworthy downstream effects; add narrowly scoped roster entities only where weekly JSON cannot represent published shift instances.

**Access/tradeoff:** supervisors propose/publish within their scope; employee requests never silently change staffing. Rest/maximum-hours rules must be country/employer-policy reviewed. Avoid biometrics and automatic optimization as default scope. **Effort: L.**

**Acceptance/metric:** overnight work, overlapping shifts, leave conflicts, holidays and mid-period changes allocate correctly. Measure uncovered shifts, schedule-change acknowledgement and supervisor planning time.

### Proposal 4 — An attendance correction desk with a visible audit trail

**Problem/persona:** employees, supervisors and payroll staff need to agree what happened when imported time is wrong.

**Experience:** “The system recorded 6 hours; 8 hours were worked” becomes a structured request with before/after values, evidence and an independent decision. The desk shows the resulting period revision and whether payroll must be recalculated or adjusted.

**Smallest useful delivery:** one discrepancy type from request through corrected certification; then overtime and cross-period absence. Add preview and exact replay behavior to time imports.

**Reuse/dependencies:** operational requests/anomalies, certified attendance correction service and payroll readiness contracts. Requires F01/F02; preserve frozen snapshots and paid-run correction rules.

**Access/tradeoff:** people can request corrections to their own records; authorized reviewers decide. Do not infer work performed from an AI guess or silently rewrite historical pay. **Effort: M–L.**

**Acceptance/metric:** an approved correction changes the correct period exactly once and preserves prior evidence. Track discrepancy age, recurrence and payroll-input adjustments after cutoff.

### Proposal 5 — Employee self-service that resolves everyday needs

**Problem/persona:** employees repeatedly contact HR for leave balances, documents, personal-data changes and payslip explanations.

**Experience:** “My work” shows schedule, leave entitlement, requests, documents and payslips. A request has a plain-language status, responsible team and next step. Documents display type, validity and acknowledgement state.

**Smallest useful delivery:** leave in days/hours with schedule-aware conversion; explicit leave type; personal-data correction request; one secure document type; request history and clear recovery. Prioritize responsive EN/FR screens.

**Reuse/dependencies:** existing own-record resolution, self-service service, operational requests, payslip/export controls and document governance metadata. Requires authorized storage, scan/retention enforcement and complete request ownership.

**Access/tradeoff:** sensitive request categories need separate scopes. Start with resilient online forms and safe retry; offline storage of private documents is not a default. **Effort: M–L.**

**Acceptance/metric:** employee cannot access another record, revoked links fail, errors preserve drafts, retries do not duplicate requests. Measure employee task success, repeat contacts and request resolution time.

### Proposal 6 — An explainable payroll-input handoff and country readiness view

**Problem/persona:** HR, payroll and the owner need to know whether the workforce inputs are complete and what the product can lawfully and technically support for a chosen employer.

**Experience:** a period checklist explains missing contracts, time exceptions, compensation approvals and payment instructions. It links each issue to its source, responsible actor and required action. Country capability labels distinguish HR policies, calculation, declaration, filing and settlement.

**Smallest useful delivery:** trustworthy readiness by employee/period, a reconciled export for an external payroll process, and explicit capability states. Keep the existing Cameroon production gate and qualify new countries separately.

**Reuse/dependencies:** payroll command read model, certified-input proof, production admission, register, payment evidence and country-pack framework. Resolve input truth first; external payroll file formats require a named target and reconciliation contract.

**Access/tradeoff:** preserve financial controls while keeping technical evidence details in an optional drawer. A rule explanation does not substitute for expert approval. **Effort: M for handoff; L per country payroll qualification.**

**Acceptance/metric:** every total traces to the same source revision; exported employee counts and amounts reconcile; unsupported payroll actions remain blocked with useful next steps. Track first-pass readiness and late adjustments.

### Proposal 7 — Repeatable starter, transfer and leaver checklists

**Problem/persona:** HR, IT, managers and finance must coordinate obligations that a status change cannot complete.

**Experience:** a starter gets contract, account, equipment and schedule tasks. A leaver gets final attendance, assets, access removal and retained-document tasks. Dependencies and owners are explicit; reminders stop when work is complete.

**Smallest useful delivery:** three templates, dated tasks, owner assignment, required completion evidence and blocker reasons. An employee lifecycle event creates tasks; task completion does not automatically bypass sensitive financial approvals.

**Reuse/dependencies:** lifecycle business events, existing notification/task infrastructure where compatible, movement history and corrected effective dates. Inspect existing task facilities before creating a new generic workflow engine.

**Access/tradeoff:** separate confidential HR documents from IT/equipment tasks. Permit configurable nonfinancial checklist items while keeping release controls explicit. **Effort: M.**

**Acceptance/metric:** future starters remain scheduled; departures cannot appear operationally complete with required access-removal work outstanding. Measure first-day readiness and overdue leaver tasks.

Template-based tasks with assigned users/roles and dates are established HR product patterns; Frappe's official onboarding documentation provides a useful comparison. The recommendation here is to adapt that pattern to Stoquify's existing lifecycle and evidence services. [Frappe HR: employee onboarding](https://docs.frappe.io/hr/employee-onboarding)

**Later AI assistance:** consider explaining a readiness blocker using authorized records or summarizing approved policy with citations. Deterministic workflows above provide value first. Hiring, disciplinary, compensation and termination decisions must remain accountable human decisions. No candidate ranking, employee “risk score” or autonomous HR decision is recommended.

## 6. Essential, valuable and deferred scope

**Essential for the initial general-purpose product:** complete employee records/search/import; contracts and dated changes; organization/manager scope; office/shift schedules; reliable leave balances and time corrections; understandable approvals; employee request tracking; safe documents; useful history; EN/FR task completion; role setup; payroll-input handoff and truthful country capability states.

**Valuable next:** expiry reminders, coverage calendar, process metrics, reconciled external payroll/accounting integrations, simple skills/training expiry, confidential employee-case intake and bounded benefits administration when validated with customers.

**Defer pending demand:** full applicant-tracking suite, performance/OKR platform, learning management, succession planning, broad benefits marketplace, biometrics/geolocation attendance, predictive employee analytics and simultaneous statutory rollout across the region. These add complexity before the essential work is dependable.

## 7. Prioritized implementation roadmap

Effort is provisional and relative, not a calendar commitment. Owners are responsibility roles, not named individuals. Add each slice to the existing program register; do not create a competing implementation program or close historical findings solely from this report.

| Order | Scope and priority | Owner | Effort | Dependencies | Exit criteria |
|---|---|---|---|---|---|
| 0 | Confirm first countries, employer boundary, worker policies and small-company reviewer setup; freeze supported capabilities | Product + HR domain + country reviewer | S–M | User target already confirmed; remaining policy facts | Written scope and country/capability matrix; realistic office/shift scenarios; no unsupported launch claims |
| 1A | Correct operational time revision/certification, leave allocation and ledger atomicity: F01/F02, P0 | HR backend + QA | L | Scope of applicable policies | Correction changes correct input once; concurrent debits cannot overspend; audit failure rolls back; frozen history preserved |
| 1B | Correct effective dates and employee/manager completeness: F03/F04, P0 | HR backend + security + UI | M–L | Existing master/resolver retained | Future changes leave present truth intact; employee 200 searchable; second report accessible; delegation/tenant negatives pass |
| 1C | Verify and preserve country production gates: F05, P0 | Payroll + country reviewer + QA | M for gate verification; L for rule qualification | Applicable country/employer scope | Unsupported/stale evidence blocks emission, posting and payment; approved full-run cases reconcile; no silent bypass |
| 2 | Complete add/import/edit employee and contract/organization setup; remove English gaps and technical input burden | Product/UI + HR backend | L | 1B; writer inventory | Owner/HR can set up representative employees without scripts; direct remedies for blockers; EN/FR and keyboard proof |
| 3 | Deliver office/shift schedules, attendance exception desk and leave operations | HR/time team + QA | L | 1A/1B/2 | Published roster, overnight cases, time import recovery and period-close journey pass with realistic fixtures |
| 4 | Deliver employee self-service, document access and starter/leaver checklists | HR product + identity/storage + UI | L | 2; effective-date and privacy controls | Own/team/HR separation; documents authorized; corrections tracked; required departure tasks completed |
| 5 | Consolidate daily work queue, readiness handoff and useful HR metrics | Product + reporting + payroll | M–L | Truthful data and completed actions from 1–4 | Queue totals reconcile; every item has an owner/action; external handoff reconciles; measure customer task outcomes |
| 6 | Qualify additional countries and selective HR extensions | Country specialists + product | L per capability group | Successful core pilots and demand evidence | Country-specific tests/review and supported-language evidence; no regional support inferred from one pack |

Slices 1A and 1B have separable implementation responsibilities if future delegation is authorized. Sensitive interfaces and acceptance must still be reviewed together. This assessment used no sub-agents.

Suggested rollout gates: first validate one office employer and one shift employer in the first selected country; include a small team and a synthetic 200-person dataset. These are proposed pilot cohorts, not evidence that customers already exist. Capture baseline timings before setting improvement targets. Expand only after users finish hire, leave, correction, schedule-change and departure journeys with representative failure recovery.

## 8. Verification performed and practical limits

| Evidence class | What was done | Result and limits |
|---|---|---|
| Source inspection | Current HRIS actions/services/components, People routes, relevant payroll controls, schema, authorization wrapper, design/workflow docs and selected tests | Findings above refer to current local source. No complete repository security audit or exhaustive writer proof |
| Graph discovery | Root component/action/app graphs, dated 9 August 2026 | Used nodes/communities as discovery aids; behavior confirmed in source. Graphs are not live coverage evidence |
| Workflow contract | `npm run agent:workflow:check`, after inspecting script, lifecycle and registry | Passed; 196 package scripts outside reviewed manifest. This does not certify the application |
| Mocked unit/component tests | Four explicitly selected suites with existing bounded Jest configuration; setup/mocks inspected; no-cache, one worker | **4 suites, 27 tests passed.** Persistence and actions mocked. No real races or database rollback established |
| Browser | Existing authenticated local Edge session; desktop People directory EN/FR and an employee profile FR | Rendered directory/count labels, missing add/remediation actions and mixed French/English content observed. Not an end-to-end test or lower-privilege authorization proof |
| Real database tests | Not executed | No disposable target was established and audit scope excludes fixture mutations. Concurrent debits, effective-date behavior and full input pipeline remain to prove |
| Provider/statutory integration | Source only | No real submission/payment, approved calculation pack or country launch certified |
| User research/performance | Target clarified with user; no interviews, timing study or load test | Benefits and segmentation are proposals. No measured ROI, adoption or latency claims |

Test command:

```text
node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --no-cache --runTestsByPath services/hris/__tests__/operational-time-decision-concurrency.test.ts services/hris/__tests__/leave-balance.service.test.ts services/hris/__tests__/org-effective-scope.service.test.ts components/hris/__tests__/HrisApprovalInbox.test.tsx
```

The focused suites cover pending-decision ownership/error propagation, basic balance posting/negative rejection, effective manager scope/denial/delegation, and approval component error/pending/self-approval handling. Passing them does not contradict F01–F04: the missing integrated/concurrent cases are different properties.

Browser access initially failed through Chrome DevTools due to an occupied profile. Edge access succeeded after a navigation timeout. The session was labeled super administrator on localhost; fixtures appeared seeded, but provenance and population were not independently verified. No lower-privilege role switching, mobile viewport, keyboard traversal, screen reader, contrast audit or form submission was performed. Browser reads may produce normal application audit entries; no intentional employee/business record changes were made.

UI/UX Pro Max focused search returned “Focusable Error Summary” from `ux-guidelines.csv`, Forms/Accessibility, applicable to web forms. Existing project design remains authoritative. ECC security-review informed source inspection of trusted actor/organization binding, privacy and approval boundaries. No security certification is implied.

Only this assessment document is authored for the task. No application/schema changes, migrations, seeds, builds, deployments or business mutations were performed. Existing unrelated working-tree changes were preserved. Reversal consists solely of removing this new report if unwanted.

## 9. Source evidence index

Line anchors refer to the inspected working tree and can shift as ongoing work continues. Package declarations read: Next `15.5.27`, React `^19.1.1`, TypeScript `^5`, Prisma `^6.19.3`, Better Auth `^1.6.14`, Tailwind `^3.4.1`; these are declared ranges, not proof of installed versions.

- **E01 — Single employee master and identity:** [HRIS ownership facade](<E:/ohada saas/Focused projects/stoquify/services/hris/employee.service.ts:27>); [PayrollEmployee schema](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:2847>).
- **E02 — Directory completeness:** [People route](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/page.tsx:37>); [service limit](<E:/ohada saas/Focused projects/stoquify/services/payroll/employee.service.ts:72>), [take](<E:/ohada saas/Focused projects/stoquify/services/payroll/employee.service.ts:512>), [summary](<E:/ohada saas/Focused projects/stoquify/services/payroll/employee.service.ts:578>); [client table](<E:/ohada saas/Focused projects/stoquify/components/hris/HrisEmployeeDirectoryTable.tsx:30>); [local filter/pagination](<E:/ohada saas/Focused projects/stoquify/components/hr-payroll/HrPayrollTableControls.tsx:63>).
- **E03 — Effective organization authority:** [resolver](<E:/ohada saas/Focused projects/stoquify/services/hris/org.service.ts:154>); [capped relationships](<E:/ohada saas/Focused projects/stoquify/services/hris/org.service.ts:213>); [profile facade limit](<E:/ohada saas/Focused projects/stoquify/services/hris/employee.service.ts:136>); [scope tests](<E:/ohada saas/Focused projects/stoquify/services/hris/__tests__/org-effective-scope.service.test.ts>).
- **E04 — Lifecycle application:** [application path](<E:/ohada saas/Focused projects/stoquify/services/hris/lifecycle.service.ts:681>), [current-state mutation](<E:/ohada saas/Focused projects/stoquify/services/hris/lifecycle.service.ts:731>).
- **E05 — Leave ledger:** [balance/read/create/audit](<E:/ohada saas/Focused projects/stoquify/services/hris/leave-balance.service.ts:97>); [action default-client call](<E:/ohada saas/Focused projects/stoquify/actions/hris/leave-balance.actions.ts:20>); [mocked tests](<E:/ohada saas/Focused projects/stoquify/services/hris/__tests__/leave-balance.service.test.ts>).
- **E06 — Correction and certification:** [request storage](<E:/ohada saas/Focused projects/stoquify/services/hris/operational-time.service.ts:518>); [certification](<E:/ohada saas/Focused projects/stoquify/services/hris/operational-time.service.ts:825>); [fixed revision](<E:/ohada saas/Focused projects/stoquify/services/hris/operational-time.service.ts:972>); [existing certified correction guard](<E:/ohada saas/Focused projects/stoquify/services/hris/time-leave.service.ts:455>); [request form](<E:/ohada saas/Focused projects/stoquify/components/hris/HrisOperationalTimeRequestPanel.tsx:37>).
- **E07 — Time and leave foundations:** [pending request claim](<E:/ohada saas/Focused projects/stoquify/services/hris/operational-time.service.ts:568>); [current concurrency-contract tests](<E:/ohada saas/Focused projects/stoquify/services/hris/__tests__/operational-time-decision-concurrency.test.ts>); [schedule/policy models](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:3503>); accrual/carry-over search in non-test `services/` and `actions/` found configuration storage in `operational-time.service.ts`, without a demonstrated executing evaluator.
- **E08 — Documents and self-service limitations:** [document access decision](<E:/ohada saas/Focused projects/stoquify/services/hris/document-evidence.service.ts:360>); [own-service capabilities](<E:/ohada saas/Focused projects/stoquify/services/hris/self-service.service.ts:137>).
- **E09 — Approval domain and interaction:** [approval service](<E:/ohada saas/Focused projects/stoquify/services/hris/approval-inbox.service.ts:41>); [decision permissions](<E:/ohada saas/Focused projects/stoquify/services/hris/approval-inbox.service.ts:178>); [evidence-hash form](<E:/ohada saas/Focused projects/stoquify/components/hris/HrisApprovalInbox.tsx:380>); [component tests](<E:/ohada saas/Focused projects/stoquify/components/hris/__tests__/HrisApprovalInbox.test.tsx>).
- **E10 — Manager projection:** [manager service](<E:/ohada saas/Focused projects/stoquify/services/hris/manager-self-service.service.ts:57>); [capability limitations](<E:/ohada saas/Focused projects/stoquify/services/hris/manager-self-service.service.ts:156>). Reporting-line availability is hard-coded false despite effective relationship support; derive this from actual capability rather than stale copy.
- **E11 — Payslip control:** [own-payslip service](<E:/ohada saas/Focused projects/stoquify/services/payroll/payslip-self-service.service.ts:352>); [fresh authorization](<E:/ohada saas/Focused projects/stoquify/lib/security/rbac.ts:90>); [protected action wrapper](<E:/ohada saas/Focused projects/stoquify/services/_shared/protect.ts>).
- **E12 — Current payroll limits and gate:** [admission](<E:/ohada saas/Focused projects/stoquify/services/payroll/payroll-production-admission.ts:69>); [gate call example](<E:/ohada saas/Focused projects/stoquify/services/payroll/payroll-control.service.ts:7246>); other inspected call sites at 7564, 7904, 8330, 8896 and 9354; [bundled country status](<E:/ohada saas/Focused projects/stoquify/services/regulatory/country-packs/cameroon.ts:13>); [payroll lifecycle read model](<E:/ohada saas/Focused projects/stoquify/services/payroll/payroll-run-lifecycle-read-model.ts>).
- **E13 — Migration planner:** [mutation mode unavailable](<E:/ohada saas/Focused projects/stoquify/services/hris/migration-backfill-pilot.service.ts:858>).
- **E14 — Rendered and source UX:** local `/en/dashboard/people`, `/fr/dashboard/people`, and a linked `/fr/dashboard/people/[employeeId]` route, desktop session on 24 October. [People source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/page.tsx>); [profile source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/[employeeId]/page.tsx>). Employee names are intentionally omitted from the report.
- **E15 — Task terminology and policy selection:** [time request panel](<E:/ohada saas/Focused projects/stoquify/components/hris/HrisOperationalTimeRequestPanel.tsx:37>); [custom approval modal](<E:/ohada saas/Focused projects/stoquify/components/hris/HrisApprovalInbox.tsx:337>).
- **E16 — Operating caller search:** non-test `.ts/.tsx` in `app/`, `components/`, `actions/` for employee upsert, lifecycle request/apply, time-foundation, schedule, time import and certification exports. [action exports](<E:/ohada saas/Focused projects/stoquify/actions/hris/operational-time.actions.ts:194>), [employee action](<E:/ohada saas/Focused projects/stoquify/actions/hris/employee.actions.ts:127>), [payroll employee read workbench](<E:/ohada saas/Focused projects/stoquify/components/payroll/PayrollEmployeeSourceWorkbench.tsx>). Caller-search absence is not exhaustive proof about indirect dispatch or external systems.
- **E17 — Adjacent HR coverage search:** `services/hris`, `actions/hris`, `components/hris`, `prisma/schema.prisma`, using recruitment/applicant, performance-review, training, grievance, disciplinary, succession and benefit-enrollment terms. Dedicated complete flows were not found; unrelated generic platform features were not classified as HR functionality.
- **E18 — Graph discovery:** [component graph](<E:/ohada saas/Focused projects/stoquify/graphify-out/graph_components.json>): `hris_hrisapprovalinbox_tsx` community 55, `hris_hrisemployeeselfservice_tsx` 80, `hris_hrismanagerselfservice_tsx` 114. [action graph](<E:/ohada saas/Focused projects/stoquify/graphify-out/graph_actions.json>): approval inbox community 41, compensation 20. [app graph](<E:/ohada saas/Focused projects/stoquify/graphify-out/graph_app.json>): People 134, approvals 135, history 136, team 137, profile 138, self-service 223. Current imports confirm route → HRIS projection/domain → existing payroll storage/control relationships.

## 10. Five next actions and remaining decisions

1. **Repair time-to-pay truth:** correction revisions, leave allocation and transactional balance posting, with disposable-database proof.
2. **Repair employee truth and reachability:** future-effective changes, manager target checks and complete search/counts through 200 employees.
3. **Finish the daily HR journey:** guided create/import/profile, usable evidence capture and full EN/FR task copy, then schedules and self-service.
4. **Make work accountable:** starter/leaver tasks and one scoped queue with owners, deadlines and direct remedies.
5. **Launch by demonstrated capability:** pilot office and shift journeys in the first selected country, maintain explicit payroll gates and expand country coverage only with reviewed evidence.

Decisions that could reorder delivery: first launch countries; one or several legal employers per workspace; sector/collective-agreement constraints; attendance source and shift patterns; access to phones/internet; whether payroll is internal or outsourced; who independently reviews sensitive work in micro-businesses. These refine delivery; they do not prevent the foundational repairs above.
