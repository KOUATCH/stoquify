# Stoquify roadmap executive summary

**Decision:** start a controlled remediation program with verification, financial correctness and offline durability as the first priorities. **Planning date:** 30 September 2026.

The requested comprehensive roadmap is organized into **38 work packages**, with complete coverage of **14 findings, 29 capabilities, 19 BI proposals and 22 review lenses**. It defines owners/reviewers, dependencies, implementation boundaries, data/controls, acceptance tests, release gates and indicative effort for every package.

## What was executed

The planning prompt was refined and executed against the saved assessment and current command references. Five reports were authored, coverage/dependency checks passed, and the older publication was preserved. The repository publisher generated the five PDF pairs successfully; final source/hash checks are recorded in the publication manifest. No application fixes, migrations, live financial actions or feature activation were executed in this planning task.

## Recommended sequence

| Order | Outcome | Work |
| --- | --- | --- |
| 1 | Trustworthy baseline | R00/R01: select current scope/revision, reproduce defects, complete ordinary tests/typecheck/build and triage blocked gates. |
| 2 | Correct financial meaning and durable offline facts | R02/R03/R06/R07/R08 financial/control lane; R04/R05 offline lane. Start R18/R19 qualification preparation in parallel. |
| 3 | Complete business lifecycles | R10–R17/R20–R24: access, master data, POS/stock, sales, AP, reconciliation, HRIS/payroll, packaging, external access, workers and user journeys. |
| 4 | Trusted BI and qualified release evidence | R09/R25–R31: historical impact disposition, operational/financial/workforce BI, AI evaluation, restore/runbooks and integrated proof. |
| 5 | Controlled activation and handover | R32/R33: supported-device offline pilot, qualified country/provider cohorts, monitored rollout, training and operational ownership. |
| 6 | Accepted extensions | R34–R37: lot/landed-cost/replenishment, assets, budgets/forecast and customer cohorts only after product/source-quality decisions. |


## Readiness and top blockers

The assessment demonstrated useful foundations but did not establish complete-platform readiness. The priority defects involve FX/base currency, source-owned correction, lost/stranded offline events and professional-close semantics. Country/payroll/fiscal qualification, real external integration, finalized lifecycle, authenticated accessibility and deployed recovery evidence remain separate requirements.

Initial audit: **3,173 passed / 23 failed assertions across 326 suites**, using an audit-specific adapter. Later overlapping rechecks: people 552 passed / 15 failed; finance 677 / 3; supplement 112 / 0; changed UI 8 / 0. Thus **18 failed assertions remained in the last affected-cohort rechecks**; these results must not be added to the initial totals. Eight structural gates passed and two were blocked. Typecheck timed out after 420 seconds; the browser could not connect. None of those commands was rerun as part of this roadmap publication.

These are historic audit results. **Current planning checks:** passed; **current application checks:** not run; **current skill validation:** not applicable because skills were not changed. The first archive attempt failed due to filesystem permissions, then the approved bounded copy succeeded. No unresolved report-generation failure is claimed when the final publication manifest passes.

## Capacity and decision needs

Indicative low-confidence planning ranges are **263–436 combined engineering/QA person-days for 34 core packages**, plus **39–63 for four conditional packages**. At an illustrative 25 effective person-days per week this is approximately 11–18 core working weeks before sequencing bottlenecks, external waiting, pilot observation and contingency. These are planning assumptions to replace after R00/R01, not committed estimates or dates.

Assign named owners and independent reviewers; agree the first customer/cohort scope, accounting and offline policies, country/provider access, retention/privacy rules, service objectives and pilot acceptance thresholds. Optional features become mandatory when promised to a cohort. Do not advertise restricted capabilities as complete while awaiting those decisions.

## Next logical action

**Execute R00 and R01 first.** Establish the current revision and evidence register, resolve ordinary verification startup/typecheck limits and reproduce the critical defects. Then execute R02/R03 and R04/R05 as the two primary lanes. Begin expert country/provider review early so its waiting time does not remain hidden until release.

Use [the detailed implementation roadmap](<E:/ohada saas/Focused projects/stoquify/docs/prompt-execution/04_IMPLEMENTATION_ROADMAP.md>) as the execution contract. Publication evidence is in [publication-validation.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-roadmap/2026-09-30-run-01/publication-validation.json>). The earlier report set is retained under [previous-publication](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-roadmap/2026-09-30-run-01/previous-publication>).
