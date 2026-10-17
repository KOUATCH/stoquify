# Delivery 09 — technical labels and reconciliation acceptance

Date: 2026-10-13. This is a bounded continuation of UX02/UX03, not completion of the full program.

## Implemented

- The shared change/observation strip translates known `items` and `orders` units in French and presents `score` as points. Unknown units, currencies, source values, observation-versus-comparison semantics and provenance remain unchanged. It does not convert a score to a percentage.
- The owner action queue presents readable EN/FR role names. The action's original assigned role, permission key, destination and source record are unchanged.
- Payroll declaration evidence modes display `Preuves manuelles` / `Adaptateur pris en charge`, with readable English equivalents. The original enum still controls behavior and tone; unknown statuses remain verbatim. Adapter support is not described as submitted or accepted evidence.
- Responsive inspection found that the inventory table's inner horizontal scroll area lacked a name and tab stop. Enabled the existing shared Table `scrollRegionLabel` option, with EN/FR labels. No shared primitive, column, sorting, filter, selection or transaction behavior changed.
- The payroll register's additional live copy gaps now use existing presentation helpers: known payslip status, `MISMATCH`, and missing evidence/content-hash fallback text. Actual hashes, null/empty payslip values and source blocker narratives are preserved.

Preserved the current observation semantics introduced elsewhere in the dirty working tree. The baseline captures existing contents before this delivery. No server business logic, authority, module activation, financial submission or source evidence changed.

## Verification

| Class | Result |
|---|---|
| Workflow contract | Passed; 198 unclassified scripts remain outside the approved manifest |
| Mocked command-center/owner components | 59 tests passed across 5 suites |
| Mocked payroll destination regressions | 39 tests passed across 6 suites |
| Mocked payroll/inventory follow-up | 10 tests passed across 2 suites |
| Semantic TypeScript | Passed, 23 production roots with real dependency resolution; no emission or incremental metadata |
| Scoped ESLint | Zero errors across five changed production files; existing inventory `next/no-img-element` warning remains |
| Real database, transaction and concurrency tests | Not run |
| Build, migration, seed, deployment | Not run |

Used installed Jest with `jest.command-center.config.cjs`, `jest.destination-localization.config.cjs` and `jest.followup-localization.config.cjs`, `--runInBand --no-cache --json`. These configurations omit application Next/environment loading and mock protected actions. TypeScript used `tsconfig.owner-handoff.json`; ESLint used the existing Next rules. Reviewed current configurations and the command registry before running these checks. Evidence is in `evidence/delivery-09-*-tests.json` and `delivery-09-typecheck-result.json`.

UI/UX Pro Max focused search: `responsive data table overflow labels`, source `ux-guidelines.csv`, categories Responsive/Table Handling, Accessibility/Form Labels and Layout/Overflow Hidden. Applied as a review checklist: contain wide tables, retain associated labels, and measure overflow rather than hiding content. These are compatible with current Next 15 / Tailwind 3. No generated palette or replacement design master was used.

## Browser and role evidence

See the final acceptance notes below. All inspected business routes used the existing Edge SUPER ADMIN session, French locale and Wilkinson - Feeney 001. Read navigation can produce normal authorization audit logs; no business transactions were submitted.

- Reconciliation rendered a populated workbench at `/fr/dashboard/finance/reconciliation`, including the trust banner, durable proof, runs, rail failures and suspense review. Disabled controls remained disabled. Desktop document width and scroll width both measured 1523px. This closes the prior content-arrival gap for this role/context, not production reliability certification.
- Phone calibration: the tool's first 390×844 request produced a measured 487px inner width. A smaller override produced **390×844 CSS inner viewport**, with 371px document width and scroll width (the remainder is the scrollbar). The reconciliation header, filters and section links wrapped without page-level horizontal overflow. The mobile navigation opened with `Ouvrir le menu de navigation`, focused `Fermer la navigation`, and showed the French navigation heading. Escape was sent, but focus restoration was not conclusively observed before the next viewport change.
- Tablet: measured inner viewport 787×900, document width and scroll width 768px. The French recoverable error panel fit the content column. The initial populated page later changed to a load error; retry led to the global English not-found screen. Server diagnostics recorded a missing compiled reconciliation page, cache rename ENOENT failures and stale server-action identifiers. This is a development-runtime failure, not a verified permission denial or a responsive-layout defect.
- Recovery used installed Next directly on loopback port 3002 with `NEXT_DIST_DIR=.next-ui09-readonly`, skipping npm's `predev` Prisma helper and avoiding shared `.next-dev` output. No cache deletion, firewall changes, browser termination or authentication changes were used.
- Connected-browser inventory exposed Edge only, plus empty in-app/MCP surfaces. Chrome accountant and Firefox cashier sessions were not exposed. Requested connection/sign-in through the browser without requesting credentials. SUPER ADMIN does not substitute for owner, accountant or cashier acceptance.

## Remaining acceptance

Restricted-role journeys, actual screen-reader checks and full denied/stale/error matrices require further evidence. Page containment is not exhaustive responsive table-cell, dialog or transactional acceptance. Tests do not certify those checks. Additional rendered results from this delivery follow.

### Isolated-server acceptance

- `/fr/dashboard/owner-war-room`, port 3002: source labels `éléments` and `points` rendered in the summary. Pilotage showed `Comptable` and `Achats` alongside unchanged permission keys. Both the 787×900 tablet viewport (768px client width) and 390×844 phone viewport (371px client width) had matching document scroll/client widths. Phone screenshot confirmed wrapped modes, visible warning/provenance, and a readable full-width recommendation action. This is populated/stale/blocked SUPER ADMIN evidence.
- On the recovered owner page, mobile menu opened, Escape dismissed the dialog, and focus returned to `Ouvrir le menu de navigation` (confirmed through the DOM after the close transition). This closes the earlier focus-observation gap for this context.
- `/fr/dashboard/payroll/declarations`, port 3002: `Preuves manuelles` rendered next to `Action requise`. Phone 390×844 and tablet 787×900 both had equal document scroll/client widths (371px and 768px respectively). Header, lifecycle and source-scope headings remained French. Only manual-evidence mode was available live; adapter-supported copy is unit-tested.
- `/fr/dashboard/inventory/items`, port 3002: populated catalogue fit both phone and tablet document widths. The 1040px table remained within a horizontally scrollable area (312px phone / 457px tablet), rather than widening the page. Enter opened the first row menu with `Consulter l’article`, `Modifier l’article`, `Supprimer l’article`; Escape closed it and returned focus to `Ouvrir le menu`. No menu action was submitted. After the accessibility fix, `Tableau des articles de stock` was exposed as a region with tabindex 0; keyboard focus on that region was confirmed. An ArrowRight was sent, but the subsequent scroll measurement timed out and then the viewport was reset, so actual horizontal keyboard displacement is not certified.
- `/fr/dashboard/finance/reconciliation`, port 3002: the populated workbench eventually rendered after cold compilation/client loading. Its tablet 787×900 viewport had 768px document and scroll width, closing the populated tablet gap. This confirms recovery by isolated development output; it does not prove the previous failed retry now works or establish deployed performance.
- Reconciliation theme check: activating the light preference set the document root to `light` while the authenticated wrapper remained `dashboard-landing-theme dark`, as required by the design master. Tablet containment remained intact. Restored the previous dark preference and cleared the temporary viewport override. This checks the approved boundary, not a second authenticated light design.
- Next's isolated dev startup automatically added a TypeScript include and generated route reference. Removed only its `.next-ui09-readonly/types/**/*.ts` include afterward and restored the generated route reference to the configured normal `.next-dev` location. No other configuration was intentionally edited. The isolated server remains running on loopback 3002 for review; logs/cache are local runtime artifacts, excluded from the owned source patch.
- `/fr/dashboard/payroll/payments`, port 3002: loaded `Rapprochement des paiements` at both 390×844 and 787×900; document scroll/client widths matched at 371px and 768px. These measurements establish page containment, not exhaustive table-cell or dialog coverage at each size. The proof drawer's French close/Escape behavior was verified separately in Delivery 08.
- `/fr/dashboard/payroll/register`, port 3002: populated register loaded at both 390×844 and 787×900 with equal scroll/client widths (371px/768px). Source blocker narratives remain English verbatim; the interface's additional known status/hash fallback labels were corrected after observing this page.
- `/fr/dashboard/inventory/loss-control`, port 3002: `Contrôle des pertes de stock` and the French `Aucune perte de stock enregistrée` empty state loaded. Phone 390×844 and tablet 787×900 document scroll/client widths matched at 371px/768px. Restored the normal viewport after this last responsive check. Browser automation timeouts during compilation required re-binding the same tab; no route denial was inferred from those tool failures.
- Final register revisit confirmed `Écart constaté`, `Aucune empreinte de preuve`, `Aucune empreinte du contenu` and `Brouillon` in rendered page text. Final document width was 1523px and root theme `dark`. Kept the tab available for the pending role-session handoff.

Rollback uses only `evidence/delivery-09-owned.patch` against `delivery-09-baseline.json`; do not reset dirty files to HEAD. `delivery-09-files.json` records final owned hashes. Raw server logs are local diagnostic material, not publication artifacts.
