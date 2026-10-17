Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P04 — Establish access and recovery prerequisites

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Map actual trust boundaries, fix a reproducible narrow access defect if found, and prepare a usable recovery proof plan for later rehearsal.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 1–30**; roadmap mapping: **R06; Gate A foundation**.
- Accountable role: **Platform/security engineer**. This is a responsibility, not an assigned person.
- Indicative effort: **2–3 engineer-days; low confidence until environment discovery**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P01](01_BASELINE_AND_PILOT_SCOPE.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `lib/security/rbac.ts`
- `services/_shared/protect.ts`
- `services/operating-access/operating-access-scope.service.ts`
- `services/accounting/accountant-access.service.ts`
- `services/modules/module-entitlement.service.ts`
- `scripts/prisma-local-restore-rehearsal.js`
- `services/assurance/assurance-incident.service.ts`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Trace server-owned actor/organization, related-resource ownership, active membership, location scope, module entitlement and artifact/download permissions for the pilot paths. Include expired/revoked accountant grants and background exports.
2. Add or strengthen focused negative tests for a second tenant/location, revoked access and read-only/export distinctions. Repair only defects demonstrated by the scoped cases, preserving existing authority helpers.
3. Inspect backup, attachment storage, worker and restore tooling from nonsecret repository metadata. Distinguish local-only rehearsal tooling from deployed backup operation. Record unestablished RPO/RTO and all external dependencies.
4. Prepare a restore protocol with explicit disposable target identity, synthetic fixture inventory, attachment/hash checks, worker recovery and containment/rollback steps. Review the actual script’s source guard and cleanup without running it on an inferred environment.

## Acceptance criteria

- [ ] The trust matrix maps every pilot path to server authority and a specific denial case.
- [ ] Any changed authority boundary has focused regression evidence and no client-supplied tenant trust.
- [ ] The recovery protocol identifies database, files and operational dependencies; the roadmap’s proposed 15-minute RPO/4-hour RTO are not reported as achieved.
- [ ] Missing deployment evidence is explicit and cannot unlock live onboarding.

## Verification steps

1. V1; V2-A for existing RBAC coverage after reviewing imports; add appropriately scoped authority tests as needed.
2. V3/V4 session revocation and artifact authorization checks remain separate runtime evidence. V5 restore execution is deferred to P17 unless an explicitly disposable target is already available and within authorization.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P04/RESULT.md`
- `docs/retention/execution/P04/ACCESS_MATRIX.md`
- `docs/retention/execution/P04/RECOVERY_PROTOCOL.md`
- `docs/retention/execution/P04/TRUST_BLOCKERS.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P04's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P05](05_CHECKOUT_UNCERTAINTY_RECOVERY.md), [P06](06_OFFLINE_REPLAY_FIRST_SLICE.md), [P07](07_GUIDED_SETUP_FIRST_SLICE.md), [P09](09_PORTABILITY_CONTRACT.md), [P10](10_COMMERCIAL_LIFECYCLE_AND_SUPPORT.md), [P12](12_DAY_30_CHECKPOINT.md), [P13](13_COMPLETE_RECONCILED_CUTOVER.md), [P15](15_ACCOUNTANT_CLOSE_JOURNEY.md), [P16](16_AUTHORIZED_ARCHIVE_IMPLEMENTATION.md), [P17](17_RECOVERY_AND_SERVICE_READINESS.md)

## Risk controls, data impact and non-goals

Own only demonstrated access fixes, their focused tests and recovery documentation. Do not expose credentials, weaken download redaction, reset any database, or change deployment settings.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
