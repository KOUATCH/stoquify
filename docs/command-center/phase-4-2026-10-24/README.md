# Command Center Phase 4 — Release A review

24 October 2026. Phase 4 implementation and local verification are complete. **Release A remains pending** the human productivity trial, manual assistive-technology/native-zoom checks, authenticated role/scope journeys and the existing release-build process. No deployment approval is implied.

Existing Phase 1–3 work was preserved. No schema/database changes, migrations, seeds, business commands, dependency changes, deployment, staging or commit were performed.

## Delivered changes

- Completed the remaining scoped EN/FR source-copy review and fixes. See the [localization inventory](LOCALIZATION_REVIEW.md), including 34 static blocker objects from six current snapshot producers, dynamic evidence patterns, accessible names and deliberate preservation of authored evidence.
- Owner Command now shows every supplied authorized action, replacing the seven-item truncation, and states the loaded count. Brief remains a compact priority preview.
- Manager explicitly discloses the existing assurance source limit and read failures. The query still requests 25 rows; permission filtering can reduce the visible count. A reached cap is reported as possibly partial, and a failed read cannot imply completed work. No hidden incident identifiers or error details are added.
- Owner proof drawers return focus to the control that actually opened them, including Investigate cards and closure during a pending read. Duplicate reads remain blocked; late results cannot reopen closed evidence. The shared host retains its prior disabled-loading behavior by default, with an explicit Owner opt-in for focusable loading triggers.
- Corrected invalid definition-list nesting in location Manager metadata and action details. Localized branch authority, severity and Owner module-control labels. Existing design tokens and shared themes remain intact.

The integrated Work & Follow-up functionality remains planned in Phases 5–6. Phase 4 adds no fourth center, assignment persistence, durable review receipt or generic business-completion action.

## Acceptance decision

| Criterion | Evidence / disposition |
|---|---|
| CC-03.4 localization review | Scoped source inventory and canonical-copy fixes complete. Human French-language and authenticated role journeys remain separate checks. |
| CC-04.1 prior-phase acceptance | Open: CC-02.8 human productivity trial has no participants or measured baseline/result yet. |
| CC-04.2 page/language/viewport matrix | Passed for isolated rendered fixtures: 4 variants × 2 languages × 3 modes × 3 widths; height 1000px. Not a live-role matrix. |
| CC-04.3 accessibility | Automated scans and focused keyboard/reflow checks passed. Manual screen-reader reading/announcement quality, exhaustive keyboard order and native browser zoom remain open. |
| CC-04.4 work/access correctness | Local source and mocked/rendered checks passed for loaded-work reachability, explicit caps, source uncertainty, access-denial responses and stale private-state clearing. Live tenant/location revocation and real persistence isolation remain unverified. Kept open for release. |
| CC-04.5 shared consumers | Selected BI host/primitives, proof drawer/badges, agent panel and dashboard regression tests passed. No global theme change. |
| CC-04.6 evidence provenance | Separate evidence classes below, baseline hashes and owned patch recorded. |
| CC-04.7 release/rollback | Scoped release notes and rollback below use existing release controls. No new persistence requirement. |

## Verification evidence

**Source inspection.** Read the four page contracts, shared workflow, command registry, test lanes and release artifact/schema controls. Inspected actual runner/setup/imports before execution. `npm run agent:workflow:check` passed; it reported 196 unclassified package commands, which were not implicitly trusted. Existing graph evidence identified BI proof-host consumers; current source and targeted tests, not graph age or counts, support behavioral claims.

**Mocked/pure tests.** [Selected lane output](mocked-tests.txt): 24 suites / 413 tests passed. The later source-inventory extension passed all 15 tests in the Phase 4 test file, adding five cases to the earlier run: **418 distinct current tests covered**, no skipped tests. See [localization extension output](localization-tests.txt). Source, Prisma and action boundaries are mocked. These results do not establish real DB isolation or persistence. One earlier concurrent run hit a five-second Owner test timeout; the full isolated rerun passed without changing the timeout or that test. Initial test/fixture expectation failures were corrected before the successful runs.

**Static checks.** Focused TypeScript with no emit/incremental output passed. Scoped ESLint passed with no errors or warnings. UTF-8 and whitespace/preservation checks are recorded in [static-checks.json](static-checks.json). The TypeScript lane checks the affected application dependency graph and fixture DTOs, not the whole repository.

**Rendered browser.** [Runner](verify-browser.cjs), [journey results](browser-results.json), [automated accessibility results](accessibility-results.json). Eight synthetic journeys passed in headless Edge; 24 axe scans across all modes reported zero violations. The scans initially found definition-list nesting errors in the location view; [before-fix evidence](accessibility-before-fixes.json) is retained. Automated scans are not exhaustive WCAG certification. Axe left `aria-prohibited-attr` and `color-contrast` cases inconclusive; their rule IDs are retained in each scan and require manual review.

The runner bundles real components, existing Tailwind/tokens and scoped Digest CSS without loading Next application configuration or environment files. It mocks Next routing, refresh commits, proof reads and business actions. It checks 25-item reachability, filter labels, keyboard mode/detail activation, visible/unobscured focus on sampled controls, proof focus trap/return, loading/error recovery, hidden internal errors, reduced-motion loading animation, source modifier-click/Back, and private data clearing. It records zero business-action calls and zero page errors. The `/locations` fixture represents the existing Manager branch variant; it is not a production route.

Screenshots at 375px and 1440px are synthetic. French location Manager mobile and English Owner desktop were visually inspected. The 200% check uses CSS zoom and verifies overflow; it does not substitute for native browser zoom or assistive technology. Status roles/live regions are checked structurally, not by listening to screen-reader output.

**Authenticated/manual checks.** The user signed into a test dashboard. Edge inventory confirmed `http://localhost:3000/en/dashboard` and an existing Manager tab. Repeated attempts to attach to that session timed out at `Emulation.setFocusEmulationEnabled` / `Page.enable`; the native window fallback also timed out at `get_window_state`. The separate Chrome DevTools session remained on the login page. No authenticated page journey is claimed. This is a tooling limitation, not a reported sign-in or application failure. No live proof request or operational command was submitted. Some ordinary page/proof paths have existing audit writes; live verification must respect those source controls.

**Real database tests:** not run. **Human productivity trial:** not run; no time-saving percentage claimed. **Native screen-reader/zoom audit:** not run. **Release build/artifact verification/deployment:** not run.

## Reproduce the bounded local checks

```powershell
node node_modules/jest/bin/jest.js --config components/daily-habit/__tests__/jest.phase4.config.cjs --runInBand
node node_modules/jest/bin/jest.js --config components/daily-habit/__tests__/jest.phase4.config.cjs --runInBand components/daily-habit/__tests__/phase4-release.test.tsx
node node_modules/typescript/bin/tsc --project components/daily-habit/__tests__/tsconfig.phase4.json --noEmit
node docs/command-center/phase-4-2026-10-24/verify-browser.cjs
```

Review the current registry/definitions first. The isolated Jest configuration invokes `next/jest` without an application directory. The browser runner writes only its owned temporary bundle/report files and serves synthetic content on loopback. The ESLint lane uses the existing configuration with `fix:false` on the changed TS/TSX files and new helper/test/fixture. Run resource-intensive lanes sequentially on this workstation.

## Preservation and release notes

Baseline HEAD: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, already containing unrelated uncommitted work. [Before hashes](before-files.json) capture 188 scoped files. [Preservation record](preservation.json) records 20 changed baseline files, 168 unchanged and none missing. Captured schema, package metadata, command registry and business-action files are byte-identical. The [owned patch](phase4-owned.patch) distinguishes this phase from earlier local edits. This is a bounded preservation check, not a clean-tree assertion.

Release note: Command Center now provides fuller loaded-work visibility, clearer source coverage, more complete English/French explanations and more reliable keyboard proof navigation. Business authority, source-owned completion, reporting periods and database schema are unchanged.

Follow [existing artifact and schema-promotion controls](../../release/ARTIFACT_SCHEMA_PROMOTION.md) after the open gates close: freeze a reviewed candidate, compile in an isolated build environment, retain and verify the trusted artifact digest, then use the separately authorized deployment process. This phase has no migration to promote. Do not run a generic build against deployment credentials or infer release approval from fixtures.

Rollback: reverse only the Phase 4 owned hunks after reviewing later edits. Keep Phase 1–3 functionality and unrelated changes. Remove the new copy helper only after reverting its imports, and revert the optional assurance coverage DTO/producer/UI together. The focus prop is optional and defaults preserve prior loading behavior. No data rollback or destructive migration is necessary. Do not reset entire files or the working tree.

## Remaining release evidence

1. Reconnect to the signed-in designated test workspace and exercise all three pages in EN/FR, plus a legitimate location-scoped Manager account. Record current revision, role, viewport and source-return behavior. Do not infer broader permission coverage from an owner account.
2. Complete live permission/module/location revocation and source-failure checks in a designated controlled target; do not edit current records merely to simulate them.
3. Have a human tester verify screen-reader reading order/status announcements and native 200% zoom/reflow, then complete the CC-02.8 productivity trial with baseline and task results.
4. Run the existing isolated release artifact/build checks and obtain the release owner's decision. Phase 5 database/persistence work remains separately scoped.
