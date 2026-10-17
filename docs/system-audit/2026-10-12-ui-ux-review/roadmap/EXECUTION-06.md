# Delivery 06 — recommendation alignment, navigation feedback and French destinations

Date: 2026-10-13. Base HEAD: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`, with pre-existing local changes. This is a local implementation and bounded acceptance report, not a deployment or whole-roadmap completion.

## Changes

1. The owner brief now selects its conclusion and main action together. Cash risk (including an unavailable amount) leads to cash-suspense review; otherwise close blockers lead to close review, then upcoming payroll obligations lead to the payroll command center. Labels name the task in EN/FR. Missing read permission disables the recommended action with an explanation; it does not substitute an unrelated accessible task. A freshness-only or clear brief does not display an unrelated queue CTA. Priority actions remain independently ranked.
2. The purchase-order destination was not a broken route: clicking the owner queue link eventually reached the purchase-order register. The apparent stall was a navigation interval without visible feedback. Shared BI links now show the actual Next router pending state, with localized “Opening…” text, and the purchase-order route has a localized loading boundary. This does not claim to reduce database latency or repair an unproven server fault. The installed Next 15 link declarations and implementation expose `useLinkStatus`; no dependency upgrade was introduced.
3. French destination interface copy now covers payroll command, payments/recovery, register and declarations: headings, metrics, table/filter labels, empty/error frames, dates, known status labels, readiness summaries, proof controls, and the embedded recovery/authority/pilot controls. Payroll page metadata also follows the route locale. Inventory items now have French catalogue/filter/metric/action/loading labels, and loss-control copy has corrected French accents and casing.

Presentation keeps raw amounts, currencies, IDs, hashes, redactions, period names and custom evidence unchanged. Known display enums are translated without changing the raw enum used for state, tone or authorization. In particular, RELEASED is “Transmis” and SETTLED is “Réglé”; release is not described as settlement. Unknown source text remains verbatim, rather than being guessed or rewritten.

## Scope and controls

Source inspected: owner composer and action contracts; BI action control; payroll route guards and read-model components; payroll command readiness source; inventory page and loss dictionary; purchase-order route and loading primitive; installed Next link API. Existing graph report `graphify-out/GRAPH_REPORT_components.md` references `payroll/PayrollCommandCenter.tsx`; it is dated discovery evidence only. Behavior was checked against current source.

Applied the UIUX orchestrator and project UI/UX Pro Max guidance, design master, UI constitution/component registry and inventory contract. This continues the user-authorized UX02/UX03 fixes and destination copy slice; it does not certify later roadmap phases. No new visual system or palette was introduced.

No service queries, financial mutations, permissions, tenant scopes, redaction decisions, settlement payloads, step-up checks, replay controls, approvals or module guards were changed. The owner action metadata uses canonical module slugs and existing read permissions. Destination server guards still decide access.

Existing content was captured before each owned edit in `evidence/delivery-06-baseline.json`. The final owned patch is relative to that baseline, not to HEAD; unrelated changes must be preserved.

## Verification

Commands were inspected against `docs/ecc/command-registry.json`. New component lanes were reviewed separately: installed Next Jest transform without application configuration, explicit test roots, mocked protected actions, no environment/DB/global application setup. ESLint reads the existing Next configuration; syntax inspection parses owned TS/TSX. Neither command runs build hooks.

| Evidence class | Result |
|---|---|
| Workflow contract | `npm run agent:workflow:check` passed; 198 scripts remain unclassified and were not run |
| Mocked owner service/action/route and pure presentation | 64 tests passed in 4 suites; recommendation priority, unavailable vs zero, denied recommendation, immutable inputs and EN/FR covered |
| Mocked payroll components and pure localization | 39 tests passed in 6 suites; French populated/empty/error states, preserved source objects, loading announcement, English fallback, release vs settlement labels and unknown text covered |
| Navigation/owner UI components | 49 tests passed in 5 suites; actual pending-state presentation is mocked, link destinations/query/hash/context and disabled reasons retained |
| Syntax / scoped ESLint | 28 owned TS/TSX files parsed with no syntax errors; scoped ESLint passed |
| Isolated semantic experiment | Inconclusive: `noResolve` intentionally omits imported React/domain types and produced 8 missing-type-derived diagnostics. Not counted as TypeScript certification |
| Real database tests | Not run |
| Full application build, migration, seed, deployment | Not run |

Commands: installed `node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/<config> --runInBand --no-cache`, using `jest.owner-localization.config.cjs`, `jest.destination-localization.config.cjs`, and `jest.command-center.config.cjs`. JSON results are in `evidence/delivery-06-{owner,destination,navigation}-tests.json`.

An initial new test-suite run failed to load the ESM icon library. The isolated icon mock was added and the final lane passed. Scoped diff checking found whitespace introduced in locale props; those lines were corrected.

## Browser evidence and gaps

Browser: Edge. Session: SUPER ADMIN, Wilkinson - Feeney 001. Locale: FR. Dark theme. Screenshot dimensions: 1523 × 733; no explicit viewport override. No business controls were submitted.

| Route / state | Observation |
|---|---|
| `/fr/dashboard/owner-war-room`, populated blocked/stale brief, before edit | Cash recommendation paired with an accounting-close main link; mismatch reproduced |
| Owner Pilotage → `/fr/dashboard/purchase-orders`, populated register, before edit | Click initially left the owner view visible; a later observation confirmed the actual register, “Bons de commande” and its rows. The link resolved successfully |
| `/fr/dashboard/payroll`, populated command center, after localization | French title/metadata, metric captions, “Non évalué”, “Non prêt”, readiness explanation, pilot gate, blocker/action panels, run/payment/declaration/close panels, release, adapter and freshness headings observed. Screenshot and AX evidence appeared inline in the chat |
| `/fr/dashboard/payroll/payments`, after edits | Navigation and observation repeatedly timed out; final rendered result not established |
| French register/declarations and inventory items/loss-control after edits | Current source/component evidence only in this delivery; rendered acceptance remains open |
| Owner CTA and purchase-order pending state after edits | Regression/source evidence passed; fresh live confirmation remains open |

Browser recovery used the documented selected-browser path and a fresh audit tab; it also timed out. No alternate browser-control stack, user browser termination or sign-in changes were used. Previous delivery’s rendered destination observations are not relabelled as new post-change proof.

## Remaining acceptance

- Finish live checks of the new owner CTA, visible pending indicator, all six French destination surfaces, keyboard navigation and narrow viewports once browser control responds.
- Repeat with actual owner, accountant and operator roles. SUPER ADMIN and mocked denial cases do not establish restricted-role acceptance.
- Detailed service-authored blockers, technical evidence/policy identifiers and unknown custom messages are preserved verbatim. This delivery is not a guarantee that every string in every payroll module is translated.
- Obtain a full semantic typecheck in the established engineering lane; no full build is claimed.

Rollback: reverse only `evidence/delivery-06-owned.patch`, after checking for subsequent changes. Do not reset these files to HEAD, because their starting versions already contained unrelated and earlier delivery work. The manifest records final content hashes for review.
