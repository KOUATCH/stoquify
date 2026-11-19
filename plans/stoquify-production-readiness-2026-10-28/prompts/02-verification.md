# Execution prompt 2 — P02 current verification baseline

Repository: E:/ohada saas/Focused projects/stoquify
Plan: E:/ohada saas/Focused projects/stoquify/plans/stoquify-production-readiness-2026-10-28/ROADMAP.md
Machine register: E:/ohada saas/Focused projects/stoquify/plans/stoquify-production-readiness-2026-10-28/work-register.json
Verification recipes: E:/ohada saas/Focused projects/stoquify/plans/stoquify-production-readiness-2026-10-28/verification-recipes.md
Read AGENTS.md, docs/ecc/WORKFLOW.md, docs/ecc/command-registry.json and relevant current domain controls before acting. All relative paths below are relative to this repository.

Preserve unrelated changes. Inspect the current checkout: the plan recorded HEAD 80e4abb283216b9f8e04b94e5020393f7dcabf62, but HEAD alone excludes local changes. Do not reset, stage everything, commit, push, create a PR, change production flags or deploy. GitHub CLI was unauthenticated at planning time; do not claim remote enforcement.
Review actual command definitions, lifecycle hooks, runners/imports/config and target effects before execution. Start verification with npm run agent:workflow:check after that review. No production or .env-inferred database target. Keep source, mocked, native DB, authenticated browser, actual provider and operator proof separate.
Use actual installed tools/skills; do not assume a slash-command runner exists. For an engineering task, plan the bounded change, review it and verify its acceptance. Independent read-only review is authorized for this package using the actual collaboration API. If the work requires multiple independent fixes, add child packages with dependencies before implementation.
Record candidate, owned files, exact checks/results/skips, cleanup, limitations and recovery. Update only this package and necessary cross-references in the programme/domain registers. Other packages stay pending.

Execute P02 only after P01's candidate/decision/evidence register is available. If absent, establish that prerequisite first; do not silently work from the old audit HEAD.

Context:
The four audit compiler diagnostics came from before-snapshot TSX files. Those snapshots are now .txt and later public-performance evidence reports a successful scoped build. Do not apply the old fix again or claim the entire current tree passes from that historical build.

Own only a new execution/P02 evidence folder, necessary bounded verification configuration/documentation repairs and exact reproduced compiler defects. Identify specific files before editing. No feature refactoring.

Tasks:
1. Inspect current package scripts/hooks, tsconfig includes/excludes and scoped configs, especially generated type inputs and active code imported from excluded directories.
2. Review the safe direct compiler invocation. Run:
   node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
   Retain full diagnostics and real exit status outside application source.
3. If it passes, mark the old snapshot cause resolved and record current candidate proof. If it fails, isolate and reproduce each actual failure; fix only the bounded verification/application input issue needed for this package. Split unrelated feature defects into owned child tasks.
4. Inspect and run relevant safe workflow fixtures/ECC pilot tests if their current setup/imports remain appropriate. A mocked pass is not native DB or browser proof.
5. Map admitted journeys to actual unit, PostgreSQL and authenticated browser runners, including skip flags, fixture requirements and mutation effects. Do not run native DB/browser/build lanes in this baseline package.
6. Correct stale build/coverage statements only where source confirms the discrepancy. Do not broaden exclusions, disable strictness or refresh registry hashes without semantic review.
7. Obtain independent review and rerun only checks affected by changes.

Deliver:
- Compiler diagnostics/result and exact source/configuration identity.
- Check-lane matrix including missing or unresolved runners.
- Bounded patch if a current defect required one; otherwise report no code change.
- Source-bound verification and P02 status.

Done means the current required compiler/check baseline passes, or each remaining failure has an explicit child package and P02 remains pending. Never turn failure into pass by omitting inputs or reporting a formatter's exit code.
No build, dependency installation, schema changes, deployment or production flag change.
