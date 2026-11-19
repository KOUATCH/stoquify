# Execution prompt 3 — P03 sealed accountant-grant recovery

Repository: E:/ohada saas/Focused projects/stoquify
Plan: E:/ohada saas/Focused projects/stoquify/plans/stoquify-production-readiness-2026-10-28/ROADMAP.md
Machine register: E:/ohada saas/Focused projects/stoquify/plans/stoquify-production-readiness-2026-10-28/work-register.json
Verification recipes: E:/ohada saas/Focused projects/stoquify/plans/stoquify-production-readiness-2026-10-28/verification-recipes.md
Read AGENTS.md, docs/ecc/WORKFLOW.md, docs/ecc/command-registry.json and relevant current domain controls before acting. All relative paths below are relative to this repository.

Preserve unrelated changes. Inspect the current checkout: the plan recorded HEAD 80e4abb283216b9f8e04b94e5020393f7dcabf62, but HEAD alone excludes local changes. Do not reset, stage everything, commit, push, create a PR, change production flags or deploy. GitHub CLI was unauthenticated at planning time; do not claim remote enforcement.
Review actual command definitions, lifecycle hooks, runners/imports/config and target effects before execution. Start verification with npm run agent:workflow:check after that review. No production or .env-inferred database target. Keep source, mocked, native DB, authenticated browser, actual provider and operator proof separate.
Use actual installed tools/skills; do not assume a slash-command runner exists. For an engineering task, plan the bounded change, review it and verify its acceptance. Independent read-only review is authorized for this package using the actual collaboration API. If the work requires multiple independent fixes, add child packages with dependencies before implementation.
Record candidate, owned files, exact checks/results/skips, cleanup, limitations and recovery. Update only this package and necessary cross-references in the programme/domain registers. Other packages stay pending.

Execute P03 after P01/P02 prerequisites and a reviewed disposable reproduction recipe. Scope is the saved grant pending state and subsequent password-confirmation interruption, followed by its focused grant/recovery qualification.

Read:
- docs/accounting-firms/roadmap-2026-10-19/execution/AF16/SEALED_ENGAGEMENT_BROWSER_2026-10-28.md
- Its retained request timeline, browser failure and committed-grant readback (do not expose private credentials)
- components/accounting/AccountantAccessManager.tsx
- components/accounting/FirmEngagementWorkspace.tsx
- actions/accounting/accountant-access.actions.ts
- services/accounting/accountant-access.service.ts and accountant-client-invite.service.ts
- scripts/verify-firm-engagement-browser.cjs and referenced fixture/startup/recovery runners
- Approved design master and relevant accountant/access page contracts
- docs/release/ARTIFACT_SCHEMA_PROMOTION.md

Context:
The sealed artifact eoW9-NZPj4rd9OHTZxMDM recorded a committed preparer grant and success message while the button remained Saving. Reload restored the form; a subsequent reviewer grant/password flow timed out with an aborted POST. Root cause is not established. Lifecycle, localized/mobile and recovery matrices were not reached in that attempt.

Tasks:
1. Preserve original sealed artifact, failure receipts and diagnostic clone. Use fresh uniquely owned disposable fixtures for new attempts; inspect preparation, seeding, startup and cleanup before running.
2. Trace request completion, action result, fresh-auth state, transition/refresh behavior and local proxy without recording secrets. Compare controlled direct-origin and proxy behavior where the harness safely permits.
3. Reproduce before assigning cause. Do not fix by increasing timeouts, weakening assertions, bypassing consent/fresh-auth or replaying a committed grant with a fresh identity.
4. If an application defect is proven, change only the responsible component/action/owner and add focused before/after regression. If only a harness/proxy defect is proven, repair that layer and preserve application behavior.
5. A changed application requires a separately identified replacement candidate and reviewed isolated build/artifact preparation. Never edit the sealed artifact in place. Use only authorized local synthetic environments; no deployment or schema promotion.
6. Verify grant completion, next grant, password expiry/recovery, role/tenant denial and uncertain response recovery. Read back durable grants to prove one intended effect.
7. Obtain independent review; rerun affected checks and record fixture/server cleanup. Hand off the wider AF lifecycle/export matrix to P25 once grant entry is reliable.

Exit criteria:
- Saved-grant outcome is truthful and pending state resolves.
- Reviewer grant/step-up has a proven complete or actionable failure path.
- Unknown outcomes recover retained identity without duplicate grants.
- Current authority, consent and independent roles remain enforced.
- Source/artifact/fixture identities, failed and passing evidence and limitations are retained.

If reproduction does not identify a cause, report precise remaining evidence and keep P03 open; do not invent a patch. Do not proceed to AF11 as though AF03–AF05 passed.
