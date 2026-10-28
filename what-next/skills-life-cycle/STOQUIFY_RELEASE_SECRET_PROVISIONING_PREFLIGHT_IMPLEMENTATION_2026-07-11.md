# Stoquify Release Secret Provisioning Preflight Implementation

Date: 2026-07-11

Status: Conditional. Repository controls are implemented and verified; production promotion remains blocked until Vercel securely injects both dedicated secrets.

## Scope

Turn the final leadership release-evidence blockers into a repeatable, value-redacting production configuration boundary without generating, committing, printing, or pretending to provision production secrets locally.

## Implemented

- Added `scripts/release-secret-preflight.js` with release-aware, fail-closed checks for the two dedicated public-boundary secrets.
- Enforced minimum length, placeholder rejection, minimum character diversity, cross-purpose separation, and separation from Auth.js secrets.
- Added non-release and release package commands and wired the preflight into `policy:gates`, `verify:release`, and the normal `npm run build` entrypoint.
- Strengthened the leadership release-evidence ratchet to require dedicated secret names and preflight wiring. Structural evidence increased from 8/8 to 9/9.
- Added focused tests, `.env.example` variable-name documentation, and a Vercel provisioning/rotation runbook.
- Corrected stale documentation that claimed nonexistent `vercel-build` and `lib/env.ts` controls.

## Evidence

| Check | Result |
| --- | --- |
| Focused Jest | Passed: 2 suites, 11 tests |
| JavaScript syntax | Passed for both release scripts |
| TypeScript | Passed: `npm run typecheck` |
| ESLint | Passed with 0 errors and 4 existing warnings |
| Full policy chain | Passed in 148.5 seconds |
| Local preflight | Conditional, 2/6 ready, 0 blockers, 4 warnings |
| Forced release preflight | Correctly blocked with exit 1 and 4 blockers |
| Leadership evidence ratchet | Conditional, 9/9 structural checks, 0 structural blockers, 2 release blockers |
| Secret disclosure | No secret value printed or serialized |
| Application build | Inconclusive: command exceeded the 304.1-second execution budget after entering the guarded build path |

## Production Boundary

The remaining blockers are external configuration, not repository implementation:

1. `PUBLIC_IDENTITY_ABUSE_HASH_SECRET`
2. `AQSTOQFLOW_RECEIPT_TOKEN_SECRET`

The values must be generated independently, stored in the Vercel Production environment, and kept distinct from each other and from `AUTH_SECRET` or `NEXTAUTH_SECRET`. Local `.env` files are not release evidence and were not used to bypass the gate.

## Important Finding

The canonical operations and architecture documents claimed that Vercel ran `npm run vercel-build` and automatically applied Prisma migrations. The current `package.json` defines no `vercel-build` script, and `npm run build` does not run `prisma migrate deploy`. The documentation now states the actual controlled pre-deploy migration requirement. Restoring tested migration automation is the next repository-owned production-hardening slice after the two Vercel secrets are provisioned.

## Next Action

Follow `docs/operations/runbooks/release-secret-provisioning.md` in the Vercel project, redeploy production, run `npm run verify:release` in the provider-injected environment, and archive the resulting non-secret preflight and release-evidence index with the promoted commit.
