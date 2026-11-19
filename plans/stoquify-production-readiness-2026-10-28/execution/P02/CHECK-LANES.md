# P02 verification lane map

Admitted execution scope is P01–P03. Later domain journeys remain mapped to their original packages and verification-recipes.md; no whole-platform qualification is claimed.

| Journey | Mocked/pure lane | Native PostgreSQL / actual browser lane | Target and mutation boundaries |
|---|---|---|---|
| Workflow contract | agent:workflow:test, 23 negative/positive fixture tests | No DB/browser needed | Isolated OS temp fixtures; no application environment |
| Baseline authentication/RBAC, inventory, POS, purchasing, close, payroll invariants | test:ecc:pilots: 128 tests / 10 suites | Domain native lanes in docs/ecc/test-lanes.md remain separate; not run in P02 | Jest config omits Next dir; setup mocks persistence/auth. Payroll migration test reads SQL; does not apply it |
| Grant / revoke / role / cross-client consent | actions/accounting/__tests__/accountant-access.actions.test.ts; services/accounting/__tests__/accountant-access.service.test.ts; accountant-client-invite.service.test.ts | P03 authenticated AccountantAccessManager against retained sealed AF16 runtime, real Better Auth and explicit disposable PostgreSQL, durable readbacks | No live provider. Each fresh fixture has five synthetic users and three organizations. Expired session and response-loss cases must retain operation identity |
| Firm managed-access authority and recovery | firm-engagement / managed-accountant-access unit suites and scoped configs | jest.firm-engagement-workflows-postgres.config.cjs; services/accounting/__tests__/firm-engagement-workflows.postgres.test.ts | Requires AF05_POSTGRES_URL loopback with stoquify_local_af05_* name and AF05_CLUSTER_DIR realpath guard. Writes synthetic fixtures, disconnects; dedicated DB retained for diagnosis. No opt-in skip silently treated as pass |
| Portfolio native reads | jest.accountant-portfolio.config.cjs | jest.accountant-portfolio-postgres.config.cjs | Existing suite requires RUN_AF01_POSTGRES=1, 127.0.0.1:55441 and stoquify_local_af01_*; not silently usable on new P03 port. P25 owns broader portfolio proof |
| Grant entry in sealed engagement journey | Existing service/action tests, no real-browser implication | scripts/run-af16-sealed-engagement-browser.cjs and verify-firm-engagement-browser.cjs | Existing wrapper pins old artifact, ports and already-used directories; cannot rerun as-is. P03 requires a newly reviewed isolated adapter, exact artifact verification, fresh clone, local TLS, protected server actions, safe logs and cleanup |
| Fresh-auth, uncertain result and permission recovery | Existing invite/access mocks plus any focused regression justified by reproduction | P03 focused authenticated journey, real step-up, DB readback after injected response loss | Existing verify-firm-engagement-browser-recovery.cjs primarily tests firm workspace reads and assumes an already completed engagement. It does not independently qualify grant response-loss; P03 must supply that bounded missing scenario |
| Wider lifecycle, exports, provider delivery, operator acceptance | Not admitted by P01–P03 | P25 and later release/provider packages | AF05_RESUME_AFTER_HANDOVER skips preceding lifecycle sections; no resumed result may certify those sections. Provider workers remain disabled. No deployment or production qualification |

## Compiler boundary

The unchanged tsconfig resolves 2,410 root files and 5,247 source files, including 331 generated Next inputs and 2,777 dependency declarations/sources. See compiler-inputs.json for exact bytes and compiler-scope.json for imports that pull excluded roots back in. Examples include payroll actions, legacy inventory columns, supplier-system routes and transfer components. Additional documentation fixtures, two scratch TypeScript files and the .well-known route are included in actual compiler provenance. Historical snapshot .before.tsx files are already renamed .txt; they were not fixed again.

## Commands and environment

run-baseline.cjs invokes the exact reviewed direct Node compiler and the two npm script bodies, without npm lifecycle hooks. It passes only OS runtime variables plus NODE_ENV=test and telemetry opt-out. Config/setup inspection found no application dotenv/bootstrap in those lanes. No native DB, browser, build, install, schema changes or production flags occur here. Compiler uses --noEmit --incremental false. Capturing a compiler graph resolves/types source without executing application imports.

## Documentation and rollback

Only CLAUDE.md build wording and docs/ecc/test-lanes.md coverage wording changed. Before-copies are retained. Restore only those owned text hunks if needed; do not replace unrelated later edits. No command registry or TypeScript strictness/exclusions changed.
