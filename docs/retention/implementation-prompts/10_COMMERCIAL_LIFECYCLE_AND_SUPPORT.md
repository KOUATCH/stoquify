Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P10 — Define commercial lifecycle and support policy

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Prepare a concrete, scenario-tested commercial lifecycle and support specification without conflating module selection with billing or inventing approved commercial terms.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 1–30**; roadmap mapping: **R08**.
- Accountable role: **Product/commercial owner with support and legal review**. This is a responsibility, not an assigned person.
- Indicative effort: **0.5–1 engineer-day plus business review**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P01](01_BASELINE_AND_PILOT_SCOPE.md), [P04](04_ACCESS_AND_RECOVERY_FOUNDATION.md), [P09](09_PORTABILITY_CONTRACT.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `services/modules/module-composition.service.ts`
- `services/modules/module-stop-policy.service.ts`
- `services/modules/module-entitlement.service.ts`
- `services/assurance/assurance-incident.service.ts`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Discover repository evidence of billing/support tooling and record unknown external systems. Separate platform subscriptions from customer business payments.
2. Draft trial, active, past-due, cancelled, archive and deletion-request states with roles, access/export rights, in-flight/offline work, support escalation and legal-retention questions.
3. Define a simple pilot package and willingness-to-pay research protocol, using no invented prices. Define staffed-hours and incident ownership proposals without claiming 24/7 coverage.
4. Walk proposed states through actual entitlement/stop-policy code and P09 archive requirements. Record contradictions and required decisions; create focused policy fixtures only where they can be checked without rewriting the access engine.

## Acceptance criteria

- [ ] Each lifecycle transition has an owner, trigger, business effect, data-access effect and recovery path.
- [ ] Cancellation does not require feedback and does not intentionally trap data.
- [ ] Read-only/export policy and unsupported stop behavior have explicit resolutions or blockers.
- [ ] Policies and prices awaiting owner/legal review are clearly proposed; no inferred approval appears in UI or code.

## Verification steps

1. V1; a documented scenario table covering revoked users, pending jobs, read-only plus export, cancellation and billing mismatch.
2. V2 for any pure policy fixture added. No real billing, cancellation, customer contact or deletion is executed.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P10/RESULT.md`
- `docs/retention/execution/P10/LIFECYCLE_POLICY_PROPOSAL.md`
- `docs/retention/execution/P10/SUPPORT_RUNBOOK_DRAFT.md`
- `docs/retention/execution/P10/PACKAGING_DECISIONS.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P10's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P12](12_DAY_30_CHECKPOINT.md), [P16](16_AUTHORIZED_ARCHIVE_IMPLEMENTATION.md), [P17](17_RECOVERY_AND_SERVICE_READINESS.md), [P22](22_REPEATED_TEAM_VALUE.md)

## Risk controls, data impact and non-goals

Own policy/evidence and synthetic scenarios only. Do not change billing state, entitlement enforcement or access rights until the concrete policy has the required business authority.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
