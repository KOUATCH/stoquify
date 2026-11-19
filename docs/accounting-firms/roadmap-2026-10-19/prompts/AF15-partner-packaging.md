Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# AF15: Firm onboarding, coexistence and packaging

## Mission and boundaries

Implement **Firm onboarding, coexistence and packaging** using Stoquify's current functionality. Priority: **P3; commercial validation first**. Accountable delivery disciplines: Product/CS + modules/billing architect + integrations. Planning estimate: 4–8 engineer-days; re-estimate after inspection, and do not treat this as an approved calendar commitment.

Prerequisites: AF05 — Firm engagements — setup, staff assignment and handover UI; AF08 — Review workpapers and readable close deliverables; AF12 — Client advisory packs and outcome measurement

Program gate: review AF16's core RELEASE_SCOPE and GO_NO_GO before optional expansion. Resolve blocking core defects first unless the user explicitly changes sequencing. AF13–AF15 additionally require the demand/quality/commercial evidence stated in their tasks. Do not treat absent pilot data as positive validation.

Baseline observation from the 19 October 2026 audit: Client-to-accountant invitation and referral attribution exist. A firm-to-new-SME signup journey and firm commissions were not established.

Inspect prerequisite outputs and current code. If a prerequisite is already implemented without a result file, validate its relevant contract and record evidence instead of rebuilding it. If a required contract is genuinely missing, complete safe discovery/design work and identify the specific prerequisite; do not silently implement multiple phases.

## Evidence and reuse targets

Start with these existing paths, then follow their actual callers, data models and tests:

- [services/accounting/accountant-client-invite.service.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-client-invite.service.ts>)
- [services/communication/accountant-client-invite-worker.service.ts](<E:/ohada saas/Focused projects/stoquify/services/communication/accountant-client-invite-worker.service.ts>)
- [services/referrals/referral-attribution.service.ts](<E:/ohada saas/Focused projects/stoquify/services/referrals/referral-attribution.service.ts>)
- [services/referrals/referral-funnel-read-model.service.ts](<E:/ohada saas/Focused projects/stoquify/services/referrals/referral-funnel-read-model.service.ts>)
- [services/modules/module-entitlement.service.ts](<E:/ohada saas/Focused projects/stoquify/services/modules/module-entitlement.service.ts>)
- [docs/landing/accounting-firm-workflow-evidence-2026-10-18.md](<E:/ohada saas/Focused projects/stoquify/docs/landing/accounting-firm-workflow-evidence-2026-10-18.md>)

Data/change boundary: Reuse attribution and entitlement contracts. Do not create duplicate subscriptions, automatically enroll firms or fabricate referral commission obligations.

## Ordered implementation tasks

1. Prepare an actionable firm onboarding playbook for the current invitation direction, first client evidence loop and readable deliverable. Explain client ownership, revocation, module needs and support responsibilities.

2. Implement a narrow activation read model using actual mandate and completed-work events. Separate invitation/click/registration/acceptance from current access, useful completion and paid retention.

3. Define coexistence import/export profiles for pilot firms' actual tools; start with reconciled documented formats from AF08/AF09 rather than claiming a live integration.

4. Propose client-paid, firm-sponsored and hybrid packaging with explicit entitlement consequences, using existing module lifecycle machinery. Implement only the agreed local configuration/mock path; do not invent prices, charge users or alter real subscriptions.

5. Any firm-to-new-client creation journey is a separate scoped future decision, not a relabel of accountant invitations. Document missing contracts and defer unless explicitly added to scope by the user.

6. Test activation attribution privacy, expired mandates, duplicate events and module-locked states. Provide bilingual onboarding/support material grounded in actual implemented capability.

## Acceptance criteria

- **AF15-AC1:** Onboarding describes only implemented invitation/activation directions and required modules.
- **AF15-AC2:** Activation metrics use retained actual work evidence and cannot imply access from historical acceptance.
- **AF15-AC3:** Export/coexistence claims match tested formats.
- **AF15-AC4:** No real message, charge, subscription mutation or partner certification occurs.
- **AF15-AC5:** Commercial assumptions and conversion baselines are labelled as hypotheses until measured.

Design tests around these behaviors, including the failed and denied paths, not around copying implementation details. Add the specific evidence to each criterion in RESULT.md.

## Non-goals

No automated commissions, new billing engine, unsupported signup direction, live outreach or invented pricing.

## Rollout and rollback

Introduce only this phase's owned slice behind the existing rollout mechanism where needed. Keep old consumers compatible until the corresponding slice is ready; do not invent a new flag framework. Name the activation preconditions, observable failure signals, safe fallback and data-retention impact in RESULT.md.

Disable new activation/configuration views without changing existing entitlements or client mandates; retain attribution history.

## Required outputs

RESULT.md, FIRM_ONBOARDING_PLAYBOOK.md, PACKAGING_DECISION.md, coexistence profiles and activation tests

Use the existing repository conventions for implementation files and tests. Canonical phase evidence belongs in `docs/accounting-firms/roadmap-2026-10-19/execution/AF15/`; planned artifact names above are new outputs, not claims that those files already exist.

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
7. Save phase results under `docs/accounting-firms/roadmap-2026-10-19/execution/AF15/`, replacing AF15 with this phase ID. Keep run-specific evidence in a timestamped subdirectory; `RESULT.md` points to the latest run without erasing prior evidence. Update only this phase's row in `STATUS.md` and any explicit release-scope decision.
8. Report source revision plus relevant dirty-tree context; changes and reuse decisions; actual file/line evidence; each acceptance criterion as pass/fail/not-verified; commands/results by evidence class; migration/rollout/rollback instructions; unresolved dependencies; and the smallest justified next phase. Include a short follow-up under `what-next/` linking to the canonical phase result.
9. Finish when all acceptance criteria have evidence and required checks pass, or when all independent authorized work is done and a precise external blocker is documented. A plan, scaffold, mocked test or screenshot alone does not establish end-to-end completion.

