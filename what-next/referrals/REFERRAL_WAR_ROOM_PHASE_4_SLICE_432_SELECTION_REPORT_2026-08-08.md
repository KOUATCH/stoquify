# Referral War Room Phase 4 Slice 432 Selection Report

Date: 2026-08-08
Skill: `stoquify-referral-war-room-orchestrator`

## Selected Slice

Phase 4 / Slice 432: Accountant Missing-Proof Response Acceptance And Finding Resolution Command Foundation.

## Why This Slice

Slice 431 established the least-privilege review read model required before an accountant can make a high-trust decision. The smallest dependency-aware next step is the positive acceptance command that binds that decision to one typed request, one typed client response, and one `IN_REVIEW` finding.

## Expected Files

- `services/accounting/missing-close-evidence-response-acceptance-contracts.ts`
- `services/accounting/close-assurance.schemas.ts`
- `services/accounting/close-assurance.service.ts`
- `actions/accounting/close-assurance.actions.ts`
- focused action/service tests
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- generated report-trust readiness artifacts
- Slice 432 implementation, release, and program evidence

## Acceptance Criteria

- Input cannot supply target organization, actor, responder, finding, period, close run, decision status, resolved time, or fresh-auth time.
- Protected action requires `accounting.close.accountant.review` and five-minute fresh authentication, verifies exact protected claims before parsing, and forwards immutable evidence.
- Service validates permission and fresh authentication with its own clock before database work.
- Active home actor and tenant/delegated `REVIEW` access are resolved before client evidence reads.
- Request, response, and finding relationships are revalidated from typed persisted evidence.
- The accountant cannot accept their own client response.
- Exact replay returns prior acceptance without writes; correlation reuse with different evidence or notes fails.
- A compare-and-set transition changes only `IN_REVIEW` to `RESOLVED` and records resolution attribution.
- Typed acceptance comment, audit, business event, and notification are atomic.
- Audit/event payloads contain identifiers and status only, not request text, response text, resolution notes, or raw metadata.
- Focused tests, typecheck, scoped lint, report-trust ratchet, and diff hygiene pass.

## Non-Goals

- No rejection, changes-requested, repeat-response, reassignment, or due-date workflow.
- No generic `AccountantReview` rewrite.
- No close-run or period certification.
- No UI, route, hook, dashboard, schema, or migration.
- No statement network, signed public link, external delivery, AI, copilot, WhatsApp, or POS activation.
- No repository integration or production deployment claim.

## Next Skill

`stoquify-accountant-close-portal`, consulting accountant data-trust, business-event, and release-verification controls.
