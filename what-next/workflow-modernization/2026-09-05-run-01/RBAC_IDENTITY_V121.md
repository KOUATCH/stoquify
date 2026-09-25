# Current authority remains bound to the session subject

Evidence date: 2026-09-13. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`; existing dirty changes preserved. Source checkpoint: `evidence/source-baseline-v121.json`.

## Defect and correction

`loadRbacContextFromSession` queried active users by session ID **or email**. An owned PostgreSQL reproduction changed the original user's email and deactivated that user after a synthetic authentication snapshot. Reassigning the old email to a second active user caused the old lookup to return the second user's signing permission. This proves incorrect directory identity resolution, not a demonstrated exploit against real authentication.

The lookup now requires the immutable session ID, selects only its active user, and rejects a returned mismatching ID. Email-only sessions fail before a directory lookup. Current organization, verification, lock, live-session revocation and role checks remain in the same path. No caching window was widened.

Benefit: changing an email cannot transfer another account's authority. Valid users continue to resolve their own current roles after an email update. Invalid sessions receive the existing authentication recovery response.

## Affected relationships

Canonical workflow: `OA-PERMISSION-REFRESH`. Current source connects `requireRbacContext` to `requirePermission`, protected actions, server user loading, and API organization guards. Relevant consumers include role editors, module controls and the payment workbench. The historical action graph includes `roles_role_auth_assertcanassignpermissions` in community 0; graph hints were checked against `actions/roles/role-auth.ts`, `services/_shared/protect.ts`, `lib/auth-server.ts` and `lib/security/server-authz.ts`. The graph is not proof of current guard behavior.

The access-boundary-hardener skill was read. Its receipt-link/inventory expansion is not part of this bounded shared-identity correction; no receipt compatibility behavior was changed. Its current-authority and focused-verification principles apply. This is not Slice 4 release certification.

## Verification

All commands use the bundled Node runtime at `C:/Users/J COMPUTER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`, from the repository root. Inspected Jest config uses existing setup; the default migration-bearing build was not invoked.

- Before unit proof: two new tests failed (receipt `9e5244`, historical continuation receipt). Retained PostgreSQL before JSON: `lanes/environment/rbac-identity-v121-before-441b1b2a-b091-4288-a4c5-e369a75cbfe2.json`, re-read in receipt `0d57e0`.
- `node_modules/jest/bin/jest.js --runInBand --runTestsByPath lib/security/__tests__/rbac.test.ts lib/security/__tests__/auth-session.test.ts lib/security/__tests__/server-authz.test.ts app/api/me/permissions/__tests__/route.test.ts services/modules/__tests__/module-entitlement.service.test.ts actions/modules/__tests__/module-control.actions.test.ts`: **41 tests, six suites passed**, receipt `647b3c`.
- `node_modules/typescript/bin/tsc --noEmit --pretty false`: passed, receipt `ab2834`.
- `node_modules/eslint/bin/eslint.js lib/security/rbac.ts lib/security/__tests__/rbac.test.ts`: passed, receipt `2be578`.
- `lanes/environment/verify-rbac-identity-v121.cjs --after`: all PostgreSQL assertions passed with stable source; process exit 1 because saving its JSON hit EPERM. Emitted evidence recovered without rerunning mutations into `evidence/rbac-identity-v121-after-recovered.json`, receipt `213767`. This command is not classified as exit-zero.
- `lanes/environment/verify-rbac-browser-v121.cjs`: passed, receipt `af94aa`. Actual local credential login and permission endpoint retained the same user after email change; deactivating that owned user made the existing session receive 401. Actual EN/FR reconciliation run lists loaded, at 1440px/320px respectively, without horizontal document overflow or page errors. Both screenshots retained in the browser report; French image visually inspected. Source stable. Readiness 13,673ms EN / 12,826ms FR: development observations only, no speedup claim.

Browser evidence: `lanes/environment/rbac-browser-v121-702ea1fb-8bda-4ac3-b634-3b3b948f5b24.json`. Isolated database `stoquify_local_registration_20260906_01`, local app `http://127.0.0.1:3110`. Guards check owned database provenance. Only synthetic fixture users/roles changed; no financial operation was invoked.

## Review responsibilities

| Responsibility | Finding / scope |
| --- | --- |
| Architecture, backend, IAM/privacy | Immutable subject binding corrected in the shared guard; fresh identity lookup preserved. |
| Database/integrity | Real user/role reassignment reproduced; no schema or migration required. |
| Frontend, UX, accessibility, localization | Existing EN/FR state language and shell retained; two browser sizes passed. No new UI. Native screen reader, zoom and full contrast remain unverified. |
| Finance/reconciliation and audit/records | Wrong-actor permission substitution prevented at shared entry; no ledger/signing logic changed. Evidence distinguishes synthetic-session reproduction from real login regression. |
| Quality, release, SRE/DevSecOps | Focused tests, typecheck, lint and actual app regression passed; evidence-write failure retained honestly. Runtime is development-only. |
| Product, packaging, operations | Existing selection and commercial controls unchanged; current session subject remains required. No customer activation. |
| Statutory/country rules, POS/offline, purchasing/AP, payroll, analytics, AI/agents, external providers | Not applicable to domain behavior changes: only shared identity selection changed. Broader domain workflows remain in the platform register and require their own verification. |

## Use, rollout and recovery

Review the existing `/en/dashboard/finance/reconciliation` and `/fr/dashboard/finance/reconciliation` routes in the isolated app. No new configuration, pricing, approval document or user-supplied information is needed for this correction. A denied user should use existing sign-in recovery; an authorized administrator should inspect the user's active status, organization and role assignments if denial persists. Do not restore email fallback as an access workaround.

No migration or backfill. Before live rollout, execute the existing release process and verify valid sign-in plus inactive-user denial in an authorized staging cohort. If valid users fail, retain denial and diagnose their session subject IDs and current directory records; avoid logging credentials. No production deployment or release certification occurred.

## Remaining work

Repeated permission queries and authentication/layout loading remain unoptimized. The closed native select still truncates its long French selected label at 320px. Full workflow discovery, cross-tab shell freshness, native accessibility and the remaining domain lifecycle checks are unfinished. Existing rejected notification-trigger removal and provider/authentication proposals remain held; no rejected action was applied through this patch. This batch does not clear X1 or complete the platform review.
