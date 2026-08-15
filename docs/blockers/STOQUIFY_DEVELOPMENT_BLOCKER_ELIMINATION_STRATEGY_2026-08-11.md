# Stoquify Development Blocker Elimination Strategy

Date: 2026-08-11  
Workspace: `E:\ohada saas\Focused projects\stoquify`  
Branch: `codex/service-boundary-burndown`  
Observed commit: `4a6cc16`  
Observed working tree: 219 changed entries (156 modified, 63 untracked)  
Mode: evidence-led review and strategy only; no gate or product remediation implemented

## 1. Executive verdict

**Verdict: Stoquify can make immediate development progress, but its ordinary verification path is currently blocked by lifecycle wiring, code-health failures, and slow feedback—not primarily by OHADA approval. Production remains correctly blocked by several independent controls.**

| Lifecycle | Current decision | Primary reason |
|---|---|---|
| Ordinary local development | **Can continue, but the shared cleanline is red** | Ten TypeScript errors, one lint error, and very slow full checks |
| Shared integration | **Blocked** | The intended integration profile is absent; five expected aliases and the integration umbrella are missing; payroll immutability and migration safety also fail |
| Internal/sandbox product work | **Allowed within explicit non-authoritative boundaries** | Country-adapter internal gate passes 16/16; production authority remains disabled |
| Controlled pilot | **Capability-dependent** | Authenticated browser/pilot evidence and environment ownership remain incomplete |
| Production release | **Blocked and must remain fail-closed** | Statutory expert approval, destructive-migration approval, safe database target, production secrets/delivery configuration, and external adapter evidence |

The highest-leverage correction is **isolation and lifecycle repair, not gate deletion**:

1. Restore a real integration-only gate profile.
2. Fix current TypeScript and lint failures.
3. Diagnose the payroll immutability test harness on an isolated database.
4. Resolve migration risk through an exact-hash, maker-checker decision packet.
5. Deliver one browser-verified supplier vertical slice.
6. Keep statutory approval, production credentials, live authority conformance, and production database targeting on a separate release-only track.

Only one command in the current 27-command production policy chain is the direct qualified country-pack production gate. It appears at position 11, after ten passing gates, and hides sixteen downstream commands when it fails. Independent execution showed that the visible statutory stop is not the whole problem: current integration also has code-health, payroll-runtime, and migration-safety blockers.

## 2. Evidence boundary and confidence

### High-confidence repository facts

- `package.json` currently defines a 27-command `policy:gates` chain.
- `statutory:country-pack:gate` is command 11 and fails on one qualified-human approval check.
- `scripts/policy-gates-integration-contract.json` expects 26 integration gates.
- Five required integration aliases are absent, and `policy:gates:integration` is absent.
- `verify:repo` still invokes production-oriented `policy:gates`.
- `.github/workflows/ci.yml` invokes `verify:ci`, which reaches `verify:repo` and therefore the production policy chain.
- Fresh typecheck and lint executions fail.
- Fresh Prisma schema validation and Workflow Assurance runtime checks pass.
- Fresh local and production migration safety checks fail on 13 unapproved destructive findings in one historical migration.
- Fresh payroll immutability runtime execution stops during migration deployment before any trigger or mutation proof runs.
- Production release secret enforcement identifies 16 blocked checks; local enforcement reports the same items as warnings and exits successfully.
- The worktree is heavily dirty, so this is a workspace-state assessment rather than a clean release-candidate certification.

### Evidence limitations

- No production database, production credentials, live provider, regulator, authority sandbox, or real pilot was accessed.
- The payroll migration harness reports only the first line of Prisma stderr, so the underlying migration-deploy failure is not yet diagnosed.
- The initial typecheck timed out at 184 seconds; an extended retry completed in 192 seconds with errors.
- Lint completed in 280 seconds. These timings are local Windows observations, not universal performance benchmarks.
- Static gates prove source and wiring conditions, not live provider, load, hardware, or authority behavior.
- No legal, tax, accounting, security, privacy, accessibility, or production certification is made.

## 3. Current gate topology

### 3.1 Production policy chain

`policy:gates` currently contains 27 sequential commands:

1. `inventory:boundary:fail`
2. `service:boundary:fail`
3. `api:guard:inventory:fail`
4. `public-identity:abuse:gate`
5. `ledger:close-truth:gate`
6. `payment:cash-truth:gate`
7. `purchasing:ap:gate`
8. `offline:pos:replay:gate`
9. `country:adapter:pilot:gate`
10. `ai:copilot:guardrails:gate`
11. `statutory:country-pack:gate` — current fail-fast stop
12. `report:trust:export:gate`
13. `role:cockpit:gate`
14. `settings:surface:fail`
15. `workflow:assurance:runtime-check`
16. `workflow:assurance:release-gate`
17. `kontava:moat:release-gate`
18. `receipt:token:config-gate`
19. `payroll:immutability:runtime`
20. `hard-delete:fail`
21. `regulatory:hardcode:fail`
22. `demo:trust:fail`
23. `error:boundary:fail`
24. `ci:release:gate`
25. `prisma:migration:safety:gate`
26. `release:secrets:preflight`
27. `release:evidence:gate`

Fresh aggregate result: the first ten gates passed and the chain stopped at gate 11. Sixteen later commands were therefore hidden by composition rather than proven failed.

### 3.2 Intended integration profile versus current package scripts

| Expected integration contract | Current package state | Effect |
|---|---|---|
| `policy:gates:integration` | Missing | There is no ordinary integration umbrella |
| `inventory:valuation:truth:gate` | Missing alias; direct script exists | Domain gate reports 5/6 and fails only on policy wiring |
| `regulatory:boundary:fail` | Missing alias; direct script exists | Boundary itself passes across 1,649 files |
| `ap:fraud-control:gate` | Missing alias; direct script exists | AP gate reports 8/9 and fails only on policy wiring |
| `statutory:country-pack:integration:gate` | Missing alias; direct script exists | Integration gate reports 8/9 and fails only on lifecycle separation |
| `payroll:presence:gate` | Missing alias; direct script exists | Payroll presence reports 12/13 and fails only on policy wiring |
| `country:adapter:pilot:gate` | Present in the dirty working tree | Passes 16/16; added but not committed at observed revision |

The target architecture and July implementation record say integration verification is separate. Current source contradicts that record. Current source is authoritative for this review.

### 3.3 Verification call graph

```text
Pull request / push
  -> verify:ci
     -> ci:release:gate
     -> prisma:migrate:deploy
     -> prisma:migration:history:health
     -> prisma:migrate:status
     -> verify:repo
        -> prisma:validate
        -> typecheck
        -> lint
        -> policy:gates        [production statutory gate embedded]
        -> build:app
        -> full Jest suite

Production promotion
  -> verify:release
     -> verify:repo
     -> production secrets, migration, identity, receipt, evidence,
        and agent operational promotion gates
```

The first structural problem is therefore not that the production gate exists. It is that normal repository verification has no independent integration path.

## 4. Fresh command-result ledger

Statuses use only `passed`, `failed`, `skipped`, `timed out`, or `blocked`.

| Command | Start → finish | Status / exit | Result and classification |
|---|---|---|---|
| `git status --short` | discovery phase; 4.6 s | passed / 0 | Dirty worktree observed and preserved |
| Primary report, recovery report, target architecture, implementation record, CI, package, contract, and graph scans | discovery phase | passed / 0 | Evidence loaded; one early sandbox batch was blocked and one broad focused batch timed out, then focused reruns passed |
| `npm run typecheck` | bounded initial attempt; 184.1 s | timed out / 124 | No diagnostics before timeout; not treated as pass |
| `npm run typecheck` extended retry | 14:16:39 → 14:19:51 +01:00 | failed / 2 | Ten diagnostics across four files |
| `npm run lint` | 14:09:31 → 14:14:11 +01:00 | failed / 1 | One error and three warnings; 280 s runtime |
| `npm run policy:gates` | 14:00:19 → 14:02:13 +01:00 | failed / 1 | Ten gates passed; country-pack production gate failed 11/12 on expert approval; sixteen downstream commands hidden |
| `npm run policy:gates:integration` | 14:03:43 → 14:03:46 +01:00 | blocked / underlying 1 | Npm script does not exist |
| `npm run statutory:country-pack:dev:gate` | 14:03:38 → 14:03:45 +01:00 | failed / 1 | 9/11; lifecycle separation missing and brittle non-claim phrase mismatch |
| Direct statutory integration gate | 14:03:49 → 14:03:50 +01:00 | failed / 1 | 8/9; integration and promotion commands are not independent |
| `npm run statutory:country-pack:gate` via policy chain | 14:02:12 → 14:02:13 +01:00 | failed / 1 | 11/12; only `source_artifact_expert_approval` blocked |
| Direct regulatory boundary gate | 14:03:42 → 14:03:43 +01:00 | passed / 0 | 1,649 files checked; direct resolver/registry imports prohibited |
| Direct inventory valuation gate | 14:04:06 → 14:04:06 +01:00 | failed / 1 | 5/6; only `policy_gate_wiring` blocked |
| Direct AP fraud-control gate | 14:04:13 → 14:04:13 +01:00 | failed / 1 | 8/9; only `ap-fraud-control.policy-gate-wiring` blocked |
| Direct payroll presence gate | 14:04:14 → 14:04:14 +01:00 | failed / 1 | 12/13; only `policy_gate_wiring` blocked |
| `npm run workflow:assurance:runtime-check` | 14:04:52 → 14:04:59 +01:00 | passed / 0 | 7/7 tables and 3/3 migration rows |
| `npm run prisma:validate` | 14:04:55 → 14:05:17 +01:00 | passed / 0 | Prisma schema valid |
| `npm run prisma:migration:safety:gate` | 14:04:59 → 14:05:05 +01:00 | failed / 1 | 13 destructive findings, zero exact-hash approvals |
| `npm run payroll:immutability:runtime` | 14:04:52 → 14:05:21 +01:00 | failed / 1 | Migration deploy exited 1; 0/9 triggers tested and no mutation checks executed |
| `npm run release:secrets:preflight` | 14:06:22 → 14:06:30 +01:00 | passed / 0 | Local mode correctly conditional: 16 warnings, no blockers |
| `npm run ci:release:gate` | 14:06:16 → 14:06:24 +01:00 | passed / 0 | CI configuration 11/11 ready |
| `npm run release:evidence:gate` | 14:06:22 → 14:06:30 +01:00 | passed / 0 | Conditional local synthesis; six release blockers retained |
| `npm run release:secrets:preflight:release` | 14:06:51 → 14:06:55 +01:00 | failed / 1 | 16 production configuration blockers |
| `npm run prisma:migration:release:preflight` | 14:06:45 → 14:06:50 +01:00 | failed / 1 | Destructive approval, safe target, and database URL blocked |
| `npm run release:evidence:gate:release` | 14:07:18 → 14:07:21 +01:00 | failed / 1 | Consolidated six release blockers |
| `report:trust`, `role:cockpit`, Workflow Assurance release, Kontava, receipt token local, hard-delete, regulatory hardcode, demo trust, raw-error gates | 14:07:57 → 14:08:40 +01:00 | passed / 0 | Independently proven green after being hidden by aggregate fail-fast behavior |
| `npm run settings:surface:fail` parallel attempt | 14:07:57 → 14:08:04 +01:00 | failed / 1 | Transient `UNKNOWN ... open` error writing readiness JSON |
| `npm run settings:surface:fail` isolated retry | 14:09:03 → 14:09:09 +01:00 | passed / 0 | 37 records, zero-findings baseline; first failure is non-deterministic output-file contention |
| `npm run build:app` | not run | skipped | Typecheck and lint are known upstream failures; build would add generated output without changing blocker classification |
| Broad `npm test -- --runInBand` | not run | skipped | No code changed; focused gate evidence was sufficient for strategy; no whole-suite claim is made |
| `npm run verify:repo` | not run | skipped | Would stop on the independently proven typecheck failure and then repeat long checks |
| `npm run verify:release` | not run | skipped | Constituent production preflights were run directly; full command would repeat known upstream failures and was unnecessary |

## 5. Master blocker register

| ID | Blocker and primary category | Lifecycle | What it actually blocks | What it does not block | Basis | Owner / decision authority | Priority / status |
|---|---|---|---|---|---|---|---|
| BLK-001 | Missing integration profile and five aliases — **integration or promotion blocker** | Integration/CI | A truthful ordinary CI path; inventory/AP/payroll/statutory integration wiring checks | Local feature coding; production gate integrity | Missing umbrella and aliases; `verify:repo` calls production chain | Platform engineering lead / principal architect | Critical / open |
| BLK-002 | Brittle statutory non-claim phrase matcher — **false or indirect blocker** | Development/integration | Country-pack development gate | Actual non-claim substance and production fail-closed behavior | Manifest says “do not”; gate searches “does not” | Compliance platform engineer / controls owner | High / open |
| BLK-003 | Ten TypeScript errors — **development blocker** | Local/integration | Green compiler check and every aggregate command after it | Unrelated modules whose focused tests pass | Extended `typecheck` exit 2 | Frontend/domain owners / engineering lead | Critical / open |
| BLK-004 | One lint error — **development blocker** | Local/integration | Green lint and `verify:repo` | Accounting correctness, statutory approval, unrelated warnings | `finance-route-access.tsx:72` uses reserved `module` identifier | Finance frontend owner / engineering lead | High / open |
| BLK-005 | Slow, silent, side-effectful verification — **organizational or operating-model blocker** | Local/CI | Fast feedback, failure localization, safe parallel evidence collection | Correctness of the gates themselves | Typecheck 192 s, lint 280 s, policy 114 s; transient output-file contention | DevEx/SRE owner / engineering lead | High / open |
| BLK-006 | Payroll immutability harness stops at migration deploy — **integration or promotion blocker** | Payroll integration | Proof of 9 database triggers and mutation protections | Non-payroll feature work; static payroll presence checks | Runtime gate exits before trigger catalog | Payroll/data engineer / data architect | Critical for payroll / open |
| BLK-007 | Thirteen unapproved destructive migration findings — **integration or promotion blocker** | Integration/release | Migration-safety cleanline and safe production promotion | Ordinary UI/service work not requiring schema promotion | `20260611130000_accounting_auth_baseline_bridge` has 1 drop table and 12 drop columns; 0 approvals | Data migration owner / maker-checker change authority | Critical / open |
| BLK-008 | Production database target absent — **infrastructure or environment blocker** | Production | Release migration preflight and deployment | Local and integration development | No production `DATABASE_URL`; target safety unproved | Platform/SRE / release authority | High / open |
| BLK-009 | Production secrets, HTTPS origin, and delivery activation absent — **infrastructure or environment blocker** | Production | Public identity, receipt, history, statement, invitation, and live delivery launch | Local development; local gate exits 0 | 16 blocked release checks | Security/platform owner / security and release authorities | High / open |
| BLK-010 | Qualified country-pack expert approval absent — **external or qualified-human blocker** | Production/statutory | Authoritative country-pack promotion and related production claims | Integration-safe, watermarked, non-authoritative work | Production gate 11/12 | Qualified statutory reviewer / authorized checker | High release-only / externally blocked |
| BLK-011 | Live country-adapter evidence absent — **external or qualified-human blocker** | Pilot/production | Live DGI/authority behavior | Internal sandbox adapter work, which is 16/16 ready | Official contract, production expert review, credentials, external sandbox conformance absent | Regulatory integration owner / release + qualified reviewer | High release-only / externally blocked |
| BLK-012 | Dirty worktree and release-scope isolation gap — **organizational or operating-model blocker** | Integration/release | Reproducible revision-bound evidence and clean handoff | Continued local work with careful ownership | 219 changed entries across multiple domains and generated evidence | Release manager / product-engineering lead | Critical / open |
| BLK-013 | No single binding critical path; report and WIP sprawl — **organizational or operating-model blocker** | Portfolio | Conversion of work into user-verified outcomes | Necessary evidence tied to an active acceptance criterion | Recovery assessment: 14,786 `what-next` files, 68 audits, 193 readiness reports, 83 roadmaps | Product/engineering leadership / executive product owner | Critical / open |
| BLK-014 | Authenticated browser and real pilot evidence incomplete — **production-release blocker** | Pilot/release | Supplier workflow acceptance and later referral pilot proof | Service, data, and focused test work | Recovery assessment and current untracked E2E work show unfinished evidence | Product/QA/release owners / product owner | High / open |
| BLK-015 | Regulatory boundary gate misses country-specific constant imports — **non-blocking risk or warning** | Integration architecture | Nothing today; increases late country-coupling risk | Current boundary gate, which passes | Generic POS schema directly imports Cameroon provider codes; scanner focuses on resolver/registry imports | Regulatory architecture owner / principal architect | Medium / open risk |

The machine-readable companion register is `docs/blockers/stoquify-development-blocker-register-2026-08-11.json`.

## 6. Detailed resolution playbooks

### BLK-001 — Restore lifecycle-specific verification

- **Why it exists:** the intended integration contract was implemented historically but drifted out of `package.json`; one alias has recently been restored in the dirty tree, but the integration umbrella and five aliases remain absent.
- **Positioning:** production statutory approval is correctly blocking production but incorrectly inherited by ordinary repository verification.
- **Technical remedy:** add the five exact aliases, compose `policy:gates:integration` from the 26-entry contract, point `verify:repo` and pull-request CI to it, and make `verify:release` explicitly run both integration and production chains. Add a contract test that compares package targets to `policy-gates-integration-contract.json` and proves integration can pass while the production country-pack gate remains blocked.
- **Human remedy:** platform architect approves lifecycle semantics; release owner confirms no production gate was removed.
- **Verification:** integration command exists; all 26 targets resolve; `verify:repo` references integration profile; `verify:release` retains production `policy:gates`; production country-pack gate still fails without approval.
- **Unlock:** ordinary CI can progress without a qualified statutory signature, while universal controls remain enforced.
- **Still blocked afterward:** current typecheck, lint, payroll runtime, and migration safety.

### BLK-002 — Replace brittle legal non-claim text matching

- **Why it exists:** the evidence manifest substantively states that artifact capture and hash binding “do not certify legal interpretation” and “do not constitute qualified reviewer approval.” The gate searches exact singular substrings containing “does not.”
- **Positioning:** the non-claim must remain required, but exact prose grammar should not be a policy interface.
- **Technical remedy:** validate structured non-claim identifiers or boolean policy fields, retain the human-readable copy, and add tests for semantically equivalent wording plus missing/contradictory wording. The minimum change is to canonicalize the manifest copy and gate fixture together; the durable fix is structured identifiers.
- **Human remedy:** controls and statutory reviewer approve the canonical non-claim meanings, not legal sufficiency.
- **Verification:** development gate recognizes the current non-claims; a fixture that asserts production approval still fails.
- **Unlock:** removes one false development blocker.
- **Still blocked afterward:** lifecycle wiring and production approval.

### BLK-003 — Clear current TypeScript errors surgically

- **Evidence:** ten diagnostics in:
  - `app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx`
  - `app/[locale]/(dashboard)/dashboard/finance/stock-to-cash/page.tsx`
  - `app/[locale]/(dashboard)/dashboard/finance/tax-rates/create/page.tsx`
  - `components/customers/CustomerActionPage.tsx`
- **Technical remedy:** normalize route locale once to the existing `"en" | "fr"` type before indexing localized objects; align `SectionCard` and `FieldShell` prop contracts with their current call sites or remove unsupported `description`/`hint` props based on intended UI. Avoid broad component redesign.
- **Human remedy:** finance and customer surface owners confirm whether the descriptive copy is intentional before changing component contracts.
- **Verification:** focused component/page tests, then `npm run typecheck` exit 0.
- **Unlock:** compiler cleanline and access to later `verify:repo` steps.

### BLK-004 — Remove the single lint error

- **Evidence:** `app/[locale]/(dashboard)/dashboard/finance/finance-route-access.tsx:72` assigns the loop variable `module`, violating the Next.js rule.
- **Technical remedy:** rename only the loop binding and its local references, for example `moduleRequirement`; leave the three unrelated warnings unchanged unless separately authorized.
- **Verification:** focused ESLint on the file, then `npm run lint` exit 0.
- **Unlock:** lint cleanline.

### BLK-005 — Make verification fast, observable, and concurrency-safe

- **Why it matters:** a correct gate that takes minutes without progressive output still disrupts the development loop. Parallel static gates also raced on a generated JSON file; the isolated retry passed.
- **Technical remedy:** create a fast changed-slice command for local use, retain full typecheck/lint in integration, enable safe TypeScript/ESLint caching outside immutable evidence, stream child-process output, print gate start/end/duration, write artifacts atomically to command-specific temporary files, and prevent concurrent writers to the same final evidence path. Keep certification commands artifact-producing; provide read-only check modes for normal feedback.
- **Human remedy:** adopt feedback budgets: changed-slice check under 60 seconds, first failing integration gate visible under 30 seconds, full integration target under 10 minutes in CI unless an approved exception exists.
- **Verification:** measured local and CI timings, deterministic results on two consecutive runs, and a safe parallel-output test.
- **Unlock:** quicker iteration and lower rediscovery cost; it does not waive any gate.

### BLK-006 — Diagnose and restore payroll immutability runtime proof

- **Why it exists:** the wrapper reaches the dedicated local `stockflow_immutability_test` database, invokes Prisma migration deploy, receives exit 1, then records only the first stderr line. No trigger or mutation checks run.
- **Technical remedy:** reproduce on a newly created isolated PostgreSQL database; retain redacted full Prisma diagnostics; distinguish database availability, migration-history conflict, migration SQL error, and Prisma configuration failure; repair the harness or migration only after root cause is proven. Never point the gate at shared or production data. Keep transaction rollback for synthetic rows.
- **Human remedy:** data architect reviews any migration intervention; payroll controls owner confirms all 9 trigger and allowed/forbidden mutation cases.
- **Verification:** 9/9 triggers present, all forbidden mutations blocked, all permitted lifecycle updates allowed, output contains redacted diagnostic evidence, exit 0 twice on clean ephemeral databases.
- **Unlock:** payroll can join the integration profile.

### BLK-007 — Resolve destructive migration risk through maker-checker evidence

- **Why it exists:** one migration contains 13 destructive operations and none are bound to an approved exact file hash.
- **Correct position:** this must remain blocking for schema promotion. It is a universal data-loss control, not OHADA-specific.
- **Technical remedy:** inventory each dropped table/column, map historical data and code consumers, prove backup/export and forward/backfill strategy, rehearse against a production-like clone, record before/after row and financial control totals, and bind any acceptance to the exact migration hash. Prefer replacing unsafe steps with additive expand/migrate/contract sequencing if data is still needed.
- **Human remedy:** maker prepares the packet; independent data/accounting/security checkers approve or reject. Approval must not be inferred from a passing test.
- **Verification:** risk registry validates; exact hash matches; rehearsal and rollback evidence are attached; local and release preflights pass for the approved artifact.
- **Unlock:** migration-safety gate and production schema promotion.

### BLK-008 — Provision and attest the production database target

- **Technical remedy:** configure the production database URL through the approved secret manager, enforce a non-local PostgreSQL target, verify environment identity without logging credentials, run read-only connectivity and migration-status checks, and require backup/restore evidence before deploy.
- **Human remedy:** SRE owns provisioning; release authority confirms target identity and change window.
- **Verification:** production preflight reports URL configured and target safe without printing it.
- **Unlock:** migration execution can be considered after BLK-007; it does not authorize deployment by itself.

### BLK-009 — Complete the production secret and delivery package

- **Grouped root conditions:** six purpose-specific secrets/keys, canonical HTTPS origin, at least one statement delivery channel, and accountant-invite live delivery activation. Provider credentials become mandatory when the corresponding channel is enabled.
- **Technical remedy:** generate separate high-entropy values in the platform secret manager; prohibit reuse of auth secrets; define rotation and rollback; configure `NEXT_PUBLIC_BASE_URL`; enable one bounded statement channel and invite delivery only in the target environment; add provider health checks and redacted evidence.
- **Human remedy:** security approves secret ownership/rotation; product and support choose the initial delivery channel; release owner confirms environment scoping.
- **Verification:** `release:secrets:preflight:release` passes with no secret values printed; controlled non-production delivery test succeeds before production activation.
- **Unlock:** public signed links and live delivery release conditions.

### BLK-010 — Obtain qualified country-pack approval without blocking engineering

- **Correct position:** release-only. It must not be manufactured in code or removed.
- **Human/external remedy:** freeze the exact source packet and hashes, obtain independent qualified review and conflict declaration, capture dated approval/checker evidence, then promote only the reviewed country-pack version.
- **Engineering responsibility:** preserve production fail-closed states, provenance, pack/schema version, source hashes, and non-authoritative watermarks.
- **Verification:** production gate moves from 11/12 to 12/12 for the exact artifact; a changed hash invalidates approval.
- **Unlock:** authoritative country-pack activation for the reviewed capability only.

### BLK-011 — Complete live authority-adapter conformance

- **External conditions:** official DGI technical contract validation, independent production review, production credentials, and external sandbox conformance.
- **Technical remedy:** maintain the shared adapter contract, idempotent submission, hashed evidence, queue health, disable control, redaction, retry/rate-limit fixtures, and production fail-closed behavior.
- **Human remedy:** regulatory integration owner coordinates provider/regulator access; qualified reviewer approves contract interpretation; SRE owns credentials.
- **Verification:** external sandbox acceptance/rejection/outage/rate-limit evidence tied to an exact adapter revision; no live call from unapproved environments.
- **Unlock:** live authority behavior only; internal sandbox development is already unblocked.

### BLK-012 — Isolate a clean release candidate

- **Why it exists:** 219 changed entries span customers, suppliers, finance, AI, POS, scripts, reports, screenshots, fixtures, and configuration. Generated evidence and active product work are interleaved.
- **Technical remedy:** freeze current ownership, classify paths by product slice, move only the chosen slice plus required shared changes into a clean revision/worktree, regenerate only revision-bound evidence, and run a security diff. Do not reset or overwrite unrelated work.
- **Human remedy:** release manager decides scope; file owners approve mixed shared hunks.
- **Verification:** clean status for the isolated candidate, exact commit, scoped diff, reproducible commands, and zero unclassified paths.
- **Unlock:** trustworthy browser evidence and handoff.

### BLK-013 — Adopt one critical path and stop report-driven WIP

- **Why it exists:** the recovery assessment found extensive audit/readiness/roadmap volume and many partially finished workstreams. Current graph reports also show large, distributed domain surfaces: customer and supplier action communities, payroll RBAC communities 47–55, compliance community 63, country-adapter community 71, finance route communities, and multiple compliance/payroll/inventory UI communities. These graphs are useful for scoped impact analysis, not release proof.
- **Operating remedy:** set WIP limit to one platform-cleanline item plus one product slice; freeze new broad audits and skill expansion; use this report and JSON as the authoritative blocker register; mark superseded evidence historical rather than deleting it.
- **Human remedy:** product and engineering leadership choose the critical path and enforce stop conditions.
- **Verification:** weekly review shows one active product slice, named owners, aging blockers, and completed acceptance evidence rather than additional roadmaps.
- **Unlock:** converts engineering effort into demonstrable user outcomes.

### BLK-014 — Complete authenticated supplier browser evidence first

- **Recommended first vertical slice:** supplier workflow, after the integration greenline. It is smaller and less externally dependent than the referral production pilot, and the worktree already contains supplier fixtures/tests and presentation remediation.
- **Technical scope:** canonical supplier list/create/detail/edit, restricted-role denial, AP-linked history, export redaction, loading/error/empty states, and desktop/tablet/mobile behavior.
- **Human remedy:** product/QA provides a safe tenant, restricted-role identity, and lifecycle fixtures; accessibility reviewer validates keyboard/focus/labels.
- **Verification:** exact-revision Playwright run, no console errors, role-denial proof, redacted screenshots, focused tests, typecheck/lint/integration gates green.
- **Unlock:** first complete, user-visible recovery outcome. Referral exact-pilot release should be the next slice.

### BLK-015 — Expand the regulatory import boundary carefully

- **Risk:** the current boundary passes because it prohibits resolver/registry imports, but generic POS schemas can still import Cameroon-specific provider constants.
- **Technical remedy:** define jurisdiction-neutral provider-code contracts and expand static detection to direct country-pack constants outside approved adapters. Migrate consumers additively; do not rewrite historical data.
- **Verification:** a negative fixture proves a direct country constant import fails, while approved adapter imports pass.
- **Unlock:** reduces late country-pack retrofit risk; not a current stop condition.

## 7. OHADA-specific rules versus universal platform invariants

| Boundary | Classification | Defer? | Required treatment now |
|---|---|---|---|
| Qualified country-pack source approval | OHADA/country-specific | Yes, until capability promotion | Keep release-only fail-closed gate and exact provenance |
| Official DGI contract and live sandbox conformance | Country/authority-specific | Yes for ordinary development | Keep adapter port, credentials external, live paths disabled |
| Statutory payroll declarations, legal fiscal receipts, certified statutory close | Country-specific outcomes | Yes until real pilot/release | Expose pending/non-authoritative states; never claim certification |
| Country values, effective dates, source references | Country-pack data | Values may be deferred | Keep versioned schema, hashes, effective windows, and resolution contract |
| Tenant isolation, RBAC, fresh auth, segregation of duties | Universal | No | Keep blocking throughout development |
| Ledger balance, monetary precision, source links, reversal/correction | Universal accounting | No | Keep stable now; never retrofit with destructive history changes |
| Stock events and inventory valuation truth | Universal operational/accounting | No | Keep service-owned and immutable |
| Payment/AP reconciliation, maker-checker, suspense | Universal financial control | No | Keep blocking |
| Idempotency, outbox, audit, evidence, redaction, retention | Universal trust | No | Keep blocking and observable |
| Migration safety and payroll immutability | Universal data integrity | No | Resolve; never bypass |
| Regulatory port, provenance, watermark, pending states | Mixed enabling spine | No | Retain now because it makes later country packs additive |

## 8. Lifecycle blocker matrix

| Concern | Local development | Shared integration | Pilot | Production |
|---|---|---|---|---|
| Typecheck/lint | Blocking | Blocking | Blocking | Blocking |
| Integration-profile wiring | Does not stop editing | Blocking | Blocking | Production chain remains separate |
| Non-claim semantic check | Blocking only for country-pack dev work | Blocking | Blocking | Superseded by production evidence |
| Payroll immutability runtime | Blocking when payroll is touched | Blocking | Blocking for real payroll | Blocking |
| Destructive migration risk | Review during local work | Blocking for schema promotion | Blocking | Blocking |
| Production database target | Not applicable | Not applicable | Environment-dependent | Blocking |
| Production secrets/delivery | Warning only | Warning only | Capability-dependent | Blocking |
| Qualified statutory approval | Not applicable | Not applicable | Required before real statutory effect | Blocking |
| Live authority conformance | Not applicable | Sandbox fixtures only | Required for live authority pilot | Blocking |
| Browser/pilot evidence | Focused UI work can proceed | Required for slice acceptance | Blocking | Blocking |
| Single critical path/release isolation | Productivity constraint | Blocking trustworthy handoff | Blocking | Blocking |

## 9. Critical-path execution sequence

```text
Leadership WIP freeze and ownership
  -> TypeScript + lint cleanline
  -> Integration-profile and semantic-gate repair
  -> Payroll harness diagnosis + migration decision packet
  -> Green integration command on a clean revision
  -> Supplier authenticated browser slice
  -> Customer/referral exact release slice
  -> External production tracks converge when ready
       ├─ statutory expert approval
       ├─ live adapter conformance
       ├─ production secrets/delivery
       └─ safe database target + migration approval
  -> full release verification and authorized go/no-go
```

The external tracks run in parallel under separate owners. They must remain visible but must not hold the supplier integration slice hostage.

## 10. First 48 hours

1. **Leadership:** declare the critical path `Integration Greenline → Supplier Browser Evidence → Customer Referral Exact Pilot`. Pause new broad audits and unrelated workstreams.
2. **Release manager:** snapshot this report, JSON register, branch, commit, and 219-entry worktree; assign owners before any isolation work.
3. **Finance/customer frontend owners:** clear the ten TypeScript diagnostics and single lint error surgically; do not clean the three unrelated lint warnings.
4. **Platform engineering:** prepare the exact six-script lifecycle patch: five missing aliases plus `policy:gates:integration`; update `verify:repo`/`verify:release` and add contract tests without deleting production gates.
5. **Compliance platform + controls:** replace the brittle non-claim text match with structured meaning or align canonical wording and tests.
6. **Data/payroll:** reproduce payroll migration deploy on a fresh isolated PostgreSQL database and capture redacted full diagnostics.
7. **Data migration owner:** open a 13-finding exact-hash decision packet; do not approve it until data-impact and rollback evidence exist.
8. **DevEx/SRE:** add timing and progressive command visibility to the remediation backlog; do not weaken full checks.

Exit criteria: typecheck and lint green; integration command exists and resolves all contract targets; payroll failure has a precise cause; every critical blocker has an accountable owner.

## 11. First 7 days

1. Land the lifecycle-specific verification patch in a clean, reviewed revision.
2. Prove integration can pass while production statutory approval remains blocked.
3. Restore payroll immutability proof to 9/9 triggers and all mutation cases on two clean isolated databases.
4. Complete migration rehearsal and maker-checker decision; use additive replacement if destructive evidence is insufficient.
5. Create the clean supplier slice with only required shared changes.
6. Establish safe supplier tenant and restricted-role fixtures.
7. Run exact-revision focused tests plus desktop/tablet/mobile authenticated browser checks.
8. Assign named people or contracted roles for statutory review, adapter conformance, secrets, database target, and pilot operations.

Exit criteria: one green integration path, one clean supplier candidate, and production-only blockers isolated into owned external/environment tracks.

## 12. Next 30 days

1. Complete supplier workflow acceptance and support/runbook handoff.
2. Isolate the customer/referral release candidate; classify mixed paths and bind evidence to an exact revision.
3. Run non-production referral delivery rehearsal with redacted provider evidence.
4. Configure secret-manager references, HTTPS origin, delivery ownership, rotation, and rollback without enabling premature production behavior.
5. Complete production-like migration rehearsal and safe-target attestation.
6. Expand regulatory boundary coverage for country constants.
7. Prepare—not self-approve—the qualified country-pack review packet.
8. Execute external authority sandbox conformance only when official contracts and credentials exist.
9. Measure gate latency weekly and keep the authoritative register current; supersede, do not multiply, reports.

## 13. Release-only track

The following must stay out of ordinary development but remain mandatory before relevant production capability activation:

- Qualified country-pack expert approval bound to exact hashes
- Official authority/provider contract validation
- Production credentials and external sandbox evidence
- Safe production database target
- Exact-hash destructive migration approval and rehearsal
- Purpose-specific secrets, HTTPS origin, rotation, and delivery configuration
- Exact release revision, browser evidence, support runbooks, and authorized go/no-go

No engineering task may mark these complete without the required human or external evidence.

## 14. Ownership and escalation matrix

| Workstream | Accountable role | Decision authority | Escalate when |
|---|---|---|---|
| TypeScript/lint cleanline | Finance/customer engineering owners | Engineering lead | Intentional UI contract is unclear after one focused review |
| Gate lifecycle repair | Platform engineering lead | Principal architect + release owner | Any proposed change removes a production control |
| Payroll immutability | Payroll/data engineer | Data architect + payroll controls owner | Reproduction requires shared/production DB or migration rewrite |
| Migration risk | Migration owner | Independent data/accounting/security checker | Any historical data cannot be proven disposable or recoverable |
| Production database | SRE/platform | Release authority | Target identity, backup, or restore proof is missing |
| Secrets/delivery | Security/platform + product ops | Security and release authorities | Secret reuse, logging, or live-provider ambiguity appears |
| Statutory pack | Qualified reviewer | Authorized statutory checker | Sources conflict, are stale, or scope is unclear |
| Authority adapter | Regulatory integration owner | Release authority + qualified reviewer | Official contract or external sandbox access is unavailable |
| Supplier evidence | Product/QA + supplier engineer | Product owner | Safe fixtures or restricted-role identity cannot be provided |
| Portfolio WIP | Product and engineering leadership | Executive product owner | More than one product slice or a new broad audit is proposed |

## 15. Operating cadence

- Maintain one authoritative blocker register: the JSON companion to this report.
- Limit active work to one platform cleanline and one product slice.
- Review critical blockers for 15 minutes daily: owner, next evidence, age, and escalation date.
- Review lifecycle gate composition weekly; production requirements may not drift into integration unnoticed.
- A report is allowed only when it changes a decision, closes a blocker, or supersedes an older artifact.
- Every task ends with exactly one of: verified artifact, explicit owner decision, precise external blocker, or deliberate stop.
- Gate output must name lifecycle, exit semantics, elapsed time, and next owner.
- Do not count files, prompts, reports, or lines of code as progress. Count green integration revisions and user-verified flows.

## 16. Work that can proceed immediately

- Fix the four files containing current TypeScript diagnostics.
- Rename the lint-conflicting loop variable in the finance access file.
- Prepare and review the integration-profile wiring patch.
- Correct the non-claim gate’s semantic contract and tests.
- Diagnose the payroll test-database migration failure on an isolated database.
- Build the destructive-migration decision packet without approving or executing production migration.
- Prepare supplier authenticated fixtures and exact browser test scope.
- Continue non-authoritative, watermarked product development behind the regulatory port.
- Prepare statutory and adapter evidence packets without making production claims.

## 17. Work that must not proceed yet

- Production country-pack activation
- Live authority submission
- Real statutory payroll, declaration, fiscal receipt, filing, or certified close based on unapproved rules
- Production migration execution
- Public signed-link or live delivery launch without the required secrets and HTTPS origin
- Release certification from the current 219-entry dirty worktree
- Any attempt to delete or bypass accounting, migration, tenant, RBAC, audit, reconciliation, or evidence gates

## 18. Multidisciplinary disposition

| Lens | Finding |
|---|---|
| Enterprise/platform architecture | Isolation is sound; current lifecycle wiring has regressed from the documented target. |
| Backend/API/events | Service and replay boundaries pass; retain transactions, idempotency, outbox, and provider failure isolation. |
| Database/migrations | Schema validates, but payroll runtime and destructive-migration evidence block promotion. |
| Security/IAM/privacy/fraud | Core gates pass; production secret package remains legitimately incomplete. |
| Frontend/design system | Applicable: current compiler and lint errors block the shared cleanline. |
| Workflow UX/accessibility/localization | Supplier browser evidence is the next acceptance gap; locale typing errors are current. |
| Product strategy/business process | The main portfolio blocker is excessive WIP without one releaseable critical path. |
| Finance/accounting/reconciliation | Ledger, cash, AP, inventory, close, and evidence invariants are universal and must remain. |
| OHADA/statutory | Qualified production approval is external and release-only; development isolation is viable. |
| Quality/release assurance | Fail-fast aggregation hides downstream truth; independent checks provide a more accurate register. |
| SRE/DevSecOps/observability | Gate latency, silent output, file contention, environment ownership, and release configuration need explicit owners. |
| SaaS packaging/customer success | Compliance may remain separately entitled, but supplier/customer workflows need completed acceptance and support evidence. |
| Audit/records/data quality | Preserve evidence history, but consolidate current truth into one register. |
| POS/inventory/offline | Internal boundary gates pass; external hardware/authority behavior remains unproven. |
| Purchasing/AP | Core AP gate passes; fraud-control gate is blocked only by missing policy wiring. |
| HRIS/payroll | Presence logic is ready except wiring; immutability runtime proof remains blocked. |
| Payments/provider | Internal cash truth passes; live provider evidence is release-only. |
| Analytics/data governance | Not a material gate in this review; ensure future pilot metrics bind to exact revisions. |
| AI/agent governance | Copilot guardrail gate passes 18/18; no autonomous authority expansion is proposed. |
| Change management/support | High documentation volume needs consolidation into current runbooks and ownership, not more broad reports. |

## 19. Decisions required from leadership

1. Approve the critical path: `Integration Greenline → Supplier Browser Evidence → Customer Referral Exact Pilot`.
2. Name the platform owner for lifecycle-gate repair.
3. Name the migration maker and independent checker.
4. Name or procure the qualified statutory reviewer.
5. Name owners for production database, secrets, delivery channels, and external adapter conformance.
6. Enforce the WIP/report rule: no new broad audit unless it changes a decision or closes a blocker.

## 20. Residual risks

- The dirty working tree may change before remediation begins; rerun focused evidence on the isolated revision.
- The payroll failure may reveal a deeper migration-history issue once full redacted diagnostics are retained.
- Expanding the regulatory import boundary may expose additional jurisdiction coupling.
- Provider, authority, hardware, load, accessibility, and real pilot behavior remain external or environment-specific.
- Gate timing improvements must not turn full checks into optional checks.
- A green integration profile will not imply production readiness or statutory approval.

## 21. Final recommendation

Do not remove the OHADA compliance stack and do not let its qualified production approval gate block ordinary engineering.

Restore lifecycle separation, clear the present code-health failures, resolve universal data-integrity blockers, and focus the team on one exact supplier vertical slice. Run statutory review, live adapter conformance, production environment provisioning, and migration authorization as owned release tracks that converge later.

That sequence creates the requested “giant strides” without creating a destructive compliance retrofit or weakening the controls that make Stoquify trustworthy.
