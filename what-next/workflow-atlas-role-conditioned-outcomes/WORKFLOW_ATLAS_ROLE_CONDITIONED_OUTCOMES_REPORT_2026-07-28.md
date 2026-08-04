# Workflow Atlas Role-Conditioned Outcomes

Date: 2026-07-28  
Status: **READY FOR PUBLIC PREVIEW; PRODUCTION VISUAL SIGN-OFF REQUIRED**

## Scope

The public `/en/workflows` and `/fr/workflows` Workflow Atlas now derives available outcomes from the selected responsibility. The role selector remains a public discovery lens and does not grant, infer, or replace authenticated workspace permissions.

## What Changed

- Added one data-owned filter contract in `components/landing/workflow-atlas-data.ts`.
- Limited outcome controls to outcomes backed by at least one workflow for the selected role.
- Reset an incompatible outcome deterministically to `all` when the role changes.
- Derived recommendations, counts, map links, playbooks, and the live announcement from the same filtered workflow set.
- Added workflow counts to outcome controls and numbered role/outcome decision steps.
- Added grouped control semantics, pressed states, focus retention, contextual authorization copy, and a polite screen-reader status.
- Updated English and French copy with equivalent enterprise language and correct accents.
- Added a rendered interaction test, source-contract test updates, a reusable browser-smoke gate, and package scripts.

## Benchmark Decisions

| Official reference | Decision for Stoquify |
| --- | --- |
| [Asana use cases](https://asana.com/uses) | Adopt concise, outcome-oriented discovery organized by the visitor's working context. |
| [monday.com use cases](https://monday.com/w/use-cases) | Adapt compact team/use-case categories into role-conditioned outcome controls with counts. |
| [Salesforce Flow Orchestration work items](https://help.salesforce.com/s/articleView?id=platform.orchestrator_concepts_work_items.htm&language=en_US&type=5) | Adapt explicit responsibility, handoff, and next-work cues; reject any claim that this public page assigns or executes work. |
| [Salesforce decision outcomes](https://help.salesforce.com/s/articleView?id=sf.orchestrator_ref_elements_decision.htm&language=en_US&type=5) | Adopt deterministic outcome/fallback behavior instead of allowing invalid combinations. |
| [SAP Signavio goal-based navigation](https://help.sap.com/docs/r/beeb6d1bb4c344b4af8b2f42913c5eaa/CLOUD/en-US/682050821117468b9b47d2fe681751e6.html) | Adopt goal-specific starting points and the explicit separation between relevant content and authorized content. |

No competitor wording, layout, customer proof, automation claim, or process-mining claim was copied.

## Verification

| Command or check | Result |
| --- | --- |
| `npm run ui:gate:workflow-atlas` | PASS: 3 suites, 12 tests |
| `npm run typecheck` | PASS |
| Focused ESLint on the three changed TypeScript files | PASS |
| EN/FR/package JSON parse check | PASS |
| `npm run ui:gate:landing-navigation-localization` | PASS: 1 suite, 5 tests |
| `node scripts/workflow-atlas-browser-smoke.js --base-url http://127.0.0.1:3001` | PASS: EN/FR at 390x844 and 1440x1100 |
| Screenshot dimension, opacity, and sampled-color checks | PASS: 8 nonblank PNGs |

The browser smoke proved:

- Initial catalogue: 9 role controls and 13 outcome controls including `all`.
- Cashier catalogue: `all`, `sell`, `stock`.
- Purchasing catalogue: `all`, `buy`.
- Selecting `stock` and then changing to Purchasing resets the selected outcome to `all`.
- Recommendation, map, and library result counts all resolve to the same single Purchasing workflow.
- Keyboard activation retains focus on the selected role.
- No horizontal overflow, clipped controls/headings/links, page errors, console errors, or critical request failures were detected.

## Evidence

- `browser-evidence.json`
- `screenshots/workflow-atlas-decision-en-mobile.png`
- `screenshots/workflow-atlas-decision-en-desktop.png`
- `screenshots/workflow-atlas-decision-fr-mobile.png`
- `screenshots/workflow-atlas-decision-fr-desktop.png`
- `screenshots/workflow-atlas-launchpad-en-mobile.png`
- `screenshots/workflow-atlas-launchpad-en-desktop.png`
- `screenshots/workflow-atlas-launchpad-fr-mobile.png`
- `screenshots/workflow-atlas-launchpad-fr-desktop.png`
- `dev-server.stdout.log`
- `dev-server.stderr.log`

## Residual Risk

- The workflow inventory identifies participating roles but does not distinguish primary owners from supporting participants. The public lens therefore treats every declared role association as equally relevant.
- Filter state is intentionally local and resets on refresh; shareable role/outcome query parameters were not introduced.
- Protected destination authorization was not exercised because this scope is the public discovery surface. Existing copy continues to state that workspace permissions decide access.
- The Codex image viewer was unavailable because its Windows sandbox helper failed. Playwright generated the screenshots successfully, and automated layout plus nonblank pixel checks passed, but a human should review the saved PNGs before production promotion.

## Launch Decision

The role-conditioned behavior, localization, accessibility contract, and focused browser evidence are sufficient for a public preview. Production promotion should wait only for human visual sign-off on the saved screenshots and product confirmation that participating roles may be presented with equal relevance.
