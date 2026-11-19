# Reviewed verification recipes

All runs use explicit owned fixtures, no application environment files and no production target. Inspect current files before replay; evidence binds the versions tested here.

- npm run agent:workflow:check — manifest/hash-only contract. Passed initially and after reviewed next.config hash refresh; expected interim drift failure retained in command-review.json.
- node --test scripts/__tests__/dev-app-safe.node-test.cjs — reviewed helper/config-only tests;6passed. Temporary fixtures only; no app start.
- node plans/stoquify-production-readiness-2026-10-28/execution/P04-R02/repair/unit/run.cjs — see actual command/runner file in unit/RESULT.md and run.json;63passed. Synthetic authority/errors; real disposable filesystem. No root Jest setup.
- Packing fixture command is recorded verbatim in packing/fixture-receipt.json;52passed. Review packing/run-fixtures.cjs and jest.config.cjs. Build and migration callbacks are fixtures.
- HTTP launch.cjs development run-04 and production run-03 — scrubbed environment;61requests each. Archive runner.cjs.source.txt is materialized only under .codex-tmp. The real repaired images/rewrites policy is extracted from snapshotted config, middleware and route/helpers copied verbatim. Production compiles only this minimal fixture, without root application setup.
- node .../repair/packing/inspect-private-publication.cjs — actual packer/verifier using unchanged preexisting mirror, buildstub and fresh destination;3privatecopies.
- node .../repair/verify-final.cjs — receipt and source/asset hashes; temporarily binds/closes logged loopback ports to verify release; final-integrity.json.
- node plans/stoquify-production-readiness-2026-10-28/execution/validate-register.cjs — validates mappings/dependencies/preservation and regenerates work-register.csv; no app/database execution.

Source inspection, mocks, native filesystem, real Next HTTP and minimal production compilation are separate evidence classes. No native DB, browser, full current app artifact, remote provider, production ingress or operator acceptance is implied.
