# Referral War Room Phase 3 Slice 52 Selection Report

Date: 2026-07-28

## Selected Slice

Phase 3 / Slice 52: POS cash-shortage browser certification gate activation-evidence contract.

## Decision

Select one read-only contract bridge: compose the Slice 50 browser certification gate result into the new Slice 51 production activation evidence field without granting activation authority.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` reports Slice 51 certified and no Slice 52 preselected.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` now requires `browser_certification_gate` via `browserCertificationGateCertified`.
- `services/leakage/pos-cash-shortage-browser-certification-gate-preflight.ts` certifies only when browser readiness, auth/fixture readiness, and structured evidence manifest preflights all certify, and it always reports `activationAuthorized: false` and `promotionAuthorized: false`.
- Existing activation evidence contracts compose individual preflight outputs into narrowly scoped production activation evidence without satisfying unrelated requirements.

## Why This Slice

Slice 51 added the required production activation evidence field, but no local composer describes when the browser gate is allowed to satisfy that field. The smallest safe next step is to define that composition rule and prove it can satisfy only `browser_certification_gate` while all other production activation requirements remain blocked.

## Scope

- Add `PosCashShortageBrowserCertificationGateActivationEvidence` and `composePosCashShortageBrowserCertificationGateActivationEvidence` to the browser gate preflight module.
- Require `browserCertificationGateCertified === true`, `activationAuthorized === false`, and `promotionAuthorized === false` before setting production activation evidence to true.
- Add focused tests for certified, blocked, and authority-claiming gate outputs.
- Add a production activation preflight integration test proving the composed evidence can satisfy only `browser_certification_gate`.

## Expected Verification

- Focused browser certification gate preflight Jest.
- Related production activation preflight Jest.
- Related activation evidence composer Jest for neighboring contracts.
- Typecheck.
- Scoped ESLint.
- Source-only forbidden runtime scan.
- Scoped hygiene checks, with dirty/untracked worktree caveats recorded.

## Non-Goals

- Do not run Playwright.
- Do not create auth states, fixtures, screenshots, or evidence manifests.
- Do not enable the POS cash-shortage definition.
- Do not run or schedule workers.
- Do not add routes, actions, UI, alerts, rollback execution, AI, or WhatsApp behavior.
