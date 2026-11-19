# P12 — First-month checkpoint decision

18 October 2026. **PARTIAL. M0 is PARTIAL; Gate A is not evaluated or passed. No paid-launch decision is made.** “Day 30” names the roadmap checkpoint, not 30 elapsed delivery days: the reviewed execution packets are dated 13–18 October. This review does not authorize deployment, customer contact, production offline sales or any later prompt.

The programme has credible, bounded synthetic checkout recovery and guided master-import evidence. It has not yet demonstrated a reconciled business cutover, a manager resolving a discrepancy, a complete authorized customer archive, or an operational restore. Those are necessary for durable customer value. More modules cannot substitute for these gaps. No customer satisfaction, adoption, retention or churn result can be inferred from this checkpoint.

## Decision basis and scope

Use the [roadmap](../../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), [P01 envelope](../P01/PILOT_SCOPE.md), [decisions](../P01/DECISIONS.md), and the exact [42-item acceptance ledger](ACCEPTANCE_LEDGER.md). PASS in that ledger means the stated bounded deliverable has supporting evidence; it never means all of a module is ready for customers. PARTIAL means evidence or implementation remains incomplete; BLOCKED means a required input/authority is unavailable; NOT_RUN means the specified check has not been performed. Accountable roles are proposed responsibilities, **not assigned people**.

Current source observation: HEAD `6ee84a90c760d2864f6aef672d8b393ac2b65971`, plus the inherited dirty tree and selected raw SHA-256 fingerprints in [BASELINE](evidence/BASELINE.json). HEAD alone is not the candidate. The snapshot includes 27 inherited tracked modifications. It is neither a frozen release nor a deployment identity. [Fingerprint comparisons](evidence/PREREQUISITE_FINGERPRINTS.json) retain expected and current bytes; final [validation](evidence/VALIDATION.json) checks preservation. P12 changes only its evidence/documents and its status row.

The planning default remains a **proposed Cameroon retail/distribution, cash-first, two-site synthetic envelope**. P01's target segment was 2–5 sites; actual customer, device, accounting-regime and tender selections are unconfirmed. ON_ACCOUNT appears in zero-tax characterization fixtures, not an approved commercial promise. Offline retained-evidence recovery is distinct from offline economic execution. Payroll, new country expansion, provider transfers and statutory production admission remain outside this checkpoint's qualified scope.

## M0 and downstream milestones

| Required M0 element | Decision | Evidence and missing condition | Accountable role |
|---|---|---|---|
| Named pilot envelope and exclusions | PARTIAL | P01 names a proposed envelope; customer/jobs, regime, devices, supported tenders and reviewers are not confirmed (D01/D05/D06/D07/D13) | Product, accountant, QA |
| Fixed candidate release | BLOCKED | Current baseline captured; no approved candidate/deployment identity or reconciliation of shared work (D02) | Engineering/release |
| Evidence register | PASS for preparation | P01–P11 results, dated follow-ups, P12 acceptance ledger and raw evidence review; failures and omissions retained | Engineering/QA |
| Acceptance fixtures | PASS for bounded synthetic preparation | P03 independent opening controls and P05–P08 synthetic fixtures exist; they are not live opening or customer acceptance | QA/domain/accountant |
| Source-to-ledger map | PASS as a map; execution incomplete | P03 maps stock, AR/AP, cash and GL; master import intentionally cannot complete opening positions | Domain/accountant |
| Owner for each blocker | PARTIAL | Role-based ownership and next actions below exist; accountable people and review capacity have not been assigned (D03/D11) | Programme/product |

M0 cannot be marked PASS by treating role labels as staffed ownership or a source snapshot as a fixed candidate. M1 (reconciled cutover) is NOT_RUN end to end; M2 (recoverable operating loop) is PARTIAL from bounded P05/P06 evidence; M3 (manager resolution) is NOT_RUN end to end. P08 proves navigation and next-action explanation, not resolution. M4 accepted accountant close and M5 complete departure/restore proof remain downstream. Gate A requires its own P18 review of exact scope and S/M/D/B plus applicable expert/operational evidence. A local disposable database is not deployed recovery proof.

## Predecessor freshness and consumption

| Packet | Current revalidation | Safe consumption and limits |
|---|---|---|
| P01 | 69 primary + 12 supplementary entries; 14 total differences | Consume proposed scope and decision register; replace historical source assumptions with this observation. Do not erase older dirty-tree facts |
| P02 | 29 entries, 10 differences in shared dependencies/generated runtime/schema; eight owned slice files unchanged | 65 historical mocked/pure cases are useful, but no real PostgreSQL reader verification exists. PARTIAL remains |
| P03 | 31 entries, seven differences; five owned fixture/checker/test/config files unchanged | 48 fixture/import mocked cases and three selected inventory-boundary cases are synthetic evidence; opening execution is still incomplete |
| P04 | 54 entries, nine differences | Reuse matrix/protocol; preserve T01–T08 until their specific current runtime/policy gaps close. Original 65 mocked cases do not establish a live access matrix |
| P05 closure | 202 current-hash entries, eight differences | Core economic transaction dependencies match the closure snapshot; changed POS UI is covered by subsequent P06/P08 evidence. Package and queue drift are not ignored. No fixed-candidate certification |
| P06 operator | 11 source entries, four differences: queue helper/test, operator fixture and shared STATUS | Historical operator/browser and DB proof is bounded. P12 refreshes current storage checks; it does not claim the full authenticated flow was rerun against current bytes |
| P07 media closure | 11 entries, only shared STATUS differs | Ten non-register fingerprints match. Complete synthetic master import and tenant-owned media controls remain supported; successful external upload/durable object delivery remains unproved |
| P08 | Two owned entries and 120 selected POS/security/schema dependency entries match | Consume bounded cashier recovery and manager navigation evidence; not full discrepancy resolution or customer observation |
| P09 | 35 manifest entries, only STATUS differs | 47 pure contract cases; partial synthetic archive, no full tenant extraction/delivery |
| P10 | 22 entries, only STATUS differs | 30 mocked policy/access cases and proposed lifecycle/support specification. No commercial/legal approval or staffed support |
| P11 | 19 manifest + 35 inspected-source entries match at P12 start | Research packet and documented retrieval limits remain applicable; expert cases are planned, not executed or approved |

Raw-byte differences in the P06 queue/test/fixture are not just LF/CRLF normalization. Their exact historical content is not reconstructed from Git HEAD: the earlier run itself used a dirty tree. P12 therefore preserves the uncertainty instead of inventing a commit-level equivalence. The current storage suite is run separately and reported in RESULT. No broad suites were repeated to turn historical checks into current claims.

## Evidence by capability

| Capability | What the evidence establishes | What it does not establish |
|---|---|---|
| Outcome measurement | Server-only reader requests reports.read + sales.read, scopes tenant/location, caps sources, uses RepeatableRead; pure projection keeps uncertain/reversed outcomes distinct | Persisted reader behavior, actual human provenance/calendar/completeness or measured adoption; no new dashboard/collector exists |
| Opening positions | Independent synthetic controls: stock 3,000, AR 1,200, AP 700, cash 500, equity 4,000; debit/credit 4,700. Duplicate and imbalance checks | Approved account mappings, operational AR/AP opening, real posted stock-to-GL tie-out or live cutover |
| Checkout uncertainty | Dated P05 closure: 9 lifecycle + 16 full-commit real-DB cases; actual authenticated lost-response/retry returns original result. Fixture has one commit, one stock movement, two payments, two journals, two posting batches, one AR entry | Tax behavior, provider settlement, all peripherals, production load or every race. Zero-tax synthetic cash 6 / credit 4 on sale 10 is not statutory certification |
| Offline retained evidence | P06 historical 64 mocked cases, 23 browser-storage cases, 16 DB cases, seven authenticated operator steps; local-only visibility and fresh close guard | Offline production capture/replay, browser signing/enrollment, offline application boot, remote-device visibility or automatic conflict correction |
| Guided setup | P07 closure: 107 mocked and 12 real-DB cases plus complete customer/supplier/two-item application journey with independent checker/tenant/media denials | Real upload provider success, reconciled opening positions, all devices/locales or customer task success |
| Cashier/manager UX | P08: 201 mocked cases; five cashier steps and ten manager observations, FR/EN, keyboard and declared viewports | Exact transaction-level link for every alert, manager resolution, complete accessibility audit or observed customers |
| Portability | P09 covers 20 data categories; partial fixture has 21 records/11 datasets/two attachments and independent omissions/hash controls | Full authorized archive, retained access after cancellation, interruption/revocation at HTTP delivery, or reconstruction of a real tenant |
| Lifecycle/support | P10 proposes 11 transitions/17 scenarios and names unresolved stop/export rules | Approved trial/grace/retention terms, price, legal obligations, billing integration or staffed service hours |
| Local/provider relevance | P11 separates 13 capabilities, seven official sources, 12 planned expert cases and nine provider prerequisite groups | Reviewed national rules, live supported payroll/regulatory functions or a native licensed payment connector |

Counts above describe particular historical runs and must not be added together as unique coverage. The P06 final 11-panel recheck repeats a subset. Its earlier 60-pass/three-timeout attempt is retained and superseded by the 64-case pass, not silently discarded. The [raw evidence review](evidence/EVIDENCE_REVIEW.json) identifies selected final files, counts and hashes.

## Current source and graph anchors

Existing graphs are discovery aids dated August, not a fresh execution model. No graph was installed or regenerated. In `graphify-out/graph.json`, `pos_pos_service_commitpossale` belongs to community 4; `accounting_accounting_settings_service_getaccountingsettings` belongs to community 8. The component graph's POS community 1 and digest community 156 locate the operator-to-manager surfaces. [Source review](evidence/SOURCE_REVIEW.json) records selected current nodes/edges, file hashes and line matches; historical graph line numbers are not treated as current.

- `services/analytics/retention-outcomes.service.ts:22–58`: permission admission, tenant source selection, bounded query and RepeatableRead. `services/analytics/retention-cohorts.ts:32`: non-HUMAN or missing calendar/coverage stays UNKNOWN. This supports R01 design, not its database verification.
- `services/inventory/inventory-stock-event.service.ts:885`: OPENING_STOCK_LEDGER_REVIEW. P03's source map and current onboarding readiness still separate master setup from balances and ledger review. P13 must preserve these ownership boundaries.
- `lib/pos/offline-local-queue.ts:314,374`: current local inventory and fail-closed shift-close check. `services/pos/offline-sync.service.ts:1268–1280`: economic replay requires test environment and explicit test opt-in. Local acknowledgement cannot mean paid.
- `actions/accounting/data-trust.actions.ts:28–65`: protected READ/EXPORT and grant resolution. No explicit module gate is visible at this entry point; P10's generic policy tests do not close P04 T02's full composed-path question. Review the current shared protect/registry path and prove intended retained-access behavior before claiming full coverage.

## P05/P06 remaining verification and enablement register

| ID | Status now | Exact next action; dependency; owner |
|---|---|---|
| F01 P05 core transaction/replay | PASS for dated local fixture | No missing repetition of the same synthetic economic case is claimed. Once D02 fixes the candidate, compare full dependency/config hashes; rerun only changed boundary cases. QA/POS owner; P14 consumes |
| F02 P05 broader supported operating envelope | NOT_RUN | On selected D05/D06/D07 scope, prove applicable taxes/rounding, refund/void recovery, receiving/late evidence and device/peripheral failures through transaction + authenticated browser checks. Do not widen to unselected providers. Domain/QA; P13 then P14 |
| F03 P06 current storage bytes | See P12 RESULT | Run the exact current storage suite, retain sandbox failure and successful retry separately. This refreshes browser persistence only; QA |
| F04 P06 current authenticated integration | PARTIAL | Recreate an explicitly disposable target after runner/fixture review; rerun original signed ingestion, lost acknowledgement/reload/keyboard retry, local-only and server close blockers, anonymous/foreign-tenant, expired/revoked conflict retention and FR failed-read recovery. Assert zero economic effects and unchanged event identity. Queue/fixture drift prevents labeling the historical flow a current full rerun. P06 continuation before P14 integration; POS/QA |
| F05 P06 production enablement | BLOCKED; excluded | Only if separately selected: signed capture/key enrollment, policy/reference-age renewal, reviewed conflict correction, authority interleavings and independent multi-device close coordination need design and evidence. Keep production replay disabled. D06/D07/D14 and domain/security review; no implicit implementation in P14 |
| F06 P06 durability/device limits | NOT_RUN outside named Chromium fixture | Actual device versions, power-loss/eviction, unavailable storage, offline app startup and deployment restore require explicit envelope and fixtures. A persistent-profile restart is already tested; it is not a power-cut proof. D07/D08; QA/SRE |

## Unfinished technical and operational work

Every row is a pending action, not an instruction executed by P12. See the [ordered plan](DAYS_31_60_EXECUTION_ORDER.md) for capacity and ownership sequencing.

| ID | Status / exact next action | Dependencies and owner | Blocks |
|---|---|---|---|
| U01 P02 database proof | NOT_RUN: create explicit synthetic PostgreSQL target; verify two tenants/two sites, permissions/module denial, dedup/reversal/uncertainty, elapsed-window boundaries, overflow, transaction snapshot/concurrency and DB-error behavior against independent expected outcomes | Current reader/schema/import review; QA/data; D04 | P02 runtime completion; valid measurement in P18 |
| U02 Human metrics | BLOCKED: choose provenance, trading calendar, coverage/retention and accountable metric owner; retain UNKNOWN until established | D12; product/data, privacy review | Human activation/cohort claims; not a reason to synthesize usage |
| U03 Opening execution | NOT_RUN: select smallest complete stock/AR/AP/cash/GL cutover; reconcile P03 controls on real DB with retry/concurrency, reviewer separation, repaired rows and provenance | P03/P04/P07/P11/P12; D05; P13 domain/accountant/QA | M1 and downstream operating/close claims |
| U04 Manager resolution | NOT_RUN: move from source navigation to a controlled discrepancy, authorized resolution and retained reviewer/effect evidence | P13 then P14; D06; domain/UX/QA | M3 |
| U05 Media operational path | NOT_RUN: verify authorized real upload and durable read, provider configuration/availability; preserve owned-asset checks and version-2 import review | D08/data scope, P07 closure; platform/QA | Any pilot relying on uploaded media |
| U06 Accountant/close | NOT_RUN: real grant expiry/revocation/read-only, issue assignment/review, late source invalidation and pack trace; qualified acceptance remains separate | P13/P14 then P15; P11 review; accounting/security/QA | M4 technical rehearsal, later real acceptance |
| U07 Whole archive | NOT_RUN: implement promised category coverage, relationship/attachment integrity, resume and current authorization on release, independent reconstruction | P09/P10/P13/P15 then P16; D10, P10 D3/D5 | M5 and trustworthy departure |
| U08 P04 T01 access matrix | PARTIAL: disposable capability now exists via P05–P08, so original “no target” is superseded; perform remaining current role/session/grant/module/foreign-object matrix on the selected fixture | D02/D04; security/QA | Whole pilot isolation/retained access; not invalidated by some passing routes |
| U09 P04 T02 module composition | PARTIAL: specify the intended module/retained-data contract per accountant/legacy close path; trace current protect/registry/entry point and prove unavailable/read-only cases end to end | P10 D3, P04 matrix; module/security/accounting | Comprehensive module admission claim |
| U10 P04 T03 site authority | BLOCKED policy: confirm which stock/receiving roles may operate across assigned sites; test site-A operator against site B, repair only denied-policy failures | D01, approved role policy; product/security/domain | Assigned-site claim; tenant ownership alone is not enough |
| U11 P04 T04 export delivery | NOT_RUN: verify actual HTTP/job route, current authority at release, revocation/expiry and in-flight continuation policy | P10 D3/D5, P16/P17; security/export | End-to-end authorized archive |
| U12 P04 T05 legacy media | NOT_RUN: synthetic unauthenticated/foreign-tenant API and direct static-path checks; inventory deployed storage only when authorized | Explicit fixture/storage scope; platform/security | Legacy-file exposure decision; no confirmed exploit asserted |
| U13 P04 T06 restore containment | NOT_RUN: review helper fallback/cleanup, require explicitly owned source/target, independent controls and cleanup; never infer ambient DB | D08, P17; SRE/QA | Any recovery qualification |
| U14 P04 T07 service proof | BLOCKED external: obtain nonsecret hosting/backup/object/key/scheduler/alert inventory, staffed support and measured restore/alert results | D08/D11, P17; SRE/support | Gate A/B; 15-minute RPO/4-hour RTO remain proposals |
| U15 P04 T08 post-restore safety | NOT_RUN: quarantine worker egress; reconcile restored sessions/grants/export expiry and provider/attachment state before resuming | U13/U14; P17 SRE/security/domain | Safe reopening, not just successful pg_restore |
| U16 Lifecycle stop/access | BLOCKED authority: resolve P10 D1–D7, unsupported POS/sales/reconciliation stop behavior and retained archive rights; prove approved lifecycle cases in P17 | Commercial/legal/product/support plus P10/P14 | Service promises and paid entry; not a retention friction opportunity |

## External authority inventory

No external decision is inferred from code, a PASS documentation packet, or elapsed time. D04 is partly satisfied for past local fixtures; each future target still needs ownership validation. D14 research is prepared; review and contractual access remain absent.

| P01 ID | Required next evidence / decision | Accountable role; dependency/claim |
|---|---|---|
| D01 | Confirm jobs, segment/sites/roles and actual pilot selection | Product; scope, T03, Gate A |
| D02 | Assign release owner, reconcile shared changes, fix candidate and deployed identity | Engineering; integrated qualification/Gate A |
| D03 | Name people and weekly capacity, QA and reviewer availability | Programme; scheduling and blocker accountability |
| D04 | Reconfirm each disposable target, actors, roles and independent checker | QA/platform/security; U01/F04 and remaining access tests |
| D05 | Qualified regime, opening mappings, tax/rounding and reviewer decisions | Accountant/country; P13/live cutover and selected tax behavior |
| D06 | Confirm cash/credit/refund scope and actual provider demand | Product/finance; P14 and any provider selection |
| D07 | Approve actual hardware, browser versions, peripherals/network/offline limits | QA/operations; device and offline support claims |
| D08 | Hosting/DB/storage/keys/backup/scheduler/alerts and RPO/RTO authority | SRE; media, archive, P17/Gate A |
| D09 | Billing/manual process, package/price, invoice handling/cancellation authority | Commercial/product; P10 D1/D2/D6, paid Gate B |
| D10 | Customer-owned fields/attachments, post-cancellation rights, retention/deletion | Data/privacy/legal/commercial; P10 D3/D5, P16/P17 |
| D11 | Staffed hours, escalation, named incident owner and contact authorization | Support/SRE; P10 D7, P17; proposed weekday coverage is not an SLA |
| D12 | Analytics inventory, provenance, calendar, completeness and data retention | Product/data/privacy; U02/retention measurement |
| D13 | Authorized participants/data/observations and real accountant cycle | Product/CS/accountant; P18 preparation and later P19 execution |
| D14 | Qualified current national-rule review and provider contractual/test access | Country/integration; P11 packet, optional P20/P21, no live admission |

P10's additional D4 requires an explicit unsupported-stop/offline policy. Proposed 14-day trial, seven-day grace, 90-day archive period, package size and Mon–Fri 09:00–17:00 Douala support remain unapproved. P11's E01–E10 packet requires authoritative texts/effective dates, regime/applicability, mappings/rounding, independent expected results, qualified sign-off and provenance; its C01–C12 expert cases remain NOT_RUN. Seven researched official sources do not resolve full-text retrieval limits or the stored 2025-versus-current-2026 CGI review question. No rate is declared wrong or changed by this checkpoint.

P11's I01–I09 provider groups still need customer tender/settlement demand, exact job/rail and provider selection, current official protocol/version, representative redacted samples, sandbox credentials/access and contracts, settlement/reversal semantics, security/data handling, operations/support and release evidence. MTN/Orange are unranked; a statement-import hypothesis is not an approved connector project. Retain [P11 expert packet](../P11/EXPERT_REVIEW_PACKET.md) and [provider prerequisites](../P11/PROVIDER_PREREQUISITES.md) as the detailed authoritative open-input register.

## Completion and continuation

The checkpoint decision is complete as a review; programme status remains PARTIAL. The first useful continuation is **close U01 (P02 real-database verification), revalidate F04 on a fixed scoped candidate, and assign D01–D03/D05/D08/D10/D11 owners**. Prepare P13's bounded reconciled-cutover scope only after explicitly requested and after those dependencies relevant to its slice are resolved or accurately blocked. P12 does not execute that continuation.
