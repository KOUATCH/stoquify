# Common execution contract

Applies to every prompt in this pack. Read this file and VERIFICATION_GUIDE.md before executing a prompt. The prompt authoring task did not execute any P01–P24 implementation work.

## Mission and authority

Build the roadmap in bounded slices. Executing a specific prompt authorizes its described local work, not later prompts, deployment, customer contact or live financial operations. Use available tools; do not assume `/plan`, `Task`, or another harness exists. The multidisciplinary prelude defines review lenses for one agent; it does not require spawning agents. Delegate only when the user or applicable instructions explicitly authorize it.

Core review lenses in every prompt: platform architecture; domain/backend/integration; data/migration integrity; security/IAM/privacy; frontend/design-system; workflow/accessibility/localization; product/business process; QA/release assurance; SRE/operations; SaaS packaging/support. Apply finance, OHADA/country, audit/records, POS/offline, AP, payroll, payments, close/accountant, analytics, AI, API/events and change-management lenses only where relevant. Mark immaterial lenses not applicable with a short reason, without performing unrelated audits.

## Start each run

1. Read AGENTS.md, docs/ecc/WORKFLOW.md, docs/ecc/skill-routing.md, the source roadmap, this contract, VERIFICATION_GUIDE.md and the selected prompt. Inspect current status/diff and relevant existing evidence; the 12 October 2026 roadmap describes an earlier dirty checkout, not guaranteed current behavior.
2. Read predecessor RESULT.md files in `docs/retention/execution/Pxx/` and their artifacts. Verify current hashes/revision and actual acceptance evidence. A predecessor's existence or a green status label is insufficient. Do not mark absent records passed. P01 has no predecessors.
3. If a predecessor is partial, perform only demonstrably independent discovery/fixture work; do not guess its missing contract or implement dependent behavior. State exactly what is missing and continue unrelated authorized work. Checkpoint/gate prompts must still produce a blocked/partial decision when dependencies are incomplete.
4. Inspect relevant existing graphs and graph freshness. Use nodes/communities to navigate, then validate current source. Useful inherited service nodes: commitPOSSale community 20, postPOSStockIssue community 9, exportClosePack community 22. The graph refresh is dated 9 August 2026; do not regenerate it implicitly. Search relevant what-next/ and innovation/ reports only as context, not current proof.
5. State owned files, smallest acceptance criteria, verification classes and non-goals. Reuse current domain owners and tests. Preserve all unrelated work, including other agents' changes if present. Do not fix unrelated lint warnings, reset Git, stage, commit, install dependencies or upgrade frameworks unless separately requested.
6. Inspect verification definitions, lifecycle hooks, configuration, imports and environment effects. Start with the reviewed workflow check. A refusal requires side-effect review; do not bypass it with an equivalent direct invocation or blindly refresh hashes.

## Implementation boundaries

- Server-owned actor/organization, related-resource scope, fresh auth, RBAC, module entitlement, review separation, idempotency, monetary precision, period controls, evidence and safe errors remain authoritative.
- UI work requires design-system/stoquify/MASTER.md and the applicable page contract. Reuse approved tokens/components; inspect a focused project UI/UX skill when useful. Cover truthful loading, empty, denied, error, uncertain and recovery states, FR/EN and keyboard/focus. No UI-only business truth.
- Schema changes are permitted only when necessary to the selected implementation prompt. Document necessity, domain ownership, data compatibility, migration/replay tests and rollback/forward correction. Do not apply migrations against an inferred or shared target. A documented proposal is not proof a migration ran.
- Use synthetic fixtures by default. Never rely on ambient DATABASE_URL or a wrapper's .env fallback to select a test target. Inspect destructive setup/cleanup, local host, database/schema name and ownership before DB mutation. Local disposable tests within the requested scope need no redundant approval once target safety is established; production/shared or destructive user-data work needs explicit authority.
- Do not contact customers, providers or regulators; send messages; use sensitive production records; alter live billing/payments; deploy; or submit filings unless specifically authorized. Prepare a concrete packet and continue independent work when external authority is missing. Merely reading a prompt does not approve its future external steps.
- Do not create exit friction: preserve authorized customer access, meaningful exports and correct cancellation semantics. Do not weaken role-appropriate redaction or export secrets.
- When material legal/tax/provider assertions are needed, verify current primary sources and record applicability/effective period. A source link, test, registry flag or model opinion is not qualified review or certification.

## Scope and continuation

Do not turn one prompt into the entire roadmap. If its estimated scope exceeds one run, deliver a coherent narrow slice, record residual acceptance items and give the exact continuation instruction. Never report the full prompt complete when only the first slice is implemented. If existing behavior already satisfies the mission, verify and document it instead of manufacturing a feature. If a blocked dependency prevents meaningful implementation, produce the requested evidence/decision with the precise blocker rather than rewriting unrelated code.

## Required artifacts and completion record

For Pxx, save its named artifacts and `RESULT.md` under `docs/retention/execution/Pxx/`. These directories are future execution outputs; this prompt pack does not prepopulate them. Put actual reusable fixtures and tests in the appropriate existing module, not in a documentation-only simulator. Keep temporary logs/screenshots in a task-owned directory; link durable sanitized evidence as needed. Do not overwrite prior evidence: preserve prior runs or append dated runs.

RESULT.md must contain:

1. Prompt ID; source revision and relevant dirty-diff/fingerprint scope; run date; exact owned files changed.
2. Objective, implementation state, reused components, assumptions and decisions; explain any changed scope.
3. Each acceptance criterion with PASS / FAIL / PARTIAL / BLOCKED / NOT_RUN / NOT_APPLICABLE and its evidence link. A not-applicable decision requires a reason.
4. Verification rows: source inspection (S), mocked/pure/component tests (M), real database tests (D), rendered/browser/device checks (B), provider/authority operation (P), observed customer outcomes (C), qualified expert review (E), operational restore/load evidence (O). For each: exact command/procedure, current config, environment/fixture identity without secrets, date, suite/case counts, exit/result and limitation. Zero tests or skipped suites are never PASS.
5. Unresolved risks, external decisions, missing environment, source drift and recovery/rollback notes. Explain whether remaining work blocks the prompt, a later gate, or only a broader claim.
6. Metrics added or affected and their definitions; no invented baselines, churn, compliance, customer satisfaction or production readiness.
7. Exact next action, dependency handoff and continuation scope. Update only this prompt's row in `docs/retention/execution/STATUS.md`, linking RESULT.md; gate prompts may additionally update their own decision row. Do not mark downstream rows complete.

Prompt implementation completion and release readiness are different. All mandatory acceptance checks for the requested slice must pass before reporting it complete. A prepared research packet can be complete with explicitly unresolved external questions when its acceptance says so; a runtime/release claim cannot be complete with required runtime evidence missing. Gate A/B/C/D require their own owner decisions and evidence.
