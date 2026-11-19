# HR-08 — Critical correctness decision

Status: VERIFIED — bounded engineering correctness gate. HR-00–07 dependency evidence is retained and refreshed by the combined checks. At the user's explicit request, independent reviewer `/root/hr08_independent_review` examined current source with fresh context and read-only ownership, identified four findings and re-reviewed their fixes. No actionable correctness/security finding remains within this scope. The final rerun and source-bound evidence satisfy the reviewer's closing condition.

Candidate: HEAD 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886 plus inherited working-tree edits and this bounded tranche. Current SHA-256 file identities are in evidence.json. This is neither a clean release commit nor legal, production, accessibility or whole-platform certification.

## Repaired behavior

- HR-01: serialized leave ledger/debit decisions, complete replay identity, future-effective balance protection and atomic audit/event outcomes.
- HR-02: immutable original attendance with target-bound, independently approved corrections; fresh certification evidence creates a linked revision. Stale/paid-run changes fail; request form errors retain values and focus.
- HR-03: exact cross-period leave conservation, explicit employee policies, reviewed schedules/calendars, eligible overtime counted once, full scheduled-date coverage. User decision: the whole overnight shift belongs to its local start date.
- HR-04: future employment changes stay scheduled; explicit due application validates the current source and independent authorization. Historical employment projection preserves prior state and retries recover retained outcomes.
- HR-05: exact employee authorization independent of list size; complete current scope; historical access intersects current authority; revoked/expired authority cannot revive fallback access.
- HR-06: server search/filter/paging and scoped totals, stable duplicate-name ordering, URL/back behavior and EN/FR recovery states for a 200-person company.
- HR-07: existing admission remains closed for unsupported/stale payroll; real-guard negative coverage, actual transaction rollback and retained replay recovery added.

Integration review found and repaired one additional cross-flow gap: an employment change affecting the target period could otherwise be followed by early attendance certification. The builder now returns HRIS_TIME_EMPLOYMENT_CHANGE_PENDING until that change is resolved at its permitted effective time. PostgreSQL confirms no snapshot is created and today's employee remains active. This is a narrow HR-03/04 integration correction, not an automatic lifecycle scheduler.

## Acceptance decision

| Criterion | Decision / evidence |
|---|---|
| AC01 | PASS within documented engineering lanes: HR-01–07 have current focused and combined evidence plus completed independent aggregate review. |
| AC02 | PASS: independent reviewer closed R1–R4 after source re-review and inspected verification artifacts. Final unit, PostgreSQL and type checks pass; current source hashes are retained. |
| AC03 | PASS: 60 PostgreSQL cases include deterministic concurrent contenders, winning state, transaction rollback/recovery and bounded cleanup. Final remaining synthetic organization count is zero. |
| AC04 | PASS for scoped component journeys: six People EN/FR/360–768–1440 role/search/back/error cases using actual service/DB, plus six earlier attendance-correction component cases. Full Next/Better Auth session and screen-reader coverage are not claimed. |
| AC05 | PASS for scoped recovery rehearsal: actual transaction rollback, retained replay and denied-access behavior; see ROLLBACK_AND_SUPPORT.md. No production schema rollback was performed. |
| AC06 | PASS: legal rules, qualified release evidence, production migration replay, pilot rollout and deployment remain separate gates. |

## Verification lanes

- Source: affected service/action/worker entry points, replay order, tenant predicates and dependency contracts inspected. Current source hashes and the original dirty baseline are retained.
- Mocked/pure/source-assertion regression: 327/327 passed in unit-review.json across 29 suites, no skips. Includes eight payroll replay boundaries × authorized/revoked/stale authority, explicit worker authority, and current/legacy manual/automated declaration recovery after state/time/adapter retirement. Initial failed artifacts remain retained and explained in INDEPENDENT_REVIEW.md. Migration tests inspect SQL source; they are not database trigger replay evidence.
- Real PostgreSQL: 60/60 passed in postgres-review.json, no skipped cases, including all HR-00–07 fixtures and the new lifecycle/source-freshness cases. Real import → request → independent review → linked certification → readiness export retains the new attendance proof. Unrelated missing identity/contract/payment proof remains BLOCKED rather than being fabricated into payroll readiness. The final rerun passed after source changes; the subsequent payroll-control edit removed only trailing whitespace.
- Browser: actual components, real People service/PostgreSQL, synthetic role boundary and anchor/locale navigation; twelve EN/FR viewport cases across the two touched journeys. French 360 and English 1440 People screenshots visually inspected. No real provider was used.
- Focused TypeScript: typecheck-review.txt records zero diagnostics across affected production roots, the real-DB suite and changed payroll test fixtures. Whole-repository build/typecheck was not substituted for this bounded result.
- Workflow contract passed; 196 unrelated/unclassified package scripts were not executed. Owned tracked diff passed whitespace checking. All changes remain uncommitted.

## Independent review fixes and assessment crosswalk

See INDEPENDENT_REVIEW.md and independent-review.json for reviewer identity, findings, resolution and limitations. R1 rejects new lifecycle proposals over certified input before effects and allows independent rejection of approved but unapplied legacy proposals, retaining audit history. R2 rechecks current authorization before payroll/payment/declaration replay and makes declaration recovery independent of later state/time/adapter retirement. R3 requires explicit worker authority before leasing or submission. R4 compares current operational policy/evidence/totals canonically under employee serialization, sharing the source projection between certification and payroll consumption; all time approvals respect sealed payroll. Schedule activation and manual ledger writes share the employee lock.

| Assessment finding | Current acceptance evidence |
|---|---|
| F01 — Time/correction fidelity | HR-02/03 import-to-readiness chain; HR-08 unchanged/stale/revised source proof and pending/anomaly checks. |
| F02 — Leave consistency | HR-01 concurrent debit/decision, future balances and atomic rollback; HR-03 allocation conservation; HR-08 changed-ledger freshness. |
| F03 — Effective employment | HR-04 scheduled application/history/replay; HR-08 both orderings of lifecycle versus certification and legacy rejection recovery. |
| F04 — Authority/discovery | HR-05 exact second/51st/200th scope, current/historical/revoked authority; HR-06 server search/count/paging and role/browser journeys. |
| F05 — Admission/effects | HR-07 actual guard/transaction denials and retained recovery; HR-08 replay authority, pre-provider denial and retired-adapter recovery. |

The R1 reproduction retained two expected PostgreSQL failures. The focused review run passed nine tests but failed cleanup on the new anomaly fixture's foreign key; cleanup order was fixed and cleanup-recovery.json records only the exact two synthetic organizations removed, with zero remaining. Final complete PostgreSQL cleanup and shutdown passed. The initial combined unit failures were incorrect denial-text assertions and old mocked-authority fixtures, corrected to exercise the real authority policy.

## Restrictions and handoff

Re-run against the file hashes in evidence.json if implementation changes. This decision is independent engineering review, not qualified legal or production sign-off. The earlier pending decision/evidence and failed runs are preserved as historical artifacts.

The disposable environment used schema synchronization, not the production migration chain or custom immutability-trigger installation. Runtime service/transaction evidence and static migration assertions are distinct. Existing schema/migration release gates must still run before deployment.

Local work-date totals implement the user-selected shift ownership policy; elapsed-time/DST segmentation and holiday-work exceptions are not supplied. Company/country leave and overtime eligibility require reviewed policies. The payroll technical envelope remains CM/monthly/single employer; there is no generic OHADA statutory approval.

Architecture/data/control review retained existing ownership, audit/outbox and immutable snapshots. Security preserved tenant, own/team and independent approval boundaries. UX localized only touched surfaces. SRE/support has bounded fixtures, safe failure categories and recovery notes. AI, inventory, unrelated modules and commercial packaging changes are not applicable. No production data, schema promotion, rate approval, payment, filing, message, deployment or commit was performed.

Next eligible roadmap slice is HR-09, subject to its own contract. This execution stops at HR-08. Retrospective employment corrections remain outside this slice; do not change factual effective dates to bypass frozen-history controls. Routine workflow rollout and later statutory/pilot gates retain their own dependencies.
