# Stoquify CI Release Gate Modernizer Implementation

Date: 2026-07-11

Skill: `exam-015-aqstoqflow-ci-release-gate-modernizer`

Status: Repository implementation complete. GitHub-hosted execution and provider branch/promotion settings remain external evidence.

## Scope

Make Stoquify's advertised CI verification reproducible on a clean GitHub runner. The previous workflow declared a localhost `DATABASE_URL` but provided no PostgreSQL service even though `verify:repo` runs a database-backed payroll immutability gate.

## Evidence Reviewed

- `.github/workflows/ci.yml`
- `package.json`
- `prisma/schema.prisma` and the committed migration history
- payroll immutability database wrapper and runtime check
- CI backlog 019 and the current Graphify summary
- Exam 015 skill, risk brief, and runtime boundary
- current migration, secret, and leadership release evidence

The two historical source reports named by Exam 015 were not present at their expected `what-next/` paths. Current repository evidence and the installed risk brief were used instead.

## Implemented

- Added an ephemeral PostgreSQL 16 service with `pg_isready` health checks and mapped port 5432.
- Added separate `aqstoqflow_ci` and `stockflow_immutability_test` database names.
- Added an explicit payroll test database creation step before repository verification.
- Added synthetic CI-only Auth.js configuration and read-only workflow permissions.
- Added `verify:ci`, which validates the CI contract, applies and checks migrations, then runs `verify:repo`.
- Added `scripts/ci-release-readiness-gate.js` and fixtures covering service removal, database sharing, production secret leakage, migration ordering, and evidence redaction.
- Wired `ci:release:gate` into `policy:gates` and the leadership release-evidence ratchet.
- Updated the canonical CI runbook and corrected stale architecture testing claims.

## Verification

| Check | Result |
| --- | --- |
| Workflow YAML parse | Passed |
| CI readiness gate | Ready: 10/10 |
| Focused Jest | Passed: 4 suites, 26 tests |
| TypeScript | Passed |
| ESLint | Passed with 0 errors and 4 existing warnings |
| Full policy chain | Passed in 125.1 seconds |
| Leadership evidence | Conditional: 11/11 structural checks, 10 readiness artifacts, 0 structural blockers |
| Production credential references in CI | None |
| Secret values in evidence | None |

## Boundaries

`verify:ci` was not run locally because it is intentionally designed for two disposable PostgreSQL databases, and this workstation's developer databases are not an acceptable substitute. The actual GitHub-hosted workflow was not executed because this run did not push a commit or open a pull request.

Repository code also cannot enforce GitHub branch protection or Vercel's promotion policy.

## Next Action

Push the reviewed branch, observe the `Verify Repo` job on a pull request, require that check on protected release branches, and configure Vercel to promote only commits whose required GitHub checks passed. Then provision the three remaining production conditions and run `verify:release` in the provider-injected environment.
