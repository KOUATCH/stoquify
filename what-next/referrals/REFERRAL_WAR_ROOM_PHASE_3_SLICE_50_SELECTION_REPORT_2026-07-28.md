# Referral War Room Phase 3 Slice 50 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 50: POS cash-shortage browser certification gate composition preflight.

## Why This Slice

Slices 46 through 49 created separate browser-readiness, harness, structured evidence-manifest, and auth/fixture preflights. The next safe dependency is a single read-only composition gate that prevents any future run from treating one green preflight as full browser certification readiness.

## Scope

- Add a read-only composed browser certification gate preflight.
- Require browser readiness, auth/fixture readiness, and structured browser evidence manifest preflight to all certify before the composed gate can certify.
- Preserve `activationAuthorized: false` and make the gate explicitly non-promotional.
- Add focused tests for all-certified, each missing component, current blocked state, and no runtime/activation behavior.

## Non-Goals

- Do not run Playwright or create screenshots.
- Do not create auth state files.
- Do not seed or mutate fixture incidents.
- Do not resolve incidents, call the database, activate workers/schedulers/detectors, send alerts, execute rollback, or add UI/product routes.
- Do not authorize AI or WhatsApp as source of truth.

## Expected Verification

- Focused Jest for the composed gate plus adjacent browser preflight guardrails.
- Focused ESLint and typecheck.
- Source-only forbidden runtime/activation scan.

## Expected Decision After Slice

Real browser certification remains blocked until a later selected slice produces real auth, fixture, screenshots, accessibility/layout, and server-truth evidence that satisfies all underlying preflights and this composition gate.
