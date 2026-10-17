# ECC and UI/UX Pro Max implementation status

Date: 7 October 2026. Scope: execute the repository configuration recommendations in the [blueprint](stoquify-codex-ecc-uiux-configuration-blueprint-2026-10-07.md), Codex first with shared project standards. Baseline HEAD: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9` plus the existing dirty working tree. No commit, deployment, migration, seed, production UI change or host plugin reinstall was made.

## Delivered

| Blueprint phase | Local implementation | Acceptance status |
|---|---|---|
| A: shared instructions | Corrected AGENTS/CLAUDE auth and command guidance; [WORKFLOW](WORKFLOW.md), [qualified routing](skill-routing.md), [tooling baseline](tooling-baseline.json) | Implemented; independent fresh-start document walkthrough found clear auth/UI/database routes |
| B: ECC command contract | Reviewed registry, validator, 23 negative/positive fixture tests, explicit test lanes, service coverage inclusion, PR evidence fields | Local checks passed; required-reference existence is checked, not arbitrary Markdown semantics or all application imports |
| C: persistent design | [Master](../../design-system/stoquify/MASTER.md) and public/auth, inventory, POS, AP page contracts; project skill routing/version guidance; generated slug references repaired | Persistence and color-mode tests passed; current tokens and production UI preserved |
| D1/D2: bounded pilots | [Pilot evidence](pilot-results-2026-10-07.md), isolated Next/Jest configuration and `test:ecc:pilots` command | 10 suites / 123 tests passed; full rendered, real-DB and independent domain acceptance remain open |
| E: enforcement/maintenance | Early CI contract job, bounded pilots, explicit Prisma generation, direct axe-core dependency, PR evidence, [maintenance procedures](maintenance.md) | Local wiring implemented; remote CI/required checks and full rollout acceptance remain open |

Sequence adjustment: the cheap deterministic CI gate and maintenance procedures were wired after the bounded tests passed. This does not close D or authorize broader rollout before its database, browser and domain conditions pass. No speculative application changes were made to demonstrate plugin use.

## What changes in daily work

Codex and Claude entry instructions now lead to the same project standards. Agents select relevant ECC skills, inspect commands and their side effects, reuse existing domain controls, and report evidence by class. UI tasks retrieve the existing constitution, live tokens and shared components through the project master before using focused UI/UX Pro Max searches. Search advice incompatible with the installed Next 15 / Tailwind 3 stack is rejected.

The command registry approves three bounded lanes and explicitly denies seven mutation/build lanes for read-only audits. At validation, 198 other scripts were outside the reviewed manifest. Unknown commands fail when explicitly selected; their existence does not fail the default gate. The validator never executes a selected command. Fingerprints cover listed files and lifecycle changes; this is an integrity check, not a security sandbox or complete side-effect analyzer. Canonical design conflicts still require review.

## Verification evidence

| Check | Observed result |
|---|---|
| `npm run agent:workflow:check` | Passed; reviewed command text, fingerprints and required references resolve |
| `npm run agent:workflow:test` | 1 suite / 23 tests passed |
| `npm run test:ecc:pilots` | 10 suites / 123 tests passed in one final integrated invocation, 12.038 seconds on this host |
| Explicit selection of `build` | Expected refusal, exit 1; command not executed |
| UIUX Python persistence tests | 3 passed, including no-overwrite and scoped paths; workspace temporary output cleaned |
| UIUX Python color-mode tests | 22 passed |
| Existing public-color contract | 7 passed; also included in the 123 pilot tests, not counted twice |
| New design master/page links | 43 checked, no broken target |
| Instruction/workflow relative Markdown links | 35 checked, no broken target |
| CI YAML, dependency metadata and scoped whitespace diff | Passed; existing axe resolutions satisfy the direct declaration in both lockfiles |
| Explicit unknown-command selection | Expected refusal, exit 1; command not executed |
| Independent implementation review | No high/critical issue identified; explicit Prisma generation added to address CI prerequisite reliability |

Local results use the installed dependencies, not a newly installed Linux checkout. CI explicitly generates the Prisma client before the mocked pilot lane. Generation writes client artifacts; it does not establish database connectivity or apply migrations. A remote clean-checkout run is still required.

`axe-core` is now a direct dev dependency because existing browser tests import it. Existing lock resolutions were reused: npm 4.11.4 and pnpm 4.13.0 both satisfy `^4.11.4`. The preexisting lockfiles also differ on framework/test versions; they were not broadly regenerated. npm remains the current CI reproduction path. No package download or framework upgrade was performed.

## Remaining acceptance and concrete next actions

| Open item | Evidence/constraint | Next action and responsible role |
|---|---|---|
| Real PostgreSQL pilot | Docker, Podman and PostgreSQL CLI tools absent from PATH; no disposable target verified | QA/platform provisions an explicitly disposable target, then follows inspected runners and reset conditions in [test lanes](test-lanes.md); complete missing AP concurrency/recovery coverage before claiming acceptance |
| Rendered public/auth, inventory and financial states | Chrome DevTools MCP reports profile already in use; no rendered pilot evidence captured | Tooling owner uses a supported isolated browser configuration and QA runs scoped EN/FR, keyboard, responsive, state and axe checks against disposable fixtures |
| Screen-reader and financial acceptance | No human assistive-technology or domain review evidence | Design/domain owners review actual pilot outcomes and record acceptance or remaining defects |
| Remote CI and required checks | Workflow edited locally; no branch run or remote protection verified | Engineering owner runs the proposed branch through CI, then verifies repository-required checks with authenticated administration |
| Hook execution | ECC installed/enabled; trust record observed, current-hash match and execution unverified | Verify native hook status and fresh-session behavior through supported host controls; do not edit trust hashes |
| Proven long-term benefit | No measured before/after product-task comparison yet | Record accepted/rejected suggestions and task outcomes over the next three scoped tasks using [maintenance](maintenance.md) |

Native inventory was improved during implementation: the PATH npm CLI is 0.128.0 and lacks the necessary list operations; the desktop-bundled 0.160.1 successfully lists enabled ECC 2.2.3 and its marketplace. The remote catalog request failed independently of successful local inventory. No PATH change, upgrade, cache modification or hook-trust mutation was necessary.

## Ownership and rollback

Responsibility roles and review triggers are documented; actual people/GitHub teams have not been invented. No recurring automation is activated. Retain existing domain/security/release gates. For rollback, reverse only the task-owned instruction, contract, design-adapter, package metadata and CI hunks after reviewing the current dirty tree; never reset the checkout or remove preexisting skills. Preserve prior audit reports as historical evidence. This status record supersedes their unapplied-configuration statements for the changes listed above.
