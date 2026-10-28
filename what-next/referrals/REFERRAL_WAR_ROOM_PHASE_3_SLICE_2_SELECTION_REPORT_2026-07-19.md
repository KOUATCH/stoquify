# Referral War Room Phase 3 Slice 2 Selection Decision

Generated: 2026-07-19  
Program: Stoquify Referral-Worthy Execution Program  
Invocation: `/stoquify-referral-war-room`  
Operating skill: `stoquify-referral-war-room-orchestrator`

## Executive Decision

The war room accepts the Phase 3 / Slice 1 audit and selects exactly one implementation slice:

> **Phase 3 / Slice 2: POS Shift Close Evidence Foundation**

Selected operating skill: `007-aqstoqflow-pos-ledger-controls`  
Companion contract: `004-aqstoqflow-business-event-gateway`  
Rule reviewer: `stoquify-cash-leakage-radar`

The slice is authorized to harden the source command for new POS shift closes. It is not authorized to create Leakage Radar incidents, assurance definitions, exception UI, inventory-loss behavior, predictive scoring, AI authority, or WhatsApp authority.

## Evidence Reviewed

- All referral strategy documents required by the war-room skill
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/CASH_LEAKAGE_RADAR_REPORT_2026-07-19.md`
- Live POS session, drawer, sale, refund, void, RBAC, module, event, outbox, audit, UI, and test boundaries
- Installed war-room, POS ledger-control, business-event, and cash-leakage skills
- Current targeted worktree status
- Read-only PostgreSQL close-integrity preflight

## Why This Slice Is Selected

The first future leakage rule requires one trusted closed-shift source. The current close path is not eligible because it:

- accepts a system-derived balance when the count input is blank;
- reads `ACTIVE` before its transaction and updates by ID only;
- can race a second close or a sale/refund/void session update;
- has no successful domain audit, business event, outbox message, payload hash, or replay contract;
- does not bind closer authority to the session cashier or a certified managed location;
- selects a drawer without proving terminal/session/location agreement;
- has no focused service, action, UI, or concurrency tests.

Sale, refund, and void already demonstrate the correct transactional business-event pattern. Reusing that foundation is lower risk than inventing a new case model or broad cross-module detector.

## Database Preflight

The war room ran read-only aggregate queries against the configured PostgreSQL database.

| Check | Count | Decision |
| --- | ---: | --- |
| Terminal groups with more than one active session | 0 | No active duplicate blocks the slice |
| Sessions with more than one closing-balance transaction | 0 | No close duplicate blocks the slice |
| Closed/reconciled sessions missing required close fields | 135 | Legacy rows are untrusted and excluded |
| Session/terminal location mismatches | 0 | No current mismatch blocks the slice |
| Closing drawer/session terminal or location mismatches | 0 | No current mismatch blocks the slice |
| Closed-session variance equation mismatches | 135 | Legacy rows are untrusted and excluded |
| Existing `pos.shift.closed` business events | 0 | New source version starts prospectively |

No historical row may be synthetically upgraded. Only a newly committed versioned close event can become future Leakage Radar input.

## Migration Decision

No Prisma model or migration is selected for this slice.

The existing POS session, cash-drawer transaction, `BusinessEvent`, outbox, and audit models are sufficient for a prospective source contract when the service uses a serializable/conditional transaction and a stable session-scoped idempotency key.

The 135 legacy rows make immediate closed-state check constraints unsafe and confirm that a no-backfill boundary is required. If real PostgreSQL race tests cannot prove one winner with current primitives, implementation must stop and return to the war room for one narrow POS-invariant migration. It must not improvise a migration inside this slice.

## Implementation Control-Plane Clarification

This clarification records the live control-plane decision used during implementation and supersedes conflicting authorization or verification language below:

- `what-next/module-system/execution-status.md` states that runtime module-enforcement promotion is not approved. The protected close action therefore keeps canonical `pos.session.end` RBAC and records audited `pos` write access in `observe` mode; this slice does not claim hard commercial entitlement enforcement.
- The service implements self-close only. Delegated manager close, managed-location authority, fresh-authentication evidence, and delegated-close reason evidence are deferred and fail closed rather than being partially simulated.
- Managed-location and stale-auth denial tests do not apply to the self-close command. They become required if the war room later selects a delegated-close contract.
- Real PostgreSQL certification covers simultaneous identical closes, simultaneous changed closes, close versus an active cash writer, and rollback after injected event, outbox, or audit failure.
- Actual sale, refund, and void writers are covered by focused regression tests proving their active-session and sale-state claims. A broad end-to-end POS workflow expansion is outside this narrow slice.
- The final implementation file set also includes `services/pos/__tests__/pos-shift-close.postgres.test.ts` and the directly affected concurrency assertions in `services/pos/__tests__/pos.service.test.ts`.

Implementation and verification evidence is recorded in `what-next/referrals/POS_SHIFT_CLOSE_EVIDENCE_FOUNDATION_REPORT_2026-07-19.md`.

## Authorized Implementation Contract

### Input and UX

- Require an explicit counted-cash value. Blank input must never fall back to expected or drawer system balance.
- Accept explicit zero.
- Preserve decimal precision and reject non-finite, negative, or unsupported-precision input.
- Require a trimmed explanation when signed variance is nonzero.
- Keep close wording operational and non-accusatory.

### Authority and entitlement

- Derive organization and actor from protected server context.
- Record audited `pos` module write-access evidence in `observe` mode until runtime enforcement promotion is approved.
- An operator may close their own active session.
- Delegated close is not authorized in this slice and must fail closed; manager scope, fresh authentication, and delegated reason evidence are deferred.
- Foreign tenant, session, location, terminal, or drawer identifiers must not enumerate data.

### Transaction and replay

- Load and claim the exact organization/session/location/terminal source inside one transaction.
- Bind the drawer to both session terminal and session location.
- Condition `ACTIVE -> CLOSED` and every competing sale/refund/void session mutation on `ACTIVE` at write time.
- Use one stable idempotency identity per session close.
- Same committed payload returns the original result with `replayed: true`.
- Different payload for the same session conflicts and writes durable conflict evidence without changing the close.
- Any domain audit, event, or outbox failure rolls back session, drawer, drawer transaction, and terminal changes.

### Evidence

Commit exactly one:

- closed POS session state;
- `CLOSING_BALANCE` drawer transaction;
- `POS_SHIFT_CLOSED` domain audit;
- `pos.shift.closed` business event with schema version 1;
- deduplicated `pos.shift.closed` outbox message.

The event payload must include tenant, session, location, terminal, drawer, cashier/closer, self authority mode, opening amount, expected amount, counted amount, signed variance, currency, close time, closing transaction ID, and evidence version. The event payload hash is the future source hash.

## Expected Files

- `services/pos/pos.schemas.ts`
- `services/pos/pos.service.ts`
- `actions/pos/session.actions.ts`
- `components/pos/ProfessionalPOSSystem.tsx`
- `services/events/business-event.service.ts` only if conflict-audit durability requires a shared fix
- `services/pos/__tests__/pos-shift-close.service.test.ts` (new)
- `services/pos/__tests__/pos-shift-close.postgres.test.ts` (new, gated certification)
- `services/pos/__tests__/pos.service.test.ts` (competing-writer regression)
- `actions/pos/__tests__/session.actions.test.ts` (new)
- `components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx` (new)

No Prisma file, Leakage Radar service, assurance registry, Manager Action Center, or inventory service is expected to change.

## Verification Plan

Focused tests must prove:

- explicit count, zero count, validation, and difference explanation;
- tenant, cashier, permission, and non-owner denials plus audited module-observation evidence;
- same-payload replay and changed-payload conflict;
- dual close and close-versus-active-writer behavior in real PostgreSQL, with actual sale/refund/void claims covered by focused regression tests;
- atomic rollback when audit/event/outbox writes fail;
- exactly one close transaction, audit, event, and outbox message;
- UI does not submit a system-derived count;
- legacy rows without the versioned event remain ineligible.

Required commands after implementation:

```text
npm test -- --runInBand services/pos/__tests__/pos-shift-close.service.test.ts actions/pos/__tests__/session.actions.test.ts components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx
npm test -- --runInBand services/pos/__tests__/pos.service.test.ts actions/pos/__tests__/drawer-dashboard.actions.test.ts
npm run typecheck
npx eslint services/pos/pos.service.ts services/pos/pos.schemas.ts actions/pos/session.actions.ts components/pos/ProfessionalPOSSystem.tsx
npm run service:boundary:fail
npm run module:surface:fail
npm run role:cockpit:gate
```

The current full typecheck is already red outside this slice at `app/[locale]/(dashboard)/dashboard/people/page.tsx:58` with TS2367. Focused implementation evidence may proceed, but release certification remains held until that unrelated HRIS contract drift is resolved and full typecheck is green.

## Stop Conditions

Stop and return to the war room if:

- a schema migration becomes necessary;
- source authority cannot be enforced without broad HRIS or role refactoring;
- close cannot serialize against all competing POS session writers;
- same-payload replay cannot be distinguished from changed-payload conflict;
- transactional audit/event/outbox evidence cannot be atomic;
- the implementation requires a Leakage Radar case, dashboard, or assurance change.

## Selection Outcome

Phase 3 / Slice 2 is **selected for implementation** under `007-aqstoqflow-pos-ledger-controls`, with `004-aqstoqflow-business-event-gateway` as the evidence/idempotency contract.

The orchestrator now hands off to the selected POS skill. After implementation and focused verification, return to `/stoquify-referral-war-room` for certification and the next-slice decision.
