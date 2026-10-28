---
name: stoquify-transaction-history-06-frontend-delivery
description: Audit, implement, and verify Stoquify transaction-history frontend delivery after approved Stage 04 read-model and Stage 05 workbench contracts. Use for Stage 06 audit|implement|verify work on the shared history shell, one allowlisted domain adapter and locale-aware route/hook integration, server-owned filtering and export, URL state, robust states, 320px responsive behavior, keyboard and drawer focus, EN/FR copy, organization-timezone display, screenshots, browser smoke, and focused tests.
---

# Stoquify Transaction History Stage 06 Frontend Delivery

## Operating Contract

Support exactly one mode per run:

- `audit`: inspect product code and contracts; write only allowlisted run evidence.
- `implement`: deliver the smallest approved frontend delta and focused tests.
- `verify`: rerun checks without repairing product code; write only allowlisted run evidence.

Reject any other mode. Preserve tenant, RBAC, entitlement, redaction, audit, accounting, and service-owned truth.

## Required Reads And Entry Gate

1. Read repository instructions, current Git status, `package.json`, the 2026-07-14 transaction-history proposal, the suite `manifest.md`, the run manifest, and Stage 01's exact Stage 06 allowlist.
2. Read the Stage 04 and 05 skills and their reference contracts completely. Verify their evidence checksums and input fingerprints against current source.
3. Require exact Stage 04 and 05 `PASS` for every active lane. Reject `PARTIAL`, missing, stale, failed, checksum-invalid, contradictory, or lane-incomplete evidence. When upstream work is `PARTIAL`, create a new narrowed run for fully passed lanes instead of advancing this run.
4. Confirm that the approved service/action result, filter, cursor, completeness, export, timezone, permission, and proof contracts agree with the Stage 05 command brief. Treat services and actions as read-only inputs.
5. Inspect the selected route, adapter/component, hook, EN/FR messages, and tests. Inspect `components/inventory/movements/StockMovementDashboard.tsx`, `components/dashboard/primitives/command-center-primitives.tsx`, `components/dashboard/DashboardRouteState.tsx`, and current table patterns for visual conventions. Use current source over stale graph output and record graph provenance when used.

Stop `implement` immediately on any contract mismatch. In `audit` or `verify`, continue read-only where safe and record the failed gate.

## Exact Edit Boundary

Copy `manifest.stageAllowlists["06"]` exactly into evidence `allowedEdits`. Reject directory globs or a product path outside these eligible categories:

- exact files under `components/dashboard/history/`;
- the exact selected domain adapter/component files;
- the exact selected locale-aware route and query-hook files;
- `messages/en.json` and `messages/fr.json` when named;
- exact focused component, hook, accessibility, or browser-smoke tests.

Allow exact Stage 06 JSON, Markdown, command-log, and screenshot paths under `what-next/transaction-history/runs/<run-id>/slices/<slice-id>/`. In `audit` and `verify`, forbid every product edit. In `implement`, require every product file to be both eligible above and explicitly named in the Stage 06 allowlist.

Never edit services, actions, API contracts, schemas, migrations, authentication, permissions, proof or accounting semantics, generic table/UI primitives, global styling, unrelated locales/tests, generated files, or another stage's artifacts. Before each write, compare `git status --short -- <exact-path>` with the inspected baseline. Stop on pre-existing or concurrent overlap; never stash, reset, revert, clean, stage, or overwrite another contributor's work.

## Delivery Workflow

1. Declare mode, run ID, slice, active lane, prerequisite artifacts/hashes, approved service/action owners, command brief, exact allowlist, baseline commit, dirty-file decision, and verification environment.
2. Define one shared shell boundary for command context, same-filter KPIs, action queue, server filter controls, history table, pagination, page-level detail/proof drawer, and robust states. Keep columns, row mapping, actions, permissions, and business vocabulary in the selected domain adapter.
3. Consume the Stage 04 result envelope without recomputing business values. Render decimal strings with their currency/unit; preserve separate effective, recorded, generated, completeness, business, control, reconciliation/posting, and proof meanings.
4. Drive search, date range, entity/status filters, sort, page size, cursor/position, and selected row through locale-preserving URL state. Reset traversal when filters or sort change; sanitize invalid values; make back, forward, refresh, and copied URLs restore the same scope and drawer.
5. Send normalized inputs to the approved server action and render its `appliedFilters`, summary, rows, snapshot, page information, and completeness. Never derive financial totals, balances, blockers, certification, reconciliation, or completeness in React.
6. Generate export only through the approved server contract using its filters and knowledge cutoff. Do not serialize loaded rows. Treat the existing generic `DataTable` client search/date filtering, pagination, row selection, and visible-row export as incompatible with complete history unless those behaviors are bypassed by an approved server/manual mode.
7. Implement explicit loading, empty-unfiltered, empty-filtered, error/retry, partial-source, no-active-organization, and permission-denied states. Never flash protected data or render missing data as zero. Name partial sources, affected scope, cutoff, and export limitation.
8. Render one page-level drawer from a focusable row action. Move focus into it, close with `Escape`, restore focus to the trigger, and keep selection in the URL. Show proof only when the Stage 05 handoff cites Stage 02 support; otherwise use a neutral localized unavailable explanation without an assurance badge.
9. At 320px, prevent page overflow and preserve primary identity, amount or quantity, status, and action through priority columns or a semantic row-card adaptation. Keep a named table, text status beyond color, visible focus, keyboard-reachable controls, logical tab order, result announcements, and practical 44px targets.
10. Source all visible and accessible copy from EN/FR messages, translate enums, preserve French diacritics, and format numbers/dates for the active locale. Apply the organization timezone to date boundaries and effective timestamps; never infer accounting time from the browser or server-local timezone.

## Mandatory Stop Conditions

Stop before an affected product write when:

- Stage 04/05 evidence or current service/action behavior disagrees on fields, filters, cutoff, cursor, completeness, export, timezone, permission, or proof;
- the UI would create financial truth, client-only filtering/sorting/pagination/export, a complete-history claim over capped rows, or unsupported proof;
- the remedy requires a service, action, API, permission, schema, migration, global primitive/style, or other non-allowlisted edit;
- the command brief, organization timezone, server export path, robust-state semantics, or EN/FR contract is missing;
- an allowed file has pre-existing or concurrent edits that cannot be preserved safely;
- required focused tests or browser evidence cannot be produced within the approved paths and environment.

Record the condition as `BLOCKED`, `PARTIAL`, or `FAILED`; do not invent a fallback contract or claim skipped evidence passed.

## Verification And Evidence

Run the narrowest relevant checks and record exact commands, environment, exit codes, skips, and logs:

- focused component/hook tests for envelope mapping, URL round trips and cursor reset, all robust states, selected-row drawer behavior, and no client-derived totals or exports;
- focused EN/FR and organization-timezone boundary tests, including UTC-midnight and applicable daylight-saving transitions;
- focused typecheck/lint for changed files when available;
- authenticated browser smoke at 320px and desktop in EN and FR, with screenshots, no document overflow, URL restore/share, server export trigger, and safe error/permission behavior;
- keyboard-only filter/table/drawer traversal, `Escape` close, trigger-focus restoration, result announcements, and an available automated accessibility scan.

Save under `what-next/transaction-history/runs/<run-id>/slices/<slice-id>/`:

1. Schema-valid Stage 06 JSON evidence with `stageId: "06"`, this skill name, `agentType: "Frontend Developer"`, prerequisite checksums, exact allowed/observed edits, repository state, claims, verification, checksummed outputs, blockers, and next-stage eligibility.
2. A concise Markdown report covering mode/scope, contract verdict, changed files, URL/server-truth/state/accessibility/i18n/timezone results, screenshots, commands, blockers, and residual risk.
3. Command logs and cited screenshots; record unavailable checks explicitly.

Use claim IDs `TH06_PREREQUISITES`, `TH06_ALLOWLIST`, `TH06_CONTRACT`, `TH06_SERVER_TRUTH`, `TH06_URL_STATE`, `TH06_ROBUST_STATES`, `TH06_MOBILE_A11Y`, `TH06_I18N_TIMEZONE`, `TH06_BROWSER_SMOKE`, and `TH06_VERIFICATION`. Validate artifacts with the Stage 00 validator when available.

Return `PASS` only when every active lane and all applicable checks pass. Use `PARTIAL` only for isolated passed lanes with named residual work, `BLOCKED` for missing authority/contracts or unsafe overlap, and `FAILED` for executed verification failures. Mark Stage 07 eligible only after `PASS`.
