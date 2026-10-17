Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P16 — Implement a complete authorized archive for the pilot scope

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Implement the P09 archive contract with the resolved P10 access policy, preserving relationships and evidence for the exact supported scope.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 31–60**; roadmap mapping: **R07/R08; M5 technical proof**.
- Accountable role: **Data/export engineer**. This is a responsibility, not an assigned person.
- Indicative effort: **4–7 engineer-days per archive slice; low confidence**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P04](04_ACCESS_AND_RECOVERY_FOUNDATION.md), [P09](09_PORTABILITY_CONTRACT.md), [P10](10_COMMERCIAL_LIFECYCLE_AND_SUPPORT.md), [P13](13_COMPLETE_RECONCILED_CUTOVER.md), [P15](15_ACCOUNTANT_CLOSE_JOURNEY.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `services/customer/customer-export.service.ts`
- `services/purchasing/ap-history-export.service.ts`
- `services/inventory/inventory-history-background-export.service.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/modules/module-entitlement.service.ts`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Reuse existing export jobs/artifact storage. Add pagination/chunking, restart/retry and scope manifest as required; do not simply raise limits without resource controls.
2. Include authorized records, configurations, identifiers, relationships, reviews and permitted attachments, with counts and hashes. Keep ordinary role-scoped redacted reports unchanged.
3. Implement explicit owner/archive permissions, expiring download authorization and audit records across active/read-only/archive states according to the resolved policy.
4. Reconstruct a representative multi-location synthetic dataset with an independent reader, testing beyond current row/byte bounds and checking attachment content hashes.

## Acceptance criteria

- [ ] Manifest completeness and omissions match the promised scope; no unresolved missing attachment/reference is hidden.
- [ ] Independent reconstruction reconciles counts and financial/stock control totals.
- [ ] Interrupted generation resumes safely; unauthorized/revoked requests and expired links are denied.
- [ ] M5 technical proof is distinct from production tenant-export evidence and commercial policy approval.

## Verification steps

1. V1/V2 manifest/export/privacy cases; V3 large dataset, job restart, authorization and artifact integrity.
2. V4 request/status/download flows and post-cancellation policy fixtures; V6 independent reviewer reconstruction sign-off.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P16/RESULT.md`
- `docs/retention/execution/P16/ARCHIVE_RECONSTRUCTION.md`
- `docs/retention/execution/P16/EXPORT_ACCESS_MATRIX.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P16's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P18](18_PILOT_ENTRY_GATE.md), [P23](23_WIDER_ROLLOUT_GATE.md)

## Risk controls, data impact and non-goals

No real customer export or deletion, blanket unredaction, secrets in archives or unsupported whole-platform completeness claim. Schema/storage changes need reviewed migration/recovery notes.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
