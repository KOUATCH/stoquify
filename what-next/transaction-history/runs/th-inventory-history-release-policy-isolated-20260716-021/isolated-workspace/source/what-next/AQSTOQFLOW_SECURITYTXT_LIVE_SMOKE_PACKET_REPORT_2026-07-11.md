# AqStoqFlow Security.txt Live Smoke Packet Report

Date: 2026-07-11
Workspace: `E:\ohada saas\Focused projects\stoquify`
Sprint mode: surgical public/API boundary verification

## Packet Scope

Selected surfaces:

- `scripts/security-txt-live-smoke.js`
- `scripts/__tests__/security-txt-live-smoke.test.js`
- `app/.well-known/security.txt/route.ts`
- `app/api/security-txt/route.ts`
- `scripts/api-route-guard-inventory.js`
- receipt and inventory item API focused tests as control-preservation evidence

Objective: turn the previous code-level `/.well-known/security.txt` work into repeatable live HTTP evidence by building the app, starting a local production server, requesting `/api/security-txt` and `/.well-known/security.txt`, and proving both responses are equivalent and safe.

## Agents And Skill Lens

- Orchestrator: public/API live-smoke packet.
- Application security engineer: public disclosure route parity, fresh expiry, and `mailto:` disclosure contact.
- API tester: reusable smoke script, route parity tests, live HTTP probe, and API inventory regression.
- Minimal-change engineer: no domain service, schema, tenant, RBAC, or UI refactor.
- Skill used: `aqstoqflow-access-boundary-hardener`.

## Evidence Reviewed

- Active sprint brief requires focused verification per touched surface and saved reports under `what-next/` when audit or implementation work is performed.
- Previous public/API packets made `/api/security-txt` contact URI-safe and added `app/.well-known/security.txt/route.ts` as an alias to the API handler.
- `npm run build:app` listed `/.well-known/security.txt` as a built dynamic route.
- Live smoke JSON `what-next/security-txt-live-smoke-2026-07-11.json` reports `status: ready`, `issueCount: 0`, and both public security.txt routes returning HTTP `200`.
- The live smoke JSON reports body parity, content-type parity, and cache-control parity as `true`.
- Refreshed `what-next/api-route-guard-inventory.md` reports `Status: ready`, `API routes inventoried: 10`, and `Issues flagged: 0`.

## Implementation Summary

- Added `scripts/security-txt-live-smoke.js`, a small reusable Node verifier for `/api/security-txt` and `/.well-known/security.txt`.
- The verifier checks HTTP status, body equality, `Content-Type`, `Cache-Control`, `Contact: mailto:`, and future-dated `Expires`.
- Added `scripts/__tests__/security-txt-live-smoke.test.js` covering argument parsing, URL construction, passing parity, failure issue detection, and JSON evidence writing.
- Ran a production build, started a local `next start` server on `127.0.0.1:3139`, executed the smoke verifier in fail mode, saved JSON/log evidence, and stopped the temporary server.
- The first local-server attempt failed because `Start-Process` split the Next binary path at the workspace space; the retry used `npm run start -- -p 3139 -H 127.0.0.1` and passed. This is documented in the live smoke log.
- No production route, service, schema, tenant, RBAC, module entitlement, receipt, or item API behavior was changed by this packet.

## Changed Files

Packet-owned files:

- `scripts/security-txt-live-smoke.js`
- `scripts/__tests__/security-txt-live-smoke.test.js`
- `what-next/security-txt-live-smoke-2026-07-11.json`
- `what-next/security-txt-live-smoke-http-2026-07-11.log`
- `what-next/security-txt-live-smoke-release-gates-2026-07-11.log`
- `what-next/security-txt-live-smoke-server-2026-07-11.err.log`
- `what-next/security-txt-live-smoke-server-2026-07-11.out.log`
- `what-next/security-txt-live-smoke-server-retry-2026-07-11.err.log`
- `what-next/security-txt-live-smoke-server-retry-2026-07-11.out.log`
- `what-next/AQSTOQFLOW_SECURITYTXT_LIVE_SMOKE_PACKET_REPORT_2026-07-11.md`

Generated or refreshed by release gates:

- `what-next/api-route-guard-inventory.md`
- `what-next/api-route-guard-inventory.json`
- `what-next/payroll/payroll-immutability-runtime-check.md` - timestamp refresh from `npm run policy:gates`
- `what-next/payroll/payroll-immutability-runtime-check.json` - timestamp refresh from `npm run policy:gates`

Existing/prior packet files still modified in the worktree:

- `app/.well-known/security.txt/route.ts`
- `app/.well-known/security.txt/__tests__/route.test.ts`
- `app/api/security-txt/route.ts`
- `app/api/security-txt/__tests__/route.test.ts`
- `scripts/api-route-guard-inventory.js`
- `scripts/__tests__/api-route-guard-inventory.test.js`
- `scripts/__tests__/payroll-prompt-suite-index.test.js`

Unowned changes observed in final status and left untouched:

- `actions/pos/catalog.actions.ts`
- `actions/pos/drawer-dashboard.actions.ts`
- `actions/pos/terminal-management.actions.ts`

## Focused Verification

Focused verifier test:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath scripts\__tests__\security-txt-live-smoke.test.js
```

Result: `1` suite passed, `5` tests passed.

Focused public/API suite:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath scripts\__tests__\security-txt-live-smoke.test.js app\.well-known\security.txt\__tests__\route.test.ts app\api\security-txt\__tests__\route.test.ts scripts\__tests__\api-route-guard-inventory.test.js app\api\v1\organisations\[id]\items\__tests__\route.test.ts app\api\v1\organisations\[id]\briefItems\__tests__\route.test.ts app\api\receipts\[receiptId]\__tests__\route.test.ts services\pos\__tests__\receipt-public.test.ts services\pos\__tests__\public-receipt-token.test.ts services\pos\__tests__\public-receipt-token-registry.service.test.ts
```

Result: `10` suites passed, `60` tests passed.

Live HTTP smoke:

```powershell
node.exe scripts\security-txt-live-smoke.js --mode fail --base-url http://127.0.0.1:3139 --timeout-ms 15000 --out what-next\security-txt-live-smoke-2026-07-11.json
```

Result from JSON evidence:

- `status: ready`
- `issueCount: 0`
- `/api/security-txt`: HTTP `200`, `Content-Type: text/plain`, `Cache-Control: public, max-age=86400`
- `/.well-known/security.txt`: HTTP `200`, `Content-Type: text/plain`, `Cache-Control: public, max-age=86400`
- `parity.body: true`
- `parity.contentType: true`
- `parity.cacheControl: true`

Temporary server cleanup:

- Parent `npm run start` process was stopped by the smoke wrapper.
- A child Next server process on port `3139` remained alive and was stopped explicitly.
- Post-stop probe returned `NO_LISTENER_AFTER_STOP`.

## Release Gate Results

Detailed gate log: `what-next/security-txt-live-smoke-release-gates-2026-07-11.log`.

| Gate | Result |
|---|---:|
| Focused public API live smoke tests | PASS: 10 suites, 60 tests |
| `npm run prisma:validate` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS with 0 errors and 4 pre-existing warnings |
| `npm run policy:gates` | PASS |
| `node scripts/workflow-assurance-release-gate.js --mode fail` | PASS |
| `node scripts/kontava-moat-release-gate.js --mode fail` | PASS |
| `npm test -- --runInBand` | PASS: 287 suites, 1501 tests |
| `npm run build:app` | PASS |

Refreshed API inventory result:

- `Status: ready`
- `API routes inventoried: 10`
- `Issues flagged: 0`

## Controls Preserved Or Strengthened

- Tenant isolation: item API tests still prove tenant/session denial stops before item service reads.
- RBAC: item API tests still prove `inventory.items.read` is required before inventory DTO reads.
- Module entitlement: item API tests and API inventory still prove `inventory` module enforcement on item APIs.
- Auditability: the public security.txt live smoke is now repeatable and writes JSON evidence under `what-next/`.
- Redaction: receipt tests still prove token-bound public receipt lookup and public contact redaction.
- Safe errors: receipt and item API focused tests remain green; API inventory fail mode is clean.
- Release gates: full Jest, policy gates, workflow/moat release gates, and build all pass with the live smoke verifier present.

## Residual Risks

- The live smoke proves a local production server, not the deployed reverse proxy, CDN, or public domain.
- `next start` emitted a warning that standalone output should use `.next/standalone/server.js`; the route still served correctly in this local smoke. A future deployment-specific smoke should use the production host/runtime command.
- Public receipt compatibility telemetry remains a broader product decision; this packet preserved existing signed-token behavior and did not add fallback compatibility.
- `npm run lint` still reports 4 pre-existing warnings in image/default-export rules.
- Unowned POS action changes are present in the worktree and were left untouched.

## Next Safe Implementation Task

Run a narrow POS action RBAC packet only if those observed POS action changes are intended: inspect `actions/pos/catalog.actions.ts`, `actions/pos/drawer-dashboard.actions.ts`, `actions/pos/terminal-management.actions.ts`, add focused tests proving tenant, RBAC, wildcard, and audit behavior, then rerun POS-focused tests and release gates. If those POS changes are not intended, review with the owner before touching them.
