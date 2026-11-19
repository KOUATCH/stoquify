# Combined-source review — 26 October 2026

This continuation addresses Phase 11's P0 request to review the later concurrent changes and verify a fresh capture. Existing edits are preserved. No application or database changes are made by this phase.

## Inspected behavior

| Changed boundary | Source finding | Verification selected |
|---|---|---|
| Session assurance | Reads the stored lock deadline; active locks reject otherwise recent assurance. Session ID, token, user, expiry and current RBAC identity checks remain in place. | Authentication/session suite; lock-denial regression |
| Password step-up | Threshold lockout clears prior assurance time, method, organization and level. Existing exact-session conditional updates and retry logic remain. Account lock errors become safe authentication denials. | Step-up action and service tests, with mocked persistence |
| Protected actions | Fresh-authentication user and organization must match the independently resolved permission context before module checks or handler execution. | Shared protection tests including actor and tenant mismatch denial; affected HR actions |
| Employee and compensation actions | Adds explicit enforced payroll-module gates for reads and writes while retaining current permission and tenant checks. | Existing action tests with current-actor/module assertions |
| Public layout/session | An absent or empty recognized session cookie returns anonymous without loading the authentication graph. A present cookie is only a hint: the existing session validator still decides validity. | Public-session, landing, recovery and routing suites |
| Upload metadata | Defers authentication/error imports until a request. Upload requests still require a session, current organization, inventory entitlement and create/update permission. The disabled upload completion path remains disabled. | Metadata-import and upload authorization tests |
| TypeScript configuration | Phase 11 comparison shows no semantic configuration change; original exclusions remain. | Configured-project compiler check with emission and incremental output disabled |
| New HR fresh-auth recovery hook | Fresh capture includes a new EN/FR password-verification dialog hook. It uses the existing step-up action, guards stale async responses, and asks the user to retry rather than automatically resubmitting a mutation. No other captured source file imports it. | Source inspection, type check and lint only; integration, rendered focus and recovery behavior are not certified here |

These findings are source inspection, not real concurrency, PostgreSQL or rendered-browser proof. Mocked assertions verify code paths and arguments; they do not prove database isolation under contention.

The final capture differs slightly from Phase 11's earlier drift list: 17 changed source paths and nine new paths, including the unconnected HR recovery hook. The TypeScript configuration's bytes again match Phase 11. The exact captured delta, rather than the older 18/eight counts, defines this run.

Focused lint returned zero errors and one react-hooks/exhaustive-deps warning at the new hook's effect cleanup: generation.current is incremented there. Source inspection shows this ref is a response-generation counter, not a DOM-node ref; the change intentionally invalidates late responses. This observation does not replace hook interaction tests. The warning remains visible and was not suppressed or changed in this verification-only continuation. Integration, scope replacement, late-response handling and rendered focus remain acceptance work for that newly added HR hook.

## Verification and helper scope

The four existing bounded Command Center/authentication/public/routing lanes are reused with a fresh candidate path. Eleven additional explicit test files cover the changed boundaries. The authentication-session file is already in the authentication lane and is not counted twice. No broad HR test discovery or PostgreSQL runner is selected.

New AF16 build/database/publication helpers were inspected for scope but not executed. They target a separate AF16 candidate and disposable cluster, include database cloning and artifact/publication writes, and cannot be treated as read-only verification commands. This phase makes no safety or execution certification for their complete call graphs.

The new HR admission configuration was read but is not run broadly: its default test discovery could select database tests. Existing package scripts, workflow guidance, registry and selected configurations were reviewed before execution. The workflow validator passed with 196 unclassified commands; that count is not an approval of those commands.

## Isolation

The package manifest, lockfile and Prisma schema must match the previous clean-installed candidate before reuse. The fresh candidate links only to that task-owned package directory. A Node module-resolution guard rejects resolved packages outside that directory; this is a Node-loader check, not an independent audit of every virtual module resolved inside Jest. Process environment is allowlisted, database URLs point to unused loopback port 1, external connections are refused, and no environment files are copied. No install, client generation, application server, database server, artifact build or production command runs here.

An initial local preparation attempt could not create the dependency junction under restricted filesystem permissions. It produced an incomplete owned copy, not a verified candidate. Preparation was retried with permission for that local link; incomplete copies were left untouched. Actual verification results and final preservation checks are recorded separately.
