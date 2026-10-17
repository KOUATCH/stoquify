# Tool and workflow maintenance

The repository workflow is maintained independently of plugin caches. No recurring automation is activated by this document.

## Responsibilities and cadence

| Trigger | Responsible role | Deliverable |
|---|---|---|
| Task/PR | Implementer + reviewer | Risk lane, affected invariant, exact verification and limitations |
| Registered command/helper change | QA/platform | Side-effect re-review, registry fingerprint diff, negative tests |
| UI contract/token/component change | Design-system owner | Approved contract, state/locale/viewport evidence and relevant regression checks |
| Financial/auth/database change | Domain/security owner | Authority/replay/approval/privacy/transaction evidence and remaining release conditions |
| Monthly targeted review | Engineering/tooling owner | Broken links, duplicates, outdated version advice, useful/redundant skill findings |
| Plugin/skill update | Tooling + design/QA | Version/content diff, compatibility canary, native hook-trust review if definition changes |

Assign actual people/teams through the normal project process; these role labels do not invent CODEOWNERS identities. Initial effort allowance is 1–2 hours monthly plus 1–3 hours per tool update, to be replaced with measured effort. No claim of proven time savings is made.

## Compatible Codex executable

On the inspected Windows machine, PATH resolves an npm Codex 0.128.0 before the desktop-bundled 0.160.1 executable. The latter successfully listed the installed/enabled `ecc@ecc` 2.2.3 and its marketplace. No host upgrade is needed merely to perform that inventory.

Discover paths on each host; the hash directory under the desktop installation changes with updates:

```powershell
Get-Command codex -All | Select-Object Source,CommandType
$stoquifyCodex = Get-Command codex -All |
  Where-Object { $_.Source -match '[\\/]OpenAI[\\/]Codex[\\/]bin[\\/].*[\\/]codex\.exe$' } |
  Select-Object -First 1 -ExpandProperty Source
if (-not $stoquifyCodex) { throw 'Discover a compatible Codex executable on this host.' }
& $stoquifyCodex --version
& $stoquifyCodex plugin --help
& $stoquifyCodex plugin list --json
& $stoquifyCodex plugin marketplace list --json
```

These inventory operations do not update PATH. In this environment the remote catalog request failed, but local installed-plugin inventory succeeded; keep those results separate. Do not copy a versioned absolute executable path to another machine.

## ECC hooks and browser diagnostics

ECC's local manifest references a SessionStart bootstrap. A stored trust hash is not proof of a matching current definition or successful execution. Check the host's native hook status and a fresh-session result; do not rewrite trust hashes. Avoid directly replaying bootstrap scripts against the real user home: their context/session handling can write or prune state.

If Chrome DevTools reports its browser profile already in use, do not terminate an unrelated browser or erase its profile. Use an available task-isolated browser surface for diagnostics. For a future dedicated Chrome DevTools MCP configuration, verify `--isolated` in that installed connector's help and apply it through a supported native connector configuration/restart, not by modifying ECC's cached `.mcp.json`. Record connector connectivity separately from rendered Stoquify evidence. A blocked connector does not disable source/unit verification.

For document publishing, Playwright's browser location may need a process-scoped `PLAYWRIGHT_BROWSERS_PATH` pointing to an existing installation. This is separate from the interactive MCP profile; never assume printing a PDF verifies the application UI.

## Development cache isolation

Use `npm run dev` (Webpack) or `npm run dev:turbopack`. Both retain the existing
Prisma Client preparation and launch the local Next CLI with a fresh, atomically
allocated `.next-dev-session-*` directory. `npm run dev -- --port 3001` starts a
separate session. An explicit `NEXT_DIST_DIR=.next-review` is a prefix and becomes
`.next-review-session-*`; it must be a local `.next-<name>` directory name.
The launcher prints the actual output path. Production builds continue to use
`.next` or their explicit `NEXT_DIST_DIR`.
Each session also uses an ignored sibling `*.tsconfig.json` extending the source
config, so Next's generated type paths do not accumulate in `tsconfig.json`.

Each full restart starts cold, so it cannot reuse interrupted output. Webpack
uses an in-memory cache during development; production caching is unchanged.
Next's normal Fast Refresh, automatic config restart and signal handlers remain
in place. Direct `next dev` commands bypass session isolation: use the npm entry
points for interactive development and new verification scripts.

Generated session directories and their sibling TypeScript configs are ignored
by Git and retained for diagnostics.
They are not deleted automatically because a surviving worker may still own
them after an interrupted shutdown. Remove old session directories only after
stopping their servers; never clean the output of a running server. If a runtime
error recurs, stop that session and run `npm run dev` again. This allocates fresh
output without deleting another server's files. This protection addresses stale
or shared build artifacts, not application exceptions or every framework bug.

`npm run test:dev:startup` runs isolated Node filesystem/config tests. It does not
start the application, load database fixtures, or apply migrations.

On Windows, `prisma:ensure` reuses a generated client only when the schema,
installed/generated versions, required files and engine hashes match. Schema
comparison ignores Prisma's reordering of adjacent single-line block attributes
such as `@@index` and `@@unique`, while preserving the field order inside each
constraint. This avoids unnecessary DLL replacement while another dev server
has the engine loaded. A real schema/version/engine change still requires
generation: stop this project's Prisma-using processes before generating, then
restart them. The startup guard does not automatically terminate other sessions.

## Upgrade and rollback

1. Record installed version, relevant content hashes, supported CLI/tool capabilities and current project checks. Do not export secrets or private session content.
2. Read the native lifecycle and installed skill instructions; inspect release/version differences before any update. Use supported host management and let it handle required trust decisions.
3. Run contract fixtures, relevant UIUX search/persistence tests, and the bounded pilot lane. Verify stack applicability and no-overwrite rules. Keep DB/browser checks in their declared environments.
4. Update baseline metadata only after inspecting the actual changes. Never refresh fingerprints blindly to suppress failures.
5. If a tool breaks, use the repository workflow while restoring the prior supported plugin through native management. For repository changes, reverse only owned reviewed hunks; preserve existing product/domain gates and unrelated edits.

## Pilot and drift measurements

Use [pilot results](pilot-results-2026-10-07.md) as the initial technical evidence, not a measured productivity baseline. For the next three real tasks (public/auth, inventory, reviewed payment/checkout), first record findings from the established process, then additional accepted plugin-assisted findings. Record duplicate/rejected suggestions, effort, escaped defects and user task errors. Do not manufacture before/after improvements when no product change was made.

Required release evidence still includes isolated PostgreSQL concurrency/rollback, rendered EN/FR/state checks, manual assistive-technology review and domain acceptance where applicable. Remote branch protection can only be verified/configured with authenticated repository administration. The local CI file is not proof that a required check is active remotely.
