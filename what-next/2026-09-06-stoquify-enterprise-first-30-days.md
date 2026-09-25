# Stoquify — executable first 30 days

Planning date: 2026-09-06. Start at mobilization, not automatically on this date. This backlog is prepared for execution; **no implementation, deployment or external outreach was performed by the roadmap run**. The complete context is in [the roadmap](<E:/ohada saas/Focused projects/stoquify/what-next/2026-09-06-stoquify-enterprise-execution-roadmap.md>) and [the work-package register](<E:/ohada saas/Focused projects/stoquify/what-next/2026-09-06-stoquify-enterprise-work-packages.json>).

## Intended day-30 result

Business Pulse correctly reports the scoped authoritative sales metric; every identified analytics entry enforces its durable module rule before reading; and the country-review packet identifies the exact supported scope, reviewer and remaining evidence. These are targets, not current passes. Early role baselines, delivery arrangements and migration samples have started. A delayed expert decision does not become an invented approval.

The first three eligible packages are 001, 002 and 003. They have no internal hard predecessor. 001/002 are engineering corrections; 003 is a bounded preparation package with external approval explicitly separated. Finance/access policy decisions B07 may block a disputed behavior but not reproduction, inventory, tests or a concrete reviewable change. Design and sample preparation under 004/020 can proceed in budgeted small slices.

## Capacity and ownership

Lean assumes 3 engineers at 70% project focus: about **9 effective engineer-weeks** over 30 calendar days. Target allocation: 001 = 4; 002 = 3; 003 = 1; initial 004 = 0.5; initial 020 = 0.5. This uses nearly all first-month capacity: high estimates or review rework move unfinished items forward. It does not claim complete 004/020 or O1/O2/O3 by day 30. QA, design, security/SRE, finance and country-review allocations are separate as stated in the roadmap.

Two major engineering packages maximum. The analytics owner coordinates current daily-sales work; platform access owns the route/guard contract. Product/payroll prepares the review packet with limited engineering support. The frontend/product owner collects source-grounded role observations and migration requirements using remaining scheduled capacity. Do not silently book the same person simultaneously to two full allocations.

With six engineers, preserve the same decisions and gates while completing more 004/020 work and beginning 005 delivery, 006 instrumentation and 011 operations. Increased staffing does not compress expert approval or customer observation periods.

## Daily sequence and review points

| Days | Work and owner | Concrete handoff / exit |
| --- | --- | --- |
| 0–2 | Analytics/access owners refresh Git status, source hashes and scoped findings. Product names package owners and identifies overlapping active program work. Payroll/product prepares review request; integration/SRE inventories channel/environment needs. | Bound starting candidate, file ownership, current reproductions, existing tests, decision questions and no application writes outside assigned scope. |
| 3–5 | Finance decides or narrows recognition/currency/period policy; platform chooses concrete analytics module/retained-access rules. Engineers write meaningful failing cases. Country owner assembles versioned sources and scope questions. | Reviewable contracts and precise acceptance cases; disputed semantics explicitly unsupported. Independent source reproduction establishes the trigger. |
| 6–10 | 001 implements the smallest finalized-sales/context slice; 002 binds server enforcement across route and feeding action/export entries. Product observes initial owner/manager tasks. | Positive and denied cases passing in scoped local tests; service contract before UI changes. Country packet ready for qualified review; no source-check-to-approval substitution. |
| 11–15 | Extend 001 to return/time/currency/decimal and caller consistency; extend 002 to lifecycle/stale/wildcard states and retained exports. QA prepares isolated authenticated proof. | Exact negative matrix, no denied downstream reads, no duplicate/mixed-currency totals. Known environment gaps assigned under B04. |
| 16–20 | Run candidate-bound integration tests where environment permits; inspect role/currency/date render states in EN/FR. Qualified reviewer returns issues or remains pending. | Reconciled test receipts and corrected failures. Missing browser/database evidence stays open; it is not replaced with a screenshot of loading state. |
| 21–25 | Resolve focused findings; rehearse safe feature/route rollback and history-preserving correction. Product prepares O1/O2/O3 next slices. Migration owner obtains or requests permitted anonymized samples. | Small internally validated changes and evidence packet; 004/020 partial handoffs, not imaginary completed samples. |
| 26–30 | Independent finance/security/QA review, source-drift check and remaining-gate register. Re-estimate actual throughput and staffing. | Accept only evidenced scope; carry missing expert/provider/environment gates forward. Choose next two engineering packages from actual dependencies, normally 004/020 completion then 005/006/008/011. |

Long-lead owner tasks start in week 1: qualified Cameroon reviewer and exact employer profile; payment statement specification/provider arrangements; transactional delivery setup; isolated database/authenticated test roles; three anonymized migration samples; normal phones and consenting employees/managers; cooperating accountant firms and owners. This roadmap does not itself send messages or enter provider arrangements. The responsible human can start those external actions, or explicitly authorize a later run to do so.

## Execution brief 1 — STQ-RM-001: authoritative sales and context

**Mission.** Correct the reproduced Business Pulse projection without changing authoritative historical transactions. Preserve the existing analytical context and current daily-sales improvements. Deliver a source-linked finalized POS-sales result first, then prove remaining declared sales channels and related callers.

**Starting evidence.** [Sales analytics service](<E:/ohada saas/Focused projects/stoquify/services/analytics/sales-analytics.service.ts>); [analytical context contract](<E:/ohada saas/Focused projects/stoquify/services/analytics/analytical-context-contracts.ts>); [new daily-sales read service](<E:/ohada saas/Focused projects/stoquify/services/analytics/daily-sales-read.service.ts>); [local-day helper](<E:/ohada saas/Focused projects/stoquify/services/analytics/daily-sales-period.ts>); [authoritative POS owner](<E:/ohada saas/Focused projects/stoquify/services/pos/pos.service.ts>). The source-hashed reproduction returns 1,000/2 for completed 100 plus unfinished 900, and the production composition defaults to XAF/server day. The normalizer already exists; replacing it is outside scope.

**Execute.** Refresh the listed files and current owner changes. Trace each metric to sale/payment/return event, status and effective date. Reuse AN-D04/AN-D12 policy questions and agree an explicit currency/rounding/time contract with Finance. A complete POS sale and a confirmed sales order may represent different facts; do not install a blanket status filter across every channel. Add the missing fixture, then bind the context resolver, exact aggregate and source policy in the smallest affected service/caller set. Represent missing facts as unavailable, not zero or an arbitrary currency. Update only directly affected display labels/state. Record source hashes and old/new fixture output.

**Acceptance.** Completed 100 + draft 900 + cancelled 700 = finalized POS sales 100, one transaction. Return/refund handling is explicit and cannot double-subtract. Tenant midnight/DST and cross-period corrections tie to effective source dates. XAF/XOF never mix. Decimal precision survives aggregation. Foreign locations and stale/duplicate evidence fail safely. Historic records remain unchanged. Finance reviews the declared semantics independently of the implementing engineer.

**Existing verification command, from the workspace:**

```text
node node_modules/jest/bin/jest.js --roots services --runInBand --runTestsByPath services/analytics/__tests__/business-pulse.service.test.ts services/analytics/__tests__/analytical-context-contracts.test.ts services/analytics/__tests__/daily-sales-read.test.ts
```

Add only missing recognition/return/query-boundary/integration cases. The existing Business Pulse shape tests are insufficient on their own. Save source binding, exact test receipt, reviewed metric policy and source tie-out under a new implementation evidence folder for STQ-RM-001. No broad build or migration is needed for a read-model correction unless actual discovery proves otherwise.

**Completion / recovery.** Engineering completion means the bounded changes and developer tests exist. Validated means the required database/caller/permission and Finance review evidence exists. Pilot/production require the later applicable gates. Disable a misleading derived metric if necessary; do not roll back to known false totals or alter the ledger to match the dashboard. Escalate a missing authoritative event as a specific contract gap, not permission to invent one.

## Execution brief 2 — STQ-RM-002: analytics access enforcement

**Mission.** Bind the three existing analytics routes and their feeding actions/exports to durable module authority before data access. Preserve the current managed grant and navigation system.

**Starting evidence.** [analytics wrapper](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/analytics/analytics-route-access.tsx>); [surface catalog](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/analytics/analytics-route-data-access.ts>); [entitlement authority](<E:/ohada saas/Focused projects/stoquify/services/modules/module-entitlement.service.ts>); [server authorization helpers](<E:/ohada saas/Focused projects/stoquify/lib/security/server-authz.ts>). The current wrapper performs RBAC and calls its data callback without the module check. The reproduction is bounded synthetic source evidence, not a live exploit.

**Execute.** Inventory the three catalog routes, direct navigation, feeding actions, APIs and exports; document the exact module slug and allowed read/write/retained behavior for each. Reuse the existing guard semantics, including current managed grants, organization scope and invalidation. Place the guard before service reads, not solely in Sidebar. Preserve lawful retained exports through their own authority. Add scoped negative tests and render useful module-locked/denied states. Never globally flip every observe-mode surface or grant access directly from a provider/billing event.

**Acceptance.** Enabled, absent, disabled, expired, read-only and wildcard-RBAC scenarios match the reviewed matrix. Every denial causes zero downstream reads and no export leakage. Organization switching and stale session/grant state cannot retain authority. Legitimate permitted behavior still works. Financial record retention survives plan changes, and billing replay cannot grant independent authority.

**Existing verification command:**

```text
node node_modules/jest/bin/jest.js --roots services --runInBand --runTestsByPath services/modules/__tests__/module-entitlement.service.test.ts services/modules/__tests__/module-transport.integration.test.ts
```

Add wrapper/action/export tests for the actual entries and candidate-bound authenticated negative cases in an isolated environment. Reuse the tests' real permission/tenant/module chain with mocked persistence only where appropriate; then distinguish that evidence from real deployed behavior. Record a route/action/export access matrix with exact source versions and reviewer.

**Completion / recovery.** Security and platform product review the access/retention contract. A passing module unit suite does not prove an untested route is guarded. If compatibility fails, pause the changed entry or restore a previously safe guarded path; do not restore an access bypass. Leave unrelated module lifecycle code with its active owner.

## Execution brief 3 — STQ-RM-003: qualified country review preparation

**Mission.** Make the external country decision concrete and reviewable for one Cameroon employer profile and effective period. This package prepares evidence and tracks the decision; it does not grant approval or publish a pack.

**Starting evidence.** [static country registry](<E:/ohada saas/Focused projects/stoquify/services/regulatory/country-packs/registry.ts>); [fail-closed evaluator](<E:/ohada saas/Focused projects/stoquify/services/payroll/payroll-tax-rule-evaluator.ts>); [statutory readiness check](<E:/ohada saas/Focused projects/stoquify/scripts/statutory-country-pack-production-gate.js>); [fresh 11/12 blocked result](<E:/ohada saas/Focused projects/stoquify/what-next/2026-09-06-stoquify-enterprise-roadmap-evidence/statutory-readiness.md>). CM is the inspected static entry; deployed database coverage is unknown. Two captured artifacts and source hashes do not substitute for qualified approval.

**Execute.** Inventory exact rules, source documents, effective dates, exceptions, pack hashes, current review records and support assumptions without reading secrets. Prepare a rule-to-source-to-expected-result matrix and define employer/profile exclusions. Name the human qualified reviewer and internal Payroll owner when actually known; otherwise record the role and pending appointment. Include approved inputs, freeze/calculate/review/approve, net pay/payslip, posting, settlement and declaration receipt examples. Plan two cycles and a corrected payslip scenario. Start provider/sandbox evidence intake in parallel. Preserve unsupported and review-required behavior.

**Acceptance.** A complete review packet identifies source/version, scope, expected cases, unresolved questions, responsible reviewer and required decision evidence. The reviewer response is recorded only when received and bound to the reviewed version. Missing, expired or rejected approval remains blocked. A traceable preparation handoff can be complete while the external approval gate remains pending; package 015 may not claim reviewed production support until its exact external evidence exists.

**Safe existing unit baseline:**

```text
node node_modules/jest/bin/jest.js --roots services --runInBand --runTestsByPath services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts
```

For a fresh static report, inspect the script and use a **new** output directory before running:

```text
node scripts/statutory-country-pack-production-gate.js --mode fail --out <new-evidence-directory>/statutory-readiness.md --json-out <new-evidence-directory>/statutory-readiness.json
```

The placeholder must be replaced with the actual new implementation evidence path; it is intentionally not a command to overwrite this roadmap's evidence. A blocked result is expected until real source-artifact expert approval exists. No source-check flag, seed user, timestamp or signature may be manufactured. Save the review packet, applicability matrix, open-issue register, reviewer response when available, and two-cycle plan. Qualified review waiting time is separate from the package's 0.5/1/2 engineer-week preparation estimate.

## Day-30 review packet and next-run instructions

Each owner provides the actual diff, source/environment binding, acceptance results (passed/failed/skipped/blocked), unresolved questions, reviewer record and safe recovery procedure. Update a new execution record; preserve the audit and this planning baseline. No old passing suite or broad scan marks unvisited paths complete.

At day 30, report 001/002 independently as complete, partial or blocked with exact evidence; report 003 preparation and external approval separately. Record actual time spent and remaining estimate, recruitment/sample progress, provider/delivery status and ownership conflicts. Re-estimate days 31–90 rather than pretending slippage never occurred. Source changes made concurrently must be reconciled before the next package starts.

The next run should select the first package with satisfied hard prerequisites, required scope decisions and an available owner/WIP slot, read its full JSON contract, execute only its slice, and preserve linked validation/rollback artifacts. A source-only design package does not permit deployment. The roadmap is complete when these four planning artifacts validate; the system hardening program is complete only after execution and its required rollout/value decisions.
