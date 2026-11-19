# Command Center — Phase 2: concise briefings

Date: 24 October 2026. Baseline HEAD: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, plus existing local changes. This phase implements the Daily Digest and Owner briefing contracts. No database, schema, migration, seed, deployment or source-command change was made.

## Delivered behavior

- Daily Digest uses one compact page header and one reporting-period label. Organization, audience, currency and display timezone remain visible; the reporting period remains UTC. Existing workspace/mode URL state and source-navigation behavior are preserved.
- Brief starts with the leading permitted source action, followed by an explicit path to the supplied Digest actions. Command retains every supplied action, including disabled explanations. The service's existing top-five summary policy is unchanged; this is not an exhaustive organization-wide queue.
- Repeated blocker appearances are grouped by stable blocker identity and source occurrence, with native keyboard-operable disclosure. Distinct records and locations stay separate even when translated labels match. All differing restrictions, next steps and allowed references remain available; critical/high limitations remain visible outside disclosure.
- The optional agent's unavailable/off/shadow state is compact and appears after the briefing. The opt-in presentation preserves existing rollout, permission, kill-switch and proposal gates. Enabled agent behavior and other consumers' default presentation remain unchanged.
- Owner and Digest show **current observations** and explicitly unavailable historical comparisons. Owner service events no longer assert a new/change direction without a prior snapshot. English/French copy reflects the current-state meaning.

Work & Follow-up, which connects the existing three centers, remains in Phases 5–6. Phase 2 adds neither a fourth submenu nor persistence for assignment or review.

## Source identity and comparison policy

Blocker identity combines the source's stable blocker ID, gate and source-table set. Occurrence identity combines organization, location, proof subject or source kind/record identity, and reporting period. Display text is never identity. A source hash is used only where no record ID exists; missing provenance stays container-specific rather than merging unrelated records by their text or route.

Digest risks now optionally carry the originating signal's provenance, matching their observation representation. This adds metadata already available in memory; it changes no query, permission filter or persistence. Other risk producers can omit this optional field. Aggregate blocker copies are attached to matching detailed groups, preserving variant restrictions. Links retain disabled state and additional permission requirements; an explicitly unavailable drill-through never becomes an active link.

The current change DTO has one provenance record, not a validated pair of historical observations. It cannot prove aligned definitions, periods, scope, currency and units. Both scoped briefings therefore opt into observation-only rendering, which suppresses numerical/directional deltas even if a legacy producer supplies two numbers. No historical storage or comparison engine was added. A future true-comparison feature must establish that full comparable-pair contract before enabling deltas here. Legacy shared-component consumers retain their prior default behavior; this is not a certification of their comparison semantics.

## Acceptance evidence

| Criterion | Evidence and boundary |
|---|---|
| CC-02.1 | Pure grouping tests cover repeated stable blockers, aggregate copies and observation/risk occurrences with shared provenance. |
| CC-02.2 | Identical labels with different blocker IDs, source records or locations remain separate. Missing source identity does not cause speculative merging. |
| CC-02.3 | Variant next steps and all authorized references survive grouping; critical restrictions stay visible. Disabled/unavailable links and extra permission requirements are retained. |
| CC-02.4 | Compact off/kill-switch/shadow/denied presentation has no command button; existing enabled-agent tests continue to pass. |
| CC-02.5 | Safe fallback: neither briefing emits a historical delta without a comparable-pair contract. True historical comparisons are not implemented or certified. |
| CC-02.6 | Missing history, legacy numerical pairs and null/zero current values show current observations with comparison-unavailable wording. |
| CC-02.7 | Shared BI defaults and enabled-agent regressions, plus the previous Manager suite, are checked separately. |
| CC-02.8 | **Pending human trial.** Representative participants: 0. Attempted tasks: 0. Successes/failures and elapsed times: not measured. No productivity improvement is claimed. |

F06/F07 are exercised by synthetic fixtures and bounded tests. F10 covers unavailable/unproven history and the observation-only fallback; there is no fresh comparable historical pair in the production contract to certify. These results do not close the broader Phase 3/4 recovery, localization or release gates.

## Verification classes

**Source inspection:** checked current contracts, rendering, source authority and service composition against the historical graph evidence. Existing graph nodes included DailyHabitDigestDashboard, OwnerWarRoomDashboard and BIWhatChangedStrip; current source determines behavior. The [preservation record](preservation-results.json) compares 42 selected pre-edit file hashes: 29 unchanged and 13 intentionally changed, with no unexpected drift. This includes Phase 1 Manager files, schema, package scripts and source commands. It is a bounded inventory, not a whole-repository audit. Existing local edits were preserved; only Phase 2 hunks were changed.

**Workflow:** `npm run agent:workflow:check` passed. The registry still identifies 196 unclassified scripts. Definitions/imports for the bounded runners were inspected before execution; registry entries and package scripts were not changed.

**Mocked unit/component/service checks:** run with the reviewed isolated Next/SWC configuration, without Next application configuration, environment loading, default Jest setup or database helpers:

```powershell
node node_modules/jest/bin/jest.js --config components/daily-habit/__tests__/jest.phase2.config.cjs --runInBand --no-cache
node node_modules/jest/bin/jest.js --config components/manager-action-center/__tests__/jest.phase1.config.cjs --runInBand --no-cache
```

Phase 2: **9 suites / 221 tests passed**. Manager regression: **4 suites / 27 tests passed**. Next navigation, actions, snapshot queries, operating-access resolution and persistence dependencies are mocked where exercised. This proves component/service behavior under those inputs, not real-session authorization or database isolation. After the final drill-through module/permission metadata adjustment, the focused Phase 2 briefing suite passed again: **1 suite / 20 tests** (included in the 221, not additional distinct tests). Initial failures in test-helper scope, duplicate-text selection and an outdated region label were corrected before the passing full run.

**Static validation:** the final scoped TypeScript check passed (exit 0), including changed UI, both briefing services and browser fixture definitions. Incremental writes are disabled:

```powershell
node node_modules/typescript/bin/tsc -p components/daily-habit/__tests__/tsconfig.phase2.json --noEmit --pretty false
```

The scoped whitespace check (`git diff --check` over owned source/test/contract paths) passed. It does not inspect untracked files; a separate check passed for 13 new text files and all six local links in this report.

**Rendered/browser checks:** [runner](verify-browser.cjs), [results](browser-results.json). Headless Edge renders real components and existing Tailwind/theme CSS with synthetic DTOs, mocked Next routing and actions, and a local static fixture server. It does not start Next or contact application services. EN/FR Digest and Owner fixtures run at 375×1000, 768×1000 and 1440×1000 with reduced motion. Checks cover one page heading, grouped disclosure by keyboard, retained source links, compact agent, observation-only labels, mode switching, Digest source handoff/Back, zero action calls and horizontal reflow. Screenshots at 375 and 1440 are retained. Some English source strings deliberately remain in the French fixtures; complete source localization is a Phase 3 concern. This is not a screen-reader audit, real Next router integration test or live authenticated application check.

The runner writes only its owned `.codex-tmp/manager-phase2` bundle and report artifacts. Run `node docs/command-center/phase-2-2026-10-24/verify-browser.cjs`; `--skip-build` can reuse an unchanged fixture bundle. An initial CSS-loader quoting error in the test harness was corrected before the successful browser run.

Both final browser journeys passed with zero page errors and zero mocked command calls. The updated English desktop and French mobile Digest screenshots, and French mobile Owner screenshot, were visually inspected. The leading Digest action is above the grouped limitations; keyboard focus and source links remain visible. See [Digest desktop](digest-en-1440.png), [Digest mobile](digest-fr-375.png) and [Owner mobile](owner-fr-375.png).

**Not run:** production build, database tests, migrations, seeds, schema promotion, live source actions, financial mutations, deployment, commit or staging.

## Human validation still required

Proposed protocol: representative manager, owner and operations users each open their permitted Brief in their working language and identify (1) the leading priority and (2) the next permitted action within 30 seconds. Include a normal source, critical restriction and unavailable comparison scenario. Record participant role/language, task, success/failure, elapsed time, wrong destination and misunderstood restriction. Compare against a measured baseline before claiming productivity gains. The automated scenarios above are not human participants.

## Files and rollback

Application ownership: DailyHabitDigestDashboard; new DigestSourceLimitations and digest-blocker-groups; opt-in AgentCommandPanel and BIWhatChangedStrip changes; OwnerWarRoomDashboard and Owner service/copy; optional BIRiskRank provenance and its Daily Digest producer. Tests/configuration live in the existing component/service test directories; this report contains browser fixtures and evidence. Page contracts/checklist link to this record.

Rollback only these Phase 2 hunks and new files after preserving subsequent work. Use the before-file hashes/backups to identify owned differences; do not reset the repository, restore baseline hashes wholesale, or revert existing schema, package, accounting, Manager or earlier Digest changes. No database rollback is required.
