# Verification and rollback plan

## What this run verifies

Source file existence and hashes, saved kit references, selected historical graph evidence, and standalone preview behavior. `evidence/source-snapshot.json` binds this plan to the inspected source. `evidence/preview-checks.json` records artifact results. Preview screenshots are proposals derived from current structure; they are not screenshots of a running production application.

No production tests/build/deployment ran because no application source changed. Existing test results in historical reports are not presented as fresh results.

## Command discovery and safety

`package.json:12` chains secret preflight, `prisma:migrate:deploy:safe` and a build. **Do not run `npm run build` for this branding review.** `build:app` invokes a wrapper that may clean stale `.next` output. It is not needed here. Test script is `jest`; typecheck is `tsc --noEmit --pretty false`.

After implementation, run only the focused checks for the changed slice. Example commands, verified against existing script/test filenames, to be run from the repository:

```powershell
npm run ui:gate:landing-navigation-localization
npm test -- --runTestsByPath scripts/__tests__/landing-public-content.test.js --runInBand
npm test -- --runTestsByPath components/dashboard/__tests__/Sidebar-current.test.tsx components/dashboard/__tests__/dashboard-localization.test.tsx "app/[locale]/(dashboard)/dashboard/__tests__/layout.test.tsx" --runInBand
npm run typecheck
```

For the actual public-route browser smoke, use an already authorized test server and pass its verified URL; do not assume the preview server is the Next application:

```powershell
node scripts/landing-navigation-localization-browser-smoke.js --base-url <verified-test-server-url> --out docs/branding/adoption/evidence/landing-browser.json --screenshots-dir docs/branding/adoption/evidence/landing-screenshots
```

The placeholders must be replaced before execution. The existing smoke covers landing anchors/navigation; add focused visual/state checks where it does not cover branding. The above commands are a future verification plan, not claims of passing execution.

## Acceptance matrix

|Area|Checks|Evidence / rejection condition|
|---|---|---|
|Asset|All lockups and transparent variants; 16/24/32/48 icons; narrow sidebars|Reject clipping, wrong aspect ratio, broken images or rejected S variants|
|Fonts|Local requests only; accents; tabular monetary figures; fallback/offline|Reject missing glyphs, duplicate downloads or altered value formatting|
|Theme|Light/dark; hover/focus/disabled; popover/dialog portals; hard-coded legacy overrides|Reject white-on-mint text, invisible focus or inconsistent portal theme|
|Semantic colors|Warnings, errors, success, information, signed values and charts|Reject citron used as warning replacement or color-only meaning|
|Landing|EN/FR; logged-out/logged-in header; every actual section anchor; CTA destinations|Reject navigation/conversion changes or unsupported new claims|
|Auth|Login/register/recovery/invite/unauthorized, invalid/pending/disabled states|Reject altered auth responses, hidden errors or duplicate submission behavior|
|Shell|Current destination, collapsible groups, search, role/module filtering, mobile Escape/focus|Reject wider link visibility, lost selection or broken return focus|
|Data|Overview/inventory/operations, unavailable/error/empty/loading, refresh|Reject invented values, stale-as-live labels, changed permissions or calculations|
|Documents|Merchant identity, amount/currency/legal fields, pagination, print contrast|Reject substituted issuer or altered export data|
|Email|Correct aspect, absolute origin, blocked images and client fallbacks|Reject unreadable logo or token/message behavior changes|

Measure real text pairs against 4.5:1 normal text or 3:1 large text, and relevant control boundaries/focus indicators against 3:1. Keep labels/icons with statuses. The kit's existing contrast file is a starting point, not full WCAG evidence.

## Rollback

Create a phase-specific patch before implementation and record asset hashes. Keep old compatible asset URLs or versioned masters until rollout stabilizes. Remove only the new scope or revert the phase patch on failure. Never use a broad working-tree reset, restore unrelated files, change grants, replay migrations or modify provider settings for a visual rollback.

Source checks in this run cover the monitored files only; other user/agent work may continue elsewhere in this large working tree. Full screen-reader testing, role-authenticated browser journeys and printer/email-client proofs remain future implementation gates.
