# Accounting firms in Stoquify: capability audit and product strategy

**Research date:** 19 October 2026. **Source baseline:** `6ee84a90c760d2864f6aef672d8b393ac2b65971`, plus the local working tree inspected during this audit. **Purpose:** product and workflow assessment, not a production-readiness or statutory certification.

## 1. Executive assessment

**Stoquify has a substantive accountant collaboration and accounting-evidence foundation. It does not yet establish a complete accounting-firm operating system.** Its strongest existing assets are explicit client mandates, delegated ledger access, a cross-client evidence work desk, source-linked accounting information, close assessments, and controlled resolution of missing evidence. These are real implementations in the inspected source, not merely proposed screens. Four focused test suites passed, with 100 tests in total. [E01][E02][E03][E04][E05][E06]

The best initial product position is: **help an accounting firm keep its SME clients ready for review by turning operational discrepancies into assigned, evidence-backed resolutions.** This fits the existing links between sales, payments, stock, purchasing, payroll, ledger entries, and close evidence. It also offers a concrete reason to return: new evidence, overdue client responses, changed source records, and review decisions that actually need attention. [E04][E06][E07]

Five findings should shape investment:

1. **Complete and unify the existing product before multiplying dashboards.** A work desk and portfolio already exist. Extend them rather than proposing them as new features.
2. **Make portfolio status trustworthy.** The portfolio uses stored close-run scores. Its cards do not display the assessment time or current-proof state, although a separate current-proof service already handles stale and missing evidence. The portfolio query also caps results at 100 without returning continuation metadata. [E01][E02][E07]
3. **Model the firm and engagement explicitly.** Client mandates point to an individual accountant, with firm name and optional registration number as descriptive fields. That is not a verified firm identity, client-team assignment model, engagement contract, or staff succession process. [E08]
4. **Remove onboarding and deliverable friction.** The current master-data importer deliberately excludes financial opening positions; its readiness projection explicitly leaves opening AR/AP unsupported and the overall cutover unverified. Accountant trust packs and close packs are JSON, despite separate CSV/JSON accounting-report exports. [E09][E10][E11]
5. **Keep regional claims precise.** The inspected static country-pack registry contains Cameroon. Its pack has mixed capability statuses, including payroll components requiring review. The inspected fiscal adapter registry contains fake and Cameroon sandbox adapters, not proof of live authority filing. [E12][E13][E14]

The proposed commercial entry point is a **Cameroon-first, bilingual evidence-to-close pilot for small and growing firms serving retail, wholesale, and inventory-holding SMEs already using Stoquify**. Cameroon is a practical starting hypothesis because the inspected static registry has a Cameroon pack; this is not a conclusion about total market attractiveness or production legal readiness. Expand geography only after validating national rules and workflows.

Do not promise that Stoquify is unique merely because it has portfolios, reminders, review tasks, or AI. Official competitor documentation already establishes those categories. The defensible hypothesis is the quality of the complete operational-source-to-accounting-evidence workflow for a selected regional segment. That hypothesis needs comparative task testing and pilot results.

## 2. What was inspected and what was verified

The audit combined current routes, UI components, action boundaries, services, schema, tests, project controls, existing architecture graphs, and official vendor/regulatory sources. It searched for firm, engagement, workpaper, billing, deadline, referral, and accountant concepts and followed the core accountant workflows in depth. Adjacent POS, AP, inventory, payroll, and regulatory systems were inspected selectively; they were not exhaustively audited.

| Evidence class | Result | What it establishes |
|---|---|---|
| Source inspection | Completed for core accountant workflows; selective for adjacent domains | Implemented logic, data contracts, visible workflow limits, and reuse opportunities |
| Workflow contract | `npm run agent:workflow:check` passed; 196 package scripts remain outside the reviewed manifest | The reviewed workflow references and fingerprints passed; no application checks were implied |
| Mocked unit and pure-function tests | Three suites passed | Access-service behavior, work-desk projections/denials/pagination, and current close-proof grading under test fixtures |
| Component tests | One jsdom suite passed | Tested work-desk interaction, localization, identity confirmation, incomplete/denied states, and recovery behavior |
| Combined focused result | **4 suites, 100 tests passed; 0 snapshots** | Limited to the exact suites listed in the evidence appendix |
| Real database tests | Not run | No new proof of SQL concurrency, migration correctness, transaction rollback, or persisted-session races |
| Current browser/rendered checks | Not run | No claim of full browser navigation, responsive appearance, accessibility, or real user sign-in success |
| External research | Official sources reviewed on 19 October 2026 | Vendor-documented capabilities and jurisdictional scope; no independent competitor product tests |
| Customer discovery and production telemetry | Not available in this audit | Pain prevalence, ROI, adoption, willingness to pay, active customers, and production usage remain unmeasured |

The first test invocation was interrupted after producing no results during discovery. The rerun bounded Jest roots to the two relevant test directories and passed. Its inline configuration omitted the Next application directory and used mocked persistence; no application configuration, migration, seed, or production connection was intentionally loaded. No application files were changed. Pre-existing local edits, including onboarding and daily-digest work, were preserved. Findings about those files describe the local candidate, not necessarily a deployed release.

**Status vocabulary:** “Implemented” below means source exists and relevant behavior was inspected. “Partial” means a specific workflow or scope limitation was identified. “Not found” means not established in the inspected schema/source, not a proof of universal absence. None of these labels independently means production ready.

## 3. Accounting firms’ roles, segments, and commercial involvement

### Best-fit segments

| Segment | Main job | Fit with current Stoquify | Adoption constraint |
|---|---|---|---|
| Solo bookkeeper or practitioner | Collect client inputs, reconcile, prepare records, answer questions | Good fit for individual mandates and evidence review | May need a second qualified reviewer for actions requiring independent approval; do not weaken those controls |
| Small/growing firm with preparers and reviewers | Manage recurring work across clients and staff | Best initial strategic segment: recurring coordination problems and a plausible buyer | Needs explicit teams, assignments, handovers, coverage, and reliable portfolio status |
| Larger multidisciplinary firm | Standardized engagements, specialist review, capacity, controls, reporting | Longer-term opportunity | Requires broader practice management, integrations, service-level commitments, and tested portfolio scale |
| Firm serving clients on other ledgers | Collect evidence and produce accounts in its existing system | Possible coexistence opportunity | Requires dependable imports/exports and opening-position reconciliation; avoid assuming ledger replacement |

Segment preferences are product hypotheses. The repository does not establish which segment currently buys or retains Stoquify.

### Roles and responsibilities

| Role | Valuable work in Stoquify | Required boundary |
|---|---|---|
| Firm partner | Prioritize client risk, approve service scope, assess profitability and renewal | Firm oversight must not grant unrestricted access to every client automatically |
| Manager | Assign work, manage deadlines, resolve bottlenecks, review exceptions | Engagement-scoped visibility and delegation; retain attribution when staff change |
| Preparer/bookkeeper | Investigate transactions, collect source evidence, propose corrections | A PREPARER mandate label is not proof of authority to post journals or release payments |
| Reviewer | Assess current evidence, return work, approve permitted review steps | Preserve separation from the client respondent and other domain-specific maker/checker controls |
| Payroll/tax specialist | Review country-specific inputs, calculations, declarations, and evidence | Access only needed employee/client data; independently verify each production country capability |
| Client owner/finance lead | Grant and revoke mandates, supply evidence, authorize business decisions | Keep ownership and business authorization distinct from external accounting support |
| Client employee/cashier | Correct source records or respond to assigned requests | No incidental access to firm notes, other clients, or unrelated payroll details |
| Independent assurance provider | Inspect retained evidence within an explicit mandate | Product “certification” is a system evidence status, not an independent audit opinion |

Stoquify can support outsourced bookkeeping, close support, controller services, and advisory work. Tax/payroll support must be described at the actual capability and country level. Firm-led onboarding and referral are plausible growth channels. Existing accountant invitations and referral attribution provide starting infrastructure, but an accredited partner program, firm commissions, and partner service agreements were not established. [E15][E16]

### Client relationship lifecycle

| Stage | Existing basis | Next useful addition |
|---|---|---|
| Acquisition/referral | Invitation and referral-event attribution | Partner onboarding and qualified-lead handover, with explicit client choice |
| Engagement setup | Firm text fields, individual role, consent hash, dates | Scope of work, client contacts, team, deliverables, fees, and responsibility matrix |
| Authorization | Active/effective/unexpired grants, revocation, role checks | Firm/team assignment layered on client consent; clear renewal and staff-departure handling |
| Onboarding | Staged master imports and readiness projection | Reviewed financial cutover with opening balances and control totals |
| Recurring delivery | Evidence requests, work desk, ledger and close controls | Cross-domain recurring obligations and accountable work ownership |
| Review/reporting | Review records, source links, trust/close packs | Account-based workpapers and readable client deliverables |
| Renewal | Expiring mandates | Engagement review informed by work completed, unresolved obligations, and service value |
| Offboarding | Access revocation and retained evidence structures | Explicit handover/export checklist and retention policy per engagement |

## 4. Current functionality inventory

The table covers material accounting-firm capabilities, including relevant underlying business functions. Adjacent business modules do not automatically become accessible through an accountant mandate.

| Capability | Users and workflow/value | Status and evidence | Main limitation |
|---|---|---|---|
| Client consent mandates | Client authorizes a named accountant with role, dates, consent evidence and revocation | Implemented; source and focused unit tests [E01][E08] | Individual-user grant; descriptive firm identity |
| Invitation of an existing/new accountant | Existing active user receives a grant; new user follows a token-bound invitation acceptance | Implemented in source [E15] | Delivery and sign-up were not exercised live |
| Accountant portfolio | Accountant sees permitted clients, currency/country, close score, blockers and grant expiry | Implemented, partial portfolio truth [E01][E02] | 100-row cap; no returned continuation; stored scores and undisplayed assessment time |
| Cross-client work desk | Reviewer sees unanswered requests and submitted responses, urgency, delivery/publication status, and detail | Implemented; unit and component tests passed [E03][E04][E05] | Scoped to open close-evidence work; 10-client pages, not a complete firm workload total |
| Work-desk privacy and reauthorization | Redacted summaries before detail; access checked before/after reads; denied metadata withheld | Implemented; mocked denial/revocation tests [E04] | Live session/database races not tested in this audit |
| Client evidence requests | Requester links a question, recipient and deadline to a close finding | Implemented in source [E06] | Close-finding workflow, not an arbitrary universal document inbox |
| Client response and recipient replacement | Client responds; authorized staff can manage assignment/history | Implemented in source [E06][E17] | General-purpose uploads, OCR and channel coverage not established |
| Evidence acceptance | Reviewer inspects current replacement evidence, confirms identity, records notes, accepts matched response | Implemented; UI and work-desk tests passed [E03][E05][E06] | Acceptance cannot substitute for missing/stale source evidence; supported collectors bound the scope |
| Notification history | View retained request/response/acceptance publications, including closed work | Implemented in source [E18] | Publication is not proof a human read or acted on the message |
| Ledger-backed accountant portal | Inspect posted activity, source coverage, blockers, audit events and domain proof | Implemented in source [E19][E20] | Not equivalent to unrestricted access to every client's operational module |
| Chart of accounts and journals | Configure/use accounts and journals; prepare manual entries | Implemented in source [E08][E21] | Accounting setup, permission, period and account restrictions apply |
| Posting, reversal, period controls | Post/reverse through controlled actions and evaluate period close | Implemented source paths [E21][E22] | Actions inspected are tenant-scoped; blanket delegated mutation not established |
| Trial balance/general ledger | Review posted account activity and export accounting reports | Implemented in source [E11] | Report evidence is not full statutory-output certification |
| Profit and loss/balance sheet | Derive period activity and cumulative balances from posted ledger data | Implemented in source [E23] | Mapping completeness and statutory presentation require validation; full statutory statement suite not established |
| Customer receivables/statements | Review open items, aging/ledger evidence and customer-statement workflows | Implemented source foundation [E24] | Firm-wide collection management and delegated execution not established |
| Supplier invoices/AP controls | Match invoice/receipt/PO evidence; approve/post and handle exceptions | Implemented source foundation [E25] | Selective inspection; no fresh AP end-to-end test in this audit |
| Inventory accounting | Stock count/adjustment/transfer and class-3 reconciliation feed close evidence | Implemented source foundation [E26][E06] | Financial correctness and concurrency not newly certified here |
| Sales/POS accounting evidence | Posting services and source links supply ledger/close inputs | Implemented architecture/source paths [E19][E27] | No current POS business journey executed |
| Provider statement ingestion | Parse statements, fingerprint duplicates, bind provider account and invalidate affected close evidence | Implemented in source [E28] | Real-world provider formats and live coverage need individual validation |
| Mobile-money adapter | Generic signed-event and statement parser interface | Implemented, limited adapter [E29] | Generic HMAC/CSV support is not evidence of an approved live MTN/Orange/bank connection |
| Reconciliation/sign-off | Reconcile, validate source evidence, review/sign and export retained certificates | Implemented in source [E30] | Signing requires active workspace authority; no implied delegated firm signing |
| Suspense handling | Assign items, propose reclassification, approve with reviewed revision and retained evidence | Implemented in source [E31] | Requires controlled posting; not a free-form automatic cleanup action |
| Bank/balance-sheet close support | Coverage and balance evidence contribute to trust/close reads | Implemented source foundation [E19][E32] | Source availability and complete account coverage must be demonstrated per client |
| Close assessment | Gather domain checks, checklist items, findings, evidence and readiness | Implemented in source [E06] | Persisted assessment is historical; current source revision must still be checked |
| Review decisions/waivers | Record review status, comments, assignment and controlled waiver workflow | Implemented in source [E06] | Review labels alone do not prove every gate or firm-level segregation policy |
| Close invalidation/current proof | Source changes mark evidence stale; current proof evaluates blockers and retained exports | Implemented; current-proof tests passed [E07][E10] | Portfolio summary does not currently reuse this full current-proof contract |
| Trust/close pack exports | Produce hashed, watermarked, audited JSON evidence packs with sensitive-action controls | Implemented in source [E10][E19][E20] | Accountant pack is JSON-only; certified system evidence is not legal certification |
| Master-data import | Stage, validate, approve and commit customer/supplier/item masters with evidence/control totals | Implemented local candidate [E09] | Existing unrelated edits; excludes financial opening balances |
| Opening financial positions | Readiness lists stock, AR, AP, ledger and tie-out requirements | Partial/explicitly unfinished [E09] | AR/AP marked unsupported; cutover approval and tie-out not established |
| Payroll operations/evidence | Command read model, declaration lifecycle, settlement and production-admission controls | Implemented source foundation [E33] | No fresh calculation/settlement tests; country-specific production coverage must be independently established |
| Country rules/fiscal adapters | Cameroon static pack and adapter registry with explicit capability statuses | Partial/sandbox boundary [E12][E13][E14] | No blanket OHADA tax/payroll support or live tax submission claim |
| Daily operating digest | Organization-scoped signals, action counts, freshness/redaction states | Implemented contract/source [E34] | Not an accounting-firm-wide engagement digest |
| AI proposals | Evidence-referenced proposals, expiry and decisions; execution authority explicitly NONE | Implemented in source [E35] | No proof of autonomous bookkeeping, filing, posting or payment execution |
| Referral measurement | Aggregate prepared links, clicks, registrations and accepted invitations | Implemented in source [E16] | Historical acceptance is not current mandate or production activation; no firm commission ledger established |
| Firm identity/team engagements | Named legal firm, service scope, engagement team, staff succession | Not established as a dedicated model [E08] | Organization/users/roles are reusable foundations, not a complete firm contract |
| Account workpapers/document production | Versioned schedules, roll-forward, reviewer notes and linked output | Partial foundation in close comments/evidence; full workflow not found [E06][E08] | Do not confuse close evidence with a full working-paper system |
| Firm time/WIP/profitability | Time per engagement, realization, fee budget and margin | Not found in inspected firm scope [E08] | HR time entries and generic business billing are different domains |
| Firm-wide deadline/service calendar | Recurring obligations, statutory sources, cross-client due dates and coverage | Partial deadlines inside existing workflows [E06][E33] | Complete firm obligation register not established |
| Engagement pricing/renewal/offboarding | Contracts, fees, renewal and controlled client handover | Not established end to end | Subscription infrastructure and access revocation do not prove practice-management functionality |

## 5. Important gaps and their implications

### A. A portfolio card can be more reassuring than its evidence supports

`getAccountantPortfolio` selects the latest non-voided run and returns its stored score, high/critical blocker count and `asOf`. The card renders the percentage and blocker count but not `asOf`, run status or current evidence grade. Meanwhile, `deriveCloseCurrentProof` explicitly treats stored scores as historical and checks stale evidence, unresolved findings, unavailable evidence and valid retained exports. [E01][E02][E07]

**Implication:** a reviewer prioritizing clients from the cards can miss the distinction between “was ready at assessment time” and “has current usable proof.” This is a source-backed product gap; no production incident was observed. Resolve it before adding an AI priority ranking.

### B. The two portfolio surfaces have different completeness contracts

The portfolio returns up to 100 grants and sets `clientCount` to the returned length. It does not expose a continuation/total in the inspected DTO. The work desk deliberately pages 10 clients and provides continuation and incomplete/unavailable states. Its contract explicitly limits scope to open evidence within the loaded client page. [E01][E03][E04]

**Implication:** neither returned count should be promoted into an unqualified whole-firm KPI. At scale, add an explicit coverage contract, search, filtered totals and bounded authorization-safe aggregation. No performance benchmark was run; per-client queries are an architectural scaling concern, not a measured slowdown.

### C. A mandate is not a complete firm's engagement structure

`AccountantAccessGrant` binds client organization to accountant user; firm name and registration are strings. The shared access resolver distinguishes READ_ONLY from REVIEW/EXPORT but does not differentiate PREPARER and REVIEWER for those two capabilities. Other domain permissions remain relevant. [E01][E08]

**Implication:** the labels do not establish a formal preparer/reviewer engagement hierarchy. Model engagement team, effective assignment, substitutions, permitted services and client-approved boundaries. A staff member leaving a firm should not depend on manual discovery of every individual mandate.

### D. Delegated review is broader than a portal, but narrower than outsourced accounting execution

The portal and work-desk acceptance explicitly resolve a target client. Ordinary journal actions, close review updates and close-pack export actions inspected use `ctx.orgId`; reconciliation signing also requires an active user of that workspace. [E20][E21][E22][E30]

**Implication:** verify each external-accountant action separately. Do not assume that opening a client portal enables journal correction, AP approval, payroll release, reconciliation signature or final close. The sensible next step is a capability matrix and selected delegated workflows with preserved controls, not unrestricted tenant switching.

### E. Importing names is not migrating a client's books

The master importer expressly excludes current balances, opening ledger balances and stock quantities. Opening readiness states that there is no source-bound financial cutover approval/tie-out contract yet. [E09]

**Implication:** a firm migrating an established client still needs documented opening stock, AR/AP detail, ledger controls and reconciliation. Begin the pilot with existing Stoquify clients or a carefully controlled fresh period; build migration as a separate reviewed workflow.

### F. Useful evidence must become a usable deliverable

Both trust and close packs produce JSON, while general ledger/trial balance exports separately support JSON/CSV. [E10][E11][E19]

**Implication:** retain machine-readable evidence, then add readable, reconciled schedules and a client report. The opportunity is formatting and controlled workpapers tied to the same evidence, not creating an unrelated reporting truth.

### G. Country-pack labels need to lead to precise capability explanations

The Cameroon pack is labelled PUBLISHED but contains CNPS draft and IRPP expert-review requirements, and some legal references point to the 2025 tax code. Cameroon DGT now publishes a 2026 code. This warrants source-version review; it does not prove any particular stored tax value is wrong. [E14][W10]

The fiscal registry's sandbox-only adapters and payroll's production-admission conditions reinforce the need to separate “rules represented,” “expert approved,” “calculation supported,” “manual evidence recorded,” and “live filing executed.” [E12][E33]

### H. Real provider files are an onboarding and reliability risk

The generic mobile-money adapter's inspected CSV helper splits rows and fields on newline and comma. It does not implement quoted CSV field handling in that helper. A description containing a quoted comma can therefore misalign columns. [E29]

**Implication:** validate actual provider file samples, regional separators and formats before onboarding firms on promises of automatic statement processing. No test or change was added for this adjacent finding because this task is an assessment.

## 6. End-to-end workflows and recurring pain points

Pain severity and prevalence below are hypotheses derived from workflow requirements. No interviews or measured customer time savings were supplied.

| Workflow | Trigger and participants | Current Stoquify path | Remaining friction and completion proof |
|---|---|---|---|
| Start a client relationship | Client owner grants accountant access | Permission-protected grant/invite → consent and effective dates → recipient acceptance if needed → active mandate → portfolio → client portal [E01][E15][E20] | Firm scope/team/engagement not established. Complete when the intended staff can perform only agreed work and the client can revoke it |
| Chase and resolve missing proof | Close finding lacks evidence; requester, client respondent, reviewer | Finding → request/recipient/deadline → notification → response → work desk → source replacement preview → fresh-auth acceptance → retained resolution/event [E04][E05][E06][E17][E18] | Needs broader source-linked query types and convenient client submission. Complete when verified evidence resolves the finding; a reply alone is insufficient |
| Reconcile receipts/settlements | New statement or provider event; preparer/reviewer | Ingestion/fingerprints → reconciliation → exceptions/suspense → reviewed decision → sign-off/certificate → close consequences [E28][E30][E31] | Real provider coverage and delegated signer authority need validation. Complete when account coverage and signed current evidence are established |
| Correct accounting and close a period | Review identifies error or incomplete proof | Controlled posting/reversal → close-source invalidation → reassessment → review/waiver where permitted → current pack → period controls [E06][E07][E10][E21][E22] | No universal delegated correction path. Complete when current ledger, source revision, review and period gates agree |
| Migrate an established client | New engagement or replacement system | Stage/validate/approve/commit masters → opening readiness [E09] | Financial cutover remains incomplete. Complete only after source totals, detail, opening ledger and valuation tie out under an approved cutover |
| Payroll/declaration support | Payroll cycle, declaration deadline or settlement | Payroll read model → readiness/production admission → lifecycle/evidence/settlement controls → accounting/close evidence [E33] | Exact country calculation and authority/provider readiness remain conditional. Complete with accepted evidence appropriate to the actual supported workflow |
| Deliver management advice | Period review or cash concern | Ledger/AR/AP and evidence data available; organization digest/proposals provide foundations [E19][E23][E24][E34][E35] | Firm-authored narrative, client actions and service-value tracking need extension. Complete with agreed client action and traceable basis, not just a downloaded chart |

### Work cadence

| Cadence | Work that creates a real reason to return | Desired outcome |
|---|---|---|
| Daily | New client response, changed source evidence, overdue high-impact request, failed ingestion or unresolved settlement | Resolve the items that can progress today; delegate the rest with a clear owner |
| Weekly | Review aging requests, stale assessments, account coverage, team handovers and client progress | Reduce blockers before month end; identify clients requiring intervention |
| Monthly | Reconcile, prepare adjustments, review schedules, confirm payroll/AP inputs and complete close | Current, reproducible records and a report the client understands |
| Quarterly | Review service performance, applicable obligations, cash needs and engagement scope | Improve client decisions and adjust service capacity; jurisdictional obligations must be verified |
| Annually | Year-end review, applicable statutory outputs, retention, mandate renewal and service review | A defensible handover/reporting package and a clear next engagement |

Automation should remove repetitive polling, duplicate requests and manual copying. Users should return when their judgment or action changes an outcome. Quiet periods with fewer logins may indicate a well-functioning product.

## 7. Ranked product opportunities

This is an ordinal product judgment, not a calculated ROI forecast. Priority reflects observed gaps, closeness to existing implementation, recurring workflow value and dependency order. Effort is relative: S = contained extension; M = multiple connected workflows; L = cross-domain product/model work. Confidence distinguishes source-backed gaps from market hypotheses.

| Rank | Opportunity/type | Value and cadence | Minimum useful scope, dependencies and exclusions | Effort / confidence |
|---|---|---|---|---|
| 1 | **Current, complete portfolio status** — completion | Reliable daily/weekly prioritization | Reuse current-proof grading; display assessment age, period, coverage and incomplete scope; paginate all clients. No new scoring model | M / high gap confidence |
| 2 | **Firm engagements and client teams** — new model on existing identities | Staff assignment, handover and review accountability | Engagement, client consent, team membership, lead/preparer/reviewer, effective dates and revocation. Exclude full CRM automation initially | L / high structural gap, medium demand confidence |
| 3 | **Unified evidence and exception work desk** — extension | Daily resolution of missing documents and unresolved source questions | Expand existing desk to a few typed source problems; ownership, request/response, verified completion, safe reminder batching. Exclude generic chat/social features | M–L / high reuse, medium demand confidence |
| 4 | **Financial onboarding and cutover tie-out** — new controlled workflow | Faster, safer activation of established clients | Opening stock, AR/AP items, ledger control totals, validation and independent approval. Exclude arbitrary historical reconstruction | L / high gap confidence |
| 5 | **Review workpapers and readable close deliverables** — extension | Monthly/annual review with less repeated assembly | Account schedules, linked evidence, reviewer notes, roll-forward and PDF/spreadsheet-compatible outputs alongside JSON. Exclude legal audit-opinion automation | L / high output gap, medium demand confidence |
| 6 | **Provider coverage and reconciliation completeness** — completion | Daily/weekly payment reconciliation | Harden real file formats, freshness, no-activity evidence and account coverage; start with pilot providers. Exclude promises of universal bank feeds | M–L / high technical need, provider scope unverified |
| 7 | **Selected delegated accounting actions** — extension | Complete work without unsafe account sharing | Capability matrix, one approved correction/review journey, explicit authority and independent approval where required. Exclude blanket cross-tenant mutation | L / high scope gap, workflow choice needs validation |
| 8 | **Country-specific obligation register** — extension | Reliable weekly/monthly deadline management | Source-versioned obligations, applicability, owner, due date, evidence and manual submission status. Exclude automatic filing before a certified live adapter exists | M–L / medium; requires domain review |
| 9 | **Client advisory packs and follow-through** — extension | Monthly advice and higher-value services | Reviewed cash/AR/AP/stock observations, source links, client narrative and agreed actions. Exclude invented forecasts or stale-data certainty | M / medium |
| 10 | **Firm workload and engagement economics** — new | Weekly staffing and monthly fee review | Manual/lightweight effort capture, agreed fee budget, assignment and rework cost. Exclude employee surveillance and complex billing engines initially | M–L / medium-low until interviews |
| 11 | **Evidence-grounded assistant** — extension | Faster daily triage and drafting | Explain discrepancies, draft requests and summarize changes with source references and freshness; preserve NONE execution authority. Exclude autonomous posting/payment/filing | M / medium, requires task-specific evaluation |
| 12 | **Partner onboarding and coexistence toolkit** — extension | Repeatable firm-led acquisition and rollout | Firm demo/onboarding playbooks, trial client activation, import/export profiles and attribution to successful use. Exclude commission automation until commercial terms are validated | M / medium |

### Validation requirements for opportunities 6–12

| Rank | Acceptance criterion and experiment | Failure/recovery boundary |
|---|---|---|
| 6 | Replay representative pilot-provider files, including quoted fields, fees, reversals and duplicates; reconcile parsed totals to source totals | Reject unsupported/ambiguous formats; preserve import evidence and idempotent replay rather than partially guessing |
| 7 | In a disposable environment, external preparer completes the selected journey only for an active client grant; reviewer approves under explicit policy | Deny revoked, expired, wrong-client, self-approved and stale-revision actions; preserve uncertain-command recovery |
| 8 | A domain reviewer verifies each pilot obligation's applicability, source, effective dates and evidence requirements | Show unknown/expired rule coverage; do not transform manual capture into an authority acceptance claim |
| 9 | Five pilot clients can trace each material report statement to current source and identify the requested action | Mark unavailable/uncertain figures; regenerate when underlying evidence changes |
| 10 | Compare planned versus recorded effort on pilot engagements and ask managers whether it changes staffing/pricing decisions | Separate missing timesheets from zero work; restrict sensitive fee/cost information |
| 11 | Evaluate against an expert-labelled set of common discrepancies; measure unsupported assertions, correct citations, useful drafts and abstentions | Refuse ungrounded conclusions; no accepted proposal may directly gain execution authority |
| 12 | Measure first authorized client, first useful completed workflow and repeat use, not only invitations | Preserve client ownership and export paths; staff/referral attribution must not silently grant data access |

## 8. Top-five product briefs

### 1. Current portfolio status and honest coverage

**User/problem:** a manager must decide which client needs intervention, but a historical score and incomplete client count can give the wrong impression. This is directly supported by the current source, rather than inferred from interviews. [E01][E02][E07]

**Before:** read a percentage, open each client to establish whether its evidence is current, and manually reconcile what the portfolio covers.

**After:** see the selected period, assessment time, current evidence state, unresolved high-impact work, mandate expiry and loaded/total coverage; open the exact blocker. Keep the stored score as historical evidence with a clear label.

**Minimum scope:** reuse `deriveCloseCurrentProof` or its shared domain inputs; add explicit stale/historical/unknown states; include complete client pagination and search. Share period and scope semantics between portfolio and work desk. Preserve the existing design system rather than redesigning branding. [E36]

**Dependencies:** current run selection, authorization-safe aggregate reads, assessment/source revisions, grant pagination. No need for AI or a new trust algorithm.

**Controls/recovery:** revocation removes names and summaries; unavailable clients remain excluded with honest coverage metadata; a failed read is not zero blockers. Never aggregate unlike periods without stating it.

**Acceptance:** fixtures with stale exports, changed source revisions, missing assessment, revoked access and more than 100 clients produce truthful states and reachable authorized clients. Current-proof status must agree with the client detail for the same snapshot/scope.

**Experiment/benefit:** give managers matched client-prioritization tasks using the current and revised views; measure correct intervention choices and time to first useful action. Expected benefit is reduced discovery effort and false reassurance; magnitude is unmeasured.

### 2. Firm engagements, teams and handover

**User/problem:** the partner needs continuity when staff join, leave or cover a client. Individual mandates and textual firm identity do not by themselves provide that continuity. [E08]

**Before:** access and work attribution revolve around named accountants; firm scope and cover arrangements must be coordinated elsewhere.

**After:** a client engagement records authorized services, responsible firm, client owner, lead manager, assigned preparers/reviewers, effective period and contact route. Staff access is the intersection of current firm membership, engagement assignment, client consent and domain permission.

**Minimum scope:** one firm organization; client engagements; explicit team assignments; active/inactive and expiry transitions; controlled replacement/handover; an engagement activity history. Retain existing users, organizations and permission machinery. Do not build a separate authentication system.

**Dependencies:** agree the legal/commercial consent semantics with pilot firms and clients; design how existing per-user grants coexist or migrate; settle whether a firm administrator can assign within a client-approved team scope.

**Controls/recovery:** no inferred authority from matching firm names; no staff-wide access by default; protect payroll/sensitive notes; retain historical attribution after removal. Offboarding must be deterministic and auditable.

**Acceptance:** departing staff lose access on the next protected operation; a replacement gains only explicitly assigned access; historical comments remain attributable; preparer/reviewer permissions are demonstrably distinct for selected approval actions.

**Experiment/benefit:** role-play staff departure, leave cover and engagement expiry with three firms before implementation. Measure coordination steps and policy disagreements. Expected value is continuity and reduced access administration, with team-demand assumptions validated first.

### 3. Unified source-linked evidence and exception desk

**User/problem:** preparers and reviewers need to resolve client questions without losing the transaction, deadline or decision trail. The present close-evidence desk already implements much of the hard part. [E03][E04][E05][E06]

**Before:** close-related evidence flows through Stoquify, while other missing documents or source discrepancies may require separate coordination. The latter is a hypothesis to test, not observed customer behavior.

**After:** one prioritized queue covers a small initial set of source-linked cases, such as missing settlement proof, invoice/receipt mismatch and missing close evidence. Each shows who can act now, its due date, client/period, delivery status and definition of completion.

**Minimum scope:** extend the existing request/response/acceptance contracts to two adjacent case types; retain source references and request history; add batched client reminders and a simple submission path. Prefer secure email/messaging links to creating a full messaging platform. Evaluate document extraction as a separate later integration.

**Dependencies:** typed source adapters, recipient authorization, reliable notification delivery, storage/security review if accepting new file types, and explicit mapping from submitted evidence to domain validation.

**Controls/recovery:** deduplicate requests; protect notes by audience; do not accept the respondent's own response; require current evidence binding before resolution; preserve retry keys and submitted notes when the result is uncertain. A sent notification or uploaded file does not close a financial exception.

**Acceptance:** each pilot case can be opened, assigned, answered, reviewed and resolved with a trace to the original source. Duplicate submission, failed delivery, recipient replacement and changed-source cases recover without false completion or data leakage.

**Experiment/benefit:** measure touches per request, response time and time from usable response to accepted resolution. Compare one prior period with the pilot, normalized by case type and volume. Expected benefit is less chasing and review rework.

### 4. Financial onboarding and cutover

**User/problem:** a firm onboarding an established business needs assurance that the opening books match its source records. Master-data import is deliberately insufficient. [E09]

**Before:** names and catalogs can be imported, but opening stock, receivables, payables, ledger and tie-out remain a separate task.

**After:** an onboarding workbench stages a dated opening position, validates source files and mappings, reconciles detail to control totals, records exceptions and obtains independent approval before using existing controlled domain writers.

**Minimum scope:** one country/currency and one supported source format per opening domain; source-file hashes; proposed entries/items; mismatch report; accepted cutover date; explicit controls and handover manifest. Start with a small selected client set.

**Dependencies:** existing importer stages and control evidence; AR/AP item contracts; inventory valuation; journals/posting rules; fiscal periods; a domain-approved policy preventing duplicate balances or double-counted receipts/invoices.

**Controls/recovery:** a re-upload must not duplicate opening positions; changed data invalidates approval; failed partial execution must identify committed records and support controlled resume or correction. Do not use direct quantity/balance writes as a shortcut.

**Acceptance:** approved detail reconciles to ledger controls and stock valuation; intentional mismatches block activation; reruns are idempotent; the approved source manifest reconstructs the cutover. Real database tests are mandatory for a future implementation.

**Experiment/benefit:** shadow-migrate two anonymized or synthetic client datasets and compare with the accountant's independently checked opening totals. Measure effort and unresolved exceptions. This is a growth gate, not necessarily the first pilot feature if clients already use Stoquify.

### 5. Account workpapers and client-ready deliverables

**User/problem:** a reviewer needs to document why balances are acceptable and communicate results to the client. JSON is valuable retained evidence, but it is not an adequate default working paper or management report for every firm. [E10][E11][E19]

**Before:** inspect the portal and export JSON/CSV, then assemble review schedules and narrative elsewhere.

**After:** a period binder contains account schedules, reconciliation references, review notes, preparer/reviewer decisions and a readable report. Each financial amount and conclusion links to the retained evidence revision used.

**Minimum scope:** cash/settlement, AR, AP and inventory schedules; review notes and response; period roll-forward with explicit revalidation; PDF summary and spreadsheet-compatible schedules beside the canonical JSON manifest. Do not represent this as a statutory audit file certification.

**Dependencies:** posted ledger/report services, evidence/source links, close revisions and review records, export controls, agreed output layouts, role-specific redaction.

**Controls/recovery:** rolled-forward work starts unreviewed where source/period changes require it; stale evidence marks affected schedules for re-review; exports retain generation time, scope, revision and limitations. Independent review is an explicit workflow decision, not a decorative badge.

**Acceptance:** schedule totals tie to the selected ledger; report numbers agree across formats; a source correction identifies affected workpapers; permissions and redaction survive export; a reviewer can reproduce the basis of a conclusion.

**Experiment/benefit:** ask pilot reviewers to complete the same account-review task with current exports and a prototype binder. Measure assembly time, rework and evidence retrieval success. Validate client comprehension separately.

## 9. Frequent use through recurring value

| Role/scenario | Trigger → information → action → completed outcome | Reason for next visit |
|---|---|---|
| Preparer, daily | Client submits settlement proof → work desk shows current source and due date → investigate/prepare response → reviewer-ready case | Another response or actionable source discrepancy appears |
| Reviewer, daily | Prepared evidence is ready → view original question, current source and changes → accept or return with reasons → retained decision | A new review-ready item arrives; no need to poll a quiet queue |
| Manager, weekly | Several clients have aging unresolved work → current portfolio coverage and owner breakdown → reassign/escalate within authority → actionable work has accountable owners | Follow up on unresolved or newly blocked items |
| Partner, monthly | Close delivery and service review → client outcomes, effort and unresolved risks → discuss improvements/service scope → agreed client action | Next agreed milestone or material business change |
| Client owner, as needed | Specific evidence request or approval → understandable source-linked question → provide evidence/authorize decision → obligation visibly progresses | A new request or decision genuinely needs the owner's input |

**Illustrative daily routine:** a preparer opens the desk, reviews returned client evidence and resolves a supported case. A reviewer later sees only cases ready for judgment. A manager checks aging work weekly. There is no benefit in making all three re-open identical lists several times per day.

**Illustrative month-end routine:** the team reviews account coverage, clears source exceptions, completes schedules, obtains current close evidence, and delivers a report. A later source correction identifies the affected evidence and schedules. This is the compelling recurring loop: problems become visible, work moves to the correct actor, and completion has a verifiable meaning.

Onboarding must teach that loop with one real, bounded client case. Train client respondents separately from firm reviewers. Keep EN/FR terminology consistent and explain unavailable/stale states in business language. Low-bandwidth submission, keyboard-efficient review and useful exports should be tested with the actual pilot users. These are validation needs, not current browser certification.

## 10. Competitive position

All external sources below were reviewed on 19 October 2026. They describe vendor capabilities; availability by edition, country and integration must be confirmed before purchase or migration decisions.

| Alternative | Verified capabilities relevant to firms | Scope caveat | Implication for Stoquify |
|---|---|---|---|
| Xero Partner Hub / Practice Manager | Client/staff management, jobs, time, billing and connected practice information [W01][W02] | Named market availability and integrations differ; the cited material does not establish OHADA/Cameroon coverage | Portfolios and practice coordination are established expectations |
| QuickBooks Online Accountant / Intuit Accountant Suite | Books Review supports client transaction queries; Books Close documents portfolio periods, deadlines, templates and prepare/review/approve assignments [W03][W04][W05] | US Books Close is described as beta/opt-in; UK/US documentation is not universal availability | Do not claim portfolio close or client requests are unique; evaluate source-change behavior and regional fit |
| Karbon | Shared client communication, onboarding/work templates, client requests, reminders and document-linked workflows [W06][W07] | These sources establish practice management, not native OHADA ledger or local filing coverage | A generic task board or reminder engine will not distinguish Stoquify |
| Pennylane | Production portfolio, entry/review/declaration progress, client assignments, firm commercial operations, time and profitability [W08][W09] | France-oriented references and workflows; not proof of OHADA or African tax support | Strong integrated firm/client benchmark; compete on demonstrable regional execution and source evidence |
| Sage 100 / ECF OHADA | Sage's official export catalogue identifies ECF OHADA [W11] | Retrieved catalogue is dated September 2024; current templates, editions, filing connections and prices were not confirmed | Regional accounting is already served; prioritize output compatibility and coexistence |
| Spreadsheet + email/shared documents | Excel supports shared editing, changes and version history [W12] | Workflow baseline, not measured prevalence among target firms | Win through fewer manual handoffs and reproducible accounting resolution while retaining useful exports |

Intuit's August 2026 transition documentation also means a comparison frozen at “QuickBooks Online Accountant” alone would miss current product direction. [W05]

**Table stakes:** secure delegated access; client portfolio; requests and deadlines; clear review states; exports; staff assignment; reliable import; useful support; predictable commercial terms.

**Potential differentiation:** a discrepancy can be traced from a sale/receipt, stock movement, supplier document or settlement into a ledger and close finding, resolved by the appropriate actor, and invalidated if its underlying source changes. Stoquify has source foundations for that chain. The unresolved questions are whether it works reliably across the chosen real-world workflows and whether firms value it enough to adopt. [E06][E10][E19][E25][E27][E28]

**Build versus integrate:** build the consent/engagement model, current evidence logic and domain-linked resolution where these depend on Stoquify's business truth. Prefer evaluating integrations for commodity OCR, document e-signature, notification delivery, calendars and external ledger import/export. Do not introduce new dependencies until pilot requirements and existing tools are assessed.

**Reasons a firm might reject Stoquify:** clients are on another ledger; required national outputs are not verified; opening positions are too difficult; provider data formats fail; staff need an established practice-management tool; existing reports are inconvenient; data access or subscription boundaries are confusing; the operational savings fail to exceed training and migration costs. These are hypotheses to test rather than objections proven by interviews.

OHADA's AUDCIF/SYSCOHADA concerns accounting and financial information. National tax rules and declaration services require separate country-specific evidence. A common accounting framework cannot establish universal tax deadlines, tax calculations or filing readiness. [W10][W13]

## 11. Commercial model and distribution hypotheses

**Initial buyer:** a partner or managing accountant responsible for recurring delivery across several SME clients. **Daily users:** preparers and reviewers. **Client beneficiary:** the owner receives fewer unclear requests and better-supported reports. The business case must connect all three rather than sell only a dashboard to the partner.

| Model | Advantage | Constraint | Suggested validation |
|---|---|---|---|
| Client subscribes and invites accountant | Closest to current consent model; client retains direct relationship | Firm may face inconsistent modules and billing across clients | Pilot first with existing Stoquify clients and one firm |
| Firm sponsors managed clients | Can align recurring-service packaging and deployment | Requires team/engagement model, transparent client ownership and billing semantics | Test after firm access scope is clear |
| Hybrid | Firm workspace plus client operational subscriptions | More flexible but can become commercially confusing | Prototype a simple entitlement/price explanation before engineering |

Potential packages are hypotheses: an accountant collaboration tier; a firm portfolio/review tier; and operational modules paid by the client or sponsored under a clear agreement. Avoid charging per client response or essential review action, which could discourage the collaboration the product needs. No price or willingness-to-pay figure is justified by this audit.

Measure firm acquisition through first authorized client, first completed useful workflow, repeated successful periods and paying retention. Existing invitation counts and referral conversion are useful earlier funnel signals, not evidence of realized firm value. [E16]

Partner incentives should reward successful adoption and client outcomes, preserve client consent, and avoid implying that referral status confers professional certification or control over client accounts. The exact commercial arrangement requires discovery; no outreach or offer was sent.

## 12. Roadmap and pilot

These are sequencing recommendations, not engineering commitments. Staffing, implementation duration and budget were not supplied.

| Phase | Scope | Exit condition |
|---|---|---|
| Foundation | Validate deployed baseline; fix portfolio freshness/completeness; document mandate/action/entitlement matrix; verify notification operations and supported country/provider scope | Every pilot screen distinguishes current, stale, partial and unavailable evidence; supported actions are explicit |
| Minimum valuable pilot | Existing clients, explicit individual mandates, current portfolio, existing evidence desk, one close period and a readable reviewed deliverable | Complete the request → response → verified review → current close-evidence loop on real permitted cases |
| Team scale | Engagement/team model, handover, broader source-linked cases, selected delegated actions, account workpapers | Multiple staff complete recurring work with consistent scope, independent review and safe revocation |
| Client expansion | Financial cutover, tested provider formats, country obligation register and coexistence profiles | An established client can be onboarded with reconciled opening positions and supported recurring obligations |
| Commercial expansion | Workload/economics, advisory packs, partner toolkit and evaluated AI support | Measurable firm value, repeatable onboarding, supportable economics and retained client choice |

Do not make a complete practice-management replacement a prerequisite for the first pilot. Conversely, do not onboard a multi-team firm while presenting individual grants as a completed firm security model.

### Proposed research and pilot design

1. **Discovery:** interview 6–8 firms across solo/small/growing segments and observe at least one recurring workflow in each willing firm. Ask for the last difficult close or client-evidence case rather than hypothetical feature preferences. These are proposed sample sizes, not completed research.
2. **Artifact collection:** with authorization, review redacted request lists, workpapers, opening trial balances and provider file formats. Capture what constitutes acceptable completion, who may approve and where rework happens.
3. **Prototype tasks:** test portfolio prioritization, staff handover, a client response, evidence review and readable output with preparers, reviewers and client respondents.
4. **Bounded pilot:** proposed 3 firms, 5–10 clients per firm, over two monthly cycles. Start with existing Stoquify clients and the verified country/provider scope. Keep unsupported filing and financial migration outside the pilot unless separately validated.
5. **Decision:** compare workflow outcomes and retention against baseline; inspect failures and support burden; then choose whether to scale the evidence-to-close entry point, prioritize migration, or narrow the segment.

### Proposed success criteria

All targets below are proposed pilot thresholds and should be agreed after baseline measurement. They are not predictions or existing results.

| Metric | Measurement | Proposed decision threshold |
|---|---|---|
| Evidence-request effort | Human touches and active minutes per comparable resolved case | At least 25% reduction without higher reviewer rework |
| Response-to-resolution time | Time from usable client response to accepted resolution, excluding documented client waiting | At least 20% reduction for comparable cases |
| Close duration | Time from agreed input completeness to approved pilot deliverable | At least 20% improvement or a clearly demonstrated quality benefit |
| Evidence traceability | Sample completed cases; reconstruct source, request, response, current revision and decision | 100% of sampled pilot completions traceable; no false resolved state accepted |
| Portfolio truth | Compare displayed status/coverage to authorized client detail under controlled changes | No false-current states in critical acceptance scenarios |
| Onboarding effort | Staff hours from authorized client setup to first useful completed workflow | Falling across successive clients; quantify before setting a firm-wide target |
| Useful repeat participation | Assigned preparers/reviewers complete actual work in both cycles | At least 80% of assigned pilot users participate meaningfully in each applicable cycle |
| Commercial intent | End-of-pilot decision with an explicit package and price proposal | At least 2 of 3 pilot firms choose a concrete continuation discussion; this is not paid retention |
| Product burden | Support requests, failed imports, duplicate requests and notification complaints per client | No worsening trend hidden by increasing usage; review every material failure |

Log workflow timestamps and case type, not just page visits. Separate work time, client waiting time and system delay. Track financial correctness, privacy denials, rework and notification burden alongside speed. A small pilot supplies directional evidence; it cannot establish population-wide ROI or market leadership.

## 13. Evidence appendix and limitations

### Architecture navigation

Existing graphs were used as discovery aids. The repository's refresh note is dated 9 August 2026, so its counts and communities were not treated as current behavioral proof. Relevant nodes include action community 58 (`accounting_accountant_access_actions_getaccountantportfolioaction`), component community 48 (`accounting_accountantaccessmanager_tsx`), component community 17 (`accounting_accountantportal_tsx`), and route communities 74/75 for portal/portfolio. Current work-desk and access source was read directly. [E37]

The core relationship is:

`portfolio route → access action → active client grants → portfolio projection`

`work-desk component → protected action → current home/client authority → request/review queues → source-bound acceptance service`

`portal route → protected action → client access resolution → ledger/domain trust projection → controlled export`

These are distinct authority and data paths; merging their UI does not automatically merge their permissions.

### Exact focused test reproduction

After reviewing the script registry, test imports, mocks, setup and relevant dependencies, the following inline configuration was run with the installed Node/Jest/Next transform. It creates no repository config file. The complete run passed 4 suites and 100 tests in 11.272 seconds of reported Jest runtime. Node emitted deprecation/experimental warnings; no test failures were reported.

```powershell
$accountantAuditScript = @'
const nextJest = require('next/jest');
const {runCLI} = require('jest');
(async () => {
 const base={rootDir:process.cwd(), moduleNameMapper:{'^@/(.*)$':'<rootDir>/$1'},setupFiles:[],collectCoverage:false,testTimeout:20000};
 const unit=await nextJest()({...base,displayName:'accountant-audit-unit',roots:['<rootDir>/services/accounting/__tests__'],testEnvironment:'node',setupFilesAfterEnv:[],testMatch:['<rootDir>/services/accounting/__tests__/accountant-access.service.test.ts','<rootDir>/services/accounting/__tests__/accountant-work-desk.service.test.ts','<rootDir>/services/accounting/__tests__/close-assurance-current-proof.test.ts']})();
 const ui=await nextJest()({...base,displayName:'accountant-audit-component',roots:['<rootDir>/components/accounting/__tests__'],testEnvironment:'jsdom',setupFilesAfterEnv:['@testing-library/jest-dom'],testMatch:['<rootDir>/components/accounting/__tests__/AccountantWorkDesk.test.tsx']})();
 const result=await runCLI({config:JSON.stringify({projects:[unit,ui]}),runInBand:true,cache:false},[process.cwd()]);
 process.exitCode=result.results.success?0:1;
})().catch(e=>{console.error(e);process.exitCode=1});
'@
node -e $accountantAuditScript
```

The action test files were inspected but not included in that execution. Existing PostgreSQL/browser artifacts elsewhere in the repository were not promoted into current certification. The report does not establish production client counts, release state, live provider/authority credentials, delivery reliability, firm licensing or actual accounting outcomes.

### Outstanding decisions

- Which firm segment and client industry have the strongest observed recurring pain?
- Does the first pilot use existing Stoquify clients, or is financial migration mandatory?
- Which actions must external accountants execute, and who provides independent approval?
- Is client consent granted to named individuals, a managed firm team, or both?
- Which provider file samples and official interfaces are available for supported pilot connections?
- Which exact Cameroon calculation, declaration and output capabilities have qualified current approval?
- Which workpapers and export formats do target firms need to retain their current production tools?
- What deployment, operational support, pricing and data-retention arrangements will the pilot actually offer?

These questions guide validation. Stoquify already has a relevant internal foundation for a focused evidence-to-close product. Whether that foundation becomes a preferred platform depends on verified execution, usable firm workflows and measured customer outcomes.

### Code and project evidence

- **E01:** [Accountant access service: grants, access resolution and portfolio](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-access.service.ts:174>).
- **E02:** [Portfolio cards](<E:/ohada saas/Focused projects/stoquify/components/accounting/AccountantPortfolio.tsx:1>).
- **E03:** [Work-desk contracts](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-work-desk.contracts.ts:1>) and [protected actions](<E:/ohada saas/Focused projects/stoquify/actions/accounting/accountant-work-desk.actions.ts:1>).
- **E04:** [Work-desk service](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-work-desk.service.ts:87>) and [mocked tests](<E:/ohada saas/Focused projects/stoquify/services/accounting/__tests__/accountant-work-desk.service.test.ts:1>).
- **E05:** [Work-desk UI](<E:/ohada saas/Focused projects/stoquify/components/accounting/AccountantWorkDesk.tsx:1>) and [component tests](<E:/ohada saas/Focused projects/stoquify/components/accounting/__tests__/AccountantWorkDesk.test.tsx:1>).
- **E06:** [Close assessment and workflow service](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts:2548>), [request](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts:3801>) and [acceptance](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts:4265>).
- **E07:** [Current-proof grading](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance-current-proof.ts:1>) and [tests](<E:/ohada saas/Focused projects/stoquify/services/accounting/__tests__/close-assurance-current-proof.test.ts:1>).
- **E08:** [Accountant roles](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7381>), [review/comment models](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7637>) and [access-grant model](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7709>).
- **E09:** [Master import scope and execution](<E:/ohada saas/Focused projects/stoquify/services/onboarding/master-data-import.service.ts:1>) and [opening-readiness limitations](<E:/ohada saas/Focused projects/stoquify/services/onboarding/opening-readiness.ts:1>); both describe the inspected local candidate.
- **E10:** [Close pack, invalidation and certification limits](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance-pack.service.ts:1>).
- **E11:** [Trial balance, ledger and report exports](<E:/ohada saas/Focused projects/stoquify/services/accounting/reports.service.ts:74>).
- **E12:** [Fiscal adapter registry](<E:/ohada saas/Focused projects/stoquify/services/compliance/adapters/registry.ts:1>) and [Cameroon sandbox](<E:/ohada saas/Focused projects/stoquify/services/compliance/adapters/cameroon-dgi-sandbox.ts:1>).
- **E13:** [Static country-pack registry](<E:/ohada saas/Focused projects/stoquify/services/regulatory/country-packs/registry.ts:1>).
- **E14:** [Cameroon capability statuses and source references](<E:/ohada saas/Focused projects/stoquify/services/regulatory/country-packs/cameroon.ts:1>).
- **E15:** [Existing/new accountant invitation](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-client-invite.service.ts:474>) and [acceptance](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-client-invite.service.ts:521>).
- **E16:** [Referral funnel and privacy boundary](<E:/ohada saas/Focused projects/stoquify/services/referrals/referral-funnel-read-model.service.ts:1>).
- **E17:** [Same-organization evidence workbench](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-evidence-workflow.service.ts:1>).
- **E18:** [Historical publication records](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-notification-history.service.ts:1>).
- **E19:** [Portal data contract](<E:/ohada saas/Focused projects/stoquify/services/accounting/data-trust.service.ts:79>) and [JSON-only controlled export](<E:/ohada saas/Focused projects/stoquify/services/accounting/data-trust.service.ts:2604>).
- **E20:** [Delegated portal/export actions](<E:/ohada saas/Focused projects/stoquify/actions/accounting/data-trust.actions.ts:1>).
- **E21:** [Journal action scope](<E:/ohada saas/Focused projects/stoquify/actions/accounting/journals.actions.ts:1>) and [manual-entry controls](<E:/ohada saas/Focused projects/stoquify/services/accounting/journals.service.ts:304>).
- **E22:** [Close review/export action scope](<E:/ohada saas/Focused projects/stoquify/actions/accounting/close-assurance.actions.ts:254>) and [period close controls](<E:/ohada saas/Focused projects/stoquify/services/accounting/periods.service.ts:382>).
- **E23:** [Financial statement read model](<E:/ohada saas/Focused projects/stoquify/services/accounting/financial-statements.service.ts:259>).
- **E24:** [AR open items](<E:/ohada saas/Focused projects/stoquify/services/accounting/ar-open-item.service.ts:176>) and [customer statements](<E:/ohada saas/Focused projects/stoquify/services/accounting/customer-statement.service.ts>).
- **E25:** [AP control and accounting integration](<E:/ohada saas/Focused projects/stoquify/services/purchasing/ap-control.service.ts:1>).
- **E26:** [Inventory valuation exports](<E:/ohada saas/Focused projects/stoquify/services/inventory/inventory-valuation.service.ts:1>) and [class-3 reconciliation](<E:/ohada saas/Focused projects/stoquify/services/inventory/inventory-reconciliation.service.ts>).
- **E27:** [POS sale posting path](<E:/ohada saas/Focused projects/stoquify/services/accounting/postings/post-sale.ts>) and [source linking](<E:/ohada saas/Focused projects/stoquify/services/accounting/source-link.service.ts>).
- **E28:** [Statement import](<E:/ohada saas/Focused projects/stoquify/services/payments/statement-import.service.ts:1>).
- **E29:** [Generic mobile-money parser and adapter](<E:/ohada saas/Focused projects/stoquify/services/payments/adapters/mobile-money-hmac.adapter.ts:100>).
- **E30:** [Reconciliation/sign-off controls](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-reconciliation-certification.service.ts:631>).
- **E31:** [Suspense proposal and approval](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-suspense-workflow.service.ts:320>).
- **E32:** [Balance-sheet close](<E:/ohada saas/Focused projects/stoquify/services/accounting/balance-sheet-close.service.ts:1>) and [account coverage](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/account-close-coverage.service.ts>).
- **E33:** [Payroll declaration lifecycle](<E:/ohada saas/Focused projects/stoquify/services/payroll/declaration-lifecycle.service.ts>), [command read model](<E:/ohada saas/Focused projects/stoquify/services/payroll/command-read-model.service.ts>), [production admission](<E:/ohada saas/Focused projects/stoquify/services/payroll/payroll-production-admission.ts:69>) and [authority adapter readiness](<E:/ohada saas/Focused projects/stoquify/services/payroll/payroll-adapter-registry.service.ts:319>).
- **E34:** [Daily digest scope](<E:/ohada saas/Focused projects/stoquify/services/daily-habit/daily-habit-digest-contracts.ts:1>).
- **E35:** [AI proposal restrictions and authority](<E:/ohada saas/Focused projects/stoquify/services/ai/copilot-proposal.service.ts:1>).
- **E36:** [Design retrieval guide](<E:/ohada saas/Focused projects/stoquify/design-system/stoquify/MASTER.md>) and [engineering workflow](<E:/ohada saas/Focused projects/stoquify/docs/ecc/WORKFLOW.md>).
- **E37:** [Dated graph refresh](<E:/ohada saas/Focused projects/stoquify/graphify-out/POST_SLICE_438_GRAPH_REFRESH_2026-08-09.md>), [action graph](<E:/ohada saas/Focused projects/stoquify/graphify-out/graph_actions.json>), [component graph](<E:/ohada saas/Focused projects/stoquify/graphify-out/graph_components.json>) and [route graph](<E:/ohada saas/Focused projects/stoquify/graphify-out/graph_app.json>).

### External sources

- **W01:** [Xero Partner Hub launch](https://blog.xero.com/product-updates/xero-partner-hub-now-live/).
- **W02:** [Xero Practice Manager official listing](https://apps.xero.com/uk/collection/bramble-and-briar/app/xero-practice-manager).
- **W03:** [Intuit UK Books Review](https://quickbooks.intuit.com/learn-support/en-uk/help-article/manage-client/review-clients-books-quickbooks-online-accountant/L4GubaqKy_GB_en_GB).
- **W04:** [Intuit US Books Close dashboard](https://quickbooks.intuit.com/learn-support/en-us/help-article/accounting-bookkeeping/understanding-books-close-dashboard/L99ArQkrW_US_en_US).
- **W05:** [Intuit Accountant Suite transition](https://accountants.intuit.com/taxprocenter/practice-management/workflow-tools/tips-and-tricks-to-move-to-intuit-accountant-suite/).
- **W06:** [Karbon client management](https://karbonhq.com/solution/client-management/).
- **W07:** [Karbon client requests](https://help.karbonhq.com/en/articles/1524439-overview-of-client-requests).
- **W08:** [Pennylane firm workspace](https://help.pennylane.com/fr/articles/72794-naviguer-dans-l-espace-cabinet).
- **W09:** [Pennylane review workflows](https://www.pennylane.com/fr/expert-comptable/revision).
- **W10:** [Cameroon DGT: 2026 General Tax Code publication](https://www.impots.cm/index.php/en/node/1333).
- **W11:** [Sage export catalogue, September 2024](https://www.sage.com/fr-fr/-/media/files/sagedotcom/france/documents/pdf/conditions-generales/guide-produits-et-tarifs-sage-export-2024-09.pdf). Historical product-existence evidence only; current prices and capabilities not assumed.
- **W12:** [Microsoft Excel co-authoring](https://support.microsoft.com/en-us/excel/get-started/collaborate-on-excel-workbooks-at-the-same-time-with-co-authoring).
- **W13:** [OHADA AUDCIF](https://www.ohada.org/acte-uniforme-relatif-au-droit-comptable-et-a-linformation-financiere-audcif/).

[E01]: <E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-access.service.ts>
[E02]: <E:/ohada saas/Focused projects/stoquify/components/accounting/AccountantPortfolio.tsx>
[E03]: <E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-work-desk.contracts.ts>
[E04]: <E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-work-desk.service.ts>
[E05]: <E:/ohada saas/Focused projects/stoquify/components/accounting/AccountantWorkDesk.tsx>
[E06]: <E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts>
[E07]: <E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance-current-proof.ts>
[E08]: <E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma>
[E09]: <E:/ohada saas/Focused projects/stoquify/services/onboarding/opening-readiness.ts>
[E10]: <E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance-pack.service.ts>
[E11]: <E:/ohada saas/Focused projects/stoquify/services/accounting/reports.service.ts>
[E12]: <E:/ohada saas/Focused projects/stoquify/services/compliance/adapters/registry.ts>
[E13]: <E:/ohada saas/Focused projects/stoquify/services/regulatory/country-packs/registry.ts>
[E14]: <E:/ohada saas/Focused projects/stoquify/services/regulatory/country-packs/cameroon.ts>
[E15]: <E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-client-invite.service.ts>
[E16]: <E:/ohada saas/Focused projects/stoquify/services/referrals/referral-funnel-read-model.service.ts>
[E17]: <E:/ohada saas/Focused projects/stoquify/services/accounting/close-evidence-workflow.service.ts>
[E18]: <E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-notification-history.service.ts>
[E19]: <E:/ohada saas/Focused projects/stoquify/services/accounting/data-trust.service.ts>
[E20]: <E:/ohada saas/Focused projects/stoquify/actions/accounting/data-trust.actions.ts>
[E21]: <E:/ohada saas/Focused projects/stoquify/actions/accounting/journals.actions.ts>
[E22]: <E:/ohada saas/Focused projects/stoquify/actions/accounting/close-assurance.actions.ts>
[E23]: <E:/ohada saas/Focused projects/stoquify/services/accounting/financial-statements.service.ts>
[E24]: <E:/ohada saas/Focused projects/stoquify/services/accounting/ar-open-item.service.ts>
[E25]: <E:/ohada saas/Focused projects/stoquify/services/purchasing/ap-control.service.ts>
[E26]: <E:/ohada saas/Focused projects/stoquify/services/inventory/inventory-valuation.service.ts>
[E27]: <E:/ohada saas/Focused projects/stoquify/services/accounting/postings/post-sale.ts>
[E28]: <E:/ohada saas/Focused projects/stoquify/services/payments/statement-import.service.ts>
[E29]: <E:/ohada saas/Focused projects/stoquify/services/payments/adapters/mobile-money-hmac.adapter.ts>
[E30]: <E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-reconciliation-certification.service.ts>
[E31]: <E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-suspense-workflow.service.ts>
[E32]: <E:/ohada saas/Focused projects/stoquify/services/accounting/balance-sheet-close.service.ts>
[E33]: <E:/ohada saas/Focused projects/stoquify/services/payroll/payroll-production-admission.ts>
[E34]: <E:/ohada saas/Focused projects/stoquify/services/daily-habit/daily-habit-digest-contracts.ts>
[E35]: <E:/ohada saas/Focused projects/stoquify/services/ai/copilot-proposal.service.ts>
[E36]: <E:/ohada saas/Focused projects/stoquify/design-system/stoquify/MASTER.md>
[E37]: <E:/ohada saas/Focused projects/stoquify/graphify-out/POST_SLICE_438_GRAPH_REFRESH_2026-08-09.md>
[W01]: https://blog.xero.com/product-updates/xero-partner-hub-now-live/
[W02]: https://apps.xero.com/uk/collection/bramble-and-briar/app/xero-practice-manager
[W03]: https://quickbooks.intuit.com/learn-support/en-uk/help-article/manage-client/review-clients-books-quickbooks-online-accountant/L4GubaqKy_GB_en_GB
[W04]: https://quickbooks.intuit.com/learn-support/en-us/help-article/accounting-bookkeeping/understanding-books-close-dashboard/L99ArQkrW_US_en_US
[W05]: https://accountants.intuit.com/taxprocenter/practice-management/workflow-tools/tips-and-tricks-to-move-to-intuit-accountant-suite/
[W06]: https://karbonhq.com/solution/client-management/
[W07]: https://help.karbonhq.com/en/articles/1524439-overview-of-client-requests
[W08]: https://help.pennylane.com/fr/articles/72794-naviguer-dans-l-espace-cabinet
[W09]: https://www.pennylane.com/fr/expert-comptable/revision
[W10]: https://www.impots.cm/index.php/en/node/1333
[W11]: https://www.sage.com/fr-fr/-/media/files/sagedotcom/france/documents/pdf/conditions-generales/guide-produits-et-tarifs-sage-export-2024-09.pdf
[W12]: https://support.microsoft.com/en-us/excel/get-started/collaborate-on-excel-workbooks-at-the-same-time-with-co-authoring
[W13]: https://www.ohada.org/acte-uniforme-relatif-au-droit-comptable-et-a-linformation-financiere-audcif/
