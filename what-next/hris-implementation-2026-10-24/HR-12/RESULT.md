# HR-12 — Operational leave entitlements and balances

**Status: VERIFIED, scoped engineering evidence.** Baseline `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, branch `codex/migration-control-plane-release-2026-08-29`, plus inherited shared changes. No schema migration, production policy activation, installed scheduler or deployment. Next eligible slice: **HR-13** under the user's automatic-continuation instruction.

## Outcome

Employees select their explicitly enrolled, approved effective policy. There is no first-policy or country-latest fallback. Versioned employer rules declare exact minute credits, dates, carryover, expiry, rounding and negative-balance behavior; unresolved legacy rules block dependent effects. People setup prepares these facts for independent review. Same-type overlapping enrolled versions and non-midnight policy work-date bounds are rejected.

Single-date hours/days convert using the reviewed schedule, preserve the input quantity and schedule evidence, and show the equation. Partial multi-date requests retain explicit conserved allocations. Approval serializes with the employee and checks daily capacity against other approved leave across all policies, as well as the ledger's chronological minimum balance. Overnight shifts remain assigned to their local start date. Payroll still independently reconciles actual attendance.

The employee and HR views separate current credits/debits from future movements. HR can post reason/evidence-backed adjustments and execute due approved credits through today. Stable event identities prevent duplicate accrual, carryover and expiry. A source settlement closes once; future backdated mutations cannot silently reopen it. Exact committed scheduler recovery remains available after retirement while new effects are denied.

Pending leave cancellation creates no credit. Approved leave requires another reviewer and appends one inverse of the exact original debit. Pending cancellations block settlement. Settled balances and consumed payroll remain protected; rejection decisions are audited without refund. HR navigation remounts employee forms, and deterministic adjustment keys survive reloads for identical evidence.

## Acceptance

| Criterion | Result | Concrete evidence |
|---|---|---|
| AC01: explicit policy eligibility and mid-period version changes | PASS | Policy unit cases; PostgreSQL `mid-period version boundaries...` and independent preparation/overlap case; browser explicit selection |
| AC02: idempotent accrual/carryover and exact cancellation reversal | PASS | Parallel scheduler, carryover/expiry, exact reversal, pending cancellation, retirement replay and rejection-audit DB cases |
| AC03: partial days, overnight and month boundaries conserve quantities | PASS | HR-03 allocation unit cases; PostgreSQL half-day variable schedule and January/February split; shared 60-case correctness lane |
| AC04: reproducible balance and atomic insufficient-balance rejection | PASS | Current/future reconciliation DB case; parallel approval and scheduler/approval cases; expanded EN/FR balance explanations and conversion equation |
| AC05: unknown policy facts block dependent calculation | PASS | Strict policy unit matrix and DB unknown/foreign/country/ineligible cases; source admission and operations runbook |

## Separate verification lanes

- **Source inspection:** Existing policy approval, employee locks, atomic ledger, effective employment projection and HR-03 allocator reused. New/changed files are enumerated in `owned-files.json`. Historical graph metadata was discovery context, not runtime proof.
- **Mocked/pure/component/action:** **43 tests in 7 suites passed**, `unit-final.log`. Owner unit contracts explicitly isolate new eligibility/allocation guards; their real behavior is covered by PostgreSQL cases. Fresh actor/tenant binding and enforced module options are checked as action contracts.
- **Real PostgreSQL:** **16 cases passed**, `postgres-browser-final.log`, comprising 15 direct service cases plus one browser/service integration case. **60 shared correctness cases passed**, `prior-correctness-final.log`. Both runners assert bounded synthetic fixture cleanup, including zero remaining fixture organizations. No application environment database fallback.
- **Rendered browser:** `browser/results.json` records **18 results**: EN/FR HR and employee flows at 360/768/1440 pixels, employee-switch remount checks, independent cancellation/terminal state, and denied-reader captures. Keyboard submission/focus, no horizontal overflow and no page errors checked. Screenshots retained; EN employee and FR manager mobile captures visually inspected. Actual React/project CSS and real services are used with synthetic HTTP role/action adapters. This does not establish full Next/BetterAuth integration or screen-reader certification.
- **TypeScript:** **0 diagnostics**, `typecheck-sealed.log`; explicit source roots, no emit/incremental metadata.
- **Workflow contract:** PASS, `workflow-final.log`. Owned diff whitespace check is recorded in `diff-check.log`.
- **Provider/domain/production:** NOT RUN; no provider or statutory rule changes. Actual employer rules and qualified country review remain release prerequisites, not inferred from synthetic examples.

## Review and scope

Independent reviewer `/root/hr09_independent_review` identified R1–R6; all are closed in source and linked regressions. See `INDEPENDENT-REVIEW.md`. Browser verification additionally found and fixed post-save focus timing. Failed diagnostic runs are retained separately and do not contribute passing evidence.

Architecture/domain: same employee master, policy owner, request and ledger; no parallel approval engine. Data: additive use of existing JSON and immutable entries; no migration. Security/privacy: tenant/employee scope, current protected action context, independent cancellation reviewer, proof references and hashed reasons. UX: explicit policy choice, EN/FR controls, recovery, scoped remount and tested widths. Quality/release: independent source review plus distinct runtime lanes. SRE: deterministic catch-up and recovery, explicit settlement blockers, bounded synthetic cleanup. SaaS: existing payroll module enforcement and HR authority; no entitlement broadening. Statutory/payroll: no invented regional rates, no retained payroll rewrite. AI, POS/inventory, purchasing and external providers: not applicable to this slice.

## Operating limitations and rollback

See `OPERATIONS.md`. Guided setup enrolls one employee per policy preparation; the API supports explicit lists up to 200. Day/hour entry is single-date; partial multi-day leave uses per-date minute allocations. Supported automatic computation is an explicit credit schedule, capped prior-policy transfer and end-of-policy expiry; no implied statutory formula/proration. Legacy open-ended policy migration requires employer reconciliation. No recurring job is installed. Stop new execution to halt automation; retain posted history and use controlled compensations/payroll corrections. Full product rollout and pilot acceptance remain later gates.

The execution register is updated by the evidence sealing step. File hashes bind this result to the observed candidate; later authorized slices may legitimately change shared files and must reassess affected evidence rather than rewrite this history.
