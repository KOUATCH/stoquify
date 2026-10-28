# Stoquify Public API Upload Abuse Boundary Implementation

Date: 2026-07-11

Mode: narrow implementation and verification

Primary skill: `stoquify-public-api-abuse-boundary`

Supporting skills:

- `stoquify-ohada-leadership-orchestrator`
- `stoquify-release-evidence-ratchet`

## Scope

Execute the next orchestrator skill after the completed service-boundary and RBAC/settings slices. Audit current public and API-facing boundaries, then close one isolated high-risk gap without broadening into unrelated authentication or finance work.

Selected implementation boundary:

- `app/api/uploadthing/core.ts`
- shared API permission helper in `lib/security/server-authz.ts`
- API guard inventory regression evidence

## Audit Evidence

The current API inventory contained 10 routes and 2 supporting guard-evidence files with zero active issues before this slice. Public receipt access already had route and service token checks, contact redaction, expiry/signature evidence, and a release configuration gate. Tenant item APIs were read-only and returned 405 for POST. Uploaded-asset reads were tenant scoped, path constrained, extension allowlisted, and protected by safe errors.

The high-risk gap was the UploadThing write boundary:

- `POST /api/uploadthing` enforced the dashboard module but authorized writes with `dashboard.read`.
- Any dashboard reader could reach image, archive, office-document, generic-file, and mail-attachment upload routes.
- Repository-wide caller evidence showed only `itemImageUpload` was used.
- The existing local inventory-photo action already established the correct permission contract: `inventory.items.create` or `inventory.items.update`.

## Changes

### Upload Authorization

- Moved UploadThing module ownership from `dashboard` to `inventory`.
- Required either `inventory.items.create` or `inventory.items.update`.
- Preserved server-resolved user and organization metadata.
- Preserved write-intent module enforcement and audit evidence.
- Preserved the 1 MB image limit.

### Attack-Surface Reduction

Removed four upload endpoints with no repository callers:

- `categoryImage`
- `blogImage`
- `fileUploads`
- `mailAttachments`

The router now exposes only `itemImageUpload`.

### Reusable Authorization Helper

Added `requireAnyAppPermission` to the shared server authorization boundary. It succeeds when at least one approved canonical permission is present and fails closed otherwise.

### API Evidence Ratchet

Extended `scripts/api-route-guard-inventory.js` so UploadThing evidence now:

- expects the inventory module;
- extracts multiple permissions from `requireAnyAppPermission`;
- flags missing item create/update write permission;
- flags reintroduction of the four unused upload endpoints.

The generated UploadThing record now reports:

- module: `inventory`
- intent: `write`
- permission: `inventory.items.create | inventory.items.update`
- status: no active issues

## Concurrent Policy Finding

The first full policy run correctly stopped on a new settings-classifier finding for `actions/modules/module-control.actions.ts`. Inspection showed the action was already protected by generic `protect<...>(...)` wrappers, trusted `ctx.orgId`, audit metadata, and module observation. The classifier recognized `protect(...)` but not generic `protect<...>(...)` syntax.

The repository-owned and installed `stoquify-settings-surface-inventory-classifier` were updated to recognize both forms. A generic-protect regression fixture was added. The live settings ratchet returned to zero findings across 37 surfaces without weakening or bypassing the protected module action.

## Files Changed

- `app/api/uploadthing/core.ts`
- `app/api/uploadthing/__tests__/core.test.ts`
- `lib/security/server-authz.ts`
- `lib/security/__tests__/server-authz.test.ts`
- `scripts/api-route-guard-inventory.js`
- `scripts/__tests__/api-route-guard-inventory.test.js`
- `scripts/__tests__/api-upload-abuse-gate.test.js`
- `docs/skills-life-cycle/skills/stoquify-settings-surface-inventory-classifier/scripts/classify-settings-surfaces.js`
- `docs/skills-life-cycle/skills/stoquify-settings-surface-inventory-classifier/scripts/classify-settings-surfaces.test.js`

Installed skill files synchronized:

- `C:\Users\J COMPUTER\.codex\skills\stoquify-settings-surface-inventory-classifier\scripts\classify-settings-surfaces.js`
- `C:\Users\J COMPUTER\.codex\skills\stoquify-settings-surface-inventory-classifier\scripts\classify-settings-surfaces.test.js`

Generated evidence refreshed:

- `what-next/api-route-guard-inventory.json`
- `what-next/api-route-guard-inventory.md`
- `what-next/settings-surface-classification.json`
- `what-next/settings-surface-classification.md`

## Verification

Passed:

- JavaScript syntax checks for API inventory and upload-abuse tests.
- Focused ESLint on the shared authorization, UploadThing, and gate files.
- Focused Jest: 4 suites, 29 tests.
- Repository classifier Node test.
- Installed classifier Node test.
- `npm run api:guard:inventory:fail`: 12 evidence records, 0 active issues.
- `npm run settings:surface:fail`: 37 classified surfaces, 0 active findings.
- `npm run typecheck`: passed with no diagnostics.
- `npm run policy:gates`: complete chain passed.

The policy chain retained the existing warning that the production public-receipt token secret is not configured. No secret value was printed.

## Residual Risk

Custom public identity server actions remain outside Better Auth's route rate limiter:

- organization-owner registration;
- password-reset request and completion;
- email OTP verification;
- invitation redemption.

The workflows have generic reset-request responses, token expiry, token clearing or invitation-state transitions, password policy, session revocation, and security audit events. They do not yet show a durable distributed request or attempt limiter. An in-memory-only limiter would not be sufficient for multi-instance production.

## Next Recommended Skill Slice

Continue `stoquify-public-api-abuse-boundary` with a narrow, durable public-identity abuse-control implementation. Define a database-backed or approved shared-store limiter for registration, reset requests, reset completion, OTP verification, and invitation redemption; hash public identifiers in limiter keys; keep reset responses enumeration-resistant; test retry windows, expiry, successful reset, and multi-instance-safe persistence.

After public identity throttling is evidence-backed, return to the orchestrator sequence and run `stoquify-ledger-close-truth-guardian`.
