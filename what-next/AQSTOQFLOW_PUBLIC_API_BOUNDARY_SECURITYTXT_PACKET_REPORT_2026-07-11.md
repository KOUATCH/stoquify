# AqStoqFlow Public/API Boundary Security.txt Packet Report

Date: 2026-07-11
Workspace: `E:\ohada saas\Focused projects\stoquify`
Sprint mode: surgical public/API boundary hardening

## Packet Scope

Selected surfaces:

- `app/api/security-txt/route.ts`
- `app/api/security-txt/__tests__/route.test.ts`
- `scripts/api-route-guard-inventory.js`
- `scripts/__tests__/api-route-guard-inventory.test.js`

Objective: tighten the intentional public `security-txt` route and make the API guard inventory catch non-URI disclosure contact regressions, while preserving existing public receipt token enforcement and inventory item API tenant/module/RBAC controls.

## Agents And Skill Lens

- Orchestrator: public/API boundary packet.
- Application security engineer: public disclosure route and inventory guard regression.
- API tester: focused public route, receipt, inventory item API, and guard inventory tests.
- Minimal-change engineer: no production schema, service refactor, or route expansion.
- Skill used: `aqstoqflow-access-boundary-hardener`.

## Evidence Reviewed

- Active sprint brief requires Phase 1 public/API boundary hardening and explicit preservation of tenant isolation, RBAC, module entitlement, auditability, redaction, safe errors, and release gates.
- `what-next/api-route-guard-inventory.md` reports `Status: ready`, `API routes inventoried: 9`, and `Issues flagged: 0` after the packet.
- `app/api/receipts/[receiptId]/route.ts` rejects missing/blank tokens before service access and passes `receiptAccessToken` to `getPublicSalesReceipt`.
- `services/pos/receipt.service.ts` uses `assertPublicReceiptAccessToken` for token-bound public receipt access, and receipt tests cover active, bound-to-other-sale, expired, tampered, revoked, unavailable, and redacted public payload cases.
- `app/api/v1/organisations/[id]/items/route.ts` and `briefItems/route.ts` already enforce `requireApiSessionForOrg`, `requireApiModuleAccess` for `inventory`, and `requireAppPermission(user, "inventory.items.read")` before item service reads.
- `app/api/security-txt/route.ts` was fresh and cache-bounded, but published `Contact: security@stoquify.com` while the existing API inventory fixtures model fresh security.txt contact as a URI-form `mailto:` contact.

## Implementation Summary

- Changed the public security.txt `Contact` field to `mailto:security@stoquify.com`.
- Updated the focused security.txt route test to assert the URI-form contact while preserving status, content type, bounded cache, and future `Expires` checks.
- Added an API inventory detector for `security_txt_contact_not_uri` when a security.txt `Contact` value is present but not a `mailto:` or `https:` URI.
- Added a focused API inventory test proving bare email contacts are now flagged, and existing `mailto:` security.txt fixtures remain clean.
- Did not change receipt service behavior, item API route behavior, schema, Prisma models, or dashboard UI.

## Changed Files

Packet-owned files:

- `app/api/security-txt/route.ts`
- `app/api/security-txt/__tests__/route.test.ts`
- `scripts/api-route-guard-inventory.js`
- `scripts/__tests__/api-route-guard-inventory.test.js`
- `what-next/public-api-boundary-securitytxt-release-gates-2026-07-11.log`
- `what-next/AQSTOQFLOW_PUBLIC_API_BOUNDARY_SECURITYTXT_PACKET_REPORT_2026-07-11.md`

Generated or refreshed by release gates:

- `what-next/api-route-guard-inventory.md`
- `what-next/api-route-guard-inventory.json`
- `what-next/payroll/payroll-immutability-runtime-check.md` - timestamp-only refresh from `npm run policy:gates`
- `what-next/payroll/payroll-immutability-runtime-check.json` - timestamp-only refresh from `npm run policy:gates`

Pre-existing unrelated/unowned worktree artifacts were not normalized by this packet.

## Focused Verification

Primary focused packet run:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath app\api\security-txt\__tests__\route.test.ts scripts\__tests__\api-route-guard-inventory.test.js app\api\v1\organisations\[id]\items\__tests__\route.test.ts app\api\v1\organisations\[id]\briefItems\__tests__\route.test.ts app\api\receipts\[receiptId]\__tests__\route.test.ts services\pos\__tests__\receipt-public.test.ts services\pos\__tests__\public-receipt-token.test.ts services\pos\__tests__\public-receipt-token-registry.service.test.ts
```

Result: `8` suites passed, `53` tests passed.

Post-clean edited-surface rerun:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath app\api\security-txt\__tests__\route.test.ts scripts\__tests__\api-route-guard-inventory.test.js
```

Result: `2` suites passed, `16` tests passed.

## Release Gate Results

Detailed log: `what-next/public-api-boundary-securitytxt-release-gates-2026-07-11.log`.

| Gate | Result |
|---|---:|
| Focused public API boundary tests | PASS: 8 suites, 53 tests |
| `npm run prisma:validate` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS with 0 errors and 4 pre-existing warnings |
| `npm run policy:gates` | PASS |
| `node scripts/workflow-assurance-release-gate.js --mode fail` | PASS |
| `node scripts/kontava-moat-release-gate.js --mode fail` | PASS |
| `npm test -- --runInBand` | PASS: 285 suites, 1494 tests |
| `npm run build:app` | PASS |

Refreshed API inventory result:

- `Status: ready`
- `API routes inventoried: 9`
- `Issues flagged: 0`

## Controls Preserved Or Strengthened

- Tenant isolation: item API focused tests still prove cross-org/session failure stops before module, permission, or item service reads.
- RBAC: item API focused tests still prove `inventory.items.read` is required before same-org item reads.
- Module entitlement: item API focused tests and inventory still prove `inventory` module enforcement on both item APIs.
- Auditability: item API module checks keep `audit: true`; security.txt regression is now visible in the API inventory gate.
- Redaction: public receipt focused tests still prove customer contact redaction and token-bound receipt lookup.
- Safe errors: receipt and item API focused tests still exercise safe denial behavior; API inventory remains clean in fail mode.
- Release gates: full Jest, policy gates, release gates, and build now pass after the public boundary change.

## Residual Risks

- `security.txt` is still served from `/api/security-txt`; this packet does not add or verify `/.well-known/security.txt` routing.
- Public receipt compatibility telemetry remains a broader product decision; this packet preserved existing signed-token behavior and did not widen compatibility fallback.
- `npm run lint` still reports 4 pre-existing warnings in image/default-export rules; they were not introduced here.
- Broader module-surface cleanup remains report-mode with unresolved surfaces from earlier packets.
- The worktree still contains unrelated or previous sprint artifacts, including `docs/skills-life-cycle/`, Owner War Room report files, module inventory files, and the payroll prompt-suite stabilization packet.

## Next Safe Implementation Task

Run a narrow `/.well-known/security.txt` exposure packet: inspect Next route support, add a minimal alias route or documented deployment mapping if missing, test that it returns the same content and headers as `/api/security-txt`, refresh API/public route inventory, and rerun the focused public/API tests plus release gates.
