# HR-03 — Period allocation correctness

Status: VERIFIED for the supported daily work-date contract. On 2026-10-24 the user explicitly selected whole-shift ownership by local start date. Complete-period coverage now requires every scheduled work date within the employee's employment interval, including dates without imported rows. No statutory eligibility or elapsed-time segment certification is implied.

Baseline: HR-02 on 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886 plus inherited edits. Owned files: services/hris/time-allocation.ts, operational-time.service.ts, time-leave.contract.ts; focused allocation/operational-time tests and the existing isolated PostgreSQL suite. No migration.

## Changes

The builder loads the entire covered request interval before selecting the current period. A 960-minute full-day leave request allocates 480/480, rather than 960 in each period. Partial multi-day leave requires explicit reviewed allocations bound to the request hash. Leave consumes recorded absence; contradictory totals are blocked rather than clamped. The request's explicit reviewed policy is used, and the arbitrary latest country policy fallback is removed. Candidate policies must be linked to that employee's ledger or approved requests. Policy changes require separately reviewed requests.

Schedules resolve per work date; changed schedules/calendars/policy review hashes alter retained certification evidence. HR-02 requires fresh approval and creates a linked revision. Pending corrections across the entire allocation range block certification. All operational requests now share the employee transaction lock with certification/calculation.

Overtime is a subset of recorded work under the existing totals contract. Approval caps that eligible work once; duplicate authorizations cannot multiply it, and approval without recorded overtime creates no work. Unmatched imported overtime blocks certification.

## Supported interval contract and invariants

Dates are explicit local work-date labels stored at UTC midnight, not elapsed-time instants. ISO weekday keys sun–sat or 0–6 carry reviewed scheduled minutes. Public holidays have zero ordinary scheduled capacity; holiday-work exceptions need a separately supported policy. Effective schedule boundaries are inclusive date labels, with the newest effective schedule selected. Payroll periods select their inclusive work-date labels. A shift represented as a single reviewed work-date row belongs to its local start date, including an overnight shift. The current import model does not contain shift start/end segments: elapsed-time allocation across midnight, DST and holiday-work exceptions are not certified by this change. Non-normalized/duplicate daily entries fail for review.

| Invariant | Enforcement |
|---|---|
| worked + recorded absence = scheduled | Required for each source entry |
| leave <= recorded absence | Required per date across requests |
| worked + remaining absence + leave = scheduled | Conserved without clamping |
| sum of leave allocations = requested leave | Exact integer equality; unique date allocation |
| payable overtime <= recorded overtime <= worked | Authorization consumes recorded capacity once |
| allocations across disjoint periods conserve totals | Tested 480 + 480 = 960 |

## Acceptance and verification

| Criterion | Result |
|---|---|
| HR-03-AC01 | PASS — unit conservation/replay plus real two-period certification, 480/480. |
| HR-03-AC02 | PASS — user-selected local start-date ownership; synthetic 22:00–06:00 shift retains all 480 minutes in its starting period. Daily import labels carry that operational ownership. |
| HR-03-AC03 | PASS — duplicate approvals, no recorded work, unmatched work and normal overtime cases. |
| HR-03-AC04 | PASS for supported daily schedules — explicit multiple policies, part-days, holiday exclusion and effective schedule changes; policy/holiday exceptions remain unsupported. |
| HR-03-AC05 | PASS — conservation, contradictory inputs and complete scheduled-date coverage tested. Missing monthly dates block certification; hire/termination boundaries constrain required dates. |

- Mocked/pure unit: 19 tests, two suites (unit.json).
- Real PostgreSQL: 39 combined HR-00–04 tests including cleanup (postgres-regression.json); uses the actual import service for complete October/November feeds, rejects incomplete coverage, and includes new schedule version → stale review rejection → linked revision. Explicit disposable target only.
- Focused TypeScript: zero diagnostics after correcting narrow test/kernel types (typecheck.txt). Final range query and deterministic sorting additionally exercised in the PostgreSQL regression.
- Browser: not run; this slice changes service contracts only. Provider, migration replay and statutory certification: not run.

## Review and next actions

Architecture/data: existing source owners and additive evidence fields, original snapshots preserved. Backend: deterministic integer allocations, shared ordering, request/review identity. Security/privacy: tenant and employee predicates, no new role grant, no sensitive content in evidence. HR/product: conservative remedies for ambiguous splits/schedules. QA/SRE: runtime versus mocks separated, errors explicit. Finance/statutory: no new payable-rate formula or regional legal default; current country admission unchanged. Frontend, AI/POS/AP and provider transport: not applicable.

The accepted start-work-date policy and scheduled-date coverage close the two earlier engineering gaps. Actual local eligibility/rates, elapsed-time/DST segmentation and holiday-work exceptions remain outside this supported contract. HR-04 is already verified; proceed with HR-05 manager access.

Rollback: stop new allocation-version-1 certifications if an invariant fails; preserve all request, import, allocation and snapshot hashes. No rewriting of earlier financial history. Local file replacement used an exact workspace candidate/backup because Windows held a mapped section on the source file; pre-replacement snapshots are retained here.
