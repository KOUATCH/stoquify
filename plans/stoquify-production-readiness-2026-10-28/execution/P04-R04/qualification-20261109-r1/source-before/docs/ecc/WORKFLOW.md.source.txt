# Stoquify engineering workflow

Maintainers: engineering lead (instructions), QA/platform (commands/CI), design-system lead (UI), domain owner (financial acceptance). These are responsibility roles, not assigned GitHub users. Current capability evidence: [tooling-baseline.json](tooling-baseline.json). Implementation status: [implementation-status-2026-10-07.md](implementation-status-2026-10-07.md).

## Start here

1. Read the task, applicable AGENTS instructions and current working-tree changes. Define the smallest acceptance criteria and owned files. Preserve other work.
2. Select the relevant row below and the qualified skill in [skill-routing.md](skill-routing.md). Discover installed skill/tool paths; do not assume Claude commands or global home-directory skills are available in Codex.
3. Use current source, package/lock versions and appropriate graph nodes. Graph counts, historical reports and previous passing checks are discovery evidence, not current release proof.
4. Before a package command, inspect its definition, npm pre/post hooks, delegated helpers/configuration and environment requirements. Consult [command-registry.json](command-registry.json) and [test-lanes.md](test-lanes.md). The registry is a reviewed allowlist, not a complete semantic analyzer of every script.
5. Implement the requested change, then verify the acceptance criteria. Report inspected, executed, passed, failed and not-run evidence separately.

## Select a workflow

| Task | Relevant guidance | Required evidence |
|---|---|---|
| Feature | ECC search-first; scoped plan for cross-module work; existing frontend/backend patterns | Existing architecture reused; success/denial/recovery paths appropriate to the change |
| Bug | Reproduce, change minimal code, targeted regression | Before/after behavior; no unrelated cleanup |
| Auth, endpoint, permissions | ECC security-review + `lib/security/rbac.ts` + `services/_shared/protect.ts` | Fresh server-owned actor/org, revoked/denied session, related-resource tenant scope; inspect handler-derived guard bypasses |
| POS/inventory | Existing checkout/stock kernel + domain tests | Replay and changed-payload handling, reviewed revision, quantity/value conservation, period control and uncertain-commit recovery |
| AP/payroll/finance | Existing reviewed commands and close-proof decisions | Independent actors, balance/revision, privacy, retained proof, replay and downstream close invalidation |
| Database | Existing migration policies and inspected dedicated runner | Explicit disposable target, migration/replay and real concurrency/rollback evidence; mocks do not qualify |
| UI | [Design master](../../design-system/stoquify/MASTER.md), scoped page contract, UI/UX Pro Max focused search | Existing tokens/components, business truth, EN/FR, keyboard/focus, relevant states and rendered evidence |
| Release | ECC verification-loop adapted to actual scripts, existing release/domain gates | Current source/artifact provenance, operational and domain acceptance, rollback evidence |
| Small reversible edit | Existing narrow checks | Skip unrelated skills, broad tests and multi-phase planning |

## Verify without changing the wrong environment

```powershell
npm run agent:workflow:check
npm run agent:workflow:test
npm run test:ecc:pilots
```

The first two validate this contract and its negative fixtures. The pilot lane is explicitly bounded mocked/pure/component evidence, not a PostgreSQL or browser certification. Inspect any new test import/setup before adding it. Commands should retain their actual exit status; do not pipe a failing check through a formatter and report the formatter's success.

`npm run build` validates secrets and compiles; it no longer promotes schemas. It still loads application environment/configuration and can clean build output, so it is not a read-only audit command. `release:artifact` prepares a content-bound standalone artifact; `release:schema:promote` is a separate mutating stage requiring its trusted digest and the existing target/migration gates. See [schema promotion](../release/ARTIFACT_SCHEMA_PROMOTION.md). `verify:ci` includes migrations, and E2E wrapper scripts can seed data. `verify:repo` includes integration gates/build/tests. `typecheck` can write incremental metadata. Command registry refusal means review/classification is needed, not permission to bypass it with an equivalent shell string.

Registry changes require reviewing the actual script and tracked dependencies; do not refresh hashes just to turn a failure green. Fingerprints detect changes, not all semantic side effects. A registered command's npm lifecycle changes must be reviewed too. Unknown commands remain unreviewed until their effects and target requirements are understood.

## Design decisions persist

Read the master and relevant `design-system/stoquify/pages/*.md` before UI work. The master points to the UI constitution, component registries and implemented semantic tokens; it is not a second palette. Public/auth and authenticated theme boundaries remain distinct. Blue product identity and approved gold/chestnut variants coexist. The separate branding proposal is not an active recoloring instruction.

Search UI/UX Pro Max for a focused concern and inspect the actual returned result, category and version applicability. Installed baseline is Next 15 / Tailwind 3; advice marked Next 16.2 or Tailwind `@theme` requires version review. Reject off-topic results. Do not persist an unreviewed generated design over approved decisions. A page contract cannot override tenant, security, financial-truth or global identity rules.

## Completion evidence

Record: task/changed files; affected invariants; exact test commands and results; source revision and local-diff scope; unit/DB/browser/manual evidence class; limitations; rollback. For UI, include route, role, locale, viewport and states. Source assertions are not rendered accessibility; unit mocks are not lock/transaction proof; a historical certification is not current close readiness.

Use the PR template evidence fields. CI enforces the deterministic contract once this change is merged and the job is run; remote required-check policy still needs authenticated repository administration. User instructions retain their normal priority; generic plugin suggestions never override repository business controls.

## Tool failure or absence

Keep working through repository instructions and available compatible tools. Report missing capabilities precisely. Native plugin enablement, hook trust and successful hook execution are separate states. Use [maintenance.md](maintenance.md) to resolve PATH selection and browser profile contention. Do not kill another session's browser or edit provider-owned caches as a repair.
