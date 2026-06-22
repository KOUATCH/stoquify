# ADR 0009: Kontava Redaction And Sensitive Data Policy

Date: 2026-06-20

Status: Accepted for Phase 0 governance

## Context

Kontava's moat features will expose cross-module intelligence. That intelligence can include payroll, supplier bank, payment provider, close, partner, export, and proof-trail data. Those surfaces must be safe before Owner War Room, partner evidence API, AI-readable evidence, broad exports, or advanced fraud/compliance dashboards exist.

## Decision

Sensitive data must be redacted or masked server-side before it reaches UI, exports, partner surfaces, proof trails, snapshots, signals, or AI-readable contexts.

## Sensitive Classes

| Class | Default policy | Additional controls |
|---|---|---|
| Payroll person-level amounts | Redact unless payroll entitlement and permission pass. | Fresh auth for exports and release/payment actions. |
| Employee identity and contract details | Minimize fields outside payroll/HR flows. | RBAC, audit, and role-specific views. |
| Supplier bank details | Mask by default. | Fresh auth, maker-checker, purchasing/AP permission, audit. |
| Payment provider references | Mask unless finance/payment/reconciliation permission passes. | Audit for export or override. |
| Reconciliation suspense detail | Redact unless exception/suspense permission passes. | Audit resolve, override, sign, certificate export. |
| Close certification evidence | Show summary by default. | Close/audit permission, fresh auth for export/certify. |
| Partner evidence data | Deny by default. | Consent, scope, watermark, revocation, audit. |
| Export data | Deny by default for sensitive cross-module exports. | Export permission, fresh auth, watermark, audit. |
| Proof-trail hidden IDs | Do not expose. | Return safe labels and redaction reason codes. |

## Composite Guard Outcomes

Protected services should be able to return:

- `allowed`
- `denied`
- `redacted`
- `masked`
- `fresh_auth_required`
- `maker_checker_required`
- `consent_required`
- `entitlement_required`
- `permission_required`
- `export_blocked`

## UI Rules

Clients should receive explicit redaction states and safe reason codes. Do not make clients infer sensitive status from null fields.

Required display states:

- Redacted.
- Masked.
- Permission denied.
- Module unavailable.
- Fresh auth required.
- Consent required.
- Maker-checker required.
- Export blocked.

## Must Not Do

- Do not rely on UI hiding for security.
- Do not return hidden IDs or raw sensitive values in JSON.
- Do not allow wildcard permissions to bypass entitlements, consent, fresh auth, maker-checker, certification, or evidence rules.
- Do not expose partner-readable or AI-readable evidence before redaction is test-proven.

## Phase 0 Gate

This ADR passes Phase 0 when later redaction work can implement a centralized service with these classes, outcomes, and non-bypass rules.

