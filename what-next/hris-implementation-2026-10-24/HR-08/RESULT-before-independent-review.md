# HR-08 — Critical correctness decision

Status: IMPLEMENTED_PENDING_VERIFICATION. HR-00–07 engineering criteria are verified within their documented scope. The aggregate rollout gate remains OPEN for independent adversarial review; no independent human/reviewer sign-off was available. Self-review is not independent, and no sub-agent was spawned without authorization.

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
| AC01 | PASS within documented engineering lanes: HR-01–07 have current focused and combined evidence. Independent aggregate review remains open. |
| AC02 | OPEN: integrated self-review and tests reveal no remaining unexplained critical/high invariant failure; an independent adversarial reviewer must assess this claim before rollout. |
| AC03 | PASS: 55 PostgreSQL cases include deterministic concurrent contenders, winning state, transaction rollback/recovery and bounded cleanup. Final remaining synthetic organization count is zero. |
| AC04 | PASS for scoped component journeys: six People EN/FR/360–768–1440 role/search/back/error cases using actual service/DB, plus six earlier attendance-correction component cases. Full Next/Better Auth session and screen-reader coverage are not claimed. |
| AC05 | PASS for scoped recovery rehearsal: actual transaction rollback, retained replay and denied-access behavior; see ROLLBACK_AND_SUPPORT.md. No production schema rollback was performed. |
| AC06 | PASS: legal rules, qualified release evidence, production migration replay, pilot rollout and deployment remain separate gates. |

## Verification lanes

- Source: affected service/action/worker entry points, replay order, tenant predicates and dependency contracts inspected. Current source hashes and the original dirty baseline are retained.
- Mocked/pure/source-assertion regression: 295/295 passed in unit.json across 28 suites. The initial run had 294 passes and one outdated UI success-copy assertion; unit-before-copy-alignment.json preserves it. The assertion was aligned with the existing independent-review wording and the suite rerun. Migration tests inspect SQL source; they are not database trigger replay evidence.
- Real PostgreSQL: 55/55 passed, no skipped cases, including all HR-00–07 fixtures and the new employment/certification case. Real import → request → independent review → linked certification → readiness export retains the new attendance proof. Unrelated missing identity/contract/payment proof remains BLOCKED rather than being fabricated into payroll readiness.
- Browser: actual components, real People service/PostgreSQL, synthetic role boundary and anchor/locale navigation; twelve EN/FR viewport cases across the two touched journeys. French 360 and English 1440 People screenshots visually inspected. No real provider was used.
- Focused TypeScript: zero diagnostics across affected production roots and the real-DB suite. Whole-repository build/typecheck was not substituted for this bounded result.
- Workflow contract passed; 196 unrelated/unclassified package scripts were not executed. Owned tracked diff passed whitespace checking. All changes remain uncommitted.

## Restrictions and handoff

An independent reviewer should examine exact/current/as-of authority and fallback denial, correction/ledger lock ordering, future employment versus frozen attendance, replay identity and admission before effects. Re-run against the file hashes in evidence.json if implementation changes. The reviewer must record identity, findings, evidence and resolution; no approval is implied by this document.

The disposable environment used schema synchronization, not the production migration chain or custom immutability-trigger installation. Runtime service/transaction evidence and static migration assertions are distinct. Existing schema/migration release gates must still run before deployment.

Local work-date totals implement the user-selected shift ownership policy; elapsed-time/DST segmentation and holiday-work exceptions are not supplied. Company/country leave and overtime eligibility require reviewed policies. The payroll technical envelope remains CM/monthly/single employer; there is no generic OHADA statutory approval.

Architecture/data/control review retained existing ownership, audit/outbox and immutable snapshots. Security preserved tenant, own/team and independent approval boundaries. UX localized only touched surfaces. SRE/support has bounded fixtures, safe failure categories and recovery notes. AI, inventory, unrelated modules and commercial packaging changes are not applicable. No production data, schema promotion, rate approval, payment, filing, message, deployment or commit was performed.

Next eligible work is the independent HR-08 review and any resulting bounded remediation. Routine workflow rollout and later roadmap slices remain gated by their own dependencies; this execution does not silently start HR-09 onward.
