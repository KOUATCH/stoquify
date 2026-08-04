# Referral War Room Phase 3 Slice 48 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 48: POS cash-shortage browser evidence manifest preflight contract.

## Why This Slice

Slice 47 created the assurance incident-detail browser smoke harness but correctly left real browser certification blocked. The next dependency is not production activation or browser execution; it is a strict evidence contract for the future browser run so screenshots, accessibility/layout, auth, fixture, and server-truth proof cannot be represented by loose text.

## Scope

- Add a read-only manifest preflight for POS cash-shortage browser certification evidence.
- Require structured evidence for the assurance incident route id, tenant-scoped auth state, fixture incident id, mobile/desktop screenshots under `what-next/referrals`, zero serious/critical accessibility findings, no layout overflow/clipping/overlap, server-confirmed protected POS action truth, and browser-never-authors-truth posture.
- Update the existing browser-certification readiness preflight to use the structured manifest contract for evidence-only requirements.
- Add focused tests proving complete structured evidence certifies, dry-run/harness config does not certify, and partial or unsafe evidence stays blocked.

## Non-Goals

- Do not run Playwright.
- Do not create auth states, fixture incidents, screenshots, or accessibility evidence.
- Do not resolve incidents, call the database, activate workers/schedulers/detectors, send alerts, execute rollback, or add UI/product routes.
- Do not authorize AI or WhatsApp as source of truth.

## Expected Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-browser-evidence-manifest-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-browser-certification-readiness-preflight.test.ts`
- Adjacent Slice 47 harness/readiness tests.
- Focused ESLint and typecheck.
- Source-only forbidden runtime scan.

## Expected Decision After Slice

Browser certification remains blocked until real auth state, real fixture incident id, real screenshots, real accessibility/layout evidence, and real server-truth confirmation are produced through a later selected browser execution slice.
