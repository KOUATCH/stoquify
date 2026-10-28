# Stoquify Landing Founder Journey Execution Report

Date: 2026-07-27  
Scope: Accio-inspired early-stage founder progression adapted to Stoquify's public landing page  
Implementation status: **Complete for the focused slice**  
Repository launch status: **Blocked by an unrelated HRIS production-build failure**

## Decision

The founder journey was integrated into the existing `OperationsMap` buyer-pathway section. No new top-level homepage section or carousel was added.

This placement was selected because it:

- preserves the current page composition;
- keeps the founder narrative next to real buyer pathways;
- routes one qualified CTA to `/#pricing`;
- avoids another direct `/register` or protected-dashboard path;
- leaves Product Command, trust, workflow, scenarios, and pricing ownership unchanged.

The Accio pattern was adapted only as a progression model. No Accio wording, assets, sourcing claims, testimonials, metrics, or trade dress were copied.

## Phase Progress

| Phase | Status | Changes completed | Verification | Evidence | Blockers | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 0. Evidence and planning | PASS | Reviewed the Accio pattern, current landing structure, 9+ report, messages, tests, smoke conventions, and graph report | Placement decision recorded before edits | This report and saved prompt | None | Preserve the decision boundary |
| 1. Information architecture | PASS | Selected existing `OperationsMap`; no top-level section added | Page source contains one existing `OperationsMap` mount | Focused Jest contract | None | None |
| 2. Content and interaction | PASS | Added four ordered EN/FR stages, readiness boundaries, icons, and qualified CTA | JSON parse and locale contract pass | `messages/en.json`, `messages/fr.json` | Human copy sign-off remains external | Obtain human Francophone review before launch certification |
| 3. Surgical implementation | PASS | Added a responsive, non-carousel journey rail inside the existing section | Typecheck and focused ESLint pass | Component and screenshots | None | None |
| 4. Focused tests | PASS | Added isolated Jest gate and package command | 4/4 new tests pass; 17/17 relevant existing landing tests pass | Jest command results | None | Keep gate in CI selection |
| 5. Browser certification | PASS | Added dedicated Playwright smoke for EN/FR at three viewports | 6/6 browser cases pass | Browser JSON and six screenshots | Manual image viewer unavailable in this run | Retain screenshots for reviewer sign-off |
| 6. Release verification | PARTIAL | Typecheck and focused checks pass | `build:app` reached compilation and failed in unrelated HRIS actions | Build finding below | Existing HRIS Server Action compile errors | Correct HRIS actions in their owning workstream, then rerun build |

## Implemented Experience

The section now presents four deliberate stages:

1. Shape the operating model.
2. Run the core operation.
3. Establish financial control.
4. Grow with governed visibility.

Each stage includes a public capability statement and an explicit readiness boundary. The final stage qualifies HRIS, payroll, compliance, and automation as gated extensions rather than instant capabilities.

## Verification Results

| Command or check | Result | Detail |
| --- | --- | --- |
| JSON parse for EN, FR, and `package.json` | PASS | All edited JSON is valid |
| `npm run ui:gate:landing-founder-journey` | PASS | 4/4 tests |
| `npm run ui:gate:public-content` | PASS | 7/7 tests |
| `npm run ui:gate:landing-refinement` | PASS | 5/5 tests |
| `npm run ui:gate:landing-navigation-localization` | PASS | 5/5 tests |
| `npm run ui:smoke:landing-founder-journey` | PASS | 6/6 EN/FR viewport checks |
| Screenshot integrity | PASS | Six readable, nonblank PNGs; mobile, tablet, and desktop dimensions recorded |
| Focused component ESLint | PASS | No findings |
| Browser-smoke syntax check | PASS | No findings |
| Focused `git diff --check` | PASS | No whitespace errors; existing CRLF normalization warning for `package.json` only |
| First `npm run typecheck` | TIMED OUT | No compiler error emitted before the 244-second limit |
| Second `npm run typecheck` | PASS | Completed in the extended bounded run |
| `npm run build:app` | BLOCKED | Unrelated HRIS Server Action compile errors |

## Browser Evidence

- Machine-readable results: `what-next/ui-ux/landing-founder-journey/2026-07-27/browser-evidence.json`
- Screenshots: `what-next/ui-ux/landing-founder-journey/2026-07-27/screenshots/`
- Dev-server logs: `what-next/ui-ux/landing-founder-journey/2026-07-27/dev-server.log`

The smoke verified four stages, stage order, localized title, keyboard CTA activation, `#pricing` destination, reduced-motion preference, zero founder-section carousels, no horizontal overflow, no clipped stage content, no stage overlap, no page errors, no console errors, and no failed critical document/script/style/image requests.

## Residual Launch Risk

1. **High: production build is blocked outside this slice.** `actions/hris/operational-time.actions.ts` contains non-async callbacks exported through a `use server` module at lines 63, 74, 85, 96, 107, 118, 129, and 140. This pre-existing concurrent HRIS work was not modified.
2. **Medium: full landing 9+ closure remains broader than this task.** The existing completion plan still governs homepage compression, trust depth, product routes, SEO, performance, and final certification.
3. **Low: human French/OHADA copy review remains pending.** Automated parity, accents, text fit, and browser behavior pass, but final native-quality sign-off requires a qualified reviewer.
4. **Low: manual screenshot viewer was unavailable.** The sandbox image helper failed, but Playwright layout checks and independent PNG dimension/nonblank checks passed; all six captures are retained.

## Rollback Boundary

Rollback is limited to the founder rail in `components/landing/operations-map.tsx`, the two `founderJourney` locale objects, the two focused package scripts, and the new Jest/smoke files. No database, service, permission, entitlement, protected route, or accounting behavior changed.
