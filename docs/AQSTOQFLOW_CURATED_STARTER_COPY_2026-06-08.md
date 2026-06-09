# AQSTOQFLOW Curated Starter Copy

Generated: 2026-06-08
Source: E:\professional management systems\stockflow
Target: E:\ohada saas\newStockFlow\aqstoqflow

## Selection Rule

This starter was built from the locale-ready app spine: root layout/page/not-found, app/[locale] route entries, app/api route entries, middleware, auth, i18n/messages, and their import-closed functional dependencies. It also includes package/config files, Prisma schema/migrations, selected seed files, public runtime assets excluding generated uploads/seed media, and current docs/documentation folders excluding archived docs.

## Files Staged

Total project files copied: 772

- _legacy-dashboard: 2
- .env.example: 1
- .eslintrc.json: 1
- .example.env: 1
- .gitattributes: 1
- .github: 3
- .gitignore: 1
- actions: 77
- AGENTS.md: 1
- app: 138
- auth.ts: 1
- BILINGUAL_MIGRATION_SUMMARY.md: 1
- CLAUDE.md: 1
- COMMIT_GUIDELINES.md: 1
- components: 155
- components.json: 1
- config: 4
- contries.ts: 1
- DATABASE_SEED_REPORT.md: 1
- DATABASE_SEED_SUMMARY.md: 1
- docs: 77
- documentation: 24
- hooks: 25
- i18n: 4
- jest.config.ts: 1
- jest.setup.ts: 1
- lib: 45
- messages: 2
- middleware.ts: 1
- next-env.d.ts: 1
- next.config.mjs: 1
- package-lock.json: 1
- package.json: 1
- posdocs: 3
- postcss.config.mjs: 1
- prisma: 14
- public: 82
- QUICK_REFERENCE_BILINGUAL.md: 1
- RBAC_TESTING_GUIDE.md: 1
- README.md: 1
- roadmap: 1
- scripts: 12
- services: 33
- tailwind.config.ts: 1
- TESTING_SETUP_SUMMARY.md: 1
- tsconfig.json: 1
- types: 36
- ui-registry.md: 1
- validations: 5
- WORKFLOW.md: 1

## Explicitly Left Behind

- node_modules, .next, .swc, graphify-out, outputs, logs, tsbuildinfo, and local cache/build artifacts.
- The non-locale duplicate route trees under app/(auth), app/update, app/unauthorized, app/actions, app/auth, and app/digital-receipt.
- Scratch/skill/idea folders were excluded from the first curated pass, then copied in the supplemental pass below.
- Backup or malformed root files such as componentssssxxzzz.json, componentsxyz.json, componentszzzz.json, and nextx.config22.ts.
- docs/archive and bulky generated public data such as public/seed-images, public/uploads, public/images/all pics, zips, and stray Prisma files under public.

## Notes

Two files under _legacy-dashboard were retained because current localized brands/categories pages still import them through live column re-exports. They are functional dependencies, not the old dashboard system.

## Unresolved Static Imports Worth Reviewing

- None after filtering dynamic locale message imports.
## Supplemental Scratch/Skill Copy

Added after initial curated copy per user request:
- ideas: 61 files
- skills: 4 files
- skil-auth-rbac: 3 files
- .claude: 1 file
- .codex-tmp: 776 files

Note: `.codex-tm` did not exist in the source; `.codex-tmp` was copied because it is the matching existing scratch folder.
