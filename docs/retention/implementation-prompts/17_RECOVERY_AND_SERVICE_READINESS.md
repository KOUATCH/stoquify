Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P17 — Rehearse recovery and implement the minimum service controls

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Produce real recovery evidence on an explicitly disposable fixture environment and make the agreed service lifecycle operationally testable.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 31–60**; roadmap mapping: **R06/R08; Gate A/B foundations**.
- Accountable role: **Platform/operations and support leads**. This is a responsibility, not an assigned person.
- Indicative effort: **2–4 engineer-days plus operational review; low confidence**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P04](04_ACCESS_AND_RECOVERY_FOUNDATION.md), [P10](10_COMMERCIAL_LIFECYCLE_AND_SUPPORT.md), [P12](12_DAY_30_CHECKPOINT.md), [P14](14_COMPLETE_DAILY_OPERATING_LOOP.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `scripts/prisma-local-restore-rehearsal.js`
- `services/assurance/assurance-incident.service.ts`
- `lib/error-handling/monitoring.ts`
- `services/modules/module-stop-policy.service.ts`
- `services/modules/module-entitlement.service.ts`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Review the complete restore runner and its dependencies. Use an explicitly named isolated local fixture target; do not derive it from ambient application credentials. Extend fixture coverage to attachments and required workers/configuration.
2. Measure restored data age and restoration time; verify counts, relationships, attachments, authorizations and safe queue resumption. Compare measured values to proposed objectives without claiming deployed backup coverage.
3. Implement only the policy-supported lifecycle gaps needed for the pilot, or document the bounded manual process with accountable operator. Handle pending offline/jobs and archive/export access deliberately.
4. Rehearse an incident from detection through triage, escalation, communications draft, correction and recovery. Record support staffing and external deployment evidence still needed.

## Acceptance criteria

- [ ] A performed restore is evidenced with sanitized target identity, timestamps, checks and exact scope; local proof is not production readiness.
- [ ] No restored queue duplicates financial work; access and attachment checks pass.
- [ ] Supported lifecycle scenarios agree with the resolved P10 policy; missing authority is blocked rather than guessed.
- [ ] Incident/runbook owner and safe pause/recovery steps are concrete.

## Verification steps

1. V1; V2 for changed lifecycle logic; V5 actual disposable restore and V3 worker/lifecycle integration checks.
2. V4 relevant archive/read-only UI; V6 operational policy review. Never execute destructive restore/cleanup against an unverified path or database.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P17/RESULT.md`
- `docs/retention/execution/P17/RESTORE_REHEARSAL.md`
- `docs/retention/execution/P17/SERVICE_READINESS.md`
- `docs/retention/execution/P17/INCIDENT_REHEARSAL.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P17's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P18](18_PILOT_ENTRY_GATE.md), [P23](23_WIDER_ROLLOUT_GATE.md)

## Risk controls, data impact and non-goals

No production restore/deploy/billing changes, external incident notifications or data deletion. If disposable target is missing, prepare the executable rehearsal and report BLOCKED runtime proof.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
