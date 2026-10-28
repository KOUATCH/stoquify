# Referral War Room Phase 3 / Slice 406 Selection Report

Date: 2026-08-01
Slice: 406
Name: Protected Inventory Loss Command Boundary
Operating skills: stoquify-referral-war-room-orchestrator, stoquify-inventory-loss-control, aqstoqflow-release-verification-foundation, stoquify-release-evidence-ratchet

## Selection Decision

Slice 406 is selected as the next bounded implementation slice after Slice 405 certification.

The post-Slice 405 audit stops the repetitive POS cash-shortage evidence-wrapper chain. The live Workflow Assurance release gate reports 38/38 static checks ready, but the POS cash-shortage check remains intentionally disabled. Real browser certification still lacks a tenant-scoped assurance manager auth state, a live incident fixture, screenshot evidence, and a server-truth manifest. Those external/runtime prerequisites must not be replaced by another read-only wrapper or by setting production markers speculatively.

The roadmap's other money-protection acceptance criteria remain materially unfinished at the product boundary: inventory cycle counts, variances, and adjustment/write-off approval services exist and are tested, but stock-count creation, submission, posting, and adjustment approval have no dedicated protected, module-entitled action surface.

## Scope

Selected files:

- `actions/inventory/inventoryLossControlActions.ts`
- `actions/inventory/__tests__/inventoryLossControlActions.test.ts`
- `what-next/referrals/INVENTORY_LOSS_CONTROL_REPORT_2026-08-01.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/skills-life-cycle/STOQUIFY_SLICE_406_RELEASE_EVIDENCE_REPORT_2026-08-01.md`

Selected implementation:

- Add a protected command for creating a frozen stock-count session.
- Add a protected command for submitting complete counted quantities and evidence.
- Add a protected maker-checker command for approving/posting a stock count.
- Add a protected maker-checker command for approving/posting a stock adjustment or write-off.
- Derive tenant and actor identity only from server-side RBAC context.
- Enforce the inventory module entitlement for every command with audited `mode: "enforce"` decisions.
- Reuse service-owned validation, evidence hashes, segregation-of-duties checks, idempotency, business events, audit logs, inventory movement posting, and ledger posting.
- Return serialization-safe command summaries rather than raw Prisma payloads.

## Evidence Inputs

- `services/inventory/inventory-count.service.ts`
- `services/inventory/inventory-adjustment.service.ts`
- `services/inventory/inventory-event.schemas.ts`
- `actions/inventory/inventoryMovementActions.ts`
- `config/permissions.ts`
- `services/modules/module-entitlement.service.ts`
- `graphify-out/ordered-code-graph.json`
- Slice 405 certification and live Workflow Assurance release/browser preflight output.

## Explicit Non-Authority

Slice 406 does not enable the POS cash-shortage definition, worker, scheduler, detector, or production marker. It does not create inventory UI, new Prisma models, migrations, permissions, prediction, alerts, AI, copilot, WhatsApp automation, or external sharing.

The service layer remains the source of stock, variance, approval, event, audit, and ledger truth.

## Expected Verification

- Focused Jest for the new inventory-loss action tests.
- Existing inventory-count and inventory-adjustment service suites.
- `npm run typecheck`.
- Scoped ESLint over the new action and test files.
- Tenant-source, actor-source, RBAC, module-entitlement, and direct-database-access scans.
- Whitespace and Git diff hygiene.

## Success Criteria

Slice 406 is certified when all four commands:

- obtain the organization and actor from RBAC rather than caller-supplied authority;
- fail before service invocation when permission or module entitlement is denied;
- delegate to the existing service-owned stock-count and adjustment workflows;
- preserve maker-checker and evidence requirements in the service boundary;
- return stable serialization-safe summaries;
- pass the focused and related inventory integrity suites.

## Next Skill

Execute with `stoquify-inventory-loss-control`. Return to `stoquify-referral-war-room-orchestrator` after certification before selecting any further slice.
