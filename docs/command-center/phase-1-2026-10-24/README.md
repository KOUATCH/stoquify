# Manager Action Center — Phase 1

Date: 24 October 2026. Baseline HEAD: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, plus the user's existing working-tree changes. Scope: functional modes and complete discovery of the authorized actions supplied by existing services. No database, migration, domain-command, entitlement, or query changes.

## Delivered behavior

- **Brief:** three leading actions at most, explicit preview/loaded counts, urgency summaries, and an entry to the full queue. Existing source order is preserved.
- **Command:** ten actions per page, all loaded actions reachable, source/role/urgency filters, clear filters, announced loaded/matched/displayed counts, and native keyboard-operable action details. Blocker counts remain visible while details are collapsed.
- **Investigate:** business signals, evidence, source freshness, metrics and blockers; branch-specific trust and metrics remain in their own DTO and view.
- **Location responsibility:** the existing permitted-location tabs now restore from the URL; switching location resets pagination and filters. No tenant-wide fallback or additional data fetch is introduced.
- **URL state:** mode, source, role, urgency, permitted location and page survive refresh and Back. Values are checked against the received scope. Invalid values fall back safely; out-of-range pages clamp to available results. No record bodies, private cursors or proof payloads are stored in navigation state.
- **Source coverage:** loaded work is distinguished from organization-wide totals. Accountant request caps, unavailable sources, restricted sources and incomplete evidence have explicit wording and appropriate source/admin/retry recovery. Empty work and no matching filters have separate messages.
- **Handoffs:** reconciliation remains a locale-specific Finance link carrying `reviewRun`; branch daily close remains a link carrying the authorized location. The queue honors disabled source links. There is no generic completion or signing mutation.

The shared Work & Follow-up capability is still scheduled for Phases 5–6. Phase 1 does not introduce assignment persistence, follow-up storage or a fourth submenu. Priority policy, source deadlines and full localization harmonization remain Phase 3 work.

## Acceptance evidence

| Criterion | Implemented behavior and evidence |
|---|---|
| CC-01.1 | Separate labeled mode regions and selected buttons; tenant and branch interaction tests |
| CC-01.2 | Fixtures walk 25 actions exactly once over three pages in both DTO variants |
| CC-01.3 | Urgency summaries select their exclusive service lane, reset other filters/page, and expose Clear filters |
| CC-01.4 | 0/1/10/25 counts; source cap of 100 and truncation warning; counts use loaded authorized entries rather than aggregate totals that may include other sources |
| CC-01.5 | URL restoration, popstate, pagination reset; browser evidence recorded separately below |
| CC-01.6 | Invalid modes, sources, roles, page and unauthorized location; filtering is client-only over server-authorized data |
| CC-01.7 | Empty, unmatched, restricted and failed-source messages; updated props remove revoked work and locations |
| CC-01.8 | Existing Finance handoff tests and location-specific daily-close links; source workflows untouched |

An urgency lane is exclusive, following the existing service precedence; it is not an independent aggregate severity count. For example, a high-severity overdue action belongs to the overdue lane. This phase does not change that domain policy.

## Verification classes

**Source inspection:** route/query dispatch and both DTOs remain separate. No server service or database file changed. Historical graph discovery used `manager_action_center_manageractioncenterdashboard_tsx` in component community 125, then current source was inspected; graph counts are not treated as current coverage. The Phase 0 fingerprint comparison found only the two intentionally changed dashboard components among 32 files. The other 30, including existing unrelated changes within that inventory, matched exactly.

**Workflow:** `npm run agent:workflow:check` passed; 196 package scripts remain outside the reviewed manifest. Registry entries were not changed.

**Mocked unit/component evidence:** 4 suites, 27 tests passed using:

```powershell
node node_modules/jest/bin/jest.js --config components/manager-action-center/__tests__/jest.phase1.config.cjs --runInBand --no-cache
```

The inspected runner bounds its roots to Manager component and query tests, uses Next/SWC without `dir`, and does not load application configuration, `.env`, default application Jest setup or database helpers. Next Link and translation hooks are mocked; authorization dispatch dependencies are mocked. This is not a real session-revocation or database security certification. Initial runner attempts were corrected for broad discovery and ESM dependencies; the final bounded run is the result above.

**Static validation:** the scoped TypeScript check passed with incremental writes disabled, and `git diff --check` passed for the owned component changes:

```powershell
node node_modules/typescript/bin/tsc -p components/manager-action-center/__tests__/tsconfig.phase1.json --noEmit --pretty false
```

**Rendered/browser evidence:** all synthetic fixture journeys passed in headless Edge, with zero page errors; see [machine-readable results](browser-results.json). Both EN/FR runs reached all 25 actions exactly once, restored refresh/Back and source-return state, reset filters, operated details by keyboard, preserved modifier-click and localized source links, and cleared revoked payloads. Additional checks covered 0/1/10 counts, failed/denied/capped sources, unauthorized location fallback, location restoration/revocation and daily-close destinations. Desktop 1440×1000 and mobile 390×844 were rendered; horizontal overflow checks passed. [English desktop](manager-command-en.png) and [French mobile](manager-mobile-fr.png) screenshots were visually inspected. Existing source-provided English conclusion text in the French fixture remains a Phase 3 localization concern, not a claim of complete source localization. The inspected [browser runner](verify-browser.cjs) bundles the real components and existing Tailwind tokens, uses synthetic DTO fixtures, and serves only local static fixture content. It writes a temporary bundle under `.codex-tmp/manager-phase1` and report artifacts here. It does not start Next or connect to services. Windows blocked the initial sandboxed Edge launch; the same isolated fixture check passed outside the sandbox after correcting the test’s select/new-tab locators. Run with `node docs/command-center/phase-1-2026-10-24/verify-browser.cjs`; `--skip-build` reuses only the existing local bundle and was used for the final browser-only retry. Browser fixtures cannot certify real Next router integration, authentication, source APIs or database controls.

**Not run:** production build, live authenticated application journeys, database tests, migrations, seeds, schema promotion, source signing and financial mutations. No deployment, commit, or staging was performed.

## Files and rollback

Application changes are confined to the two Manager dashboard components, [ManagerActionQueue](../../../components/manager-action-center/ManagerActionQueue.tsx), and [useManagerView](../../../components/manager-action-center/useManagerView.ts). Tests and their synthetic fixture builders are in `components/manager-action-center/__tests__`. Shared BI defaults, Daily Digest, Owner War Room and source-command components remain unchanged.

Rollback consists of reverting only the Phase 1 Manager component/test changes and removing its new helper/test/report files after preserving any subsequent work. Do not reset the working tree, restore the Phase 0 hashes wholesale, or revert existing schema/package/accounting/Digest edits.
