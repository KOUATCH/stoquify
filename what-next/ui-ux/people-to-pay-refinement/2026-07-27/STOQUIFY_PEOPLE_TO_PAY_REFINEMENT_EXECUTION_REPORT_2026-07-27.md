# Stoquify People to Pay Refinement Execution Report

Date: 2026-07-27  
Status: Implemented and verified  
Surface: `/#people-to-pay`

## Executive Result

The landing page's People to pay section now communicates one controlled, understandable journey:

**Trusted people record → approved pay inputs → pay and declare → post and close**

The former four-column feature summary has been replaced with a semantic ordered flow. Every checkpoint names its owner, the information entering the stage, the evidence leaving it, and the relevant readiness boundary. The implemented HRIS foundation and the qualified payroll extension are now visibly distinct.

The work remains confined to public presentation, translation contracts, and focused verification. No HRIS, payroll, payment, accounting, permission, service, action, or database behavior was changed.

## What Changed

1. Rewrote the headline and supporting copy around the buyer outcome rather than internal architecture.
2. Added a one-line operating promise that explains the custody model before the detailed flow.
3. Rebuilt the four stages as an ordered `<ol>` with explicit owner, input, evidence, and status semantics.
4. Added visible directional handoffs on desktop and a sequential vertical path on smaller screens.
5. Distinguished the available HRIS foundation from country-, provider-, authority-, accounting-, and release-gated payroll extension.
6. Preserved `id="people-to-pay"`, `data-people-to-pay`, the landing navigation contract, and two review-safe `/#pricing` CTAs.
7. Rewrote the complete section in natural English and accented French with structurally equivalent keys.
8. Added a dedicated Jest contract and Playwright browser smoke.
9. Corrected two stale assertions in the existing landing-refinement smoke: the removed public HRIS dashboard link and the established four-slide desktop workflow layout.

## Before and After

Before, the section presented four equal feature columns followed by a dense status panel. The technical distinction was correct, but visitors had to read most of the copy to understand the relationship.

After, the page establishes the causal chain first. A visitor can scan:

- who owns the source truth;
- what is allowed to move to the next stage;
- what evidence must come out;
- which parts are available, controlled, or dependency-gated.

The section is taller on mobile because it exposes the evidence contract instead of hiding it. The mobile sequence remains ordered, unclipped, and free of horizontal overflow.

## Verification

| Check | Result |
| --- | --- |
| Focused People to pay Jest gate | Pass, 5 tests |
| Focused ESLint and script syntax | Pass |
| Existing landing-refinement gate | Pass, 5 tests |
| Existing public-content gate | Pass, 7 tests |
| Existing navigation/localization gate | Pass, 5 tests |
| Focused responsive browser smoke | Pass, 6/6 |
| Full landing-refinement browser regression | Pass, 6/6 |
| TypeScript | Pass |
| Production output inspector | Pass, valid standalone build |
| Production-build browser smoke | Pass, 6/6 with HTTP 200 |
| Baseline/after image validation | Pass, 12/12 decodable and color-diverse |

The focused browser smoke covered English and French at:

- Mobile: 390 × 844
- Tablet: 834 × 1112
- Desktop: 1440 × 1000

It verified the exact stage order, semantic ordered-list structure, eight definition terms and values, implemented and gated status bands, safe links, keyboard CTA activation, reduced-motion preference, responsive direction, no carousel, no overlap, no clipping, no horizontal overflow, and zero critical browser errors.

## Build Note

`npm run build:app` exceeded the caller's 15-minute command window while Next.js continued its final tracing phase. The wrapper and child remained active and completed before the wrapper's own 30-minute limit. Post-build verification then confirmed:

- `.next` state: `valid`
- Standalone output: present
- Build ID: `NN3-SPCBCSw0jx_MW0CMe`
- Production server: started successfully on an isolated port
- Production People to pay smoke: 6/6 checks passed with HTTP 200

The isolated production verification server was stopped after the smoke. The user-owned port-3000 process was not stopped or replaced.

## Evidence

- `baseline/source-baseline.json`
- `baseline/browser-evidence.json`
- `baseline/screenshots/`
- `comparison/source-after.json`
- `comparison/browser-evidence.json`
- `comparison/screenshot-metrics.json`
- `comparison/screenshots/`
- `regression/landing-refinement-browser-evidence.json`
- `regression/screenshots/`
- `production/browser-evidence.json`
- `production/screenshots/`
- `production/server.stdout.log`
- `production/server.stderr.log`

## Residual Launch Risk

1. Final public payroll, provider, authority, country-pack, and OHADA wording still warrants domain and legal review.
2. Automated browser evidence covers Chromium. Firefox, WebKit, screen-reader, and hands-on keyboard review remain appropriate before a production promotion.
3. The desktop image viewer was unavailable because of the Windows sandbox helper failure. DOM/layout checks and pixel validation passed, but stakeholder visual sign-off is still required.
4. The explicit mobile evidence path is longer than the former summary. A moderated mobile usability review should confirm that the additional clarity justifies the scroll depth.
5. The section continues to promise only a controlled local pilot where supported. Unrestricted payroll production remains dependent on final environment, provider, authority, privacy, accounting, deployment, and release evidence.

## Decision

The redesigned People to pay section is technically ready for stakeholder review. It is bilingual, responsive, accessible in structure, truthful about readiness, regression-tested, and proven against the completed production build.
