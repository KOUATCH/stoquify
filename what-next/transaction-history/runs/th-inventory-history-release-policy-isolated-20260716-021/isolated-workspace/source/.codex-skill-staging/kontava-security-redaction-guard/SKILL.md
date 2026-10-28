---
name: kontava-security-redaction-guard
description: Harden Kontava cross-module moat surfaces with centralized redaction, export safety, composite guards, fresh-auth sensitive actions, consent boundaries, and security tests. Use before exposing Owner War Room, proof trails, business signals, partner exports, AI-readable evidence, payroll/supplier/payment/close-sensitive data, or module entitlement mutation.
---

# Kontava Security Redaction Guard

## Purpose

Use this skill to make every cross-module surface safe before it becomes broad, exportable, partner-readable, or AI-readable.

## Upgraded Mission

Centralize the security, redaction, export, consent, and sensitive-action guardrails required before Kontava exposes cross-module intelligence. The goal is to make trust visible without leaking payroll, supplier bank, payment provider, close, partner, export, or proof-trail data.

This skill is a hard prerequisite for broad Owner War Room, partner evidence API, AI-readable evidence, exports, and high-risk proof-trail surfaces.

## Stakeholder Value

- Owners trust that sensitive business data is not overexposed.
- Accountants and auditors see enough proof without seeing unrelated confidential details.
- Payroll and HR teams keep person-level amounts controlled.
- Suppliers and payment data remain protected.
- Partners receive only consented, scoped, watermarked, revocable evidence.
- Engineering gets one composite guard instead of ad hoc checks.

## Composite Guard Contract

Every protected cross-module read or action should be evaluated through a server-side contract that can return:

- Allow, deny, observe, redact, mask, require fresh auth, require maker-checker, require consent, require entitlement, or require permission.
- Reason code safe for user display.
- Internal audit reason.
- Redaction policy applied.
- Export/watermark policy if data leaves the app.

## Inspect First

Inspect:

- `moat proposals/KONTAVA_MOAT_EXECUTION_SKILL_PROMPTS_UPGRADED_2026-06-19.md`
- `services/_shared/protect.ts`
- `lib/security/rbac.ts`
- `lib/security/rbac-permissions.ts`
- `lib/security/auth-session.ts`
- `services/controls/sensitive-action.service.ts`
- Existing export controls.
- Payment reconciliation override/sign/certification services.
- Supplier bank approval services.
- Payroll approval/payment services.
- Close certification/export services.
- Audit log services.

## UX Requirements

UI and API consumers should receive explicit states:

- Redacted.
- Masked.
- Permission denied.
- Module unavailable.
- Fresh auth required.
- Consent required.
- Maker-checker required.
- Export blocked.
- Safe unavailable.

Do not let clients infer sensitive status from nulls or missing fields. Return safe labels and reason codes.

## Build

Services:

- `services/security/redaction-policy.service.ts`
- `services/security/export-safety.service.ts`
- `services/security/moat-guard.service.ts`
- Extensions to `services/controls/sensitive-action.service.ts`

Composite guard checks:

1. Session.
2. Tenant scope.
3. Module entitlement.
4. RBAC permission.
5. Fresh auth when sensitive.
6. Maker-checker where required.
7. Consent where partner/export-related.
8. Redaction before returning JSON.
9. Audit allow, deny, export, consent, and redaction decisions.

## Sensitive Data Defaults

- Payroll person-level amounts: redact unless payroll entitlement and permission pass.
- Supplier bank details: redact unless permission and fresh auth pass.
- Payment provider references: mask unless payment/reconciliation permission passes.
- Reconciliation suspense detail: redact unless exception permission passes.
- Close certification evidence: show summary unless close/audit permission passes.
- Partner data: require consent, scope, watermark, revocation, and audit.
- Export data: require export permission, fresh auth, watermark, and audit.

## New Sensitive Actions

Add only when the corresponding feature exists:

- `evidence.snapshot.rebuild`
- `evidence.proof.export`
- `module.entitlement.change`
- `partner.consent.grant`
- `partner.consent.revoke`
- `partner.evidence.export`
- `owner.war_room.export`
- `business_signal.bulk_resolve`

## Must Not Do

- Do not rely on UI hiding for security.
- Do not allow wildcard permissions to bypass entitlements, consent, fresh auth, maker-checker, or certification.
- Do not return hidden IDs or raw sensitive values in JSON payloads.
- Do not add broad exports before watermarking and audit are implemented.
- Do not allow admin wildcard permissions to bypass entitlements, consent, fresh auth, maker-checker, certification, or evidence rules.
- Do not build partner-readable or AI-readable evidence before redaction is test-proven.

## Tests

Add tests for:

- Payroll redaction by role.
- Supplier bank redaction by role.
- Provider reference masking.
- Export fresh-auth requirement.
- Wildcard cannot bypass entitlement.
- Wildcard cannot bypass consent.
- Maker-checker separation.
- Audit event on denied sensitive action.
- Redacted proof trail does not leak hidden IDs.
- Export watermark and audit requirements.
- Consent revocation blocking partner evidence access.

## Validation

Run:

- `npm run typecheck`
- `npm run lint`
- Focused RBAC, sensitive-action, export, redaction, and tenant isolation tests.

## Completion Criteria

Finish when cross-module intelligence can be exposed through server-side redaction and composite guards with tests proving sensitive data does not leak.
