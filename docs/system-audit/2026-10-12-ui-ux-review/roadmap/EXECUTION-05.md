# Delivery 05 — owner narrative localization and destination review

13 October 2026. **Implemented locally; 57 focused tests passed. EN/FR owner views and all 11 reviewed destination surfaces inspected under SUPER ADMIN. Full role and clicked-journey acceptance remains open.**

## Visible result

The owner page now passes its resolved EN/FR locale into the service. The protected action accepts only those two presentation locales and still takes organization, identity, roles and permissions from its server context. Omitted locale preserves English behavior.

Application-owned card descriptions, strips, morning brief, conclusions, risk explanations, changes, investigation-zone questions/summaries, proof labels, action labels, disabled reasons, due dates and displayed responsibility labels now use the selected language. French dynamic summaries format numbers and dates with the French locale. Missing amounts remain unavailable rather than becoming zero. This delivery preserves the existing currency and financial calculations; it does not introduce currency conversion.

Ten canonical signal families and the owner payroll-proof/recovery next steps have French presentation copy. Exact source wording and signal identity determine whether a known default is translated. Custom notes, unknown source messages, identifiers, financial amounts, source hashes, evidence grades and access metadata are preserved. The existing snapshot-blocker presenter translates recognized payment/close warnings by identity and exact canonical copy. No translated evidence is persisted.

## Destination review

All 11 paths below have an implemented page, checked against current source and by filesystem regression tests. This establishes route existence, not successful data loading or authorization for every role.

| Destination under `/dashboard` | Current entry contract / finding | Delivery result |
|---|---|---|
| `finance/reconciliation` | `payments.reconciliation.read`, reconciliation module | Owner exception card and payment zone now use this workbench instead of provider accounts at `finance/payments`; nonexistent nested `finance/payments/reconciliation` risk drill-through repaired |
| `inventory/items` | `inventory.items.read`, inventory module | Delivery 04 stock action retains `inventory.read` plus item-read checks; unchanged here |
| `inventory/loss-control` | `inventory.levels.read`; inventory entitlement and owner-scope checks precede the owner source | Source route inspected; French empty workspace rendered under SUPER ADMIN |
| `purchase-orders` | `purchases.orders.read`, purchasing controls | Source route matches; direct navigation rendered, owner click remained unresolved |
| `payroll` | `payroll.command.read`, payroll module | Generic payroll-signal destination exists; owner balance/forecast cases use more specific destinations |
| `payroll/payments` | `payments.reconciliation.read`, payroll module | Owner card/risk/zone navigation metadata aligned with the read-entry contract; destination action/mutation guards unchanged |
| `payroll/register` | `payroll.reports.read`, payroll module | Forecast-proof signal target exists; signal additional payroll-command requirement retained |
| `payroll/declarations` | `payroll.command.read`, payroll module | Forecast-proof signal target matches current route |
| `accounting/close` | `accounting.close.read`, close controls | Source route matches; French owner links observed |
| `settings/modules` | `MANAGE_SYSTEM_SETTINGS`, alias `system.settings.update` | Owner card previously declared settings-read; now declares the actual settings-management requirement |
| `owner-war-room` | `dashboard.read` plus server-verified tenant-wide authority | Self-review target exists; French SUPER_ADMIN route rendered |

Priority action links now retain the action queue's additional permission metadata. Navigation metadata does not grant access: destination RBAC, tenant, entitlement and mutation controls remain authoritative. Generic BI controls still need explicit denied/changed-session journey acceptance; this report does not certify every static action's disabled presentation.

The generic signal defaults also contain `/dashboard/cash-drawer`, while the implemented page is `/dashboard/finance/cash-drawer` (finance cash-drawer/read entry requirements). Cash-drawer variance and refund/void spike are not emitted by the owner's current snapshot builder. Record the generic cash-drawer handoff as a separate follow-up rather than claiming the owner fixes repair every signal consumer. The analytics default points to an existing `/dashboard/analytics` page, whose entry allows reports-read or dashboard-read; its analytics entitlement must still be evaluated at the destination.

## Evidence classes

| Class | Result |
|---|---|
| Workflow contract | Passed; 198 scripts remain outside the reviewed manifest |
| Mocked owner service | 26 passing tests, including French narratives, null cash, destination corrections and additional permissions |
| Pure presentation/source checks | 24 passing tests: ten signal families, custom text (including inherited-object property names), exact forecast matching and 11 page paths |
| Mocked protected action | Four passing tests, including French input, rejected unsupported locale and rejected caller-owned access context |
| Mocked route/DOM | Three passing tests, including locale propagation and permission-denied rendering |
| Scoped lint | Ten changed TS/TSX files, passed |
| Syntax diagnostics | Ten changed TS/TSX files, no syntax errors; not a full semantic project type check |
| Scoped whitespace | Passed |
| Browser | EN/FR owner page and all 11 reviewed surfaces inspected in Edge; SUPER ADMIN, blocked/stale evidence, dark desktop. Close rendered a controlled unavailable state; other surfaces rendered. See journey limits below |
| Real DB test lane / build / deployment | Not run |

[Final test JSON](evidence/owner-localization-tests-2026-10-13.json). Source HEAD: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`, with substantial pre-existing local changes. [Starting file contents/hashes](evidence/delivery-05-baseline.json) distinguish this delivery from earlier work. The owned patch and file manifest are recorded alongside the test evidence.

## Browser note and limits

Edge initially timed out on navigation. The created tab later exposed `http://localhost:3000/fr/dashboard/owner-war-room`, allowing an actual accessibility-tree and screenshot review. A later reload also timed out, then completed. Final observed copy included “Point du jour du dirigeant”, “Blocage de clôture”, French next steps, “Comptable”, “Des constats de clôture restent ouverts”, “Des suspens de paiement restent ouverts” and “Aucun compte de prestataire actif”. The risk action points to `/fr/dashboard/finance/reconciliation`.

The screenshot was returned inline by the browser tool at 1523 × 733 pixels; no explicit viewport override was applied, so that image size is not a certified CSS viewport measurement. The sidebar visibly identified SUPER ADMIN. This is not acceptance under a restricted owner, accountant or cashier account. No financial workflow or acknowledgement was submitted. Native screenshot evidence is in the conversation; no local screenshot file is claimed.

| Browser journey, French / Edge / SUPER ADMIN | Observed result |
|---|---|
| Owner brief and Pilotage mode | Localized headings, generated card copy, priority actions and warnings rendered |
| English owner brief | “Owner morning brief”, English conclusion, priorities and risks rendered after the French route checks |
| Cash-risk action → reconciliation | Actual owner link navigated to “Atelier rapprochement paiements”; workbench preserved the message that current access cannot propose reconciliations |
| Owner purchase-order action | Click remained on the owner page during observation; direct navigation subsequently rendered “Bons de commande” and its register. Destination rendering passes; the clicked journey remains unresolved |
| Payroll payments, direct navigation | Rendered payment batches and employee recovery. **Localization gap:** “Payment reconciliation”, “Payment batches” and “Employee balance recovery” remain English on `/fr` |
| Module settings, direct navigation | Rendered “Modules et espace de travail”, module groups, existing draft and known restrictions. No settings or entitlements changed |
| Accounting close, direct navigation | Rendered “L’assurance de clôture est indisponible”. Explanation says close-assurance or accounting-dependency read access/validity is unavailable. Recovery link returns to the dashboard. This is a confirmed unavailable state, not an authorized close-workbench pass |
| Inventory items, direct navigation | Rendered the item workspace. **Localization gap:** “Inventory Items” and “Items” remain English on `/fr` |
| Inventory loss control, direct navigation | Rendered the reporting-period/trust sections and “Aucune perte de stock enregistree” empty state; no adjustment created |
| Payroll register, direct navigation | Rendered tie-out, proof, blockers and register rows. **Localization gap:** the main headings remain English on `/fr` |
| Payroll declarations, direct navigation | Rendered declaration evidence workbench, lifecycle and source scope. **Localization gap:** headings remain English on `/fr` |
| Payroll command center, direct navigation | Rendered HR/payroll/evidence/close controls, action board and run review. **Localization gap:** headings remain English on `/fr` |

Navigation timeouts were followed by bounded state reads; some pages completed after the navigation call had timed out. A timeout alone was not treated as an application failure. The owner page's browser metadata title remains English; generated in-page narratives are the scope of this delivery.

Further owner-brief finding: the observed conclusion prioritizes cash risk while the primary brief action points to close review. The selected priority comes from existing signal ranking; translation does not reconcile this pre-existing decision-order mismatch. Follow up with a shared conclusion/primary-action decision rule and explicit task label before declaring the owner journey fully accepted.

Remaining rendered checks: English operational/investigate modes and French investigate mode, long French text at mobile/tablet sizes, keyboard/focus, restricted-role denial, broader module-lock and destination data/recovery states. Direct navigation to a workspace does not complete an owner-to-workspace journey test. Source identifiers and technical units such as `items`/`score` remain visible in the existing shared evidence timeline; that shared presentation needs a separate normalization pass. Custom source wording intentionally stays verbatim.

## Verification execution and side effects

Reviewed package definitions, command registry and isolated runner imports before execution. The new runner loads installed Next/Jest transforms without the application configuration/environment, scopes discovery to the three owner test directories and uses Jest DOM only for route tests. DB, audit, entitlement and snapshot providers are mocked in service tests; signal construction and permission filtering are pure. No migration, seed, build, server launch or business mutation ran.

The first test discovery attempt scanned too broadly and was interrupted; the config was narrowed before the completed runs. Initial failures exposed an outdated expected payroll permission, an assertion that incorrectly included custom source routes, and test fixtures assuming wildcard access to sensitive permissions. Fixtures now use explicit canonical signal permissions; production RBAC was not weakened. Windows rejected some direct writes because files had user-mapped sections open; exact owned files were safely replaced via same-directory temporary files, without stopping other sessions.

```powershell
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.owner-localization.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/owner-localization-tests-2026-10-13.json
```

Lint used the installed ESLint CLI on the ten owned source/test files, without fix flags. Syntax used TypeScript `transpileModule` diagnostics, with no emitted artifacts. Rollback: reverse only this delivery's owned patch after checking subsequent edits; no database rollback is needed.
