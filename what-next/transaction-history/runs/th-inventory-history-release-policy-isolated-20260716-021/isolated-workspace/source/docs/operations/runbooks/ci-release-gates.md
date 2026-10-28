# CI Release Gates

This runbook governs Stoquify's pull-request and protected-branch verification workflow in `.github/workflows/ci.yml`.

## CI database model

The `verify` job owns an ephemeral PostgreSQL 16 service with two database names:

| Database | Purpose |
| --- | --- |
| `aqstoqflow_ci` | General Prisma migration and repository verification target |
| `stockflow_immutability_test` | Dedicated payroll trigger and immutability runtime target |

Both use CI-only credentials inside the disposable service container. Production database URLs and dedicated release secrets must never be referenced by pull-request CI.

GitHub documents PostgreSQL service containers, port mapping, and `pg_isready` health checks for Linux runners in [Creating PostgreSQL service containers](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers).

## Verification sequence

1. Start PostgreSQL and wait for its health check.
2. Install the lockfile-defined Node dependencies.
3. Create the isolated payroll immutability database.
4. Run `npm run verify:ci`.
5. `verify:ci` validates the CI contract, applies and verifies Prisma migrations on the general CI database, then runs `verify:repo`.
6. `verify:repo` performs Prisma validation, typecheck, lint, all policy gates, the application build, and Jest.

Migration deployment must precede repository verification. The workflow must not set `CI_RELEASE=1`, production `VERCEL_ENV`, production migration opt-ins, or provider secret contexts.

## Local verification

```powershell
npm run ci:release:gate
npm test -- --runTestsByPath scripts/__tests__/ci-release-readiness-gate.test.js --runInBand
npm run policy:gates
```

`verify:ci` expects the two PostgreSQL databases and is intended for the GitHub runner or an equivalent disposable environment. Do not point it at a shared developer or production database.

## Failure handling

- PostgreSQL health failure: inspect the service-container logs; do not bypass the health check.
- Payroll database creation failure: stop the job and verify that the CI role owns only the disposable service.
- Migration failure: fix the committed migration or exact-hash approval; do not replace migration deployment with `db push`.
- Policy or test failure: preserve the failed job evidence and fix forward before merge.
- Build timeout: inspect `build-app-safe` diagnostics and orphan-process evidence rather than increasing limits without cause.

## Provider controls

Repository code cannot configure these settings:

1. Require the `Verify Repo` status check on protected release branches in GitHub.
2. Prevent direct pushes or bypasses for unauthorized actors.
3. Configure Vercel to promote only commits whose required GitHub checks passed.

Record screenshots or exported settings evidence when these controls are enabled.
