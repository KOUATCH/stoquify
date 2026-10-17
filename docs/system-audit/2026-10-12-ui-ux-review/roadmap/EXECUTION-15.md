# Delivery 15 — French accountant access and portal

Date: 15 October 2026. Status: implemented locally, with actual Accountant browser checks; broader role and release acceptance remains open. Unrelated working-tree edits are preserved.

## Delivered behavior

- Accountant Access now uses French page headings, form labels, consent explanations, roles, grant statuses, expiry dates, table controls and action outcomes. English remains supported. Required consent evidence and expiry, raw role values, datetime-to-ISO conversion, authorization and revocation eligibility remain unchanged. Expired access is described as expired rather than incorrectly claiming revocation. Outcomes are announced through a status region.
- The portal translates known trust explanations, blockers, severity, module headings, facts, provenance and recorded statuses at the presentation boundary. French percentage formatting displays `97,5 %` without changing the supplied number or precision. Unknown evidence text falls back unchanged; identifiers and diagnostic evidence remain inspectable. This is not a guarantee that future service strings are translated.
- Blocker control identifiers are available under a disclosure. Long metric and module labels wrap. Financial figures remain withheld when critical blockers exist; certified export remains disabled at T0.
- French blocker search now searches the translated narrative. A failing component test exposed that the shared search bar searches raw row values rather than rendered column accessors. A local derived search field fixes this without changing shared table behavior or source evidence.

The Access read-failure state retains the safe action error and adds a localized explanation; it does not render an empty register or an invitation form on a failed read. Arbitrary server error text is not translated speculatively. Native browser datetime placeholders can still follow browser language preferences. The shared shell's `Accountant` role badge remains English and is a separate follow-up.

## Live coverage

Application: `http://localhost:3000`, existing Edge Accountant session, existing dark presentation. Dimensions below are measured CSS viewports. No Owner or Cashier session was available; Chrome also showed Accountant at inspection. An Owner sign-in handoff was requested in Chrome, keeping Edge for Accountant checks. Firefox was unavailable to the browser tool.

| Route | Locale / viewport | State and evidence |
|---|---|---|
| `/fr/dashboard/accounting/accountant-access` | FR / desktop 1542×802 | Empty access register and complete localized form rendered. Screenshot inspected. No grant or invitation submitted. |
| Same Access route | FR / phone 390×844 | Document scroll width 371; main width about 370.83. All seven fields and search remained within the page. Tab from email reached the firm-name field. Phone screenshot timed out; geometry and focus checks are not a visual acceptance pass. |
| Same Access route | FR / tablet 1024×767 | Document scroll width 1005; no page-wide horizontal overflow. Geometry saved. |
| `/fr/dashboard/accounting/accountant-portal` | FR / desktop 1542×802 | T0 Non conforme, 12 blockers, 80 posted entries and 78 linked entries rendered. Export disabled and unavailable financial figures preserved. Translated recorded status verified. Screenshot inspected. |
| Same portal route | FR / desktop, search | Searching `écritures comptabilisées` returned the two relevant source-link/posting-batch blockers. Search cleared afterward. |
| Same portal route | FR / phone 390×844 | Document scroll width 371. Three named table regions each contained 1040 px content in a 305 px scroll region; no page-wide horizontal overflow. Geometry saved. |
| Same portal route | FR / tablet 1024×767 | Document scroll width 1005; no page-wide horizontal overflow. Geometry saved. |
| `/en/dashboard/accounting/accountant-portal` | EN / desktop 1542 px wide | Language switch reached English portal with the same blocked certification state. `97.5%` retained; export disabled. DOM evidence saved. |
| `/fr/dashboard/accounting/accountant-portal` after returning from EN | FR / desktop 1542 px wide | Final formatting verified: both percentage occurrences display `97,5 %`; export remains disabled; document scroll width 1523. |
| Owner / Cashier | All locales / sizes | Actual sessions unavailable. Accountant and earlier SUPER_ADMIN observations cannot substitute for these roles. |

Temporary viewport overrides were reset and normal desktop dimensions confirmed. No browser zoom was changed. The portal desktop screenshot and responsive measurements precede only the final percentage typography change; the final French DOM observation verifies that change. Exact 1440×900, complete phone/tablet visual review, light theme, zoom, screen reader, touch ergonomics and the full role/state matrix remain unaccepted.

## Evidence and browser limitations

- [French Access desktop](evidence/delivery-15-access-fr-desktop.png), [Access DOM](evidence/delivery-15-access-fr-dom.txt), [tablet geometry](evidence/delivery-15-access-tablet.json).
- [French portal desktop](evidence/delivery-15-portal-fr-desktop.png), [portal DOM before percentage formatting](evidence/delivery-15-portal-fr-dom.txt), [responsive geometry](evidence/delivery-15-portal-responsive.json).
- [English portal read](evidence/delivery-15-portal-en-dom.json), [final French formatting and disabled export](evidence/delivery-15-portal-fr-final.json).
- [Mocked test results](evidence/delivery-15-tests.json).

A fresh tab in the same Edge browser recovered inspection when an existing tab's navigation stalled. Intermittent navigation and screenshot timeouts continued; the connection is usable but not certified as permanently repaired. Browser-tool telemetry emitted unrelated third-party network errors. These do not prove a Stoquify application defect or explain the timeouts. No extension reinstall, protection change, cache deletion, browser process termination or application-server restart was performed.

## Verification by layer

**Source inspection:** current Access page/manager, portal, shared table/search, action/read-model contracts and existing tests reviewed. Static comparison covered current service labels and counted narrative patterns; future unknown text intentionally remains unchanged. Existing graph evidence was used for discovery and corroborated with source. ECC workflow, design master, UI constitution and relevant AP/payment controls were read; no dedicated Accountant page contract was found in the inspected set. Project UI/UX Pro Max guidance on labels and feedback was applied.

**Workflow:** `npm run agent:workflow:check` passed, exit 0; 196 scripts remain unclassified. Current command definitions, hooks and registry were reviewed before verification. No migration-bearing build was used.

**Mocked tests:** 16 tests passed across three suites. Coverage includes required consent/expiry, raw role values, allowed revocation states, unchanged expiry evidence and payloads, expiry-race outcomes, French search, unknown-text fallback, count/percentage preservation, blocked export, withheld figures, loading/failed reads and denied-page behavior. Actions, hooks and access guards are mocked. These tests do not certify actual server authorization or real transactions.

**Static checks:** scoped TypeScript passed with `noEmit`; the final production-file lint run passed. The isolated Jest config uses jsdom and installed CJS icon exports; it does not load application database setup. No full-project build or full-suite result is claimed.

**Rendered checks:** actual Accountant normal-read states and limited responsive/focus behaviors are listed above. Error, denied, populated-access and consent transition coverage is mocked, not a live browser observation.

**Real database tests:** not run. No invitation, grant, revoke, export, business transaction, migration, seed, deployment or commit was performed. Ordinary application reads may generate audit records, as the portal's audit trail itself shows.

Commands:

```text
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.accountant-localization.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/delivery-15-tests.json
node node_modules/typescript/bin/tsc --project docs/system-audit/2026-10-12-ui-ux-review/roadmap/tsconfig.accountant-localization.json --pretty false
node node_modules/eslint/bin/eslint.js components/accounting/AccountantAccessManager.tsx components/accounting/AccountantPortal.tsx components/accounting/accountantAccessCopy.ts components/accounting/accountantPortalCopy.ts "app/[locale]/(dashboard)/dashboard/accounting/accountant-access/page.tsx"
```

## Remaining acceptance work

1. Actual Owner: inspect first-screen priorities and recommendation/action alignment, then purchasing, inventory and payroll destinations in EN/FR across phone/tablet/desktop. Record role, state, destination and retained context. Requires an existing Owner session, not changed permissions.
2. Actual Cashier: inspect daily dashboard, POS entry/recovery, allowed navigation and denied accountant destinations in EN/FR at the same sizes. Do not submit a sale or change shifts to manufacture coverage.
3. Complete visual and accessibility coverage: final screenshots at required sizes, keyboard navigation through table/disclosure controls, light theme, zoom and screen reader. Use isolated fixtures for populated grants, denied/error/expired states and consent actions.
4. Shared follow-ups: inspect hardcoded dashboard loading copy and finance skeleton semantics under their contracts; localize the shared role badge. These remain separate from the delivered Accountant surfaces.
5. Localization maintenance: unknown service text must remain truthful; add reviewed translations when service vocabulary changes. A dedicated bilingual review of specialist accounting terminology remains desirable before release.

## Ownership and rollback

Pre-edit bytes and hashes are in `evidence/delivery-15-baseline.json`. The owned patch is relative to that already-dirty baseline, not HEAD. `evidence/delivery-15-owned.patch` covers the five production files, three test files, two scoped configurations and this report/roadmap; `evidence/delivery-15-files.json` records final hashes. Evidence artifacts are retained separately. Reverse only owned changes after checking later overlaps; never restore whole files to HEAD. This delivery does not certify completion of the broader roadmap.
