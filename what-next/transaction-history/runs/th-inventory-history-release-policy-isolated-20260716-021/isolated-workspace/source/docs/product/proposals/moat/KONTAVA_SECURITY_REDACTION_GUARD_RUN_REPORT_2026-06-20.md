# Kontava Security Redaction Guard Run Report

Date: 2026-06-20

## Executive Summary

The `kontava-security-redaction-guard` skill has been executed as a foundation-first implementation slice. The work adds a centralized server-side security layer for redaction, export safety, consent-sensitive access, RBAC checks, module entitlement checks, fresh-auth checks, maker-checker checks, watermark requirements, and auditable guard decisions.

This phase deliberately avoids broad route rewiring, database migrations, and hard module enforcement. The goal is to create the reusable guard contracts and tests first, so future Owner War Room, evidence export, partner sharing, AI, reconciliation, close assurance, payroll, supplier bank, and module-gated surfaces can adopt one shared security model instead of inventing local rules.

## Files Added

- `services/security/redaction-policy.service.ts`
- `services/security/export-safety.service.ts`
- `services/security/moat-guard.service.ts`
- `services/security/__tests__/redaction-policy.service.test.ts`
- `services/security/__tests__/export-safety.service.test.ts`
- `services/security/__tests__/moat-guard.service.test.ts`

## Foundation Implemented

### 1. Redaction Policy Service

The redaction policy service defines server-side decisions for sensitive fields across:

- Payroll person-level amounts.
- Supplier bank details.
- Payment provider references.
- Reconciliation suspense details.
- Close certification evidence.
- Partner shared data.
- Sensitive export data.
- Hidden proof-trail identifiers.

It supports:

- Permission-aware redaction.
- Module-entitlement-aware redaction.
- Fresh-auth requirements for supplier bank data.
- Consent requirements for partner-shared data.
- Masking instead of full redaction where a safe partial value is useful.
- Field-path redaction for nested response objects.

Key security rule: wildcard RBAC does not override module entitlement redaction. If a tenant is not entitled to payroll, payroll person-level values remain redacted even for `*` permissions.

### 2. Export Safety Service

The export safety service wraps the existing `sensitive-action.service.ts` export controls and adds a stricter controlled-export layer.

It enforces:

- Export actions must be registered as `exportControl`.
- Export permission is still required through the sensitive-action backbone.
- Fresh authentication is required for controlled exports.
- A durable watermark must be supplied before release.
- A deterministic watermark helper exists for callers to generate controlled export watermarks.
- Export allow/deny decisions can be audit logged without exposing raw export payloads.

This protects future exports from accounting, reconciliation, close assurance, payment evidence, partner evidence, and Owner War Room surfaces.

### 3. Moat Guard Service

The moat guard service provides a composite server-side decision layer combining:

- Module entitlement decisions.
- RBAC permission checks.
- Sensitive-action checks.
- Fresh-auth checks.
- Maker-checker/self-approval checks.
- Consent checks.
- Export watermark checks.
- Redaction decisions.

It returns one normalized decision containing:

- `allowed`
- `result`
- `actions`
- `safeMessage`
- `moduleDecision`
- `sensitiveActionDecision`
- `exportDecision`
- `redactionDecisions`
- `rbacWildcardPresent`
- `rbacWildcardBypassedEntitlement`
- consent state

Key security rule: `rbacWildcardBypassedEntitlement` remains permanently false. Admin wildcard permission may satisfy RBAC, but it must not bypass module subscription, consent, fresh-auth, maker-checker, controlled export, or redaction rules.

## Tests Added

The new test suite proves:

- Payroll person-level amounts are redacted when payroll is not entitled, even for wildcard RBAC.
- Supplier bank detail access requires fresh authentication.
- Payment provider references are masked when reconciliation authority is missing.
- Controlled accounting exports require fresh authentication.
- Controlled exports require supplied watermarks.
- Watermarked controlled exports are allowed and audit logged.
- Wildcard RBAC cannot bypass enforced module entitlement denial.
- Wildcard RBAC cannot bypass partner consent.
- Maker-checker denial is preserved inside the composite guard.
- Redacted access can still be allowed without leaking hidden raw values.
- Denied composite guard decisions are audit logged with safe metadata.

## Validation Results

Passed:

```bash
npm test -- services/security/__tests__ --runInBand
```

Result: 3 test suites passed, 11 tests passed.

Passed:

```bash
npm run typecheck
```

Result: TypeScript completed successfully.

Passed:

```bash
npx eslint "services/security/**/*.ts"
```

Result: no lint errors in the new security guard files.

## What Was Deliberately Not Changed

This phase did not:

- Add database migrations.
- Reset or reseed the database.
- Hard-enforce module restrictions globally.
- Rewire existing pages, APIs, exports, or server actions to call the guard.
- Change existing authentication, RBAC, accounting, reconciliation, payroll, purchasing, POS, or reporting behavior.
- Add broad partner API, Owner War Room, AI, or Business Evidence Graph functionality.

This restraint is intentional. The guard foundation is now ready, but each sensitive surface should adopt it through focused follow-up slices with route/action-specific tests.

## Recommended Next Integration Slices

1. Integrate `evaluateMoatGuard` into proof-trail/evidence reads before partner or AI evidence sharing.
2. Integrate `evaluateExportSafety` into accounting, payment reconciliation, close pack, and report export paths.
3. Use `evaluateRedaction` in payroll, supplier bank, payment provider, suspense, close evidence, and proof-trail response serializers.
4. Add audit-backed consent records before partner-facing data sharing.
5. Add route/action tests for direct URL denial, export denial, report denial, and redacted response safety.
6. Run the `kontava-seed-backfill-release-gate` skill after the first real integrations so demo tenants prove full-suite, limited-module, read-only, suspended, and consent-revoked behavior.

## Risk Register

| Risk | Current Mitigation | Remaining Work |
| --- | --- | --- |
| Client-side hiding mistaken for security | Guard is server-side and reusable | Integrate into server actions and APIs |
| Wildcard RBAC bypassing module controls | Tests prove guard keeps entitlement separate | Add route tests once actions adopt guard |
| Sensitive exports released without watermark | Export safety service blocks missing watermark | Integrate all export callers |
| Partner data shared without consent | Moat guard blocks missing/revoked consent | Add durable consent schema and UI |
| Redaction inconsistently applied | Central policy service introduced | Adopt in serializers/read models |
| Hidden IDs leaked in proof/evidence views | Hidden identifier category introduced | Wire into proof-trail serializers |

## Completion Criteria Status

Completed:

- Central redaction policy service exists.
- Central export safety service exists.
- Central composite moat guard service exists.
- Focused tests cover the core security invariants.
- TypeScript and focused lint pass.
- Report saved in the `moat proposals` folder.

Not completed by design:

- Broad application integration.
- Database consent model.
- Partner evidence export.
- Owner War Room surface integration.
- Hard module enforcement rollout.

## Final Recommendation

The next safest skill to run is `kontava-seed-backfill-release-gate` only after one or two real server-action integrations adopt the new guard. If the team wants another implementation skill immediately, the best next slice is to integrate this guard into proof-trail/evidence access because it is the natural foundation for partner evidence, AI-assisted explanations, Owner War Room drilldowns, and future cross-boundary moat features.
