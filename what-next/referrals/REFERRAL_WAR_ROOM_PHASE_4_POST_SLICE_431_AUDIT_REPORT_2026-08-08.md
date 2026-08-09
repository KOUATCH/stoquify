# Referral War Room Phase 4 Post-Slice-431 Audit Report

Date: 2026-08-08
Mode: `/caveman full` -> `/stoquify-referral-war-room`

## Decision

Select Phase 4 / Slice 432: **Accountant Missing-Proof Response Acceptance And Finding Resolution Command Foundation**.

The slice is acceptance-only. It completes the positive request-response-review-resolution path without introducing a rejection/rework workflow, UI, schema, close certification, or external proof surface.

## Evidence Reviewed

- Referral war plan, execution roadmap, feature report, skill installation/validation evidence, and current war-room register.
- Slice 426-431 selection, implementation, release, and report-trust evidence.
- Installed `/caveman full`, referral war-room, accountant-close, data-trust, business-event, and release-verification skills.
- Live missing-proof schemas, action/service commands, review queue contracts/service/tests, delegated accountant access resolver, close finding/comment/review Prisma models, audit/event helpers, permissions, and report-trust gate.
- Available architecture graph evidence for `updateAccountantReview`.

The architecture graph predates the missing-proof response flow and locates only the older generic close-run review writer. Live source and tests are authoritative for this selection.

## Current State

- Slice 426 creates a typed request under tenant or delegated accountant `REVIEW` authority.
- Slice 429 lets only the assigned client recipient submit one typed response and moves the finding to `IN_REVIEW`.
- Slice 430 projects the submitted state without exposing response text to the client queue or manager action center.
- Slice 431 gives an active authorized accountant a bounded request/response review queue with delegated `REVIEW` resolution and raw-metadata redaction.
- `CloseAssuranceFinding` already has `RESOLVED`, `resolutionNotes`, `resolvedAt`, and `resolvedById` fields.
- `AccountantComment` can hold typed decision evidence without a migration.
- Existing serializable missing-proof transaction retry, audit, business-event, and notification foundations are reusable.
- The generic `updateAccountantReview` command is close-run scoped, not request/response scoped, not replay-safe by correlation, and does not resolve findings.
- No live command currently sets `CloseFindingStatus.RESOLVED`.

## Candidate Ranking

| Candidate | Impact | Readiness | Risk / Complexity | Decision |
| --- | --- | --- | --- | --- |
| Acceptance-only response decision and finding resolution | High | High after Slice 431 | High but bounded by existing service primitives | Selected for Slice 432 |
| Response rejection / changes-requested loop | High | Medium | Requires reassignment, due-date, notification, and repeat-response lifecycle policy | Defer |
| PostgreSQL JSON-path and serializable-race integration evidence | High release value | Medium | Requires dedicated safe database execution | Retain as release blocker |
| Signed statement proof network foundation | Very high referral value | Medium-high | External leakage risk until Phase 4 positive close path is certified | First Phase 5 candidate |
| Identity FK/retention and portfolio pagination/timezone | High governance value | Low-medium | Broader migration/policy surfaces | Defer |

## Required Slice 432 Controls

- Protected action permission `accounting.close.accountant.review` with five-minute fresh authentication.
- Claim-bound actor, home tenant, assurance organization, password assurance, and exact authentication timestamp verified before input parsing.
- Service-owned clock and service-level permission/fresh-auth validation before database work.
- Active actor in the home tenant before delegated client access resolution.
- Tenant member or delegated `REVIEW` access resolved by `resolveAccountantClientAccess`; `READ_ONLY` remains denied.
- Caller input limited to optional client tenant, request ID, response ID, required resolution notes, and optional correlation ID.
- Typed request and response reloaded from the target tenant and fully matched to each other and the `IN_REVIEW` finding.
- Acceptance actor must differ from the client respondent.
- Correlation replay must return the exact prior acceptance; mismatched reuse must conflict.
- One serializable transaction must compare-and-set the finding from `IN_REVIEW` to `RESOLVED`, create typed acceptance evidence, write immutable audit evidence, and emit a business event/notification.
- Resolution notes and request/response bodies must not enter audit or business-event/outbox payloads.

## Phase Boundary

Phase 4 remains active until Slice 432 is implemented and verified. Acceptance resolves a specific missing-proof finding; it does not certify a period, close run, export, statutory filing, or external statement.

## Handoff

Run `stoquify-accountant-close-portal` for Slice 432, consulting `013-aqstoqflow-data-trust-accountant-portal`, `004-aqstoqflow-business-event-gateway`, and release-verification controls.
