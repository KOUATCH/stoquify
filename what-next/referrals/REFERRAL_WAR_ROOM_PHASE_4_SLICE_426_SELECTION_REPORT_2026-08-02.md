# Phase 4 Slice 426 Selection Report

Generated: 2026-08-02
Phase: Phase 4 - Accountant Portal And Close Pack
Selected slice: Missing-Proof Request Command Foundation

## Decision

Select the missing-proof request command foundation. Roadmap requires accountants to request missing evidence from an authorized client workspace and route that work toward the client's action center with audit history. Live code has close findings, comments, business events, notification outbox, and delegated accountant access, but no atomic request command or release classification.

## Candidate Ranking

1. Missing-proof request command foundation: highest direct roadmap value, reuses existing service-owned truth, and creates the dependency for action-center delivery.
2. Accountant identity foreign keys and retention: high integrity value, but blocked by repository migration ownership and deletion-policy decisions.
3. Portfolio/register pagination: important for firm scale, lower immediate workflow value.
4. Organization-timezone policy: important, but needs product-wide temporal semantics beyond accountant portal.

## Scope

- Add a typed missing-proof request input and output contract.
- Add delegated accountant capability `REVIEW`; read-only grants cannot request client work.
- Resolve client organization inside the owning service from authenticated home organization, actor, and active grant.
- Require an authenticated requester and a future due date before transaction work.
- Require the target finding to be unresolved and backed by an actual missing-evidence condition.
- Require the requested recipient to be an active user of the client organization.
- Use correlation-scoped idempotency.
- Atomically assign the finding, create typed client-action-required accountant comment history, write immutable audit evidence, and emit business-event plus notification-outbox evidence.
- Add a dedicated protected permission and action wrapper.
- Add focused runtime tests and a TypeScript AST report-trust ratchet.
- Regenerate report-trust readiness and program evidence.

## Non-Scope

- Action-center read model or UI.
- Evidence upload, response, fulfillment, or request-closing workflow.
- New Prisma models or migrations.
- Portfolio/register pagination.
- Accountant identity retention or foreign-key policy.
- Organization-timezone policy.
- External sharing, AI/WhatsApp authority, or POS activation.

## Acceptance Criteria

- Client input cannot supply home organization, actor, permissions, access mode, audit actor, or event ownership.
- Delegated client organization is resolved by active consent; read-only grants fail closed.
- Missing actor, invalid/past due date, cross-tenant or inactive recipient, resolved finding, and non-missing-evidence finding fail before mutation.
- Duplicate correlation for the same tenant and finding returns existing request without duplicate update, comment, audit, event, or outbox.
- Successful request updates finding ownership and due date, creates typed request history, and emits source-linked audit/event evidence in one transaction.
- Gate rejects wrapper bypass, unprotected binding, direct client organization use, absent delegated REVIEW resolution, missing idempotency, missing evidence predicate, missing active-recipient predicate, missing typed history, missing audit/event, and non-atomic mutation.
- Focused and expanded tests, typecheck, lint, Prisma validation, syntax, hygiene, generated gate, and independent review pass.

## Baseline

`npx jest actions/accounting/__tests__/close-assurance.actions.test.ts services/accounting/__tests__/close-assurance.service.test.ts scripts/__tests__/report-trust-export-gate.test.js --runInBand`

Result: 3 suites passed, 93 tests passed while the missing-proof command, permission, delegated REVIEW capability, and release check were absent.

## Next Skill

Continue with `013-aqstoqflow-data-trust-accountant-portal` under `stoquify-referral-war-room-orchestrator` control.
