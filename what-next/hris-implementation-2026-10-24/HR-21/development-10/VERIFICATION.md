# Verification boundaries and commands

All commands run from the repository root after script/import/configuration review. `npm run agent:workflow:check` passed; it does not execute application commands. The new direct Jest lane is deliberately scoped, not represented as a registered whole-repository gate.

```
node node_modules/jest/bin/jest.js --config jest.hris-hiring.config.cjs --runInBand
node what-next/hris-implementation-2026-10-24/typecheck.cjs what-next/hris-implementation-2026-10-24/HR-21/development-10/typecheck.log services/hris/lifecycle.service.ts services/hris/document-evidence.service.ts services/hris/payroll-readiness-contract.ts actions/payroll/payroll-contract.actions.ts
node what-next/hris-implementation-2026-10-24/HR-21/development-10/preflight.cjs
```

The Jest setup mocks the database and named service boundaries; no application configuration or `.env` is loaded. Initial unit evidence contains the reproduced defects plus obsolete test mocks (missing logger.warn and current actor/company assurance claims); those mocks were corrected to match the existing guard. Final checks include genuine native-owner rejection and postcommit cache failure separately.

`regression.cjs --baseline` loads saved original versions of the three changed HR services. `regression.cjs` loads current versions. Both require exact `HRIS_CORRECTNESS_DATABASE_URL` for `hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public`. They create a unique synthetic organization and three actors; every case runs actual native services within a real transaction and rolls it back. Owned organization/users are removed and verified. Synthetic approved rows in this runner test malformed legacy proof and denial behavior; they do not establish a browser authoring journey. Initial baseline expected successful contract-create replay incorrectly; the existing owner safely conflicts. Corrected before/final runs instead require conflict with no extra record/event. Initial evidence is preserved.

`prepare.cjs` creates a copied application route tree and verified junctions to current sources/dependencies. `serve.cjs` starts only loopback port35586 with an allowlisted process environment, disposable database, randomly generated in-memory auth/payment secrets and synthetic handoff policy. It copies no root environment files. `preload.cjs` denies external HTTP and external environment-file reads. No build, migration, deployment or schema promotion runs.

`browser.cjs` starts actual Chromium, signs four synthetic accounts in through native BetterAuth, exercises real Next server actions, hashes source/runtime inputs and verifies owned cleanup. `journey.cjs` authors identity, contract, document attestation, activation, payment and onboarding through the actual UI. Certification alone is an explicitly synthetic time prerequisite. No compensation assignments are preloaded; base salary is the only compensation source in this lane. The manually entered document/scan references are synthetic attestations; no real file upload or scanner result is claimed.

The cleanup helper requires exact target, owned organization prefix and current database identity. It locks the handoff tables exclusively and temporarily disables only the two named immutable evidence guards inside the same transaction, restores their original states and removes only the owned package/receipt records. Other records are removed by owned organization/user identifiers. Shutdown verifies the Next launcher command and stops only that process tree and the previously dedicated local PostgreSQL directory.

Historical graph discovery is saved separately: `hris_employee_actions_ts`, community42, and related contract-action nodes in the September8 graph were used only for discovery. Current source controls behavior. No full accessibility, real-operator, deployment, statutory calculation or external-provider certification is implied by this development lane.

## Reproduction and retained attempts

`unit-action-baseline.config.cjs` maps the action import to its saved original source while keeping the corrected current guard mocks. It reproduces exactly one failed committed-cache-result assertion (eight other action tests pass); the current full lane passes all49. This separates the original unit fixture drift from the actual cache-response defect.

Browser attempt01 stopped on a duplicate Playwright route completion after four recorded stages. Its owned Next launcher was stopped; explicit recovery verified removal of its one employee, one contract, organization, users, sessions and accounts. Attempt02 reached independent document/contract approval and three-actor payment application, then a test hydration timing failure; its normal cleanup passed. Attempts03/04 refused startup before database creation when shared generated-type configuration references changed.

The configuration adoption helpers compare complete structures and permit only the inspected `.next-public-performance-20261028` generated-type include/reference; compiler options and exclusions are unchanged. The isolated runtime retains its own `.next-hris-browser` route reference. Evidence includes both configuration comparison records. No unrelated project edit was reverted or silently accepted. Type checking was rerun after this change.
