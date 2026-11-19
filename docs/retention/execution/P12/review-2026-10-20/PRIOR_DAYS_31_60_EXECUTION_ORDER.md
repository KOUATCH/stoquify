# P12 — Conditional days-31–60 execution order

18 October 2026. Planning output only. **P13–P18 remain NOT_RUN.** P12 is PARTIAL and does not grant Gate A, a live pilot, paid launch or approval to execute this backlog. Revalidate each prompt's own prerequisites when explicitly requested. Use the [checkpoint](DAY_30_CHECKPOINT.md) and [acceptance ledger](ACCEPTANCE_LEDGER.md) as the pending-work register.

## Capacity and effort decision

Actual staffed capacity, time spent on P01–P11, reviewer bookings and delivery velocity are **unknown**. The dated packets span 13–18 October; that is not evidence of 30 working days or a repeatable throughput. D03 must supply named people, available days, concurrent obligations, QA capacity and accountant/operations review slots before dates are committed.

The original roadmap assumes three engineers, 0.75 QA, 0.5 product/CS and 0.2 accountant capacity. Across 13 weeks it budgets 39 gross engineer-weeks, with 25% reserved, about 29 planned weeks. These are assumptions, not resources found by P12. For a hypothetical four-week next window with 20 working days, three engineers yield 60 gross / **45 focused engineer-days** after the same reserve; two yield 30 focused days; one yields 15. QA and external review are separate constraints and cannot be converted into engineering capacity. Thirty calendar days are not guaranteed to contain 20 available workdays.

| Work package | Original prompt allowance | P12 planning range, focused engineer-days | Reason / confidence |
|---|---|---|---|
| P02 verification continuation, U01 | Not new P13–P18 allowance | 2–4 | Explicit disposable reader fixtures, permissions/scoping, independent outcomes and transaction/overflow tests; medium-low |
| P06 authenticated refresh, F04 | Not a new offline feature budget | 1–2 | Revalidate changed fixture, same bounded operator journey and zero economic effects; medium. F05 production enablement excluded |
| Cross-cutting trust gaps U08–U12 | Separate bounded remediation allowance | 3–6 | Composed module/site/static-file checks and only necessary fixes; low until policy/fixtures chosen. Do not double-count P15/P16 delivery work |
| P13 reconciled cutover | 3–6 per agreed slice | 5–9 for one bounded complete cutover | Existing stock owner but AR/AP/opening-GL orchestration and exactly-once controls need closure; low until D05 scope approved |
| P14 operating loop | 4–7 per selected gap set | 4–7 | Reuse P05/P06/P08; add controlled resolution/receiving/corrections/late evidence selected for pilot; medium-low |
| P15 accountant close | 3–5 per bounded gap set | 3–5 | Existing close primitives; composed grants, late-source invalidation and reviewer journey need runtime proof; medium-low |
| P16 archive | 4–7 per archive slice | 6–10 for the agreed complete pilot archive | P09 is a pure contract, not extraction; relationships, attachments, authorization and resume dominate; low |
| P17 recovery/service | 2–4 plus operations review | 4–7 | Contained restore, independent totals, restored-authority/work reconciliation and approved lifecycle checks; low; external wait excluded |
| P18 admission review | 0.5–1 | 1 | Evidence-only gate after predecessors; missing evidence returns PARTIAL/BLOCKED, not more optimistic scoring |
| **Conditional total** | Original P13–P18 allowances sum 16.5–30 for one of each bounded slice | **29–51** | Includes two prerequisite continuations and separate trust allowance. Not a fixed estimate, not a promise of complete platform readiness |

The 29–51 range excludes production offline enablement, provider integration, payroll, another country, dependency upgrades, broad redesign, production migration/restore operations and customer pilot execution. It also excludes external waiting for law/policy/reviewer/hosting/provider inputs. Media-provider verification U05 is an operational prerequisite: budget its selected local work explicitly when the actual upload/storage environment is known rather than conceal an unknown cost. If testing exposes a new defect, update the owned slice estimate and trade scope; do not consume the entire reserve silently.

With assumed three-engineer capacity, the high case exceeds 45 focused days before external waits. With one engineer, the plan does not fit. **Do not commit to finishing P18 by day 60.** Confirm capacity first, target complete narrow workflows, and carry unfinished gates forward explicitly. A smaller pilot can reduce supported sites/tenders/devices only through an approved envelope change; it cannot waive isolation, financial integrity, restore or data rights.

## Ordered work and handoff conditions

| Order | Requested execution unit | Required inputs / hard predecessors | Acceptance and verification to preserve |
|---|---|---|---|
| 0 | Assign decisions and fix source observation | D01–D03; relevant D05–D12; programme/release/QA owners | Named owners and availability; selected candidate hashes and scope/exclusions; approved policies where needed. Do not reset inherited work to fabricate a clean baseline |
| 1 | Close P02 U01 and P06 F04; investigate bounded U08–U12 | Existing P02/P04/P05/P06 evidence, explicit disposable targets, reviewed runner/config/fixture chains | P02 real reader isolation, once-only counts/reversals/uncertainty, limits/snapshot/errors; P06 current authenticated original-event retry, denial/conflict retention and local/server close barriers. S/M/D/B recorded separately; no live telemetry or offline production activation |
| 2 | **P13 — Complete reconciled cutover** | **P03, P04, P07, P11, P12**; approved synthetic slice and D05 accounting decisions relevant to implementation. Missing expert approval blocks live acceptance, not honest synthetic exploration | M1 quantities/valuation/AR/AP/cash/GL tie out independently with zero unexplained differences; real DB duplicate/concurrent/changed-payload/self-approval denials; repaired rejected rows preserve provenance; EN/FR operator evidence as applicable. No master-import shortcut to opening balances |
| 3 | **P14 — Complete daily operating loop** | **P05, P06, P08, P12, P13**; refreshed relevant runtime evidence and selected D06/D07 envelope | M2 recoverable operations without duplicate/missing effects; M3 actual discrepancy resolution with evidence/reviewer; receiving distinguished from AP release, payment evidence from executed transfer. DB + browser fault/recovery checks on supported scope |
| 4A | **P15 — Accountant close journey** | **P04, P11, P13, P14**; approved grant/retained-access interpretation | Synthetic issue assigned/explained/reviewed/traced, revoked/expired/read-only grants enforced on actions/downloads, late change invalidates current proof; real reviewer acceptance remains later evidence |
| 4B | **P17 — Recovery and service readiness** | **P04, P10, P12, P14**; D08/D11 and resolved P10 policies for tested scenarios | Explicit isolated restore identity/timestamps, independent totals/attachments/access, quarantined workers and no replayed financial effects; restore revocation/expiry reconciliation; named incident owner and safe pause/resume. Measured local recovery is not a deployed RPO/RTO promise |
| 5 | **P16 — Authorized archive** | **P04, P09, P10, P13, P15**; D10 and P10 D3/D5 scope/rights approved | Category/relationship/attachment completeness, independent reconstruction, interruption/resume, current authorization/revocation/expiry at delivery. No withheld customer data or deliberately incomplete export. M5 technical proof separate from a production departure |
| 6 | **P18 — Pilot-entry gate** | **P02, P11, P13, P14, P15, P16, P17** | Evaluate actual S/M/D/B and relevant E/O evidence on fixed candidate/scope; unknown required checks block admission. Prepare task/stop/contact-role/data-access packet. Gate decision itself does not authorize deployment/contact |

All hard predecessors above are copied from the prompt contracts, not inferred from row ordering. P17 can finish before P16; P18 still waits for both. P12's PARTIAL status means consumers must inspect outstanding conditions, not treat this file as a waiver. Preparatory source reading/design may proceed only when separately requested and when a missing prerequisite cannot affect that bounded work. Do not mark implementation/runtime criteria passed on preparation alone.

## Shared ownership and safe concurrency

This is a proposed staffing model, not a request to spawn agents or start tasks. One accountable writer per shared file/change set. Revalidate actual files at task start and inspect inherited diffs; labels below name responsibility, not assigned people.

| Lane / proposed owner | Likely shared surfaces | Sequencing rule |
|---|---|---|
| Data/domain engineer: U01 then P13 | `services/analytics/retention-*`, `services/onboarding/`, inventory/accounting owners, Prisma schema if demonstrably necessary | Freeze P13 opening/economic contracts before P14 integrations; no concurrent schema/migration edits by separate lanes |
| POS/workflow engineer + QA: F04 then P14 | `services/pos/`, `actions/pos/`, `lib/pos/`, POS components/hooks, inventory/AR/ledger boundaries | Coordinate with P13 owner; one owner for stock/posting/idempotency changes. Do not overwrite P06 queue or P08 UI work |
| Accounting/export engineer: P15 then P16 | `services/accounting/`, accountant actions, close proof, data-trust, export jobs/routes | P15 grant/current-proof contract first; P16 consumes it. Keep API/archive contract and independent checker owned separately from expected values |
| Platform/security owner: U08–U12 then P17 | `services/_shared/protect.ts`, module/role registry, storage/download controls, recovery helpers and environment policy | Approve authority contracts with domain owners. P17 may overlap P15/P16 only on disjoint protocol/fixtures after P14; serialize shared auth/export/worker edits and final integration checks |
| QA/product/accountant/support | Test fixtures, independent controls, task scripts, source evidence and approvals | Use separate owned disposable targets; do not share mutable fixture DBs or claim scripts as actual customer observations |

Keep work in progress at two implementation slices plus independent QA when the assumed team exists; with one engineer, run serially. Parallel research/policy preparation is useful, but dependencies and reviewer sign-offs still gate implementation acceptance. Never replace independent expected amounts with the application's own output. Finish each bounded slice's S/M/D/B, record failures and cleanup, then hand off current hashes. A shared-file merge or intervening dependency change triggers relevant revalidation, not blanket reuse of green tests.

## Conditional four-week cadence

This is a sequence for scheduling after D03 confirmation, not calendar dates or a launch promise.

| Window | Preferred focus | Exit condition / stop rule |
|---|---|---|
| First available week | Decisions/candidate; U01/F04; P13 contract and independent controls; bounded trust probes | If owners/regime/target unavailable, keep respective work BLOCKED and prepare only unaffected artifacts; no fabricated approval |
| Second | Finish P13 before P14 integration; resolve material authority findings | No reconciled opening -> no claim of complete daily loop on migrated data |
| Third | P14 evidence, then P15; prepare P17 restore inventory and contained fixture once prerequisites hold | No manager resolution -> M3 stays incomplete; no recovery authority -> P17 operational claim blocked |
| Fourth or later | P16 after P15; P17 integration; P18 only when actual evidence is ready | If 29–51-day range/capacity or external waits overrun, retain unfinished status. Do not cut correctness/portability to meet a date |

## Measurement and review without invented adoption

U01 validates the first outcome slice before dashboard growth. U02 then defines human/source provenance, scheduled trading calendar and observation completeness. Collect authorized actual measures later: activation time to reconciled opening and first confirmed operation; confirmed workflow frequency by scheduled day; supported module adoption; distinct authorized operator/reviewer participation; eligible retention cohorts; and optional cancellation reasons. Missing or immature observations stay UNKNOWN/IMMATURE, not churn. Cancellation feedback must remain optional.

For this engineering window track owned acceptance items closed, remaining required D/B checks, reproducible defects, failed-to-recovered operations in synthetic fixtures, independent reconciliation differences, and unresolved decisions with age/owner. These are delivery measures, not customer retention metrics. Re-estimate after P13 and P14 using actual focused time and discovered cases. Product/accountant/support owners should review scope changes and claims before downstream gates; P12 performs no outreach or scheduling.

## First continuation to request

Close P02's real-database evidence gap using an explicitly disposable target; refresh P06's current authenticated operator journey; preserve unrelated changes and save evidence. Keep production offline replay disabled and do not run P13 automatically. In parallel planning, obtain named release/programme/accountant/operations/data-rights owners and confirm capacity. Then request P13 with the smallest complete reconciled-cutover slice and the applicable decisions attached.
