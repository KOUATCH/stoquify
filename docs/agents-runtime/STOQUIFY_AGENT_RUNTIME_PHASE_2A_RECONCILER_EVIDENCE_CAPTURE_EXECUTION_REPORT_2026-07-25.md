# Stoquify Agent Runtime Phase 2A Reconciler Evidence Capture Execution Report

**Execution date:** 2026-07-25  
**Phase:** 2A controlled internal pilot assurance  
**Status:** `PARTIAL - CAPTURE MECHANISM COMPLETE, REAL DEPLOYMENT EVIDENCE BLOCKED`  
**Internal activation:** Not authorized and not attempted  
**Phase 3:** Not authorized

## Executive Result

Stoquify now has a provider-neutral operator command that captures real reconciler readiness evidence without storing or printing the managed bearer secret.

The authenticated readiness endpoint now returns the three sanitized scheduler windows required by the release register. The collector performs an ephemeral invalid-auth probe and an authenticated readiness probe, validates the environment, sanitizes the response, computes a SHA-256 evidence hash, emits JSON and Markdown, and can apply only scheduler-derived evidence to the operational release register.

No deployment was contacted because no managed reconciler base URL is configured in the current operator environment. The real evidence gate therefore remains blocked.

## Completed Work

| Work item | Result |
|---|---|
| Add sanitized run IDs and timestamps to authenticated readiness | Complete |
| Add provider-neutral readiness evidence collector | Complete |
| Prove invalid authentication returns `401` | Implemented and tested |
| Enforce HTTPS, strong secret, environment match, timeout, and response-size bounds | Complete |
| Strip unknown fields, raw bodies, headers, and unapproved blocker codes | Complete |
| Hash the sanitized evidence package | Complete |
| Generate an operational-register scheduler patch | Complete |
| Prevent changes to release, approvals, owners, status, and activation | Complete |
| Hash-bind readiness evidence in the operational release gate | Complete |
| Add report, gate, and guarded apply commands | Complete |
| Capture real managed-environment evidence | Blocked on deployment configuration |

## Files Created or Modified

Created:

- `scripts/agent-reconciler-evidence-capture.js`
- `scripts/__tests__/agent-reconciler-evidence-capture.test.js`
- `docs/agents-runtime/STOQUIFY_AGENT_RECONCILER_EVIDENCE_CAPTURE_RUNBOOK_2026-07-25.md`
- this execution report

Modified:

- `services/agents/agent-reconciler-invocation.service.ts`
- `services/agents/__tests__/agent-reconciler-invocation.service.test.ts`
- `scripts/agent-operational-release-gate.js`
- `scripts/__tests__/agent-operational-release-gate.test.js`
- `scripts/agent-phase2a-command-gate.js`
- `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json`
- `package.json`

No Prisma schema or migration change was required.

## Runtime Flow

1. Resolve the managed base URL, bearer secret, environment, and bounded timeout from process environment.
2. Reject HTTP outside local development and reject secrets shorter than 32 characters.
3. Send a request using an ephemeral generated invalid credential.
4. Require HTTP `401` from the invalid-auth probe.
5. Send the authenticated readiness request.
6. Accept only the known readiness contract and at most three windows.
7. Reject or null invalid environment names, run IDs, statuses, timestamps, and unknown blocker codes.
8. Retain no raw body, authorization header, secret, database target, tenant data, or business evidence payload.
9. Compute a SHA-256 over the sanitized capture.
10. Build a scheduler-only register patch with readiness, evidence reference/hash, heartbeat expiry, invalid-auth reference, and three windows.
11. Apply the patch only when the capture is ready, the environment matches, and activation remains false/null.

## Commands

```text
npm run agent:reconciler:evidence:report
npm run agent:reconciler:evidence:gate
npm run agent:reconciler:evidence:apply
```

The apply command cannot change:

- release package, commit, artifact, or manifest identity;
- product or security approvals;
- owner assignments;
- alert-lifecycle evidence;
- credential-rotation evidence;
- declared release status;
- activation request, authorization, or timestamp.

## Local Preflight

The report command was intentionally run without managed configuration. It exited nonzero with:

```text
RECONCILER_BASE_URL_MISSING
```

The output confirmed `secretValuesPrinted: false`. No readiness evidence artifact was fabricated.

## Operational Release Gate

Scheduler readiness now requires:

- a value-free evidence reference;
- the matching SHA-256;
- fresh readiness and heartbeat;
- invalid-auth evidence;
- three completed five-minute windows;
- unique run IDs and valid timestamps.

The current operational register remains `BLOCKED` with 146 field-level external evidence requirements. This slice added the readiness evidence hash; the later alert-evidence collector adds a separate alert capture hash. Together they prevent unbound scheduler or alert references from satisfying release review.

## Verification

| Command | Result |
|---|---|
| `node --check scripts/agent-reconciler-evidence-capture.js` | Passed |
| Collector test syntax check | Passed |
| Focused reconciler, collector, operational, and credential regression | 4 suites, 36 tests passed |
| `npm run typecheck` | Passed |
| `npm run agent:phase2a:gate` | Passed |
| `npm run agent:runtime:gates` | Passed |
| `npm run service:boundary:fail` | Passed: 0 active violations |
| `npm run error:boundary:fail` | Passed: 0 active unsafe findings |
| `npm test -- --runInBand` | 473 suites and 2,852 tests passed; 3 suites and 15 tests skipped; intermittent forced-worker-exit warning observed after completion |
| Focused evidence suites with `--detectOpenHandles` | 7 suites and 73 tests passed cleanly; no open handle identified |
| `NODE_OPTIONS=--max-old-space-size=8192 npm run build:app` | Passed |

The build retained three existing `next/image` advisory warnings and non-blocking `next-intl` webpack cache-analysis warnings. They are unrelated to this implementation.

## Security and Authority

The collector is an operator tool. It has:

- no Prisma access;
- no business mutation path;
- no model or agent tool registration;
- no permission, entitlement, approval, or owner authority;
- no package activation method;
- no ledger, payment, stock, payroll, statutory, or close authority.

The readiness endpoint remains authenticated. Its added window fields are operational metadata only.

## Remaining Blockers

- Selected controlled deployment environment and managed base URL
- Managed reconciler and alert credentials
- Three real completed five-minute windows
- Real `401` and authenticated `200` capture from the same deployed artifact
- Isolated missing-configuration `503` evidence
- Scheduler provider, workload, concurrency, commit, and artifact references
- Alert acknowledgement, retry, dead-letter, recovery, escalation, and rotation evidence
- Real product/security approvals and six-owner roster
- Complete credential rotation and revocation evidence
- Clean immutable CI/deployment identity and global statutory evidence

## Next Step

Deploy the exact certified inactive artifact, configure the managed reconciler and alert transport, wait for three successful windows, run `npm run agent:reconciler:evidence:apply`, and then rerun the operational and enterprise release gates.

Activation and Phase 3 remain prohibited until those gates independently pass.

