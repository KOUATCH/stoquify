Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# P15 — Implement and verify a repeatable accountant close journey

Read and follow [COMMON_EXECUTION_CONTRACT.md](COMMON_EXECUTION_CONTRACT.md) and [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) as part of this prompt. Apply the permanent core review lenses defined there. Execute only this prompt when the user asks to run it; preparing this file does not execute its tasks or authorize external actions.

## Mission and execution slot

Connect existing scoped accountant access, evidence requests, responses, findings, review and retained close pack into one working journey.

- Workspace: `E:/ohada saas/Focused projects/stoquify`.
- Source: [value roadmap](../STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md), especially the mapped initiative contracts and gates.
- Horizon: **Days 31–60**; roadmap mapping: **R05; M4 preparation**.
- Accountable role: **Finance-product engineer with accountant**. This is a responsibility, not an assigned person.
- Indicative effort: **3–5 engineer-days per bounded gap set; medium confidence**. This is not a calendar commitment or additional budget on top of the roadmap.
- Hard predecessor artifacts: [P04](04_ACCESS_AND_RECOVERY_FOUNDATION.md), [P11](11_COUNTRY_PROVIDER_PREREQUISITES.md), [P13](13_COMPLETE_RECONCILED_CUTOVER.md), [P14](14_COMPLETE_DAILY_OPERATING_LOOP.md)
- Additional prerequisites: current source baseline, scoped ownership, and the verification/environment/authority conditions below. Missing runtime or external evidence remains a blocker for the corresponding claim.

## Evidence to inspect and ownership

Read predecessor RESULT files under `docs/retention/execution/`, the mapped roadmap findings and current relevant source. These are starting paths, not a mandate to edit every file:

- `services/accounting/accountant-access.service.ts`
- `services/accounting/close-assurance.service.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/accounting/close-assurance-current-proof.ts`
- `actions/accounting/accountant-access.actions.ts`
- `actions/accounting/close-assurance.actions.ts`

Discover dependent routes, actions, helpers, fixtures and tests through current source and existing graphs. State exact owned files before edits. Recheck documented line references because the working tree may have changed.

## Execution checklist

1. Trace invitation/consent/expiry/revocation to review/export capability and the actual close route. Respect the approved page contract and server authority.
2. Implement the narrow missing links for assignment, evidence response, reviewer decision and retained pack. Preserve prior versions, unresolved disagreements and source evidence.
3. Exercise late evidence and corrected source transactions; invalidate/revise readiness as current domain policy requires.
4. Prepare a synthetic reviewed-close rehearsal and a task packet for a separately authorized real accountant review in P19.

## Acceptance criteria

- [ ] A synthetic issue can be assigned, explained, reviewed and traced in the pack without unauthorized disclosure.
- [ ] Revoked/expired/read-only grants enforce their exact capabilities on actions and downloads.
- [ ] A later source change cannot silently preserve stale current-proof status.
- [ ] Synthetic close proof is labeled rehearsal; real accepted M4 requires actual authorized reviewer evidence.

## Verification steps

1. V1; V2-C plus scoped accountant-access and close-pack tests after review.
2. V3 persisted access/current-proof/version behavior; V4 accountant/manager FR/EN tasks and denied download. Qualified review remains a separate evidence row.

Report S/M/D/B/P/C/E/O evidence separately using the common RESULT contract. Required checks that were not run remain explicit; source presence, mocks, screenshots and historical reports cannot substitute for transaction, provider, customer or expert proof.

## Expected artifacts and handoff

- `docs/retention/execution/P15/RESULT.md`
- `docs/retention/execution/P15/CLOSE_REHEARSAL.md`
- `docs/retention/execution/P15/ACCOUNTANT_REVIEW_TASKS.md`

Implement code/tests only where this mission authorizes them, within existing module ownership. Preserve prior evidence and update only P15's row in `docs/retention/execution/STATUS.md`. Identify acceptance criteria still unfulfilled and exact continuation steps. Dependency consumers: [P16](16_AUTHORIZED_ARCHIVE_IMPLEMENTATION.md), [P18](18_PILOT_ENTRY_GATE.md), [P21](21_REVIEWED_COUNTRY_CAPABILITY.md), [P22](22_REPEATED_TEAM_VALUE.md)

## Risk controls, data impact and non-goals

Own the existing accountant/close journey and focused tests. No general document management, statutory certification badge, email invitation sending or real close issuance without authority.

State data/schema impact explicitly, including “none” when applicable. For any necessary persistence change, document migration/replay and safe recovery; do not apply it to an inferred or shared target. Preserve tenant isolation, server authority, entitlement, financial correctness, evidence and unrelated local edits. Do not install tools, regenerate graphs, contact others, deploy, or perform real financial/regulatory operations through this prompt without separately established authority.

## Definition of done

The scoped deliverable and every mandatory acceptance criterion have current supporting evidence, the RESULT records actual checks and limitations, and the next dependent prompt can tell what is safe to consume. If work is partial or blocked, say so and provide the exact continuation. Do not report a gate, production capability or customer-value hypothesis as proved by completing local code alone.
