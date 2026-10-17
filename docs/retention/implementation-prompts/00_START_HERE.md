# Ordered implementation prompts for Stoquify retention and SME value

Prepared 12 October 2026 from [the full roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md). This pack contains **24 execution prompts**, with **P01–P12 covering the first 30 days**. Later prompts cover days 31–90, months 4–6 and conditional months 7–12. The original report and roadmap files are preserved.

**Start with [P01 — Baseline and pilot scope](01_BASELINE_AND_PILOT_SCOPE.md).** Then run one prompt at a time in dependency order. This task only prepared the pack; no implementation prompt has been executed.

## How to run

In the Stoquify workspace, use:

```text
Read docs/retention/implementation-prompts/01_BASELINE_AND_PILOT_SCOPE.md and execute P01 only. Follow its shared execution contract, dependencies, scope, acceptance criteria and verification guide. Save actual execution evidence in the locations it specifies. Do not execute later prompts automatically.
```

For the next run, point to its numbered file. The entire file is the ready-to-run prompt; linked common files are part of its instructions. A new chat needs repository access to read those shared contracts and prior execution evidence. No unresolved template variables or invented test commands need to be supplied before starting P01. Later prompts identify genuine environment, expert, provider and customer prerequisites instead of pretending they exist.

Read [common execution contract](COMMON_EXECUTION_CONTRACT.md) and [verification guide](VERIFICATION_GUIDE.md). Results will be saved under `docs/retention/execution/Pxx/`; P01 initializes `execution/STATUS.md`. Those are future outputs, not evidence that this authoring task completed application work.

## Days 1–30: recommended execution windows

1. **Days 1–3:** P01 establishes scope and baseline. Begin P02 measurement, P03 synthetic cutover fixtures and P04 access/recovery foundations after P01.
2. **Days 4–12:** Execute P05 checkout recovery after P04. P07 guided setup follows P03/P04. P09 archive contract follows P04. Prepare P11 country/provider prerequisites after P03.
3. **Days 13–24:** P06 offline replay follows P05. P08 cashier/manager UX follows P05/P07. P10 service lifecycle follows P09. Finish narrowly scoped P02 instrumentation and unresolved predecessor checks.
4. **Days 25–30:** P12 reviews actual work, reports M0 honestly and orders days 31–60. Incomplete work remains explicit. P12 is executable as a checkpoint even when a predecessor is blocked; it cannot mark missing evidence passed.

The first-month planning ranges total roughly **17.5–27.5 engineer-days**, plus business/expert review and unavailable-environment delay. With the roadmap’s three engineers this leaves substantial capacity for integration, debugging and normal operating work; do not fill it by pulling every later feature forward. These are initial preparation/slice estimates, not estimates for all R01–R10 to completion. Re-estimate at P12. The roadmap’s first-90-day allocation remains 28 planned engineer-weeks and is not replaced by this prompt count.

The numeric order is safe for sequential execution. Independent branches are opportunities to schedule work, not an instruction to spawn agents: P02/P03/P04 after P01; P05/P07/P09/P11 once their dependencies hold. Do not overlap edits in shared POS, inventory, schema or entitlement files without explicit ownership coordination.

## Full order and dependencies

| Prompt | Predecessors | Roadmap coverage | Execution state |
|---|---|---|---|
| [P01 — Establish the source baseline and bounded pilot scope](01_BASELINE_AND_PILOT_SCOPE.md) | None | R01–R12; M0 | NOT_RUN |
| [P02 — Implement a minimal outcome-measurement slice](02_OUTCOME_METRICS_FIRST_SLICE.md) | P01 | R01 | NOT_RUN |
| [P03 — Map cutover ownership and build reconciled synthetic fixtures](03_OPENING_POSITION_FIXTURES.md) | P01 | R03; M1 preparation | NOT_RUN |
| [P04 — Establish access and recovery prerequisites](04_ACCESS_AND_RECOVERY_FOUNDATION.md) | P01 | R06; Gate A foundation | NOT_RUN |
| [P05 — Fix one bounded checkout uncertainty/replay path](05_CHECKOUT_UNCERTAINTY_RECOVERY.md) | P01, P04 | R02; M2 first slice | NOT_RUN |
| [P06 — Verify and harden one offline recovery envelope](06_OFFLINE_REPLAY_FIRST_SLICE.md) | P04, P05 | R02/R04; M2 preparation | NOT_RUN |
| [P07 — Connect master import to opening-readiness guidance](07_GUIDED_SETUP_FIRST_SLICE.md) | P03, P04 | R03/R04; M1 preparation | NOT_RUN |
| [P08 — Improve cashier recovery and manager discrepancy work](08_CASHIER_MANAGER_USABILITY.md) | P05, P07 | R04/R11; M3 first slice | NOT_RUN |
| [P09 — Define and test the authorized archive contract](09_PORTABILITY_CONTRACT.md) | P01, P04 | R07/R08; M5 preparation | NOT_RUN |
| [P10 — Define commercial lifecycle and support policy](10_COMMERCIAL_LIFECYCLE_AND_SUPPORT.md) | P01, P04, P09 | R08 | NOT_RUN |
| [P11 — Define reviewed country scope and provider prerequisites](11_COUNTRY_PROVIDER_PREREQUISITES.md) | P01, P03 | R09/R10/R12 | NOT_RUN |
| [P12 — Evaluate the first-month checkpoint and order the next slices](12_DAY_30_CHECKPOINT.md) | P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11 | M0; R01–R10 | NOT_RUN |
| [P13 — Complete the bounded opening-position journey](13_COMPLETE_RECONCILED_CUTOVER.md) | P03, P04, P07, P11, P12 | R03; M1 | NOT_RUN |
| [P14 — Verify and complete the pilot daily operating loop](14_COMPLETE_DAILY_OPERATING_LOOP.md) | P05, P06, P08, P12, P13 | R02/R04; M2/M3 | NOT_RUN |
| [P15 — Implement and verify a repeatable accountant close journey](15_ACCOUNTANT_CLOSE_JOURNEY.md) | P04, P11, P13, P14 | R05; M4 preparation | NOT_RUN |
| [P16 — Implement a complete authorized archive for the pilot scope](16_AUTHORIZED_ARCHIVE_IMPLEMENTATION.md) | P04, P09, P10, P13, P15 | R07/R08; M5 technical proof | NOT_RUN |
| [P17 — Rehearse recovery and implement the minimum service controls](17_RECOVERY_AND_SERVICE_READINESS.md) | P04, P10, P12, P14 | R06/R08; Gate A/B foundations | NOT_RUN |
| [P18 — Evaluate Gate A and prepare a supervised pilot packet](18_PILOT_ENTRY_GATE.md) | P02, P11, P13, P14, P15, P16, P17 | Gate A; M1–M3 | NOT_RUN |
| [P19 — Evaluate repeated customer value and Gate B](19_PILOT_OBSERVATION_AND_PAID_GATE.md) | P18 | R01/R05/R07/R08; M4/M5; Gate B | NOT_RUN |
| [P20 — Implement one evidence-backed provider capability](20_ONE_PROVIDER_INTEGRATION.md) | P11, P14, P19 | R09 | NOT_RUN |
| [P21 — Deliver one independently reviewed local capability](21_REVIEWED_COUNTRY_CAPABILITY.md) | P11, P15, P19 | R10 | NOT_RUN |
| [P22 — Improve demonstrated team value and commercial fit](22_REPEATED_TEAM_VALUE.md) | P02, P08, P10, P15, P19 | R01/R04/R08/R11 | NOT_RUN |
| [P23 — Evaluate repeatable onboarding and wider rollout](23_WIDER_ROLLOUT_GATE.md) | P16, P17, P19, P22 | Gate C | NOT_RUN |
| [P24 — Evaluate one country or sector expansion and Gate D](24_CONDITIONAL_EXPANSION.md) | P11, P23 | R12; Gate D | NOT_RUN |

P13–P18 belong to days 31–60; P19 requires actual authorized observation in days 61–90 or later. P20–P23 are conditional months 4–6 work, with long tasks delivered as bounded sequential slices. P24 is conditional months 7–12 discovery. P20/P21 become additional Gate C prerequisites only if their capabilities are part of the rollout. Later dates must move if evidence or capacity is missing.

## Dependency and readiness rules

- A predecessor supplies an evidence-backed contract or implementation, not merely a file. Each consumer checks current source and predecessor RESULT. Missing required behavior blocks dependent implementation; independent inspection/fixtures may continue.
- A partial local implementation can support independent preparation but cannot satisfy an unproved financial, security or release gate. Explicitly required DB/browser/provider/customer/expert evidence must exist for its claim.
- P12 is M0 preparation review. P18 evaluates Gate A. P19 evaluates Gate B and actual M4/M5. P23 evaluates Gate C. P24 prepares Gate D and the next bounded sequence. Gate decisions do not deploy, contact customers, transact or grant themselves human authority.
- Technical archive/close rehearsals occur before the pilot; actual accountant acceptance, paid value and customer archive use need real authorized evidence. Do not substitute synthetic users for customers.
- Never broaden country/payroll/provider support to unblock a schedule. Unsupported capability flags and reviewed financial controls remain in force.

## What this pack changes

Only Markdown prompt documents under `docs/retention/implementation-prompts/`. No application features, runtime schemas, production settings, execution records or customer communications were created. Markdown is the execution format for this request; existing roadmap PDFs remain unchanged.

## Authoring verification

- Source inspection: roadmap, project workflow/routing, command registry/runner/hooks, test-lane guide, named source/test paths, graph refresh record and prompt-architect skill.
- Workflow contract: `npm run agent:workflow:check` passed; 198 package scripts outside the reviewed manifest. No application commands are invoked by that check.
- Pack checks: numbering, dependency existence/acyclic order, required sections, relative links, source-path existence, no unfilled template markers, P01–P24 and R01–R12 coverage, and preservation of existing report/roadmap hashes.
- Application mocked tests, real DB tests, browser checks, restore rehearsals, provider operations and customer research: **not run while authoring**. Suggested future commands must be reinspected at execution time.

The [AqStoqFlow Prompt Architect skill](<C:/Users/J COMPUTER/.codex/skills/aqstoqflow-prompt-architect/SKILL.md>) supplied the prompt structure and multidisciplinary review lenses. This task did not use the five-report execution publisher because it is a prompt-authoring request, not execution of that report pipeline.
