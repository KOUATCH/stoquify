# Referral War Room Phase 3 Slice 49 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 49: POS cash-shortage browser auth and fixture readiness preflight.

## Why This Slice

Slice 48 defined the structured browser evidence manifest contract, but real browser certification still needs tenant-scoped auth and a real fixture incident before screenshots or server-truth evidence can mean anything. The safe next step is a read-only preflight that certifies the auth/fixture prerequisites and current blocked state without creating credentials or mutating data.

## Scope

- Add a read-only preflight for assurance browser auth and fixture readiness.
- Require the assurance smoke wrapper to fail before browser execution without incident id and storage state.
- Require the shared route id to bind the path to `ASSURANCE_SMOKE_INCIDENT_ID`.
- Require incident detail read access to remain protected by `controls.audit.read`.
- Require POS cash-shortage resolution to remain protected by `controls.manage`, fresh auth, audit, and handler-derived tenant scope.
- Require a future auth-state inventory entry and fixture manifest evidence before certification.

## Non-Goals

- Do not create Playwright auth state files.
- Do not seed or mutate Workflow Assurance incidents.
- Do not run browser certification or generate screenshots.
- Do not call the database, activate workers/schedulers/detectors, send alerts, execute rollback, or add product UI.
- Do not authorize AI or WhatsApp as source of truth.

## Expected Verification

- Focused Jest for the new auth/fixture preflight and adjacent Slice 47/48 readiness tests.
- Focused ESLint and typecheck.
- Source-only forbidden runtime/activation scan.

## Expected Decision After Slice

Browser certification remains blocked until a later selected slice creates or points to a real tenant-scoped assurance manager auth state and a real POS cash-shortage incident fixture, then runs browser evidence through the Slice 48 manifest contract.
