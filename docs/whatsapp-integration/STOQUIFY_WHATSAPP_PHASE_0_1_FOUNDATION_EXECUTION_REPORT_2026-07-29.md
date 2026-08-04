# Stoquify WhatsApp Phase 0/1 Foundation Execution Report

Date: 2026-07-29

## Scope Executed

This pass implements the first narrow, low-risk slice of the WhatsApp action plan: a controlled communication foundation plus a policy-ready POS receipt delivery adapter. It does not enable live sends by default and does not allow WhatsApp to approve, post, adjust, certify, file, or mutate business records.

## Before

- WhatsApp integration existed as strategy and action-plan documentation only.
- POS receipt delivery already had a pluggable `ReceiptDeliveryProvider`, but WhatsApp still followed the generic pending/stub path.
- There was no reusable WhatsApp policy gate for consent, templates, module entitlement, RBAC eligibility, redaction, or prohibited command workflows.
- There was no Cloud API payload builder, disabled-by-default provider wrapper, or webhook signature verification helper.
- There were no focused tests covering the WhatsApp policy, provider wrapper, or receipt delivery adapter.

## After

- Added `services/communication/whatsapp-policy.ts` with explicit WhatsApp send decisions for:
  - hard-prohibited workflows: payroll approval, stock adjustment, close certification, statutory filing, payment posting, and module entitlement changes;
  - template requirement for business-initiated messages;
  - category-specific consent and opt-out suppression;
  - module entitlement and actor/recipient eligibility gates;
  - sensitive raw-value blocking;
  - safe acknowledgement-only notices for sensitive workflows.
- Added `services/communication/whatsapp-cloud-api.provider.ts` with:
  - disabled/test/live configuration resolution;
  - Cloud API template message payload builder;
  - provider call wrapper that stays disabled without explicit mode and credentials;
  - retryable failure classification for provider errors;
  - HMAC webhook signature verification.
- Added `services/communication/receipt-whatsapp-delivery.provider.ts` with a controlled POS receipt adapter that:
  - normalizes WhatsApp phone destinations;
  - refuses invalid destinations;
  - skips sending when consent is missing;
  - keeps sends pending when live sending is disabled;
  - sends only the approved receipt-availability template parameters when explicitly enabled.
- Added `services/communication/index.ts` for the new communication boundary exports.
- Added focused Jest coverage for every touched runtime surface:
  - `services/communication/__tests__/whatsapp-policy.test.ts`
  - `services/communication/__tests__/whatsapp-cloud-api.provider.test.ts`
  - `services/communication/__tests__/receipt-whatsapp-delivery.provider.test.ts`

## Explicit Remaining Gaps

- Live WhatsApp sending is still off by default.
- The controlled receipt provider is available but not yet wired as the default POS receipt provider.
- Consent, opt-out, phone ownership, template registry, cost limits, and provider message audits are still not persisted in Prisma.
- Webhooks are not yet exposed through a Next.js route or linked to evidence intake drafts.
- Owner morning digest, manager escalation, supplier invoice requests, and evidence intake requests are not yet wired to WhatsApp delivery.
- Module entitlement remains report-only for this pass; no new entitlement enforcement or billing provisioning behavior was added.
- No dashboard route, server action, or module surface inventory row was added in this slice, so the broad module surface inventory was intentionally not regenerated.

## Verification

- `npm test -- services/communication --runInBand` passed: 3 suites, 14 tests.
- `npm run typecheck` passed.

## Recommended Next Slice

Implement persisted WhatsApp communication preferences and audit records, then wire the controlled POS receipt provider behind explicit consent, template, tenant entitlement, and feature-flag checks. After that, add webhook intake for evidence drafts without auto-acceptance.