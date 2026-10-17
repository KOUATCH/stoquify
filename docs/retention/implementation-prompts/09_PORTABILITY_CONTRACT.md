Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P09 — Define and test the authorized archive contract

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Inventory portability gaps and deliver a testable archive manifest contract for the pilot’s data; do not call existing reports a complete migration package.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 1–30**; roadmap mapping: **R07/R08; M5 preparation**.
- Accountable role: **Data/export engineer**. This is a responsibility, not an assigned person.
- Indicative effort: **1–2 engineer-days; medium confidence**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P01](01_BASELINE_AND_PILOT_SCOPE.md), [P04](04_ACCESS_AND_RECOVERY_FOUNDATION.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `services/customer/customer-export.service.ts`
- `services/purchasing/ap-history-export.service.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/inventory/inventory-history-background-export.service.ts`
- `services/modules/module-entitlement.service.ts`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Inventory records, settings, roles, opening/closing positions, evidence, approvals, attachments and identifiers for the P01 scope. Identify redactions, bounded exports, ownership, retention and source references.
2. Define an owner-authorized archive schema/version, relationships, monetary/unit metadata, counts, hash manifest, explicit omissions and reconstruction expectations. Preserve redacted ordinary exports.
3. Build a small synthetic archive fixture and independent validation/reconstruction checks for missing links, attachments, counts, hashes and unauthorized fields.
4. Map read-only, export, accountant and cancellation-related permissions; recommend the minimal policy decision P10 must resolve before P16 implementation.

## Acceptance criteria

- [ ] Every pilot data category is included, explicitly excluded with reason, or a named blocker.
- [ ] The independent fixture check detects omitted referenced evidence and mismatched totals/hashes.
- [ ] Secrets and access tokens are excluded; customer-owned sensitive fields require explicit authorized archive scope.
- [ ] Current AP row/size limits and redacted reports are recorded as implementation constraints, not retention benefits.

## Verification steps

1. V1; V2 pure manifest/reconstruction negative fixtures.
2. Inspect existing export tests and record a V3/V4 plan for large exports, background artifacts and download access. This prompt does not establish whole-tenant archive runtime completeness.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P09/RESULT.md`
- `docs/retention/execution/P09/ARCHIVE_CONTRACT.md`
- `docs/retention/execution/P09/PORTABILITY_COVERAGE.md`
- `docs/retention/execution/P09/ARCHIVE_FIXTURE_MANIFEST.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P09's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P10](10_COMMERCIAL_LIFECYCLE_AND_SUPPORT.md), [P12](12_DAY_30_CHECKPOINT.md), [P16](16_AUTHORIZED_ARCHIVE_IMPLEMENTATION.md)

## Risk controls, data impact and non-goals

Own contract, synthetic fixture/validator tests and evidence. No blanket unredaction, production export, attachment upload, retention deletion or cancellation implementation.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
