# Referral War Room Phase 4 Slice 431 Selection Report

Date: 2026-08-08

Selected slice: **Accountant Missing-Proof Response Review Queue Foundation**

Primary skill: `stoquify-accountant-close-portal`

Control path: `/caveman full` -> `/stoquify-referral-war-room` -> `/stoquify-accountant-close`

Consulting controls: `013-aqstoqflow-data-trust-accountant-portal`, `004-aqstoqflow-business-event-gateway`, `aqstoqflow-release-verification-foundation`, and the report-trust ratchet

## Objective

Create a source-owned, request-bound read model that lets an authorized tenant or delegated accountant inspect submitted missing-proof responses before any acceptance or finding-resolution command exists.

## Live Gap

- The client queue intentionally omits response text.
- The manager action center intentionally shows only a generic waiting state.
- The current close dashboard returns broad current-tenant comments and does not resolve delegated client access.
- The delegated accountant portal does not contain missing-proof request/response review items.
- The generic close-run review writer is not a request-response review queue.

## Required Contract

- Resolve the target organization through `resolveAccountantClientAccess` with `REVIEW` capability.
- Require a nonblank authenticated accountant, active membership in the home tenant, and `accounting.close.accountant.review` permission.
- Deny delegated `READ_ONLY` grants.
- Use the service clock. Do not accept caller time or caller-resolved authority.
- Read only `IN_REVIEW` findings with typed `MISSING_CLOSE_EVIDENCE` requests and typed `MISSING_CLOSE_EVIDENCE_RESPONSE` responses.
- Validate organization, period, close run, finding, request ID, request correlation, requester, recipient, response author, respondent, and response correlation relationships.
- Require exactly one valid response per request. Missing, duplicate, malformed, truncated, or state-inconsistent evidence must fail closed as a generic blocker.
- Return request and response text only inside this accountant-authorized review contract.
- Never return raw JSON metadata, unrelated comments, authentication data, contacts, or the full tenant ledger.
- Bound candidates and results, disclose truncation, and preserve deterministic ordering.
- Distinguish tenant-member and delegated-accountant access in source provenance without exposing grant secrets.

## Expected Files

- `services/accounting/missing-close-evidence-accountant-review-queue-contracts.ts`
- `services/accounting/missing-close-evidence-accountant-review-queue.service.ts`
- `services/accounting/__tests__/missing-close-evidence-accountant-review-queue.service.test.ts`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- generated report-trust Markdown and JSON
- Slice 431 implementation and release reports

The implementation skill may adjust these filenames only when live code demonstrates a clearer existing ownership boundary.

## Focused Tests

- Tenant-member accountant access.
- Active delegated `REVIEW` grant access.
- Delegated `READ_ONLY`, expired, revoked, wrong-client, and missing grant denial.
- Inactive or cross-tenant home actor denial before client evidence reads.
- Typed request and response relationship validation.
- Missing, duplicate, malformed, state-inconsistent, and truncated response evidence blockers.
- Authorized request/response text projection with raw metadata exclusion.
- Bounded reads, deterministic ordering, and service-clock ownership.
- No use of client queue recipient authority or broad close-dashboard comment projection.
- Report-trust mutations for every security and redaction boundary.

## Baseline Verification

| Check | Result |
| --- | --- |
| Action, close service, client queue, manager action center, and gate | 5 suites / 233 tests passed |
| Live report-trust gate | 25/25 ready, zero blockers |

## Non-Goals

- No accountant acceptance or finding resolution command.
- No finding transition, audit/event mutation, or response edit.
- No UI, page, route, hook, component, or translation.
- No reuse of the broad tenant close-dashboard comments as delegated review output.
- No schema or migration.
- No PostgreSQL production claim from mocked tests.
- No statement sharing, signed link, external delivery, AI/WhatsApp authority, or POS activation.

## Success Criteria

- An authorized accountant can receive a bounded, typed, request-bound review queue from service-owned truth.
- Client and unrelated tenant data cannot be enumerated through target-organization input.
- Response text appears only in the explicit accountant review contract.
- Corrupt or ambiguous evidence becomes a blocker rather than reviewable truth.
- A report-trust check prevents authority, relationship, redaction, and bounded-read regressions.

## Next Skill

Run `stoquify-accountant-close-portal` for Slice 431 only. Acceptance/resolution remains the immediate dependent candidate after this read model is certified.
