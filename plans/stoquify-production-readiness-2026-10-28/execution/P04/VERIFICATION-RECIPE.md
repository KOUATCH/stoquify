# P04 isolated verification recipe

Repository command-registry and current script definitions were inspected before execution. These new scripts are unclassified qualification harnesses; their side effects were reviewed explicitly. They do not invoke npm application scripts.

- `capture-source.cjs`: reads current source and Git state; writes only P04 provenance.
- `run-static-http.cjs`: scrubs inherited environment, launches the reviewed component HTTP harness, serves only synthetic upload bytes on loopback port 0, closes the server and writes evidence. No DB or real public file access. This is component HTTP, not a full app deployment.
- `run-native-authority.cjs`: starts only the owned stopped P03 loopback cluster, verifies its resolved data_directory, clones a new uniquely named P04 database from the migration-verified template, checks all 120 migration checksums/current directory count and private generated-client hashes. No migrations are applied. It uses one Jest process with no application config/environment loading and always stops that cluster. Fixture and audit writes remain exclusively synthetic.
- Native tests use actual database/guard/service code with Better Auth transport and Next headers stubbed. Session mirror checks do not qualify real signed cookies, browser cache restoration or ingress. Security audit writes are distinct from prohibited business writes.
- A known failing security assertion is retained as a defect reproduction. Harness completion is not a security PASS. Every unexpected failure invalidates the run.

No production flags, production data, deployments, commits or pushes are involved. Evidence is append-only by run; failed attempts are retained.

- `run-mocked-tests.cjs`: reviewed12-file selection, scrubbed environment, private generated client, no global setup/app config or DB URL; writes only bounded Jest evidence/cache.109 ordinary checks passed and4 characterization cases reproduced unsafe error text.
- `verify-final-integrity.cjs`: read/hash3425 captured files and Git state, query owned cluster status, briefly bind its loopback port then close. Strict status equality failed because4 unrelated new untracked scripts appeared; no captured source changed. `preservation-disposition.json` preserves that limit.
- `execution/validate-register.cjs`: reviewed structural validator; checks DAG, package/domain/gap references and unchanged unrelated baseline entries, then regenerates only roadmap CSV/validation receipts.

## Reproduction input archival

After execution, the two authored test files were renamed byte-identically to .test.ts.source.txt; test-source-relocation.json records old/new paths and hashes. This prevents ordinary root Jest discovery of the expected-red forensic case and keeps the sources outside TypeScript compilation. Historical configs/runners/receipts retain executed paths and must not be blindly rerun. A new reproduction must materialize the archived bytes inside a fresh ignored .codex-tmp sandbox, generate narrow configs targeting that sandbox, refresh source provenance and choose a fresh owned database/evidence target. No application config was changed.
