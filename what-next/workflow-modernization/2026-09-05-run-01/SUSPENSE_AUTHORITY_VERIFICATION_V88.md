# Suspense authority verification — v88

Evidence date: 2026-09-09. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. Unrelated working-tree edits preserved. Source hashes are bound to `evidence/source-baseline-v88.json` and the consolidated v88 receipt.

## Defects and reproduction

The actual `protect` implementation only enforces a module when the action supplies module metadata. Suspense assignment/proposal/approval omitted it. Approval replaced verified authentication time with the current clock and skipped the existing actor/tenant provenance helper. Assignment accepted any user ID without querying an active same-tenant user.

Five new unit tests failed before correction: 15 passed, five failed in session 50453, receipt `evidence/suspense-authority-before-v88.json`. The actual local database verifier also failed its first expected rejection: foreign assignment succeeded; session 81760, `lanes/environment/suspense-assignee-76a760ca-2dd.json`. Source hashes were stable and non-fixture records unchanged. This failure is retained as reproduction evidence.

The corrected database attempt (session 32147, `suspense-assignee-236444f5-0e7.json`) passed four checks, then stopped because the verifier expected different wording for a correct permission denial. The assertion now expects the actual `not allowed to perform this action` message; the production denial was not weakened.

## Passing evidence

| Check | Result |
| --- | --- |
| Focused regressions, session 73270 | 80 tests in nine suites, exit 0; `evidence/suspense-authority-focused-v88.json`. |
| Actual action/wrapper integration, session 77544 | Six tests, exit 0; `evidence/suspense-guard-focused-v88.json`. |
| Final combined regressions, session 67431 | 86 tests in ten suites, exit 0; `evidence/suspense-authority-final-v88.json`. |
| Actual assignment database, session 69799 | Six checks, exit 0; `lanes/environment/suspense-assignee-32168240-344.json`; stable sources and unchanged non-fixture rows. |
| Initial full typecheck, session 34776 | Exit 0 on final production and initial tests; started before the new wrapper integration test. Final typecheck completion is separately bound in the consolidated receipt. |
| Final changed-file lint, terminal `58c12f` | Exit 0 on both production files and all three changed/new tests. |

The wrapper tests import the real action and real `protect`, replacing identity, entitlement lookup and domain effects at their boundaries. All three module-denied mutations stop before any owner call. Failed fresh authentication and foreign assurance are denied; permitted approval forwards the original sign-in time. Shared auth/session and module entitlement tests provide separate guard regression evidence. None proves a real authenticated browser session.

Database negatives check foreign/inactive/missing assignees and a foreign suspense object with no changes in suspense, exceptions, audit, inbox or ledger snapshots. The missing-permission case preserves its intended denial audit but changes no ownership or inbox. A valid active same-tenant assignment produces matching suspense/exception owner IDs, one domain audit and in-app owner evidence. No financial posting or external delivery occurs.

## Exact commands

Run from the repository root with the bundled `C:\Users\J COMPUTER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe` as `node`. Previously inspected Jest configuration loads mocks; no migration/seed-bearing build command was run.

```powershell
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath actions/payments/__tests__/reconciliation.actions.test.ts actions/payments/__tests__/reconciliation-workbench.actions.test.ts actions/payments/__tests__/suspense-guard.integration.test.ts services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts services/_shared/__tests__/protect.test.ts lib/security/__tests__/auth-session.test.ts services/modules/__tests__/module-entitlement.service.test.ts actions/modules/__tests__/module-control.actions.test.ts --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/suspense-authority-final-v88.json
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
node node_modules/eslint/bin/eslint.js actions/payments/reconciliation.actions.ts services/reconciliation/payment-suspense-workflow.service.ts actions/payments/__tests__/reconciliation.actions.test.ts actions/payments/__tests__/suspense-guard.integration.test.ts services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-assignee.cjs
```

Database target: ownership-checked `stoquify_local_registration_20260906_01`. Verifiers ran sequentially with new synthetic tenants. No reset, migration, real payment, external message, deployment, X1 clearance or professional certification. The previous goal turn was progress: v87 changed three owner services, verified persisted effects and expanded the workflow register. The present turn continues that mission, without redefining its scope.

No interface changed, so no new screenshots or browser results are claimed. Whole-workflow verification remains false. See [operator inputs, rollout and remaining work](SUSPENSE_AUTHORITY_GUIDE.md).
