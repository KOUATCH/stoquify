# Stoquify Landing Founder Preview Evaluation Report

Date: 2026-07-27  
Status: Implemented and verified  
Preview route: `/[locale]/landing-preview/founder-journey`

## Executive Result

The alternative founder-oriented landing experience is implemented as an isolated, bilingual, noindex route. It does not replace or modify the current landing composition. The proposed page is deliberately shorter and more narrative: seven sections move from the founder's control problem through a four-stage operating journey, real product evidence, buyer pathways, trust boundaries and a qualified adoption path.

The focused source gate, current-page regression gates, TypeScript check, optimized Next.js build and 12-check Playwright comparison all pass.

## What Was Built

1. A localized preview at `/en/landing-preview/founder-journey` and `/fr/landing-preview/founder-journey`.
2. Seven focused sections: Product Command hero, control problem, founder journey, product proof, buyer pathways, OHADA/control trust, and adoption.
3. Four deliberate journey stages: foundation, operation, control and growth.
4. Four outcome-led pathways for retail, inventory, finance and multi-branch leadership.
5. Real redacted Product Command imagery in the hero and proof section.
6. Qualified language that preserves entitlement, provider, country-pack, approval and implementation boundaries.
7. Safe preview navigation only: in-page evidence/adoption links and return links to the current public landing.
8. `noindex`, `nofollow`, `nocache` and Google `noimageindex` metadata.

## Current vs Preview

The current landing remains the comprehensive public product presentation, with its existing module, scenario, workflow and adoption coverage. The preview reduces cognitive load and makes the founder's progression the organizing idea. It starts with the business problem, introduces the operating model in sequence, brings verifiable product evidence forward, and defers broad module detail until the buyer's job is clear.

This is an evaluation route, not a silent redesign of production navigation. The current landing header and footer remain available, while a dedicated concept bar labels the preview and returns reviewers to the current page.

## Verification

| Check | Result |
| --- | --- |
| Focused preview Jest gate | Pass, 5 tests |
| Existing public-content gate | Pass, 7 tests |
| Existing navigation/localization gate | Pass, 5 tests |
| Existing founder-journey gate | Pass, 4 tests |
| Focused ESLint | Pass |
| Browser comparison | Pass, 12/12 checks |
| Locales | English and French |
| Viewports | 390x844, 834x1112, 1440x1000 |
| Screenshots | 12/12 present, decodable and nonblank |
| TypeScript | Pass |
| Optimized Next.js build | Pass |
| Current landing hash contract | Pass, 13/13 files unchanged |

The browser smoke verified 200 responses, no horizontal overflow, no page errors, correct section/stage/pathway counts, loaded product imagery, no unsafe register/dashboard links, no carousel, reduced-motion behavior, keyboard CTA navigation, metadata robots policy, and a first-viewport hint of the next section.

The production build includes `/[locale]/landing-preview/founder-journey` at 2.08 kB route size and 125 kB first-load JavaScript.

## Evidence

- `baseline/current-landing-hashes-before.json`
- `baseline/current-landing-hashes-after.json`
- `baseline/current-landing-routes.json`
- `baseline/screenshots/`
- `comparison/browser-evidence.json`
- `comparison/screenshots/`

## Phase Register

| Phase | Outcome |
| --- | --- |
| Baseline and isolation | Complete |
| Preview architecture and composition | Complete |
| English/French messaging | Complete |
| Product evidence and safe navigation | Complete |
| Source and regression gates | Complete |
| Responsive browser comparison | Complete |
| TypeScript and production build | Complete |

## Residual Launch Risk

1. The preview is intentionally noindex and absent from the public navigation. Promotion requires an explicit product decision and removal or revision of that policy.
2. OHADA, country-pack and commercial wording should receive final legal/domain and go-to-market review before replacing public production copy.
3. The redacted Product Command screenshot is dated 2026-07-18 and should be refreshed when the represented workflow materially changes.
4. Automated browser evidence covers Chromium. WebKit, Firefox, screen-reader and hands-on localization review remain advisable before production promotion.
5. The desktop image viewer was unavailable because of a Windows sandbox helper failure. Playwright DOM assertions plus image decoding, dimensions and pixel-variance checks passed for all screenshots, but a final human visual sign-off is still appropriate.
6. The successful build retained three unrelated existing `next/image` lint warnings and non-blocking `next-intl` cache-analysis warnings; none originate in the preview.

## Decision

The isolated preview is ready for stakeholder evaluation. It is technically buildable, responsive under the tested viewports, bilingual, evidence-backed and reversible because the current landing sources remain byte-for-byte unchanged.
