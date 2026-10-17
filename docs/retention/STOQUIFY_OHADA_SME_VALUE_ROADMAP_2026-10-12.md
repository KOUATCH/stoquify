# Stoquify: roadmap to lasting value for OHADA-zone SMEs

Evidence-led product and delivery roadmap | 12 October 2026

**Recommendation: make one bounded operating system exceptionally dependable before widening the product promise. Start with Cameroon retail and distribution businesses that need coordinated stock, purchasing, cash control, and accountant review.** Deliver a reconciled transition into Stoquify, a recoverable daily operating loop, and a repeatable close. Earn deeper adoption through useful continuity and trustworthy stewardship of customer records.

This is a proposed roadmap, not an implementation or release certification. The first 90 days are a constrained pilot programme; months 4–6 deepen proven workflows, and months 7–12 depend on evidence. Dates are relative to an agreed programme start, not promises that every listed capability can ship within those windows.

## 1. Decision and commercial thesis

The retention report found substantial connected implementation but little evidence of actual adoption, usability, live provider operation, or commercial retention. Its strongest foundations are the relationships between sales, inventory, payments, accounting, and review evidence. Its largest commercial risk is customers never moving enough real work into the product to benefit from that depth. [R]

The recommended initial segment is an established retailer or distributor with roughly two to five locations, several operational roles, recurring supplier purchases, and an internal finance lead or external accountant. The location range is a pilot recruitment hypothesis, not a measured market segment. Use a single-location business as a simplicity check; use accountants as collaborators in the same pilot, rather than launching a separate accounting-practice product immediately.

Cameroon is the initial country because the inspected bundled country registry contains Cameroon, not because this audit established its market size, purchasing power, or regulatory readiness. Select the exact activity, legal entity, accounting regime, tender types, and payroll exclusions before launch. [S10–S12]

The product promise to test is: **“Our team can run today’s business, resolve exceptions, and explain the numbers without maintaining a second operating record.”** This must be demonstrated through customer task completion. It is not established by a dashboard, module count, or the existence of accounting services.

### Qualities that must become exceptional

- Correct, recoverable transactions, including ambiguous checkout results, retries, returns, adjustments, and delayed evidence.
- A guided transition from existing records to reconciled opening positions, with clear unresolved differences.
- Fast, understandable cashier and manager work on representative devices and connectivity, in consistent French and English.
- Financial explanations that trace from a balance or discrepancy to its source and review decision.
- Predictable access, support, pricing, and data recovery, including a usable authorized exit package.

Customers should stay because Stoquify works well and their team has developed valuable routines around it. Operational embedding is beneficial when it saves repeated work and preserves context. Incomplete exports, confusing cancellation, or lost access to customer records are defects, not retention achievements.

### Explicit deferrals

Defer broad country coverage, unrestricted production payroll, automated statutory submissions, a marketplace of connectors, sophisticated AI automation, and regulated or specialist-sector promises. Defer adding modules that do not improve a demonstrated pilot workflow. Do not replace the existing stock, posting, reconciliation, or access engines merely to simplify roadmap ownership. Changes should connect and verify those foundations first.

There are no supported customer-count, revenue, churn, willingness-to-pay, competitor, or productivity estimates in this roadmap. Initial positioning, capacity, and value hypotheses require validation.

## 2. Evidence basis and current-state matrix

The roadmap derives from the retained report [R] and targeted inspection of the current working tree at base commit **6f7f6741**. At the start of roadmap work, the checkout contained 400 modified and 4,203 untracked entries. Findings describe this checkout, including uncommitted work; they do not describe a known deployed release. Record a fixed release reference before pilot verification.

The inspected installed and lockfile versions are Next.js 15.5.18, React 19.2.6, Prisma 6.19.3, Better Auth 1.6.14, and TypeScript 5.8.3. PostgreSQL is declared in the Prisma schema. The actual production database version was not established. [S01]

Existing graph evidence is dated 9 August 2026. The original assessment found two sampled action hashes differed from the graph manifest. The service nodes `pos_pos_service_commitpossale` (community 20), `inventory_inventory_stock_event_service_postposstockissue` (community 9), and `accounting_close_assurance_pack_service_exportclosepack` (community 22) identify important relationships; current source confirms the relevant calls. Graphs were used for navigation, not as current coverage or behavior guarantees. [S02–S05]

In the matrix, **implemented** means present in inspected source. **Test definition inspected** means the test exists and was read, not that it passed. “Unknown” refers to missing evidence in this review, not proof that a capability or an external operating process does not exist. Commercial effects remain hypotheses throughout.

| Customer job and value | Current implementation and verification | Gap and roadmap disposition |
|---|---|---|
| Sell and keep stock and accounts aligned | Sale commit invokes stock issue, accounting posting, and a finalized event. Recovery-related unit and disposable-Postgres test definitions exist. Source inspected; tests not run. [S03, S04, S22] | Runtime reliability and actual cashier completion unproven. **Strengthen and validate: R02, R04.** |
| Buy, receive, and pay suppliers with a clear obligation trail | Goods receipt posts stock; payment release records reviewed execution evidence awaiting reconciliation. This does not establish native payment execution. [S05, S06] | Verify partial receipts, returns, invoice differences, outstanding AP, and correction paths end to end. **Connect and validate: R02, R03, R09.** |
| Match payments and explain differences | Matching handles competing claims and existing allocations. Generic mobile-money adapter and statement parsing exist. [S07, S13] | Live provider connection and operational reconciliation quality unproven. **Strengthen R02; conditionally add R09.** |
| Close a period and retain review context | Close-pack build/export retains findings, references, hashes, reviews, and comments. Restricted summaries do not imply all source documents travel with a pack. [S08] | Real accountant acceptance, close duration, and evidence completeness unknown. **Complete the journey: R05, R07.** |
| Coordinate branches, roles, and an accountant | Location-aware operating scope; accountant consent, expiry, revocation, and portfolio foundations. [S09] | Active teams, practical delegation, and repeated accountant participation unknown. **Validate and connect: R04, R05, R11.** |
| Resolve today’s operating problems | Daily digest composes role-sensitive operational snapshots and actions. [S14] | Queue generation does not establish problem resolution or a daily habit. **Strengthen: R04, R11; measure R01.** |
| Keep selling through connectivity loss | Offline synchronization models device identity, policy expiry, ordering, replay, and blocking evidence. [S15] | Real device persistence, interrupted replay, and operator understanding not demonstrated. **Validate and harden within a named device envelope: R02, R04.** |
| Start with trustworthy existing business records | Staged masters import excludes opening stock, accounting balances, and history. Separately, `postOpeningStock` exists and requires class-3 ledger review. Legacy receivable backfill is not a general external opening-AR importer. [S16, S17] | Missing coordinated cutover, not an entirely missing stock engine. **Connect, then fill identified gaps: R03.** |
| Apply local accounting and payroll rules appropriately | SYSCOHADA mapping checks; Cameroon country registry. CNPS is draft; IRPP production support is false; production payroll admission is restricted and authority worker defaults to sandbox. [S10–S12] | Applicable regime, independent review, and production authorization must be established for exact scope. **Validate R10; defer unsupported payroll and expansion R12.** |
| Obtain and move customer-owned records | Customer summary redacts sensitive fields; AP history has scope and size limits; close packs contain references and redacted summaries. Background inventory export infrastructure exists. [S08, S18, S19, S27] | A complete authorized, relationship-preserving archive was not established. **Complete R07; retain role-appropriate redaction.** |
| Understand subscription, module access, and cancellation | Workspace composition reports access preserved/no purchase; stop policies cover some modules; enforced read-only entitlement can reject export. [S20] | Module selection is not a verified commercial lifecycle. External billing/support processes unknown. **Discover and complete R08, with R07.** |
| Trust availability, isolation, and recovery | Fresh session checks, scoped access, assurance incidents, and local restore rehearsal tooling exist. Local restore script rejects non-local sources. [S09, S23, S24] | No production isolation, backup, attachment recovery, SLO, or staffed support evidence reviewed. **Validate and complete R06, R08.** |
| Learn whether the product improves business work | Import adoption metrics cover recent 12 batches. No organization-level commercial cohort system established in reviewed areas. [S16] | Baselines, repeat-value measures, and cancellation evidence absent. **Add bounded measurement R01; iterate R11.** |

The original qualitative scores remain context, not targets to optimize mechanically: daily operations 4/5; accumulated evidence 4/5; collaboration 3/5; habits/adoption 2/5; integrations 2/5; local differentiation 2/5; portability 2/5; measurement 1/5. They assessed source-supported foundations, not churn or product-market fit. This roadmap does not upgrade those scores merely because work has been planned. [R]

## 3. Country and regulatory boundary

OHADA supplies a shared accounting framework, but that is not evidence that national tax, payroll, filing, payment, privacy, or operational requirements are identical. The official AUDCIF material describes SYSCOHADA and both the normal and minimum treasury systems. Require a qualified accountant to establish each pilot’s applicable regime and reporting obligations; do not impose the most complex workflow on every SME. [W1]

The Cameroon DGI publishes a General Tax Code updated to 1 January 2026. This review located that official publication; it did not validate all tax provisions or compare every rule against the implementation. CNPS’s official employer-obligations material provides a national source for payroll-related review. Repository flags remain controlling product limitations until a qualified review and appropriate tests establish support. Do not infer legal compliance from source links, a “published” pack label, or a passing calculation test. [W2, W3, S11, S12]

For each future country pack, record authority, exact rule, effective period, applicable entities, source version, reviewer, test cases, unsupported cases, and replacement history. Verify currency, rounding, language, filing, and payment requirements separately. EN/FR is a pilot language scope, not a claim to serve every OHADA-country language need.

Production provider access has external dependencies. MTN’s official developer material describes onboarding and KYC/contracting steps; the roadmap therefore treats provider access and approval as prerequisites, not engineering deliverables with a guaranteed deadline. Provider choice remains a customer-volume hypothesis. [W4]

## 4. Priorities, capacity, and sequencing

**P0** protects the trust or repeated value required for the bounded pilot. **P1** deepens demonstrated value once prerequisites hold. **P2** is conditional expansion. “Expected retention benefit” is a qualitative causal hypothesis, not a revenue forecast.

An engineer-week (EW) means one engineer’s focused delivery week. Ranges include implementation and local integration work, but exclude external contracting lead time and independent accountant/customer availability. They are planning estimates with low-to-medium confidence, not measured throughput. Re-estimate after the first two weeks of discovery.

Assumed first-90-day capacity: three engineers, 0.75 QA/test specialist, 0.5 product/customer-success capacity, and 0.2 accountant/domain-review capacity, with security/operations review available. Thirteen weeks provide 39 gross EW. Reserving 25% for defects, integration, and operational interruptions leaves about **29 EW** for planned engineering. These roles and allocations are assumptions, not confirmed staffing.

The planned first-90-day slices below total **28 EW**. Their uncertainty ranges exceed available capacity at the high end; therefore the programme cannot promise every upper-bound scope within 90 days. Reduce the pilot envelope or extend the date when trust gates need more work. Do not remove data integrity, access, or recovery controls to maintain a launch date. If only one engineer is available, retain the order but replan the calendar.

| Initiative and priority | First 90 days: planned EW (range) | Later scope and relative benefit |
|---|---|---|
| R01 Evidence, activation, and cohort measurement — P0 | 2 (1–3) | Continuous iteration; high decision value, indirect retention |
| R02 Reliable daily operating loop — P0 | 6 (4–8) | Additional tenders/devices after proof; very high retention and customer value |
| R03 Reconciled customer cutover — P0 | 5 (4–7) | Broader migration formats, +3–6 EW; high retention and customer value |
| R04 Usable cashier and manager journeys — P0 | 3 (2–4) | Further task/device improvements, +2–4 EW; high retention and customer value |
| R05 Repeatable accountant close — P0 | 3 (2–4) | Repeated-close refinements, +2–4 EW; high for finance-led customers |
| R06 Isolation, recovery, and operational trust — P0 | 3 (2–4) | Operational hardening as evidence requires; high foundational value |
| R07 Authorized archive and portability — P0 | 3 (2–4) | Broader archive scope, +3–6 EW; high customer trust, indirect retention |
| R08 Honest packaging, service lifecycle, and support — P0 | 2 (1–3) | Automated commercial lifecycle, +3–6 EW if justified; high trust/adoption value |
| R09 One supported local payment connection — P1 | 1 (0.5–2), discovery only | +5–9 EW in months 4–6 after prerequisites; high if volume warrants |
| R10 Reviewed local finance/payroll scope — P1 | Domain review within R03/R05; no new payroll engine budget | +4–8 EW for a bounded support increment, external review extra; potentially high |
| R11 Repeated team value and targeted expansion — P1 | Baselines and initial tasks within R01/R04/R05 | +3–5 EW in months 4–6; high if recurring problems observed |
| R12 Additional country or sector — P2 | No first-90-day engineering allocation | Discovery 2–4 EW; implementation estimated only after gap analysis |

### Days 1–30: establish scope and prove the foundations

Freeze the pilot envelope and release reference; inspect existing deployment, billing, analytics, support, and backup arrangements before designing replacements. Produce the R01 event contract and baseline dashboard specification. Map R03 opening positions and prepare a representative synthetic migration dataset. Reproduce checkout uncertainty and offline-replay scenarios in authorized test environments. Inventory export coverage, access policy, attachments, and recovery dependencies.

Begin the core reliability fixes and shortest onboarding path. Draft the support model, service lifecycle, and exclusions. Ask the nominated reviewer to identify the applicable accounting regime and national review gaps. Customer sessions and external provider contact are future authorized programme activities; none were performed for this roadmap.

**Milestone M0:** a named pilot envelope, fixed candidate release, evidence register, acceptance fixtures, source-to-ledger map, and owner for each blocker. No unsupported capabilities are presented as ready.

### Days 31–60: connect real work and rehearse failure

Finish the bounded opening-position journey; prove stock, AR/AP, and accounting tie-outs or narrow the supported cutover explicitly. Exercise the sale-to-close chain with failures, duplicate requests, returns, partial receiving, and late evidence. Verify representative French/English tasks, location-scoped roles, accountant invitation/revocation, and discrepancy resolution. Rehearse recovery and a complete archive for the pilot’s supported data, including source attachments.

**Milestones M1–M3:** reconciled opening setup; recoverable checkout and shift close; a manager can resolve a discrepancy with its source and decision preserved. A supervised pilot begins only after Gate A, not automatically on day 31.

### Days 61–90: observe repeat value and make a bounded launch decision

Run the supervised pilot within the approved envelope. Complete an accountant-reviewed period close and archive/reconstruction exercise. Review usage, support effort, failures, and outcomes weekly. Fix the highest-frequency blockers before adding scope. Confirm provider specifications, commercial access, and sample-data suitability; do not assume a production connector fits this window.

**Milestones M4–M5:** an accepted close pack, then an authorized usable archive with lifecycle/access policy. Gate B determines whether a narrow paid launch is justified. If the pilot has not supplied a complete review cycle or trustworthy recovery evidence, continue it beyond day 90. A full Week-12 retention observation cannot exist for organizations activated late in this period.

### Months 4–6: deepen the demonstrated value

Reduce measured onboarding and daily-work friction; support repeated monthly closes; improve targeted purchasing, stock-transfer, or manager workflows where pilot evidence warrants it. Add one production payment connection only after R09 prerequisites. Broaden cutover and archive formats by actual customer demand. Automate the commercial lifecycle only after its policy and manual process work. Deliver a narrowly reviewed payroll increment only if R10 passes; otherwise keep it outside the promise.

The additional scoped estimates above total roughly 25–48 EW excluding country expansion and unplanned hardening. They are a prioritization pool, not a commitment to all work in one quarter. Reallocate using customer evidence and available capacity, with R06 trust work taking precedence over optional breadth.

### Months 7–12: conditional expansion

Choose either deeper penetration of the existing segment or one additional country/sector based on observed demand, support economics, repeated value, and Gate D. Reuse the shared core, with reviewed country boundaries. Do not simultaneously promise several countries, payroll systems, and provider networks. Stop expansion if core workflow reliability or service capacity deteriorates.

## 5. Initiative delivery contracts

### R01 — Establish customer-value evidence before optimizing retention

**Problem/persona/outcome:** Product leadership cannot distinguish a busy demo, enabled module, or import batch from an organization obtaining repeated value. Managers should see work completed, not vanity activity. Maps to report measurement weakness and priority 1. [R, S16]

**Reuse and deliverable:** Reuse stable business-operation identifiers, finalized events, correlation, and existing domain read models. Discover external analytics first. Specify a minimal organization-level outcome ledger and cohort definitions; add only missing instrumentation and reporting. Exclude transaction payloads, payroll details, invented baselines, and a new analytics platform by default.

**Delivery:** P0; 1–3 EW, medium confidence; accountable product lead with engineering/analytics support. Depends on a defined segment, eligible workflows, tenant identity, and privacy review. Runs alongside R02/R03.

**Acceptance and verification:** For a synthetic organization, retries produce one successful business outcome; jobs and demos are excluded; failed and uncertain attempts remain distinguishable. Reconcile event counts to controlled source fixtures, test access, and manually inspect the first cohort report. Publish denominator, maturity window, missing-data rate, and definition version.

**Metric/risk/rollout:** Track activation and repeated core-workflow completion as defined in section 7. Instrumentation loss must be visible, never converted into customer inactivity. Introduce capture without using it to gate business operations; backfill only where source semantics support it. Remove or redact unsafe telemetry without deleting customer business records.

### R02 — Make the daily operating loop reliable and recoverable

**Problem/persona/outcome:** Cashiers, stock staff, and managers cannot trust a platform if uncertain sales, delayed evidence, or correction flows create unexplained stock or money. Maps to report priorities 1 and 4. [S03–S07, S15, S22]

**Reuse and deliverable:** Strengthen existing checkout preparation/recovery, sale commit, stock posting, receiving, reconciliation, and posting controls. Cover the pilot’s sale, payment evidence, receipt, return/void rules, adjustment, partial receipt, stock transfer if used, and shift/day review. Preserve source links and approved correction paths. Exclude new tender types or unsupported devices until tested.

**Delivery:** P0; 4–8 EW, low-to-medium confidence; accountable domain/backend lead. Depends on representative fixtures, release reference, permissions, and named device/connectivity envelope. R04 supplies operator recovery behavior.

**Acceptance and verification:** Prove no duplicate financial/stock effects after timeout, repeated submit, concurrent replay, worker interruption, or reconnect. Trace a sale, return, partial receipt, adjustment, and reconciliation exception to stock and ledger effects in disposable real-DB tests. Exercise supported browsers/devices and interrupted local persistence. Unresolved evidence stays visible and blocks finalization where required.

**Metric/risk/rollout:** Measure completion, uncertain outcome rate, recovery duration, and unexplained discrepancy age. Pilot by tenant and workflow; retain a documented safe pause. A UI rollback is not permission to erase posted transactions: reconcile and reverse through controlled domain operations. Do not disable idempotency or review gates to clear a queue.

### R03 — Deliver a reconciled transition into Stoquify

**Problem/persona/outcome:** An owner cannot abandon spreadsheets while stock and outstanding obligations remain outside the system. Maps to report priority 2. [S10, S16, S17]

**Reuse and deliverable:** Connect staged master import, existing opening-stock posting, reconciliation, and accounting controls into one guided cutover. Inventory the supported path for opening AR/AP and ledger balances; add a narrow reviewed path only where missing. Include field mapping, preview, duplicate detection, location assignment, import provenance, totals, approvals, and a clear cutover date. Exclude automatic historical-transaction migration and silent merges.

**Delivery:** P0; 4–7 EW first slice, low confidence; accountable onboarding/domain lead, with accountant sign-off. Depends on R06 access controls, R02 posting integrity, and agreement on applicable accounting scope.

**Acceptance and verification:** On representative fixtures, source counts, quantities, valuation, AR/AP control totals, and opening trial balance reconcile with no unexplained difference. Avoid double-posting opening stock and ledger balances. Verify reject/repair/retry and dual approval using real DB plus browser tasks. Preserve original import files under the agreed access policy. Existing legacy receivable backfill must not be relabeled a general external migration engine.

**Metric/risk/rollout:** Time to reconciled opening and support hours per activated organization. Use a rehearsal and signed cutover checklist before each pilot. Posted opening errors require controlled corrections, not destructive rollback; keep pre-cutover records available. If opening AR/AP remains unsupported, recruit only an explicitly compatible pilot and disclose the limitation.

### R04 — Make daily tasks understandable, efficient, and inclusive

**Problem/persona/outcome:** Cashiers and managers need fast, recoverable work rather than sophisticated screens that require expert translation. Maps to usability uncertainty, daily habit weakness, and priorities 1–2. [S14, S15, S21, S25]

**Reuse and deliverable:** Use the approved design system, POS page contract, recovery states, role scope, and daily digest. Improve only observed task obstacles: coherent EN/FR business language, mobile/responsive behavior, keyboard use, focus, contrast, labels, loading/empty/error/uncertain states, low-bandwidth behavior, and clear next actions. Include printable or shareable task guidance where customers need it. No visual redesign programme.

**Delivery:** P0; 2–4 EW, medium confidence; accountable frontend/product-design lead. Depends on defined tasks and R02’s truthful state model. Validate representative lower-spec devices and record the tested envelope.

**Acceptance and verification:** Representative users complete setup, sale recovery, receiving, discrepancy review, and accountant handoff without facilitator rescue for critical steps. Record failures and assistance, not only success. Run browser, keyboard, and targeted assistive-technology checks; inspect French and English renderings. Propose p95 online checkout confirmation within 3 seconds under an agreed test profile, then revise openly if baseline evidence requires another budget.

**Metric/risk/rollout:** Task completion, assistance rate, task time, and repeat manager resolution. Keep unknown/late data distinct from zero and failed outcomes distinct from successful ones. Roll out per journey; restore prior presentation if needed while preserving transaction and review state.

### R05 — Turn accountant collaboration into a repeatable close service

**Problem/persona/outcome:** Finance teams lose time collecting explanations and revisiting decisions. Maps to report priority 3 and accumulated-evidence strength. [S08–S10]

**Reuse and deliverable:** Connect scoped invitation and consent, evidence requests, manager response, findings, review decisions, period readiness, and close-pack export. Establish who owns each unresolved item. Reuse existing comments and pack mechanisms; add gaps only after tracing the journey. Exclude a general document-management suite or a claim that an exported pack is a statutory certification.

**Delivery:** P0; 2–4 EW first slice, medium confidence; accountable finance-product lead with a qualified accountant. Depends on reconciled opening, reliable source transactions, correct permissions, and applicable reporting scope.

**Acceptance and verification:** A pilot accountant completes one actual review cycle; a seeded discrepancy is assigned, explained, reviewed, and retained. Late evidence invalidates or revises readiness according to policy. Revoked/expired grants cannot access records or downloads. Validate real-DB boundaries, browser tasks, pack contents, and the accountant’s acceptance separately.

**Metric/risk/rollout:** Time to accepted close, reopened items, evidence-request age, and repeated accountant participation. Start with one review team and one period. Preserve prior versions and disagreements; do not silently overwrite the explanation behind a previously reviewed period. Roll back new UI or pause close issuance when evidence integrity is uncertain.

### R06 — Prove isolation, backup, and operational recovery

**Problem/persona/outcome:** Owners need confidence that records remain private and recoverable. This addresses missing operational evidence, not a claim that every listed control is absent. [S09, S23, S24]

**Reuse and deliverable:** Audit existing tenant/location access, fresh-session checks, export authorization, incident mechanisms, and deployed backup arrangements. Extend the local restore rehearsal concept to a separately authorized production-like recovery exercise covering database, attachments, keys/configuration dependencies, and worker queues. Define incident ownership, observability, and measured recovery objectives. Do not run the mutating restore script as a read-only audit shortcut.

**Delivery:** P0; 2–4 EW, low confidence pending operations discovery; accountable platform/security lead. Prerequisite for live data and paid launch; runs in parallel with synthetic workflow work.

**Acceptance and verification:** Negative tenant/location/role access cases pass in real DB and browser/API checks, including downloads and background artifacts. Restore a representative dataset into an isolated environment and verify counts, relationships, attachments, and access. Candidate paid-launch objectives are recovery point objective (RPO) no worse than 15 minutes and recovery time objective (RTO) no worse than 4 hours; review these against customer needs, infrastructure cost, and the ability to reconcile recent terminal/payment evidence. These are proposed limits on data loss and restoration time, not verified capabilities. Measure before making promises.

**Metric/risk/rollout:** Recovery duration, backup age, unresolved incidents, error budget, and unauthorized-access failures. Secure fixtures and least-privilege access are mandatory. Preserve evidence, contain affected scope, and restore via an exercised runbook; do not improvise production restore commands from this document.

### R07 — Provide an authorized archive that preserves useful relationships

**Problem/persona/outcome:** Owners and accountants need to retain or migrate their records without losing explanations. Maps to report priority 5 and export limitations. [S08, S18–S20, S27]

**Reuse and deliverable:** Inventory all data in the pilot’s supported workflows. Reuse domain exporters and background artifact infrastructure, while distinguishing a restricted report from an owner-authorized archive. Include schema/version, identifiers, relationships, code lists, opening and closing positions, approvals, evidence references and permitted attachments, timestamps, currency/units, hashes, counts, and an explicit omissions manifest. Include configurations and roles without exporting passwords, tokens, or secrets.

**Delivery:** P0; 2–4 EW first slice, low confidence; accountable data/export lead. Depends on access/privacy policy, attachment inventory, R03 scope, and R08 archive rights. “Complete” means complete for the declared tenant/workflow scope, never an unlabeled partial export.

**Acceptance and verification:** Test pagination beyond current limits, interruption/retry, multiple locations, confidential fields, and expired download access. Reconstruct representative relations and reconcile totals in an independent reader. Check attachment hashes and omissions; require an authorized reviewer’s sign-off. No blanket removal of redaction from ordinary role-scoped reports.

**Metric/risk/rollout:** Archive success, completeness exceptions, reconstruction time, and support effort. Audit request/download authorization; use scoped, expiring artifacts and a documented retention period. Failed generation remains resumable and explicit. Preserve access to the last valid archive without making an incomplete export look successful.

### R08 — Make the commercial relationship predictable and supportable

**Problem/persona/outcome:** Owners must understand what they buy, how to get help, and what happens when access changes. Maps to cancellation/lifecycle uncertainty and missing commercial evidence. [S20, S24]

**Reuse and deliverable:** Discover existing billing and support arrangements; reuse module/access controls without equating module composition with subscription state. Define a simple pilot package, supported scope, onboarding/support offer, and lifecycle states: trial, active, past due, cancelled, archive, and approved deletion. Document who may cancel, notice, access/export rights, queued/offline-work treatment, legal retention exceptions, and data ownership. Separate platform billing from customer business payment reconciliation.

**Delivery:** P0; 1–3 EW first slice, medium confidence for policy/manual operations, low for automation; accountable commercial/product lead with support and legal review. Depends on R06 recovery and R07 archive. No price amounts assumed. Test transparent per-business packaging with explicit location/user inclusions before adding complexity.

**Acceptance and verification:** Run policy scenarios through actual entitlement checks, including read-only plus export, revoked users, pending jobs, and unsupported module-stop behavior. A documented assisted cancellation process is acceptable initially if it is timely, clear, and verifiable. Verify invoice/access consistency and support escalation in rehearsal. Qualified review establishes legal retention/deletion rules.

**Metric/risk/rollout:** Activation by offer, support response/resolution, invoice disputes, cancellation completion, and reasons. Start with a published manual process and accountable owner; automate later. On billing mismatch, investigate under the agreed policy rather than silently removing customer data or stranded access.

### R09 — Prove one production payment connection

**Problem/persona/outcome:** Finance staff should not repeatedly re-enter high-volume payment evidence. Maps to report priority 4 and integration-depth weakness. [S07, S13, W4]

**Reuse and deliverable:** Preserve reconciliation, evidence provenance, and allocation controls. Select one provider and one narrow job from pilot demand, such as validated statement ingestion and settlement matching. Distinguish evidence import, status confirmation, collection initiation, and payout execution. Deliver only the chosen capability with published limitations; do not call the generic HMAC adapter a native provider integration.

**Delivery:** P1; 0.5–2 EW discovery, then 5–9 EW implementation, low confidence; accountable integration lead. Prerequisites: official specifications, representative evidence, credentials, contractual access, reviewed fees/settlement semantics, and operational support. External lead time is unknown.

**Acceptance and verification:** Cover duplicates, delayed/out-of-order events, signature validation, reversals, fees, settlement mismatch, retries, outage, and credential rotation. Complete provider sandbox/contract checks, then separately authorized live reconciliation against actual provider statements. Sandbox success is not live evidence.

**Metric/risk/rollout:** Evidence coverage, false matches, manual intervention, unexplained settlement amounts, and reconciliation time. Start with a few pilot accounts and conservative matching. Never resolve uncertainty by assuming paid status. Maintain an approved manual evidence path; pause intake or execution safely and preserve replay/audit evidence during provider incidents.

### R10 — Earn narrowly defined local finance and payroll support

**Problem/persona/outcome:** Local relevance is valuable only when customers can rely on the exact supported rule and period. Maps to payroll/country limitations and priority 4. [S10–S12, W1–W3]

**Reuse and deliverable:** Retain country-pack provenance, capability flags, production admission, accounting mappings, and authority adapter boundaries. Build a reviewed support matrix by business case and effective period. Prioritize the pilot’s accounting, tax evidence, and close requirements. Add a payroll increment only after qualified review and customer demand; unsupported calculation or filing remains blocked. Exclude blanket “OHADA compliant” or “Cameroon payroll ready” claims.

**Delivery:** P1; 4–8 EW for one bounded increment, low confidence, with independent domain review outside that estimate; accountable country/domain lead. Depends on current official sources, reviewer capacity, representative cases, and explicit supported exceptions.

**Acceptance and verification:** Independent expected results cover ordinary and edge cases, corrections, period changes, approval separation, payment evidence, and accounting tie-out. Verify real DB and UI behavior in addition to calculation fixtures. Production authority submission requires separate authority/adapter acceptance; a default sandbox worker is insufficient.

**Metric/risk/rollout:** Unsupported-case rate, correction rate, review turnaround, and supported-case completion. Pilot by capability and effective period. Version rules and preserve historical calculations; suspend an affected capability when rules or evidence are uncertain, with a documented manual/expert fallback.

### R11 — Deepen recurring team value where usage justifies it

**Problem/persona/outcome:** Installed roles and a dashboard do not create institutional habits. Managers and accountants need fewer recurring unresolved problems. Maps to collaboration and daily-habit uncertainty. [S09, S14]

**Reuse and deliverable:** Improve existing role-specific queues, assignments, saved configuration/report context, evidence requests, and review history based on observed tasks. Connect cross-location exceptions and handoffs only where they reduce work. Develop short role-based training and onboarding handoffs. Avoid notification volume as a goal or adding a generic social/task platform.

**Delivery:** P1; 3–5 EW in months 4–6, medium confidence after pilot; accountable product/adoption lead. Depends on R01 baselines, R04 usability, and reliable R02/R05 outcomes.

**Acceptance and verification:** A representative team completes a repeated weekly operating review and monthly finance review with clear ownership and no missing state. Confirm location boundaries and accountant grant changes. Compare task outcomes before/after, documenting observation size and confounders. Reduced support or queue age is evidence of improvement; a correlation with adoption is not proof of causality.

**Metric/risk/rollout:** Distinct role participation, resolved exceptions, recurring workflow completion, and time spent coordinating. Offer targeted prompts and training with notification preferences. Roll back noisy prompts or redundant views while preserving the underlying evidence and decisions.

### R12 — Expand only after proving repeatable delivery and value

**Problem/persona/outcome:** Broader coverage can increase market relevance but can also dilute reliability and support. This is a conditional growth option, not a requirement to keep current customers. Maps to the report’s country/integration uncertainty and positioning hypothesis. [R, S11]

**Reuse and deliverable:** Reuse the core workflow contracts, reviewed country-pack pattern, test fixtures, migration checklist, support model, and archive format. Conduct one new country or sector gap study; establish its own customer jobs, currency/language rules, accounting regime, national obligations, providers, and support needs. Defer sectors with distinct rules until separately assessed.

**Delivery:** P2; 2–4 EW discovery, low confidence; no implementation estimate until scope is known. Accountable programme/product lead. Depends on Gate D, current-segment capacity, qualified local expertise, and credible demand evidence.

**Acceptance and verification:** Publish a gap matrix distinguishing reusable, adapted, unsupported, and prohibited cases. Obtain independent regulatory review where applicable, then repeat pilot and release gates for the new envelope. A country name added to a registry is not release evidence.

**Metric/risk/rollout:** New-segment activation, support burden, repeated value, and impact on existing customers. Expand one envelope at a time. Freeze new intake if support or integrity deteriorates; maintain existing customers’ contracted service and records through the recovery plan.

## 6. Critical path and independently progressing work

```text
M0: bounded scope + fixed release + evidence contract
                         |
             R06 access and recovery gate
                         |
R03 reconciled opening --> R02 daily loop --> R05 reviewed close
          M1                    M2                  M4
                                 |
                         R04 discrepancy task
                                 M3

R07 archive inventory ----> archive reconstruction + R08 access policy
                                                    M5

M1 + M2 + M3 + R06 ---> supervised pilot (Gate A)
M4 + M5 + observed repeat use + support ---> paid-scope decision (Gate B)
```

This expresses release dependencies, not an instruction to serialize all engineering. R01 measurement, R04 task research, R07 export inventory, R08 commercial/support policy, R09 provider discovery, and R10 expert review can progress alongside synthetic R02/R03 work. R05 can be exercised on fixtures before real cutover, but a real accepted close depends on trustworthy opening and transaction evidence. R07 can be developed early; its completeness claim depends on final pilot scope.

The critical bottlenecks are reconciled opening positions, recoverable stock/money effects, access/recovery proof, accountant availability, and a complete archive for the promised scope. Provider contracting and legal review are external dependencies; they must not silently become guaranteed calendar dates.

## 7. Measurement plan and proposed targets

**All numerical targets below are proposals to approve after baseline work. None is an observed Stoquify result.** Separate technical correctness gates from improvement targets. Zero unexplained accounting differences is a release invariant for controlled fixtures; it is not an assertion that customer records never contain discrepancies. Those must be surfaced and resolved.

R01’s event contract should include organization ID, stable business-operation ID, workflow and outcome version, module, actor role, occurrence/ingestion times, location where needed, correlation ID, and whether assisted, offline, imported, or automated. Avoid sensitive business payloads. Deduplicate retries; separate attempted, successful, uncertain, reversed, and replayed outcomes. Mark demo/test organizations and exclude jobs from human adoption. Keep aggregate access restricted and data retention explicit.

| Measure | Definition, cohort, and owner | Baseline and proposed decision rule |
|---|---|---|
| Activation: simple retailer | Reconciled setup, first sale, then first reconciled shift; elapsed time from onboarding start and separately from data-ready state. Product/onboarding owner. | Baseline unknown. Proposal: at least 80% of data-ready pilot businesses complete within 7 days with all assistance recorded. Report sample size. |
| Activation: multi-location business | Opening positions accepted at every pilot site; cashier and manager complete scoped work; first cross-location review. | Baseline unknown. Proposal: 80% within 14 days of data readiness. Do not hide blocked sites in an organization average. |
| Activation: finance/accountant | Scoped invitation accepted, opening controls accepted, and first eligible period reviewed with retained pack. Finance lead. | Baseline unknown. Target first eligible period, not an arbitrary registration-age deadline; record waiting for period end separately. |
| Core workflow frequency | Distinct successful operation IDs and organization-days with core work, divided by scheduled trading days; show sales, receiving, and reviews separately. Product owner. | Proposal: core workflow on at least 80% of scheduled trading days among activated pilot firms. Exclude closed days and show inactivity causes. |
| Workflow reliability | Successful, failed, and uncertain intended operations; recovery p50/p95; unresolved discrepancy age. Engineering/operations. | Establish baseline in first 30 days. Proposal: at least 99% technically successful eligible online pilot operations; 100% of controlled retry/replay scenarios preserve correctness. Exclude business rejections from technical failures but report them. |
| Module adoption | Eligible activated organizations completing a meaningful module outcome within its natural cycle; e.g. received purchase, resolved reconciliation, reviewed close. Product owner. | No universal percentage target until eligibility known. Distinguish entitlement, page access, trial, assisted completion, and recurring completion. |
| Team adoption | Distinct people performing role-appropriate work per week/month, with eligible invited roles as denominator. Adoption lead. | Multi-role pilot target: cashier and manager recurring participation plus finance/accountant participation each eligible close. Do not require extra roles in a simple shop. |
| Customer value | Task time, assistance, close duration, exception age, duplicate external record-keeping, and support time per successful outcome. Product/CS. | Baseline unknown. Proposal: improve top two observed task costs by 20% from each pilot’s baseline without increasing errors; small samples are directional only. |
| Product retention cohorts | Organizations activated in the same week/month completing their segment’s core workflow at Week 1/4/8/12; show cohort size, eligibility, closures, and maturity. Analytics/product. | No numerical churn claim or target without baseline. Report counts with rates. Late cohorts remain immature; do not count them as retained or lost prematurely. |
| Commercial retention | Separate paid-logo retention, paid cancellations, nonpayment, and revenue retention after reliable billing data exists. Commercial owner. | Baseline and pricing unknown. Define starting paid cohort and denominator; distinguish product inactivity from cancellation. No fabricated MRR/NRR. |
| Support and incidents | Contact rate per active organization, first response/resolution, severity, repeated issue, and hours of assisted onboarding. Support lead. | Agree staffed hours and escalation coverage before launch. Measure actual performance against the published promise, not an assumed 24/7 service. |
| Cancellation and exit | Reason taxonomy, optional explanation, lost workflow, alternative if volunteered, export success, elapsed cancellation time, and disputes. CS/data owner. | Reasons: missing capability, reliability, usability, value/price, business closure, support, integration, trust, other. Feedback is optional and never a condition of cancellation. |

Review workflow reliability and support weekly; review activation and role/module adoption every two weeks; review mature cohorts and commercial trends monthly. Keep a decision log linking a change to its expected outcome, observed result, and next action. Use within-customer before/after comparisons carefully; seasonality, business size, assistance, and healthier customers adopting more modules can confound results.

The measurement programme should answer three separate questions: **Can customers complete the work? Do they repeat it without excessive assistance? Do they judge the value worth the price?** Source inspection answers none of these by itself.

## 8. Evidence gates and release decisions

Use an evidence register keyed by initiative, capability, release reference, environment, dataset, date, verifier, result, and unresolved limitation. Keep these evidence classes separate: **S** source inspection; **M** mocked/pure tests; **D** real database integration; **B** rendered/browser/device; **P** provider/authority operation; **C** observed customer outcomes; **E** qualified expert review. One class cannot substitute for another.

### Gate A — Supervised pilot entry

Required: M0–M3 for the selected envelope; source and targeted mocked tests; real-DB integrity and access checks; representative browser/device recovery; reviewed opening setup; a tested backup/restore path; named support owner; approved use of pilot data; and explicit feature exclusions. R07 archive coverage must already be known and customer data retrievable through a documented authorized process. Do not onboard real data into an unknown exit or recovery situation.

Accountable decision: product lead plus engineering/operations lead; accountant signs off financial setup. Provider evidence is required only for a provider capability included in the pilot. Keep unsupported payroll and filing unavailable or explicitly outside the pilot. Unexplained posting differences or cross-tenant access failures block entry.

### Gate B — Bounded paid launch

Required: M4–M5; an accepted actual close; a complete authorized archive/reconstruction for promised workflows; correct archive/export access after cancellation; measured recovery and reliability; critical usability/accessibility obstacles resolved; transparent pricing and supported scope; support escalation rehearsed; no unresolved severe integrity/privacy defects. Demonstrate recurring operations over a meaningful observation window, proposed as four trading weeks plus an eligible close.

Accountable decision: commercial/product owner with engineering, support, and domain review. Small-pilot evidence supports only a bounded launch decision, not statistical product-market fit. If the observation window is unavailable by day 90, extend the pilot. Do not recast mocked tests as customer evidence.

### Gate C — Wider rollout within the same scope

Required: repeated successful onboarding, capacity/load checks based on expected use, at least two consecutive eligible closes for finance-dependent customers, incident and support performance within agreed budgets, and successful restore/export rehearsals on the candidate release. Observe more than one organization so a single highly assisted customer does not define readiness. Revisit the paid launch’s support economics and data-quality assumptions.

Widen in controlled tenant cohorts. Stop or reduce intake when reliability, recovery, or support capacity misses the agreed threshold. Expand supported devices/tenders only with corresponding evidence.

### Gate D — New country, sector, or production payroll capability

Required: demand evidence, capacity to support existing customers, reviewed legal/accounting applicability, versioned national rules, representative independent expected results, local language/currency/provider decisions, and a new gap matrix. Repeat Gates A–C for the changed envelope. Provider or authority operation requires its own current evidence and authorization; repository flags cannot self-certify it.

## 9. Traceability and coverage register

Each material report finding below is assigned to implementation, validation, or deliberate deferral. This prevents a broad roadmap from quietly dropping uncomfortable gaps.

| Retention report finding or priority | Roadmap response | Evidence or exit condition |
|---|---|---|
| F01 POS/stock/accounting is the strongest daily chain | R02, R04; strengthen existing work | M2 and real-DB/browser recovery evidence |
| F02 Purchasing creates linked obligations; payment release is not transfer execution | R02, R03, R09 | Receive/invoice/payment tie-out; exact provider capability labeled |
| F03 Reconciliation and close preserve explanations | R05, R07 | M4 accepted review; M5 evidence reconstruction |
| F04 Team/location/accountant foundations do not prove adoption or network effects | R01, R05, R11 | Role participation and repeated collaborative outcomes |
| F05 Daily digest does not prove a management habit | R04, R11 | Manager resolves real exceptions repeatedly; M3 |
| F06 Offline controls exist but runtime durability is unknown | R02, R04 | Named devices, interrupted persistence/replay checks |
| F07 SYSCOHADA/Cameroon work has material payroll limits | R10, R12 | Expert-reviewed support matrix; unsupported cases remain gated |
| F08 Generic provider adapter is not a mature integration ecosystem | R09 | Official contract, sandbox, then live evidence for one job |
| F09 Masters import alone cannot transition a running business | R03 | M1 opening stock, AR/AP, and ledger tie out |
| F10 UX, speed, EN/FR consistency, and accessibility unproven | R04 | Observed tasks and rendered/accessibility evidence |
| F11 Recent import batches are not retention cohorts | R01 | Versioned eligible-organization cohorts and maturity windows |
| F12 Redacted/bounded reports are not a complete exit package | R07 | Manifest, pagination, attachments, relationships, independent reconstruction |
| F13 Module lifecycle is not verified subscription cancellation | R08 | Scenario-tested policy and actual supported cancellation process |
| F14 Read-only entitlement does not consistently imply export rights | R07, R08 | Explicit export permission and post-cancellation access checks |
| F15 Customer usage, churn, production readiness, and willingness to pay unknown | R01; Gates A–C | Separate observed outcomes and paid evidence; no inference from code |
| F16 Switching cost grows with successful use, not account age | R03, R05, R11 | Repeated operations, closes, and accumulated useful context |
| Report priority 1: dependable daily loop | R02, R04, R06 | First-90-day core work |
| Report priority 2: guided cutover | R03 | First-90-day core work |
| Report priority 3: accountant close service | R05, R11 | First close, then repeated collaboration |
| Report priority 4: one deep local integration and country scope | R09, R10 | Discovery now, production capability conditional |
| Report priority 5: authorized exit and explicit service lifecycle | R07, R08 | Required for bounded paid launch |

| Required coverage | Assigned work | Boundary |
|---|---|---|
| A. POS, stock, purchasing, payments, reconciliation, recovery, offline | R02, R09 | Supported pilot operations first; no claim all devices/providers work |
| B. Onboarding, imports/openings, mobile, bandwidth, EN/FR, accessibility | R03, R04 | Existing design system; representative device/language envelope |
| C. Accounting, approvals, audit evidence, reports, period close | R03, R05, R07, R10 | Applicable accounting regime and expert review |
| D. Country relevance, payments, payroll, statutory workflows | R09, R10, R12 | Explicit country/capability gates; no blanket compliance |
| E. Roles, managers, locations, accountants, institutional knowledge | R04, R05, R11 | Task outcomes, consent, and preserved review context |
| F. Packaging, pricing, billing, cancellation, training, support, incidents | R08, R11, R06 | Hypotheses and policy before automation; no invented price |
| G. Tenant security, privacy, backups, restore, export, archive, measurement | R06, R07, R01 | Separate verification classes; customers keep trustworthy access |

## 10. First five actions and decisions that can change the order

1. **Name the pilot envelope and accountable owners.** Confirm Cameroon retail/distribution, locations, accounting regime, tender types, supported devices, exclusions, staffing, and existing external services. Product lead; first week; output is the M0 scope sheet.
2. **Freeze a candidate release and establish the evidence baseline.** Inspect the actual deployed/releasable state, reconcile it with this working tree, define outcome events, and select representative task fixtures. Engineering/product leads; first two weeks; output is the evidence register and baseline plan.
3. **Rehearse cutover and checkout recovery together.** Trace opening stock/AR/AP/ledger and then a sale through failure, replay, shift review, and reconciliation. Domain lead plus accountant; output is prioritized blockers with no unexplained totals.
4. **Close the trust-policy gaps before live onboarding.** Inventory data/attachments, rehearse access and restore, and define export/archive/cancellation rights and support ownership. Platform/data/commercial leads; output is the pilot trust contract and Gate A evidence.
5. **Arrange observed user work and a first accountant review.** When separately authorized, recruit representative pilot users, record assistance and task outcomes, and plan the first eligible close. Product/CS and accountant; output is customer evidence rather than a feature demonstration.

Business decisions still needed: confirmed team capacity; pilot businesses and consent; exact legal/accounting scope; acceptable recovery and support promises; whether current billing/analytics/support tools should be reused; initial package and willingness-to-pay test; and provider priority based on real tender volume. These do not prevent writing this roadmap, but they affect execution order and scope.

Change the order if evidence warrants it. A serious isolation or data-loss issue moves R06 ahead of all live work. An opening-balance blocker moves R03 ahead of onboarding expansion. If existing operations already supply strong recovery evidence, redirect effort to observed usability bottlenecks. If most prospects are simple single-site cash retailers, simplify accountant-led activation and packaging. If provider-based tender volume dominates and access is available, bring R09 forward while preserving integrity gates. If expert review is unavailable, keep payroll/statutory automation out of the offer. If customer use remains shallow after a reliable pilot, revisit positioning and price before adding modules.

## 11. Verification performed for this roadmap

- **Source inspection:** Retention report, current workflow instructions, script definition/registry, representative services and boundaries, existing graphs, test definitions, design contracts, and local recovery tooling reviewed. Source claims are traceable below. Targeted review is not an exhaustive security or compliance audit.
- **Workflow contract check:** `npm run agent:workflow:check` passed after its definition, lifecycle hooks, helpers, and command-registry entry were inspected. It reported 198 package scripts outside the reviewed manifest. This is a workflow-control result, not application readiness.
- **Mocked/pure application tests:** Definitions inspected; not executed for this roadmap.
- **Real database tests and restore rehearsals:** Definitions/tooling inspected; not executed. No production-data queries.
- **Application browser/device checks:** Not performed. Proposed usability, accessibility, latency, and offline acceptance criteria remain future work.
- **Live providers, customer interviews, customer cohorts, paid retention:** Not inspected or contacted. External official material supports source and prerequisite identification only.
- **Regulatory review:** Official sources located; no qualified legal/accounting certification performed. Current tax calculations were not independently validated.
- **Document verification:** Markdown and PDF produced from the same source, with PDF text and rendered-page checks. These verify the deliverables, not application behavior.

No application code was modified, no dependencies installed, and no builds, migrations, seeds, broad test suites, or graph regeneration were run. The existing retention PDF is preserved. Only the requested roadmap Markdown and PDF are final repository deliverables.

## 12. Source register

References are evidence pointers into the inspected working tree; line numbers may move with later changes. Repository root: `E:/ohada saas/Focused projects/stoquify`. The original report is a finding source; current code remains the authority for implemented behavior. This roadmap intentionally distinguishes source presence from execution and adoption.

### Retention report

- **[R]** [Stoquify customer retention and switching costs, 12 October 2026](STOQUIFY_CUSTOMER_RETENTION_AND_SWITCHING_COSTS_2026-10-12.pdf). Sections 1–7, commercial judgment, verification and source appendix. Original SHA-256: `668D5DB2E22E8814481643C1881B261E18A3349C4240E5F13BF4C19291845CD4`.

### Repository sources

- **[S01] Stack and database:** `package-lock.json:14322` (Next lock entry; other installed/locked versions inspected separately); `prisma/schema.prisma:59` (PostgreSQL declaration).
- **[S02] Graph context:** `graphify-out/POST_SLICE_438_GRAPH_REFRESH_2026-08-09.md:1`; `graphify-out/manifest.json`; `services/graphify-out/graph.json:44183` (commitPOSSale node), `:21980` (postPOSStockIssue), `:1046` (exportClosePack). Community references are navigation context, not verification status.
- **[S03] POS transaction chain:** `services/pos/pos.service.ts:2210` (commit), `:2477` (stock issue), `:2667` (accounting), `:2792` (finalized event).
- **[S04] POS action and recovery:** `actions/pos/tender.actions.ts:35`; `services/pos/checkout.service.ts`; `services/pos/checkout-state.ts`; `app/[locale]/(dashboard)/dashboard/pos/page.tsx`.
- **[S05] Receiving:** `services/purchase-order/purchase-order.service.ts:397` (goods-receipt stock posting).
- **[S06] Payment release boundary:** `services/purchasing/payment-release.service.ts:48` (recorded execution awaiting reconciliation), `:59` (release confirmation).
- **[S07] Reconciliation:** `services/reconciliation/payment-reconciliation-run.service.ts:250` (competing claims/allocation handling).
- **[S08] Close evidence:** `services/accounting/close-assurance-pack.service.ts:1572` (build), `:1691` (references/hash/redacted metadata), `:1711` (reviews), `:1721` (comments).
- **[S09] Organization and accountant access:** `services/operating-access/operating-access-scope.service.ts:61`; `services/accounting/accountant-access.service.ts:419` (active-grant context), `:448` (read-only export restriction), `:467` (portfolio).
- **[S10] Accounting setup:** `services/accounting/accounting-settings.service.ts:396` (SYSCOHADA account checks).
- **[S11] Country support:** `services/regulatory/country-packs/registry.ts:4`; `services/regulatory/country-packs/cameroon.ts:16` (CNPS draft), `:19` (IRPP production support false), `:49` (capability matrix).
- **[S12] Payroll production boundaries:** `services/payroll/payroll-production-admission.ts:69`; `services/payroll/authority-adapter-worker.service.ts:394` (default sandbox adapter).
- **[S13] Payment adapter:** `services/payments/adapters/mobile-money-hmac.adapter.ts:115`; `actions/payments/reconciliation.actions.ts:184` (provider code/default generic adapter).
- **[S14] Manager workflow:** `services/daily-habit/daily-habit-digest.service.ts:35` (source dependencies), `:201` (close digest).
- **[S15] Offline boundaries:** `services/pos/offline-sync.service.ts:39` (failure categories and replay controls).
- **[S16] Import and measurement boundaries:** `services/onboarding/master-data-import.service.ts:32` (included/excluded scope), `:1158` (recent-batch adoption view).
- **[S17] Existing opening and reconciliation kernels:** `services/inventory/inventory-stock-event.service.ts:866` (postOpeningStock), `:885` (ledger-review blocker); `services/inventory/inventory-reconciliation.service.ts:603`; `services/accounting/customer-receivable-backfill.service.ts:42` (legacy backfill readiness, not general external opening import).
- **[S18] Customer export:** `services/customer/customer-export.service.ts:43` (fields), `:61` (redacted fields).
- **[S19] AP export:** `services/purchasing/ap-history-export.service.ts:33` (operational scope), `:62` (row bound), `:67` (byte bound).
- **[S20] Commercial/access boundaries:** `services/modules/module-composition.service.ts:175` (access preserved), `:182` (no purchase); `services/modules/module-stop-policy.service.ts:24`; `services/modules/module-entitlement.service.ts:370` (read-only/read/export distinction).
- **[S21] Copy example:** `app/[locale]/(dashboard)/dashboard/accounting/close/page.tsx:30` (mixed terminology in French description; not a general usability verdict).
- **[S22] Verification definitions:** `services/pos/__tests__/checkout-lifecycle.service.test.ts`; `services/pos/__tests__/checkout-lifecycle.postgres.test.ts`; `docs/ecc/test-lanes.md`. Tests inspected, not executed.
- **[S23] Fresh access context:** `lib/security/rbac.ts:90` (session request disables cookie cache); operating scope in S09.
- **[S24] Recovery and incident foundations:** `scripts/prisma-local-restore-rehearsal.js:18` (local hosts), `:58` (local-source guard); `services/assurance/assurance-incident.service.ts`; `lib/error-handling/monitoring.ts`; `prisma/schema.prisma:8968` (workflow assurance incident). Local tooling does not prove deployed backup operation.
- **[S25] Approved UX constraints:** `design-system/stoquify/MASTER.md`; `design-system/stoquify/pages/pos.md`.
- **[S26] Workflow controls:** `AGENTS.md`; `docs/ecc/WORKFLOW.md`; `docs/ecc/skill-routing.md`; `docs/ecc/command-registry.json`; `scripts/verify-agent-workflow-contract.js`.
- **[S27] Reusable asynchronous export infrastructure:** `services/inventory/inventory-history-background-export.service.ts`. Its existence does not establish whole-tenant archive completeness.

### Official external sources

Accessed 12 October 2026. These sources support the narrow statements cited; they do not constitute a full legal, provider, or market assessment. No competitor comparison was needed.

- **[W1]** [OHADA — Acte uniforme relatif au droit comptable et à l’information financière](https://www.ohada.org/acte-uniforme-relatif-au-droit-comptable-et-a-linformation-financiere-audcif/). Official description of AUDCIF/SYSCOHADA and accounting systems; publication/update timestamp not used as evidence of national tax currency.
- **[W2]** [Cameroon DGI — Code général des impôts, mis à jour au 1er janvier 2026](https://www.impots.cm/en/node/1333). Official publication landing page located; full tax-code validation was outside this review.
- **[W3]** [CNPS Cameroon — Obligations de l’employeur](https://www.cnps.cm/fr/employeurs/obligations-de-lemployeur1.html). Official indexed material identifies national employer obligations; subsequent full-page fetch timed out. No rates or deadlines are asserted from it here.
- **[W4]** [MTN MoMo developer portal — Go live](https://momodeveloper.mtn.com/golive), [official onboarding/contracting material](https://momodeveloper.mtn.com/content/html_widgets/7uq7g.html). Official search results describe KYC/contracting prerequisites; a subsequent full-page fetch of the latter timed out. Exact country availability, contractual eligibility, and current production requirements must be confirmed before implementation.
