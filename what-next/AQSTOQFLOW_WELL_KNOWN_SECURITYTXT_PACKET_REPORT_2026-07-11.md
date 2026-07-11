# AqStoqFlow Well-Known Security.txt Packet Report

Date: 2026-07-11
Workspace: `E:\ohada saas\Focused projects\stoquify`
Sprint mode: surgical public/API boundary hardening

## Packet Scope

Selected surfaces:

- `app/.well-known/security.txt/route.ts`
- `app/.well-known/security.txt/__tests__/route.test.ts`
- `app/api/security-txt/route.ts`
- `app/api/security-txt/__tests__/route.test.ts`
- `scripts/api-route-guard-inventory.js`
- `scripts/__tests__/api-route-guard-inventory.test.js`

Objective: make the canonical `/.well-known/security.txt` disclosure path available and tracked by the API guard inventory, reusing the existing `/api/security-txt` policy so the public disclosure body and headers cannot drift.

## Agents And Skill Lens

- Orchestrator: public/API boundary packet.
- Application security engineer: security disclosure exposure and inventory regression guard.
- API tester: canonical route parity, API security.txt route, API guard inventory, receipt, and inventory item API tests.
- Minimal-change engineer: alias route only; no schema, service, tenant, module, or UI refactor.
- Skill used: `aqstoqflow-access-boundary-hardener`.

## Evidence Reviewed

- Active sprint brief requires Phase 1 public/API boundary hardening and release-gated, focused changes.
- Existing `app/api/security-txt/route.ts` declared `Canonical: https://stoquify.com/.well-known/security.txt` but no `app/.well-known/security.txt/route.ts` existed before this packet.
- The previous public/API packet updated the security.txt `Contact` field to `mailto:security@stoquify.com` and added `security_txt_contact_not_uri` inventory detection.
- `what-next/api-route-guard-inventory.md` now reports `Status: ready`, `API routes inventoried: 10`, and `Issues flagged: 0`.
- Refreshed inventory row: `app/.well-known/security.txt/route.ts | api_route | GET | public-intentional | not_applicable_public | security contact policy`.
- Receipt and item API focused tests remain in the verification set to prove this public route addition did not weaken tokenized receipt access, contact redaction, tenant isolation, inventory module entitlement, or `inventory.items.read` checks.

## Implementation Summary

- Added `app/.well-known/security.txt/route.ts` as a narrow alias that delegates to the existing `/api/security-txt` handler.
- Added `app/.well-known/security.txt/__tests__/route.test.ts` proving the canonical route returns the same body, status, `Content-Type`, and `Cache-Control` headers as `/api/security-txt`.
- Updated `scripts/api-route-guard-inventory.js` to include exactly `app/.well-known/security.txt/route.ts` in API/public route inventory discovery.
- Updated API inventory classification so the well-known route is treated as intentional public disclosure content with no module entitlement requirement.
- Added an inventory test proving the canonical route is inventoried as an intentional public route with `GET`, `security contact policy`, and no active issues.
- Did not duplicate the security disclosure body, did not alter receipt access behavior, and did not change tenant/module/RBAC logic.

## Changed Files

Packet-owned files:

- `app/.well-known/security.txt/route.ts`
- `app/.well-known/security.txt/__tests__/route.test.ts`
- `app/api/security-txt/route.ts`
- `app/api/security-txt/__tests__/route.test.ts`
- `scripts/api-route-guard-inventory.js`
- `scripts/__tests__/api-route-guard-inventory.test.js`
- `what-next/well-known-securitytxt-release-gates-2026-07-11.log`
- `what-next/AQSTOQFLOW_WELL_KNOWN_SECURITYTXT_PACKET_REPORT_2026-07-11.md`

Generated or refreshed by release gates:

- `what-next/api-route-guard-inventory.md`
- `what-next/api-route-guard-inventory.json`
- `what-next/payroll/payroll-immutability-runtime-check.md` - timestamp-only refresh from `npm run policy:gates`
- `what-next/payroll/payroll-immutability-runtime-check.json` - timestamp-only refresh from `npm run policy:gates`

Pre-existing unrelated or prior sprint artifacts were not normalized by this packet.

## Focused Verification

Focused public/API suite:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath app\.well-known\security.txt\__tests__\route.test.ts app\api\security-txt\__tests__\route.test.ts scripts\__tests__\api-route-guard-inventory.test.js app\api\v1\organisations\[id]\items\__tests__\route.test.ts app\api\v1\organisations\[id]\briefItems\__tests__\route.test.ts app\api\receipts\[receiptId]\__tests__\route.test.ts services\pos\__tests__\receipt-public.test.ts services\pos\__tests__\public-receipt-token.test.ts services\pos\__tests__\public-receipt-token-registry.service.test.ts
```

Result: `9` suites passed, `55` tests passed.

## Release Gate Results

Detailed log: `what-next/well-known-securitytxt-release-gates-2026-07-11.log`.

| Gate | Result |
|---|---:|
| Focused public API boundary tests | PASS: 9 suites, 55 tests |
| `npm run prisma:validate` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS with 0 errors and 4 pre-existing warnings |
| `npm run policy:gates` | PASS |
| `node scripts/workflow-assurance-release-gate.js --mode fail` | PASS |
| `node scripts/kontava-moat-release-gate.js --mode fail` | PASS |
| `npm test -- --runInBand` | PASS: 286 suites, 1496 tests |
| `npm run build:app` | PASS |

Refreshed API inventory result:

- `Status: ready`
- `API routes inventoried: 10`
- `Issues flagged: 0`

## Controls Preserved Or Strengthened

- Tenant isolation: item API tests still prove same-org reads require a valid API session and fail closed before service access when tenant authorization fails.
- RBAC: item API tests still prove `inventory.items.read` is required before listing inventory DTOs.
- Module entitlement: item API tests and inventory still prove inventory module enforcement on item and brief item APIs.
- Auditability: the new canonical public route is now visible in API inventory and cannot silently disappear from public-route evidence.
- Redaction: receipt tests still prove token-bound public receipt access and public contact-field redaction.
- Safe errors: receipt and item API tests still cover safe denial behavior; API inventory remains clean in fail mode.
- Release gates: full Jest, policy gates, release gates, and build all pass after adding the canonical public route.

## Residual Risks

- This packet proves the route at code/test/build level, but does not perform a live HTTP probe against a running deployment or reverse-proxy layer.
- The well-known inventory row currently reports response envelope as `unknown` because the route delegates to the API handler; route parity tests prove body and headers instead.
- Public receipt compatibility telemetry remains a broader product decision; this packet preserved existing signed-token behavior and did not add compatibility fallback.
- `npm run lint` still reports 4 pre-existing warnings in image/default-export rules.
- Broader module-surface cleanup remains report-mode with unresolved surfaces from earlier packets.

## Next Safe Implementation Task

Run a narrow public-route live smoke packet: start an isolated local app server or use the build output, request `/api/security-txt` and `/.well-known/security.txt`, verify identical body and headers over HTTP, save the probe log, and keep the same focused public/API tests plus release gates.
