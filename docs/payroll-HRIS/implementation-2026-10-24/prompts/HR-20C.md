Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# HR-20C — Close employment-segment and proration computation gaps

**Phase:** Conditional live payroll. **Planning status:** PLANNED. **Accountable delivery role:** Payroll/HRIS engineer and payroll policy reviewer. **Relative effort:** M–L (not a time commitment). **Direct dependencies:** [HR-20B](HR-20B.md), [HR-03](HR-03.md), [HR-04](HR-04.md)

## Mission

Calculate the reviewed consequences of starters, leavers and mid-period changes from consistent effective-dated employment segments.

Execute only this slice under the [shared execution contract](../EXECUTION_CONTRACT.md), including its review lenses, controls, evidence classes and status rules. Read the [master plan](../README.md) first. Confirm dependency evidence before dependent integration or activation; safe preparation may proceed with missing runtime evidence explicitly open.

## Current evidence and crosswalk

Effective lifecycle corrections must feed payroll; actual proration and segment gaps require current reproduction.

Crosswalk: Blueprint 10; effective-dated input integration. These are assessment-era observations, not a substitute for current reproduction. Inspect the [assessment](../../hris-assessment-ohada-1-200-2026-10-24.md) and current implementations before changing code.

## Evidence and candidate owned surfaces

- [services/hris](<../../../../services/hris>)
- [services/payroll](<../../../../services/payroll>)
- [prisma/schema.prisma](<../../../../prisma/schema.prisma>)

Trace relevant callers, schemas, tests and graph relationships. Declare the actual narrow owned-file set; a listed directory does not authorize editing every module. Preserve unrelated working-tree changes.

## Ordered execution checklist

1. Derive nonoverlapping employment/compensation/policy segments from approved source history and certified time.
2. Implement reviewed proration and unpaid-period treatment with explicit boundary dates, timezone and rounding.
3. Handle mid-period salary/contract changes, leave impacts and backdated corrections without counting days or amounts twice.
4. Explain segment contributions in operator review and immutable calculation evidence.
5. Preserve paid-run adjustment workflows and reject contradictory/overlapping input histories.
6. Run the reviewed verification lanes below, record each acceptance result, review rollback, and save the required artifacts. Do not claim completion from source inspection alone.

## Acceptance criteria

- **HR-20C-AC01:** Starter, leaver, mid-month salary change and unpaid-leave examples match HR-20A approved expected values.
- **HR-20C-AC02:** Segment boundaries cover exactly the intended period with no gaps/overlaps unless an explicit inactive interval is represented.
- **HR-20C-AC03:** Future changes do not affect current payroll; applicable backdated changes use a controlled adjustment path.
- **HR-20C-AC04:** Repeated calculation and correction replay remain deterministic and idempotent.
- **HR-20C-AC05:** Every prorated amount can be traced to dates, rule version, source revision and rounding.

Every criterion needs PASS/FAIL/NOT_RUN with a concrete artifact or explanation. A missing mandatory test/review remains open. Use not applicable only with a defensible scope reason; do not use it to evade the criterion.

## Verification commands and evidence

Read the current script/config/setup and command registry before executing commands. Start with `npm run agent:workflow:check` after inspection. Follow the [contract's command recipes and separated test lanes](../EXECUTION_CONTRACT.md). Select focused tests from the current source ownership and save their exact commands/exit codes.

- Boundary/property tests for segment coverage and independently reviewed numeric cases.
- Real-database lifecycle→certification→calculation integration with frozen/paid rejection and adjustment cases.

No application .env database fallback, unreviewed reset/seed command, live provider effect or fabricated qualified approval. Source, mocked tests, real-database tests, provider tests and browser checks must be reported separately.

## Data, release and rollback

- **Data/migration:** Prefer derived versioned segment evidence; any persisted snapshot must preserve original effective history.
- **Release boundary:** Shadow payroll acceptance only until downstream outputs and pilot pass.
- **Rollback/recovery:** Suspend affected run generation; preserve segment evidence and issued results.
- **Decision or external dependency:** Proration conventions must come from HR-20A, not an assumed calendar-day or fixed-30-day rule.

## Required artifacts and completion

1. The bounded implementation, focused tests and any necessary reviewed migration/runbook; no unrelated refactor.
2. `what-next/hris-implementation-2026-10-24/HR-20C/RESULT.md` with current baseline, owned files, acceptance matrix, distinct verification results, review lenses, unresolved items and next eligible slice.
3. `what-next/hris-implementation-2026-10-24/HR-20C/evidence.json` with baseline/file hashes, commands, results, timestamps and actual artifact paths; exclude secrets and personal data.
4. A dated follow-up status/evidence entry in `docs/ecc/cameroon-blueprint-execution-2026-10-07.md`, preserving existing program history. Do not mark older work packages incomplete or completed merely because this slice exists.

Use VERIFIED only when every applicable criterion has current evidence. Otherwise report IMPLEMENTED_PENDING_VERIFICATION or the precise BLOCKED condition after completing safe work. Stop after this slice unless a larger sequence was explicitly requested.

## Non-goals

Do not create a parallel employee master, approval engine or generic platform rewrite; do not weaken tenant scope, maker-checker, immutable evidence, country admission or exact-replay recovery. Do not fix unrelated lint, redesign unrelated pages, enable unsupported countries, deploy, commit, file declarations, make payments or send external messages without applicable authorization. Apply the selected mission narrowly.
