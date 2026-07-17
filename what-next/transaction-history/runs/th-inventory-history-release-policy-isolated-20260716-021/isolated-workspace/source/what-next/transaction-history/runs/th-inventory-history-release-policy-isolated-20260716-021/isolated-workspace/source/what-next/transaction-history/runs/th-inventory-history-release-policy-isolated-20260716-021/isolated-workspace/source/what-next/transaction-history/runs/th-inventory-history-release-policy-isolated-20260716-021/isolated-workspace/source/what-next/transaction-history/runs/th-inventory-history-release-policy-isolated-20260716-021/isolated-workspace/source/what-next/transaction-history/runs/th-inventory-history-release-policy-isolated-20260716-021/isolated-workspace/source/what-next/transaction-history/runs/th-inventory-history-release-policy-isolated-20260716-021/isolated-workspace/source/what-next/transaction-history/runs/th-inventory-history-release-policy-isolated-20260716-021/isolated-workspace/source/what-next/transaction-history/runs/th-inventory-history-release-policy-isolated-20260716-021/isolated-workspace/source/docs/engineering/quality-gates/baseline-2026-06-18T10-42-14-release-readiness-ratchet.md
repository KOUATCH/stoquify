# AqStoqFlow Baseline Refresh Ratchet

Timestamp: 2026-06-18T10:42:14 Europe/Paris

Working HEAD: `90a67f57ecae252d1f0424f0e43102be45eb9b46`

Working tree: dirty before this ratchet run; existing unrelated changes were not modified.

## Ratchet Verdict

PASS. The active service-boundary count decreased from the latest accepted baseline of `137` to `127`.

| Metric | Value |
| --- | ---: |
| Previous burn-down baseline | 137 |
| Confirmed active service-boundary findings | 127 |
| Net delta | -10 |
| Accepted refreshed baseline | 127 |

Baseline source: latest confirmed baseline report under `what-next/`: `what-next/baseline-2026-06-17T17-58-21-release-readiness-ratchet.md`.

The user-provided `165` fallback was not used because a newer confirmed baseline report exists. The prior `165` baseline has now been superseded twice: first to `137`, and now to `127`.

Ratchet rule applied: `delta = 127 - 137 = -10`. Because `delta <= 0`, the ratchet passes and the accepted refreshed baseline tightens to `127`.

## Check Outcomes

| # | Check | Outcome | Count | Command or Method | Summary |
| ---: | --- | --- | --- | --- | --- |
| 1 | Prisma validation | PASS | 1 schema valid | `npm run prisma:validate` | `prisma/schema.prisma` is valid. Prisma emitted the existing `package.json#prisma` deprecation warning. |
| 2 | Typecheck | PASS | 0 TypeScript errors | `npm run typecheck` | `tsc --noEmit --pretty false` completed successfully. |
| 3 | Lint | PASS | 0 errors, 5 warnings | `npm run lint` | Existing warnings only: one React hook dependency warning, three Next image warnings, and one anonymous default export warning. |
| 4 | Service-boundary | PASS | 127 active, 4 allowed, 131 total | `node scripts/service-boundary-gate.js --mode report --out .baseline-refresh\service-boundary.md --json-out .baseline-refresh\service-boundary.json` | Active count is below the accepted `137` baseline, so the ratchet passes. |
| 5 | Hard-delete | PASS | 0 active, 7 allowed, 7 total | `node scripts/hard-delete-gate.js --mode report --out .baseline-refresh\hard-delete.md --json-out .baseline-refresh\hard-delete.json` | No active unsafe hard-delete findings. |
| 6 | Demo-trust | PASS | 0 active, 0 allowed, 0 total | `node scripts/demo-report-trust-gate.js --mode report --out .baseline-refresh\demo-trust.md --json-out .baseline-refresh\demo-trust.json` | No active production-visible demo/report trust findings. |
| 7 | Raw-error | PASS | 0 active, 35 allowed, 35 total | `node scripts/raw-error-boundary-gate.js --mode report --out .baseline-refresh\raw-error.md --json-out .baseline-refresh\raw-error.json` | No active unsafe raw-error findings. |
| 8 | Focused POS tests | PASS | 4 suites, 36 tests | `npm test -- --runTestsByPath actions/pos/__tests__/sync.actions.test.ts services/pos/__tests__/receipt-public.test.ts services/pos/__tests__/pos.service.test.ts services/pos/__tests__/offline-sync.service.test.ts --runInBand` | POS-focused Jest suite passed. |
| 9 | Compliance tests | PASS | 5 suites, 22 tests | `npm test -- --runTestsByPath services/compliance/__tests__/fiscal-document.service.test.ts services/compliance/__tests__/country-pack-hooks.test.ts services/compliance/__tests__/certification-outbox-processing.test.ts services/compliance/__tests__/cameroon-dgi-sandbox.adapter.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand` | Compliance and regulatory country-pack focused Jest suite passed. |

## Service-Boundary Detail

Current active findings by classification:

| Classification | Active Count |
| --- | ---: |
| `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | 50 |
| `ACTION_OWNED_MUTATION` | 32 |
| `DIRECT_PRISMA_DB_IMPORT` | 23 |
| `PRISMA_CLIENT_BOUNDARY_COUPLING` | 22 |

The current scan confirms `127` active service-boundary findings.

Resolved service-boundary findings: `10` by count against the accepted `137` baseline.

Newly introduced service-boundary findings: not computed from finding identities. The latest accepted `137` baseline was available only as a markdown baseline report; no comparable JSON finding list with `activeViolationCount: 137` was found under `what-next/`.

## Scanner Limitations And Residual Risks

- The service-boundary gate still reports `127` active findings, so the project remains in burn-down mode rather than zero-violation enforcement mode.
- Per-finding service-boundary deltas could not be computed against the accepted `137` baseline because no matching JSON artifact was available. The ratchet was evaluated by confirmed count.
- Gates were run in report mode to measure readiness only; no production code remediation was performed.
- The working tree was already dirty before this run. This report records current readiness and does not classify unrelated existing changes.
- Several commands required approval to run outside the sandbox because the Windows sandbox helper failed during setup before the commands executed.
