# POS Cash-Shortage Browser Evidence Manifest Preflight Report - 2026-07-28

## Scope

Phase 3 / Slice 48 adds a structured browser evidence manifest preflight for future POS cash-shortage browser certification.

This slice is read-only. It does not run Playwright, create auth state, create fixture incidents, write screenshots, resolve incidents, call the database, start workers, schedule jobs, send alerts, execute rollback, activate production detection, or grant AI/WhatsApp authority.

## Before

- Slice 47 created the assurance incident-detail browser smoke harness and package script.
- Browser certification readiness still depended on loose manifest text for desktop/mobile, screenshot, accessibility/layout, and server-truth proof.
- A later browser execution slice needed a stricter evidence contract before real browser output could be considered certification evidence.

## After

- `services/leakage/pos-cash-shortage-browser-evidence-manifest-preflight.ts` evaluates structured JSON browser evidence.
- Certification requires:
  - valid JSON manifest;
  - route id limited to `assurance-incident-detail`;
  - tenant-scoped assurance auth state path;
  - non-placeholder fixture incident id;
  - successful mobile and desktop screenshots;
  - screenshot files under `what-next/referrals/screenshots/assurance-incident-detail/`;
  - zero serious and critical accessibility findings;
  - no horizontal overflow, clipped controls, or overlapping controls;
  - server-confirmed protected POS action truth with current source hash verification;
  - explicit proof that the browser did not author terminal truth.
- `services/leakage/pos-cash-shortage-browser-certification-readiness-preflight.ts` now uses this structured manifest preflight for evidence-bearing browser requirements.
- The current live readiness state remains blocked because no real auth state, browser screenshots, accessibility/layout result, or server-truth manifest exists.
- `activationAuthorized` remains `false`.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-browser-evidence-manifest-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-browser-certification-readiness-preflight.test.ts`
  - Passed: 2 suites, 12 tests.
- Adjacent Slice 47 harness/readiness guardrails:
  - `npm test -- --runInBand scripts/__tests__/workflow-assurance-browser-smoke.test.js scripts/__tests__/ui-route-smoke-gate.test.js services/leakage/__tests__/pos-cash-shortage-browser-certification-readiness-preflight.test.ts`
  - Passed: 3 suites, 21 tests.
- `npx eslint services/leakage/pos-cash-shortage-browser-evidence-manifest-preflight.ts services/leakage/__tests__/pos-cash-shortage-browser-evidence-manifest-preflight.test.ts services/leakage/pos-cash-shortage-browser-certification-readiness-preflight.ts services/leakage/__tests__/pos-cash-shortage-browser-certification-readiness-preflight.test.ts`
  - Passed.
- `npm run typecheck`
  - Passed.
- Source-only forbidden runtime scan:
  - `rg -n "chromium\\.launch|newContext|page\\.goto|db\\.|prisma\\.|createSafeAction|router|recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident|CHECK_RUNNERS|scheduleWorkflow|cron|sendAlert|dispatchAlert|rollback|whatsApp|copilot" services/leakage/pos-cash-shortage-browser-evidence-manifest-preflight.ts services/leakage/pos-cash-shortage-browser-certification-readiness-preflight.ts`
  - No matches; `rg` exited 1 because the scan was clean.
- `git diff --check -- services/leakage/pos-cash-shortage-browser-evidence-manifest-preflight.ts services/leakage/__tests__/pos-cash-shortage-browser-evidence-manifest-preflight.test.ts services/leakage/pos-cash-shortage-browser-certification-readiness-preflight.ts services/leakage/__tests__/pos-cash-shortage-browser-certification-readiness-preflight.test.ts what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_48_SELECTION_REPORT_2026-07-28.md`
  - Passed.

## Certification Decision

Slice 48 is certified as a structured browser evidence manifest preflight only.

Real browser certification remains blocked until a later selected slice produces real tenant-scoped auth, an existing incident fixture id, mobile/desktop screenshots, accessibility/layout evidence, and server-confirmed no-browser-authored-truth evidence that satisfies this manifest contract.
