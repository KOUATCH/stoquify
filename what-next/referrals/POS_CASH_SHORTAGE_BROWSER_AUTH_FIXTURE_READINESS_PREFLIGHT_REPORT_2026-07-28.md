# POS Cash-Shortage Browser Auth And Fixture Readiness Preflight Report - 2026-07-28

## Scope

Phase 3 / Slice 49 adds a read-only browser auth and fixture readiness preflight for future POS cash-shortage browser certification.

This slice does not create Playwright auth states, seed or mutate Workflow Assurance incidents, run browsers, capture screenshots, resolve incidents, call the database, activate workers/schedulers/detectors, send alerts, execute rollback, or authorize AI/WhatsApp behavior.

## Before

- Slice 48 certified the structured browser evidence manifest contract.
- Real browser certification was still blocked by missing tenant-scoped auth state and missing fixture incident evidence.
- The assurance smoke wrapper already failed before browser execution when incident id or auth state was missing, but no dedicated preflight summarized the full auth/fixture prerequisite set.

## After

- `services/leakage/pos-cash-shortage-browser-auth-fixture-readiness-preflight.ts` classifies browser auth and fixture readiness without touching the filesystem beyond caller-provided inventories.
- The preflight certifies source posture only when:
  - the assurance smoke wrapper requires an incident id;
  - the wrapper requires tenant-scoped storage state before browser execution;
  - the shared route smoke gate binds `assurance-incident-detail` to `ASSURANCE_SMOKE_INCIDENT_ID`;
  - incident detail read remains protected by `controls.audit.read` and handler-derived tenant scope;
  - POS cash-shortage resolution remains protected by `controls.manage`, fresh auth, audit, handler-derived tenant scope, and server-owned source loading;
  - an assurance manager auth state inventory entry exists;
  - a structured fixture manifest proves POS cash-shortage incident identity, `POSSession` source, current source hash, applied source event, approved policy evidence, and read/write permission posture.
- Current live readiness remains blocked because no assurance auth-state inventory entry and no fixture manifest exist.
- `activationAuthorized` remains `false`.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-browser-auth-fixture-readiness-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-browser-evidence-manifest-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-browser-certification-readiness-preflight.test.ts`
  - Passed: 3 suites, 18 tests.
- `npx eslint services/leakage/pos-cash-shortage-browser-auth-fixture-readiness-preflight.ts services/leakage/__tests__/pos-cash-shortage-browser-auth-fixture-readiness-preflight.test.ts`
  - Passed.
- `npm run typecheck`
  - Passed.
- Source-only forbidden runtime scan:
  - `rg -n "chromium\\.launch|newContext|page\\.goto|db\\.|prisma\\.|createSafeAction|router|recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident|CHECK_RUNNERS|scheduleWorkflow|cron|sendAlert|dispatchAlert|rollback|whatsApp|copilot" services/leakage/pos-cash-shortage-browser-auth-fixture-readiness-preflight.ts services/leakage/pos-cash-shortage-browser-evidence-manifest-preflight.ts services/leakage/pos-cash-shortage-browser-certification-readiness-preflight.ts`
  - No matches; `rg` exited 1 because the scan was clean.
- `git diff --check -- services/leakage/pos-cash-shortage-browser-auth-fixture-readiness-preflight.ts services/leakage/__tests__/pos-cash-shortage-browser-auth-fixture-readiness-preflight.test.ts what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_49_SELECTION_REPORT_2026-07-28.md`
  - Passed.

## Certification Decision

Slice 49 is certified as a read-only auth and fixture readiness preflight only.

Real browser certification remains blocked until a later selected slice creates or points to a real tenant-scoped assurance manager auth state and a real POS cash-shortage incident fixture, then produces browser evidence that satisfies the Slice 48 manifest contract.
