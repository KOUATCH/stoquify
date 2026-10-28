# Stoquify 70+ Skills Phase B Action Plan and Execution Record

**Date:** 2026-08-05  
**Parent decision:** `stoquify-70-plus-skills-installation-feasibility-2026-08-05`  
**Execution status:** Recommended first wave complete; all later gates preserved

## 1. Plan of action

| Wave | Candidate/action | Required scope | Status |
|---|---|---|---|
| 1 | Supabase `supabase-postgres-best-practices` | Exact commit, project-local, report-only, explicit invocation, current validator, tested removal | **Completed** |
| 1 | Addy `web-quality-audit` | Exact commit, content-only, project-local, report-only, explicit invocation, current validator, tested removal | **Completed** |
| 2 | Impeccable detector | Disposable CLI, synthetic/non-sensitive fixtures, no hooks or root documents | **Not executed — separate artifact/provenance and pilot approval remains required** |
| 2 | Anthropic evaluation methods | Internal pattern adaptation; no duplicate `skill-creator` | **Not executed — separate reviewed internal change required** |
| 3 | Alibaba Open Code Review | Synthetic repository only; pinned Windows binary; approved provider/egress contract | **Blocked by the report's binary, privacy, provider, and egress gates** |
| 3 | Trail of Bits supply-chain method | Read-only Stoquify adaptation; CC-BY-SA legal review; advisory only | **Blocked from upstream as-is installation** |
| 4 | Sentry | Privacy-approved telemetry contract and safe content-only distribution | **Disabled and blocked** |

This execution deliberately stops after Wave 1 because the parent report requires separate prompts and domain-owner approvals for every later wave.

## 2. Executed scope

Installed project-locally under:

`E:\ohada saas\Focused projects\stoquify\.codex\skills`

No global skill, CLI, SDK, SaaS connection, MCP, hook, package dependency, application code, database schema, CI configuration, environment variable, or production configuration was added.

### 2.1 Supabase PostgreSQL guidance

- Source: `https://github.com/supabase/agent-skills`
- Path: `skills/supabase-postgres-best-practices`
- Exact commit: `1ad9aaeb49caafd9e95c0a91116f71890eebbc53`
- License: MIT; exact pinned license stored as `LICENSE.upstream.txt`
- Upstream file count: 36
- Upstream-core tree SHA-256: `27D8C8A69FEB671B6EEE39B99F6BF4E5BD0810AB4EA1F74BAFB6AFE316191614`
- Final installed tree SHA-256, including license and Stoquify Codex policy: `87AFEE16049D95020FCFC20F9CE3E776815F24FC6029263947A6B200ECC045CB`
- License SHA-256: `B65E575EB4F04A13C187D64E958321298E2AB84D67AA8428819F362056BA292C`
- Upstream-core comparison with quarantine: **exact match**
- Executable-like files: **0**
- Hooks, MCP, credentials, package lifecycle scripts: **0**
- Codex policy: `allow_implicit_invocation: false`
- Current Codex validator: **PASS — `Skill is valid!`**

Permitted use is an explicit, report-only review. It must not apply SQL, migrations, database policy, RLS, grants, schema changes, or runtime configuration. Supabase-specific identity examples must be translated into Stoquify's Better Auth/Prisma/Neon organization model and independently verified.

### 2.2 Addy web-quality guidance

- Source: `https://github.com/addyosmani/web-quality-skills`
- Path: `skills/web-quality-audit`
- Exact commit: `7b59d48aaf1f793935002f4998dfccc656f40839`
- License: MIT; exact pinned license stored as `LICENSE.upstream.txt`
- Quarantined upstream files: `SKILL.md` and `scripts/analyze.sh`
- Full upstream tree SHA-256: `A3F2173795D0196EFDAE51D89786214C29CC24CD3C0144C82B38375298113DDA`
- Installed upstream `SKILL.md` SHA-256: `B39C62F24E6EEA1FFB517924B738F052F3888F32A8A5CA3CF348C1B33AEEA291`
- Final installed content-only tree SHA-256, including license and Stoquify Codex policy: `6F94F4DD956216C8E578A43F4D579F609B88F82C7182B9BF14AB0FAFA2E21805`
- License SHA-256: `C122223AC43E86421958E18623979942C21B642951E2E3736DCB63EFF13587C3`
- Excluded `scripts/analyze.sh` SHA-256: `B1B28663AF412F746BAF5008618E3AE798E322B10FF5AB7AE1830826A6D8E4E2`
- Installed `SKILL.md` comparison with quarantine: **exact match**
- Executable-like installed files: **0**
- Hooks, MCP, credentials, package lifecycle scripts: **0**
- Codex policy: `allow_implicit_invocation: false`
- Current Codex validator: **PASS — `Skill is valid!`**

The Bash helper was inspected but never executed. Although its implementation is locally read-only, it depends on Bash, `jq`, `find`, and `grep`; the parent report required executable content to be explicitly allowlisted or excluded. It was therefore excluded from the final content-only installation.

Permitted use is an explicit, report-only checklist backed by existing browser, Playwright, accessibility, localization, performance, and human evidence. It cannot certify WCAG, security, privacy, SEO outcomes, or release readiness.

## 3. Installer and validator evidence

- Codex installer: `C:\Users\J COMPUTER\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py`
- Installer SHA-256 at execution: `80196D9F149A0191D338F37D56003F32FFC8590E833D658539903F5D794EF146`
- Codex validator: `C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py`
- Validator SHA-256 at execution: `5347A0A09CFB546BBA1C0D1A30DAE0A233D9A05F57BD4E7877155C588BCDABF7`
- Bundled document Python could not import the validator's required `yaml` module.
- Existing system Python 3.12.9 with PyYAML 6.0.3 was used instead; no dependency was installed or changed.
- Both quarantined candidates passed validation before promotion.
- Both final project-local candidates passed validation after license and policy additions.

## 4. Removal rehearsal and rollback

The complete quarantine directory was resolved to the expected project path, removed recursively using that exact literal path, and verified absent. Result: **PASS**.

No candidate may be promoted beyond this local controlled state until its final removal is also rehearsed when the skill is intentionally retired. Exact rollback targets are:

- `E:\ohada saas\Focused projects\stoquify\.codex\skills\supabase-postgres-best-practices`
- `E:\ohada saas\Focused projects\stoquify\.codex\skills\web-quality-audit`

Before removal, resolve each target and prove it is the exact child of the project-local `.codex\skills` directory. Remove only the selected directory, reload Codex, verify the skill is absent, and confirm no unrelated worktree change.

## 5. Use and update ownership

| Candidate | Pin/update owner | Use approval | Evidence owner |
|---|---|---|---|
| Supabase | Agent Governance | Database Architecture + Security | Database/tenant-control reviewer |
| Addy | Agent Governance | Frontend + Accessibility + Security | Browser/accessibility evidence reviewer |

Updates are manual reviewed repins only. `latest`, unpinned `main`, auto-update, marketplace-wide installation, and global installation remain prohibited.

## 6. Application verification decision

Application checks were not run because this execution changed only project-local Codex skill content and this execution record. It changed no application code, dependencies, Prisma schema, runtime configuration, CI, or hooks. The parent instruction therefore correctly excludes:

- `npm run typecheck`
- `npm run lint`
- `npm run policy:gates`
- `npm run prisma:validate`
- `npm run test:e2e -- --project=<approved-focused-project>`

The full build and full test suite were not run.

## 7. Completion gate

Wave 1 is complete only in a local, explicit-invocation, report-only state. The installed skills become discoverable by Codex on a subsequent turn. No skill is authorized to write product code or certify security, privacy, accessibility, accounting, statutory compliance, or release readiness.

Sentry remains disabled. Alibaba remains synthetic-only and blocked pending its stated gates. Impeccable, Trail of Bits, and Anthropic remain governed exactly as the parent report recommends.
