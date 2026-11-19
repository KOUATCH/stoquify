Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# AF16: Integration, release assurance and measured pilot

## Mission and boundaries

Implement **Integration, release assurance and measured pilot** using Stoquify's current functionality. Priority: **P0 release gate; run after AF08, then rerun for expansion**. Accountable delivery disciplines: QA/release + IAM/data + accounting owner + operations. Planning estimate: 5–10 engineer-days technical assurance; two monthly pilot cycles separately; re-estimate after inspection, and do not treat this as an approved calendar commitment.

Prerequisites: AF01 — Portfolio reliability — current proof and complete coverage; AF02 — Portfolio reliability — actionable bilingual UI; AF03 — Firm engagements — domain contract and additive schema; AF04 — Firm engagements — authorization and lifecycle services; AF05 — Firm engagements — setup, staff assignment and handover UI; AF06 — Delegated evidence work — complete the firm-to-client loop; AF07 — Reconciliation inputs — provider formats and account coverage; AF08 — Review workpapers and readable close deliverables

Run this phase after AF01–AF08 for the first release cut, before AF09–AF15. Repeat it against an explicitly expanded RELEASE_SCOPE after any optional phase is included. Technical preparation is not a completed live pilot.

Baseline observation from the 19 October 2026 audit: The earlier audit passed 100 mocked/component tests, but supplied no new real-database or current authenticated-browser proof. Those old results do not qualify changed code.

Inspect prerequisite outputs and current code. If a prerequisite is already implemented without a result file, validate its relevant contract and record evidence instead of rebuilding it. If a required contract is genuinely missing, complete safe discovery/design work and identify the specific prerequisite; do not silently implement multiple phases.

## Evidence and reuse targets

Start with these existing paths, then follow their actual callers, data models and tests:

- [docs/ecc/WORKFLOW.md](<E:/ohada saas/Focused projects/stoquify/docs/ecc/WORKFLOW.md>)
- [docs/ecc/command-registry.json](<E:/ohada saas/Focused projects/stoquify/docs/ecc/command-registry.json>)
- [docs/ecc/test-lanes.md](<E:/ohada saas/Focused projects/stoquify/docs/ecc/test-lanes.md>)
- [docs/release/ARTIFACT_SCHEMA_PROMOTION.md](<E:/ohada saas/Focused projects/stoquify/docs/release/ARTIFACT_SCHEMA_PROMOTION.md>)
- [services/accounting/__tests__/accountant-work-desk.service.test.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/__tests__/accountant-work-desk.service.test.ts>)
- [components/accounting/__tests__/AccountantWorkDesk.test.tsx](<E:/ohada saas/Focused projects/stoquify/components/accounting/__tests__/AccountantWorkDesk.test.tsx>)
- [tests/e2e/close-assurance-authenticated-smoke.spec.ts](<E:/ohada saas/Focused projects/stoquify/tests/e2e/close-assurance-authenticated-smoke.spec.ts>)

Data/change boundary: Test additive upgrade/legacy-to-managed enrollment on disposable databases only. Production rollout is a separate authorized operation.

## Ordered implementation tasks

1. Create RELEASE_SCOPE.md for an existing-client firm pilot containing AF01–AF08. AF09–AF15 are not prerequisites unless included in a named expansion. For each included phase verify current source/results, unresolved dependencies and evidence class; never inherit historical green status.

2. Exercise synthetic firm manager/preparer/reviewer/client owner journeys across portfolio, engagement consent/assignment, evidence request/response/acceptance, supported statement import, workpaper and export.

3. Test schema upgrade, legacy/unlinked compatibility, explicit enrollment, inactive users, grant/assignment revocation and expiry, concurrent suspension versus acceptance/export, duplicate commands, source changes, evidence staleness and privacy across client boundaries on a disposable PostgreSQL target.

4. Run controlled browser checks for EN/FR, desktop/mobile, keyboard/focus, error/partial/denied/locked states and uncertain recovery. Record actual routes, fixture roles, source revision and screenshots/traces. No live client data or outbound messages.

5. Measure portfolio query/fan-out bounds and worker backlog/recovery using representative synthetic loads. Agree measured latency/error budgets with the product team; do not fabricate performance success thresholds after the run.

6. Prepare staged rollout, rollback, support and incident runbooks. Disabling a feature must never cause managed grants to bypass engagement restrictions. Verify artifact/schema separation and existing release gates; do not deploy or promote production schema.

7. Prepare the two-cycle pilot protocol: proposed 3 firms and 5–10 existing clients each, baseline touches/work time/client waiting/rework/close time and meaningful repeat work. Recruitment, messages, production activation and real user enrollment require a separate explicit request.

8. Emit a GO/NO-GO matrix for the exact release scope, named missing evidence and owners. If only local preparation is complete, say PILOT_PREPARED, not PILOT_PASSED. Keep observation and paid-retention results pending until actually collected.

## Acceptance criteria

- **AF16-AC1:** Every included phase passes its required current unit/DB/browser/artifact checks, or release is explicitly NO-GO with the gap.
- **AF16-AC2:** End-to-end fixtures show truthful portfolio state, preserved consent and independent evidence review.
- **AF16-AC3:** No cross-client disclosure, false current-proof state, duplicated financial effect or permissive rollback in acceptance scenarios.
- **AF16-AC4:** Runbooks and rollback are rehearsed; schema promotion remains separate from builds.
- **AF16-AC5:** Pilot metrics have definitions and a baseline collection plan; measured baselines/results and pending observations are distinguished, and proposed targets never substitute for actual results.

Design tests around these behaviors, including the failed and denied paths, not around copying implementation details. Add the specific evidence to each criterion in RESULT.md.

## Non-goals

No automatic rollout, client recruitment/outreach, production migration, real financial operation or claim that a prepared pilot ran.

## Rollout and rollback

Introduce only this phase's owned slice behind the existing rollout mechanism where needed. Keep old consumers compatible until the corresponding slice is ready; do not invent a new flag framework. Name the activation preconditions, observable failure signals, safe fallback and data-retention impact in RESULT.md.

Use the existing release mechanism to stop new work while retaining restrictive managed authorization, existing obligations and retained evidence. Roll back additive code compatibly; no destructive data reversal.

## Required outputs

RESULT.md, RELEASE_SCOPE.md, GO_NO_GO.md, PILOT_PROTOCOL.md, ROLLBACK_RUNBOOK.md and current test/performance/browser evidence

Use the existing repository conventions for implementation files and tests. Canonical phase evidence belongs in `docs/accounting-firms/roadmap-2026-10-19/execution/AF16/`; planned artifact names above are new outputs, not claims that those files already exist.

## Operating contract

- Work in `E:/ohada saas/Focused projects/stoquify`. Execute this phase only. Implement the smallest complete slice, verify it, and record the result; do not automatically start another phase, deploy, commit, push, create a PR, send messages, charge customers, or enroll real pilot users.
- Read the applicable `AGENTS.md`, `docs/ecc/WORKFLOW.md`, `docs/ecc/skill-routing.md`, and this package's `02_EXECUTION_CONTRACT.md`. Inspect the relevant current source, tests, recent local work and prerequisite phase results. Use existing `graphify-out/` graphs only after checking freshness against source; do not regenerate them implicitly.
- The report is a dated starting point, not authority over current implementation. Classify each requested behavior as implemented, partial, missing, risky, or deliberately deferred. If another change already solves it, validate and reuse it. Do not duplicate working services, tables, screens, events, permissions or controls.
- Preserve unrelated working-tree edits. Identify owned files/hunks before changing code; adapt to overlapping changes without reverting them. Keep the service-owned contract and business logic ahead of UI. No unrelated refactoring or dependency upgrades.
- Review architecture, backend/domain/integration, database/migration, IAM/security/privacy, frontend/design, workflow/accessibility/localization, product/process, QA/release, SRE/operations/performance, and SaaS/packaging/customer-success implications. Apply accounting/evidence and country/AI lenses where material. These are responsibilities of this executor, not authorization to spawn agents.
- Reuse protected actions, trusted actor context, organization identity, existing role/permission conventions, module entitlements/retention, business events/outbox, safe errors/correlation and domain-owned transactions. Client IDs, cursors, UI state, engagement labels and caches are never authority. Recheck current authority at the sensitive read/write/export boundary.
- A firm assignment must not grant client access by itself. Managed engagement access requires the active named-accountant mandate plus the applicable engagement and assignment restrictions. Preserve independent reviewer/maker-checker and fresh-auth requirements in each domain; a PREPARER or REVIEWER label does not automatically authorize journal posting, payment, filing or reconciliation signing.
- Current users have one home organization and globally unique email. Preserve that identity model. Do not move users between organizations, create duplicate accounts to bypass uniqueness, or introduce a second authentication/membership system.
- Any financial change belongs to its existing domain writer, with currency/decimal/date semantics, idempotency, audit evidence and source-revision invalidation. Do not write balances directly or resolve a blocker merely because a document was uploaded. Preserve historical evidence, explicit uncertainty and separate business approval.
- For UI changes, read `design-system/stoquify/MASTER.md` and the relevant page contract. Reuse existing shell and command-center primitives. Cover English/French, keyboard access, narrow layouts, loading, empty, stale, denied, module-locked, partial and retry states. Keep financial decisions and authorization server-side.
- For new country rules, re-check official primary sources as of implementation, record jurisdiction/effective dates and obtain the required qualified review before production support claims. Sandbox/manual evidence must never be described as live authority filing.
- Make routine reversible implementation decisions and record the reason. Ask only for genuinely missing consequential business decisions or authority; continue independent work. Missing database/browser/provider access is a verification limitation, not permission to claim success.

## Verification and completion rules

1. Before running a script, inspect its current definition, hooks/imports and `docs/ecc/command-registry.json`. Start with `npm run agent:workflow:check`. An unclassified command requires side-effect review. Do not alter registry hashes just to make a check pass.
2. Select focused existing test lanes and add meaningful regressions for changed behavior. Record exact commands, exit codes, fixture scope and limitations. Do not invent script names or run every package command.
3. Separate source inspection, mocked/pure unit tests, component/jsdom checks, real PostgreSQL tests, rendered browser checks and artifact inspection. Old report results are historical evidence, not proof of this implementation.
4. Use reviewed synthetic fixtures and an explicitly identified disposable database for migration, concurrency and financial-write tests. Never infer that a configured application database is disposable. No production schema promotion, destructive reset or real client mutation is authorized by this prompt.
5. `npm run build` loads application configuration and writes output; it is not a read-only validation. Schema promotion is a separate mutating release operation. Run only checks justified by this phase and the reviewed environment.
6. If required real-database/browser/expert evidence is unavailable, finish independently safe code and focused tests, name the exact missing evidence, and mark the phase `IMPLEMENTED_UNVERIFIED` or `BLOCKED` as appropriate. Do not call it complete or release-ready.
7. Save phase results under `docs/accounting-firms/roadmap-2026-10-19/execution/AF16/`, replacing AF16 with this phase ID. Keep run-specific evidence in a timestamped subdirectory; `RESULT.md` points to the latest run without erasing prior evidence. Update only this phase's row in `STATUS.md` and any explicit release-scope decision.
8. Report source revision plus relevant dirty-tree context; changes and reuse decisions; actual file/line evidence; each acceptance criterion as pass/fail/not-verified; commands/results by evidence class; migration/rollout/rollback instructions; unresolved dependencies; and the smallest justified next phase. Include a short follow-up under `what-next/` linking to the canonical phase result.
9. Finish when all acceptance criteria have evidence and required checks pass, or when all independent authorized work is done and a precise external blocker is documented. A plan, scaffold, mocked test or screenshot alone does not establish end-to-end completion.

