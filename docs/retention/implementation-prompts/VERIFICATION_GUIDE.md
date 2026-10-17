# Verification guide

These are inspected entry points and procedures, not blanket permission to execute current scripts. Reinspect the execution chain at each run, because files and hooks can change. Only the workflow check was executed while this pack was authored.

## V0 — Baseline and file scope

Read-only commands from repository root:

```powershell
git rev-parse HEAD
git status --short --untracked-files=all
git diff --stat
```

Then inspect the selected files/diffs and applicable instructions using literal paths. Hash relevant baseline files if an evidence gate needs a stable snapshot. Do not dump environment files, tokens, sensitive fixtures or customer payloads into evidence.

## V1 — Workflow contract

Read `package.json`, the relevant pre/post hooks, `scripts/verify-agent-workflow-contract.js`, `docs/ecc/command-registry.json` and `docs/ecc/test-lanes.md`. The currently inspected workflow runner imports only node:fs/path/crypto, validates references/hashes and does not run application commands.

```powershell
npm run agent:workflow:check
```

For a specific package lane, classify its current definition after reading it:

```powershell
node scripts/verify-agent-workflow-contract.js --command test:ecc:pilots
```

Classification does not review extra arguments, arbitrary environment overrides or every application import. Review those separately. Do not change fingerprints merely to bypass drift. The pack-authoring check passed and reported 198 scripts outside the reviewed manifest; this is not application-test evidence.

## V2 — Focused mocked/pure/component evidence

Review current config/setup, named suite and imported application side effects. The current `jest.ecc-pilots.config.cjs` uses nextJest without a project dir, and includes an explicit list of ten suites. It does not automatically include new tests, offline-sync, onboarding or arbitrary application tests.

Existing focused examples, only after V1 and current import/argument review:

### V2-P — Checkout

```powershell
npm run test:ecc:pilots -- --selectProjects ecc-unit --runTestsByPath services/pos/__tests__/checkout-lifecycle.service.test.ts
```

### V2-A — Existing RBAC

```powershell
npm run test:ecc:pilots -- --selectProjects ecc-unit --runTestsByPath lib/security/__tests__/rbac.test.ts
```

### V2-I — Stock-event unit controls

```powershell
npm run test:ecc:pilots -- --selectProjects ecc-unit --runTestsByPath services/inventory/__tests__/inventory-stock-event.service.test.ts
```

### V2-C — Current close proof

```powershell
npm run test:ecc:pilots -- --selectProjects ecc-unit --runTestsByPath services/accounting/__tests__/close-assurance-current-proof.test.ts
```

For other suites, discover and inspect their actual domain runner, configuration/setup and imports. Record an exact focused invocation before executing it. If no safe runner covers the required new tests, add a narrowly scoped test configuration and review its effects as part of the owned change. Do not claim a ready-made command exists when it does not. Do not add unrelated suites to the pilot manifest as a shortcut. The default Jest configuration can load application environment/configuration and mock Prisma; a test filename containing “integration” does not prove real DB operation.

## V3 — Real database transaction/concurrency evidence

Require a reviewed, explicitly disposable target. Review setup and cleanup; do not source the target from ambient .env. Identify host/database/schema without printing credentials. The existing POS routes below are documented in test-lanes.md and must be reinspected before use.

### V3-POS lifecycle

Prerequisites: inspected `jest.payroll-trust-spine.config.cjs`, test imports/setup; explicit local disposable database with required public table/enum definitions; schema `codex_pos_lifecycle_20260920`; `RUN_POS_LIFECYCLE_POSTGRES=1`. The test creates fixtures/schema and drops its created schema. Confirm it is safe to own that schema.

```powershell
node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --runTestsByPath services/pos/__tests__/checkout-lifecycle.postgres.test.ts
```

### V3-POS full financial commit

Prerequisites: reviewed local DATABASE_URL pointing to explicit disposable database `stoquify_pos_audit_YYYYMMDD_<hex>` with schema public; POS_DISPOSABLE_DATABASE_NAME matches; RUN_POS_FULL_COMMIT_POSTGRES=1; required prepared schema/columns. The name pattern is a prerequisite, not a literal command argument. Do not create, reset or migrate an existing application DB to satisfy it. This route writes synthetic records and failure-injection objects.

```powershell
node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --runTestsByPath services/pos/__tests__/pos-full-commit.postgres.test.ts
```

Other domains require their own inspected DB route and fixtures. `test:purchase-receiving:postgres` drops/recreates a local schema and runs db push/migration SQL; it proves receiving, not AP payment release. There is no blanket DB command for all prompts. Missing target or opt-in flag means BLOCKED or SKIPPED, never passed. Do not weaken safety checks or set skip-tolerant flags to obtain a green exit.

## V4 — Browser/device/UI evidence

Discover the actual route, relevant page contract, browser harness, server startup chain and fixture setup. Review npm dev pre-hooks and Playwright wrappers: the current `test:e2e:master-data-onboarding` script runs migrations. Do not start a server or E2E wrapper against inferred production/shared data.

Use a separately reviewed synthetic target/account. Record route, role, organization/location, locale, viewport/device, connectivity profile, fixture, exact steps, screenshot/trace and result. Cover happy/denied/loading/empty/error/uncertain/recovery states relevant to the prompt. For offline work, actually exercise persistence and network transitions. For accessibility, distinguish keyboard/focus and assistive-technology checks from screenshots and jsdom. A missing browser environment is an explicit evidence gap.

## V5 — Restore and operational proof

Read `scripts/prisma-local-restore-rehearsal.js`, its helper imports, prerequisites, target guard, outputs and cleanup before selecting its actual invocation. It mutates local databases and invokes dump/restore tooling. Use the future P04 protocol and an explicitly owned disposable synthetic target. Do not run it merely because its name says rehearsal. Record data age/RPO, elapsed recovery/RTO, attachments, relationships, access and queue restart checks. Local success does not certify deployed backups.

## V6 — Gate, provider, customer and expert evidence

Check release/source/fixture freshness and exact supported scope. Link external evidence only when available and authorized; do not contact anyone through a gate prompt. Distinguish synthetic contract tests, sandbox provider checks, live settlement, actual customer task observation, expert-reviewed rules and commercial approval. Record missing evidence without substitution. Only rerun runtime checks invalidated by current changes. A gate produces a decision, not deployment or automatic authority to transact.

## Commands excluded as shortcuts

Do not use `npm run build`, `verify:ci`, `verify:repo`, `policy:gates`, seeds, migration wrappers or broad test suites as generic verification. Build and several wrappers mutate databases. `typecheck` can write incremental metadata; broad lint includes unrelated work. Select narrow checks proportionate to the owned change, inspect the actual command chain and preserve real exit status. No installs or graph regeneration are implied by this pack.
