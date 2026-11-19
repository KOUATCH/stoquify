# Execution contract for the accounting-firm roadmap

**Version:** 19 October 2026. **Scope:** AF01–AF16 prompts in this directory.  
**Repository:** `E:/ohada saas/Focused projects/stoquify`.  
**Source report:** [00_SOURCE_REPORT.md](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/00_SOURCE_REPORT.md>).  
**Roadmap:** [01_IMPLEMENTATION_ROADMAP.md](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/01_IMPLEMENTATION_ROADMAP.md>).

## Authorization and ordering

Preparing this package does not execute any implementation prompt. A later instruction to execute a phase authorizes that phase's reversible local implementation and appropriate reviewed verification. It does not automatically authorize deployment, schema promotion, production mutations, outreach, charges, commits, PRs or another phase.

Default order is AF01–AF08, AF16 core qualification, then selected AF09–AF15 and AF16 again for expanded scope. Follow the explicit dependency table. Do not request routine confirmation for decisions already covered by the selected prompt.

## Source and conflict policy

The report describes a dirty local candidate on 19 October 2026. Refresh HEAD, local edits, contracts and prerequisite evidence when executing. Source supersedes report descriptions when behavior has changed. Record the difference. Prefer validating existing functionality to rebuilding it.

Do not overwrite concurrent work or change unrelated lint failures. Inspect overlapping ownership before edits. Database/UI/permission contracts must be coordinated as one phase slice without moving unrelated changes into it.

## Status model

| Status | Meaning |
|---|---|
| NOT_STARTED | Prompt prepared; no implementation evidence |
| IN_PROGRESS | Owned phase work is active |
| IMPLEMENTED_UNVERIFIED | Code exists but one or more required acceptance/evidence lanes are missing |
| BLOCKED | A named dependency or external requirement prevents the remaining work; independent work is finished |
| VERIFIED | Every applicable phase acceptance criterion has current evidence; does not imply production rollout |
| DEFERRED | Explicit scope decision keeps the optional phase out; not a pass |

Do not equate a missing result file with missing code. Inspect and validate existing work first. Do not mark a phase VERIFIED merely because unit tests pass. If a criterion becomes immaterial, justify it in a scope decision rather than silently deleting it.

AF16 separately records `GO_TECHNICAL` or `NO_GO`, and pilot state `NOT_STARTED`, `PILOT_PREPARED`, `PILOT_RUNNING` or `PILOT_COMPLETED`. Every decision names the exact included phases/build and evidence. Release qualification never means production was deployed.

## Phase result template

Store `execution/AFxx/RESULT.md` with links to timestamped run evidence. Preserve earlier runs. Include:

1. **Identity:** phase, timestamp, commit, relevant dirty-tree state, executor and explicit scope.
2. **Prerequisites:** required contracts/results, validation and deviations from the audit.
3. **Owned changes:** files/hunks and why existing services were reused or narrowly extended.
4. **Acceptance matrix:** every AFxx-ACn as pass, fail or not-verified, linked to exact source/test/artifact evidence.
5. **Verification lanes:** source inspection; mocked/pure tests; component/jsdom; PostgreSQL; browser/accessibility; rendered exports; qualified country review where applicable. Record actual command, result, fixture scope and limitations.
6. **Data and controls:** authorization and entitlement matrix, migrations/backfills, transaction/idempotency implications and retained history.
7. **Operations:** activation criteria, bounded performance evidence, failure signals, support ownership, safe rollback and recovery.
8. **Outcome:** status, unresolved items with responsible discipline, exact missing evidence and smallest justified next phase.

Keep secrets, real client records, private documents and employee data out of evidence artifacts. Use synthetic fixtures and redact logs/screenshots.

## Shared implementation and verification rules

The following is reproduced in each prompt so it remains usable when copied on its own.

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
7. Save phase results under `docs/accounting-firms/roadmap-2026-10-19/execution/PHASE_ID/`, replacing PHASE_ID with this phase ID. Keep run-specific evidence in a timestamped subdirectory; `RESULT.md` points to the latest run without erasing prior evidence. Update only this phase's row in `STATUS.md` and any explicit release-scope decision.
8. Report source revision plus relevant dirty-tree context; changes and reuse decisions; actual file/line evidence; each acceptance criterion as pass/fail/not-verified; commands/results by evidence class; migration/rollout/rollback instructions; unresolved dependencies; and the smallest justified next phase. Include a short follow-up under `what-next/` linking to the canonical phase result.
9. Finish when all acceptance criteria have evidence and required checks pass, or when all independent authorized work is done and a precise external blocker is documented. A plan, scaffold, mocked test or screenshot alone does not establish end-to-end completion.

