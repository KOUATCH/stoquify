# Referral War Room Phase 3 Slice 51 Selection Report

Date: 2026-07-28

## Selected Slice

Phase 3 / Slice 51: POS cash-shortage production activation browser-certification gate ratchet.

## Decision

Select one read-only contract refinement: make the production activation preflight require the Slice 50 browser certification gate as explicit activation evidence.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` reports Phase 3 / Slice 50 certified and no Slice 51 preselected.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` currently enumerates production activation requirements through owner/security approval, but does not require browser certification gate evidence.
- `services/leakage/pos-cash-shortage-browser-certification-gate-preflight.ts` already composes browser readiness, auth/fixture readiness, and structured evidence manifest preflights while preserving `activationAuthorized: false` and `promotionAuthorized: false`.
- Referral roadmap sources emphasize service-owned proof, evidence, RBAC, audit, and release-verifiable controls before product experience, AI, or WhatsApp automation.

## Why This Slice

Without this ratchet, a future caller could provide the existing production activation evidence booleans and receive `status: "ready"` without proving the browser certification gate. The smallest safe next step is to add a named `browser_certification_gate` requirement to the production activation contract.

## Scope

- Update `services/leakage/pos-cash-shortage-production-activation-preflight.ts` to require `browserCertificationGateCertified` evidence.
- Update focused and adjacent tests that construct `PosCashShortageProductionActivationEvidence`.
- Add a focused regression proving legacy all-true activation evidence still blocks without browser certification gate evidence.
- Preserve no-activation behavior: no worker, scheduler, route, action, incident command, alert delivery, browser run, fixture mutation, AI authority, or WhatsApp authority.

## Expected Verification

- Focused production activation preflight Jest.
- Related browser certification gate and activation evidence contract Jest.
- Typecheck.
- Focused ESLint on touched leakage files.
- Source-only forbidden activation scan.
- Scoped hygiene checks, with untracked file caveat recorded if applicable.

## Non-Goals

- Do not run Playwright.
- Do not create auth states, fixtures, screenshots, or manifests.
- Do not enable the POS cash-shortage definition.
- Do not run or schedule workers.
- Do not add UI, routes, alerts, AI, or WhatsApp behavior.
