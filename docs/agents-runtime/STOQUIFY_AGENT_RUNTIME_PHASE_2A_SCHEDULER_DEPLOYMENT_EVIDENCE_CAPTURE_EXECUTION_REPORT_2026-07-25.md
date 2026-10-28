# Stoquify Agent Runtime Phase 2A Scheduler Deployment Evidence Capture Execution Report

**Date:** 2026-07-25  
**Phase:** 2A controlled internal pilot preparation  
**Status:** Repository implementation complete; external evidence blocked  
**Activation authorized:** No

## Executive Result

Stoquify now has a dedicated scheduler control-plane evidence collector and an operational release-gate ratchet for deployment authority. The implementation closes the repository-side gap identified during the skill 017 review without expanding agent authority.

The current environment does not provide an evidence endpoint, so the real apply preflight failed closed on `SCHEDULER_EVIDENCE_URL_MISSING`. No partial evidence artifact or register mutation occurred.

## Implemented

- authenticated query-free HTTPS capture;
- generated invalid-bearer probe requiring HTTP 401;
- bounded JSON response and forbidden secret-value key rejection;
- value-free references and hashes only;
- 24-hour attestation freshness;
- inactive `PILOT_CERTIFIED` package requirement;
- exact package, release, commit, artifact, and deployment binding;
- exact five-minute cadence;
- single-concurrency or lease-safety proof;
- bounded timeout;
- missing-configuration HTTP 503 proof;
- failure-alert provenance;
- immutable existing deployment identity;
- scheduler-only operational register apply;
- permanent false/false/null activation boundary.

## Files

- `scripts/agent-scheduler-deployment-evidence-capture.js`
- `scripts/__tests__/agent-scheduler-deployment-evidence-capture.test.js`
- `scripts/agent-operational-release-gate.js`
- `scripts/__tests__/agent-operational-release-gate.test.js`
- `scripts/agent-phase2a-command-gate.js`
- `package.json`
- `.env.example`
- `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json`
- `docs/agents-runtime/STOQUIFY_AGENT_SCHEDULER_DEPLOYMENT_EVIDENCE_CAPTURE_RUNBOOK_2026-07-25.md`

## Commands Added

```text
npm run agent:scheduler:evidence:report
npm run agent:scheduler:evidence:gate
npm run agent:scheduler:evidence:apply
```

## Verification

| Check | Result |
|---|---|
| Scheduler collector tests | 9/9 passed |
| Operational release gate tests | 22/22 passed |
| Focused evidence suite | 8 suites, 83 tests passed |
| Focused open-handle detection | Passed |
| Full Jest | 474 suites, 2,862 tests passed; 3 suites and 15 tests skipped |
| Focused ESLint | Passed |
| TypeScript | Passed |
| Phase 2A static ratchet | Passed |
| Agent runtime gates | Passed |
| Service boundary | Passed; 0 active violations |
| Raw-error boundary | Passed; 0 active unsafe findings |
| Prisma schema | Valid |
| Local migration safety | 8/8; 34 migrations; 0 destructive findings |
| CI configuration readiness | 11/11 |

## Fail-Closed Preflight

```text
npm run agent:scheduler:evidence:apply
SCHEDULER_EVIDENCE_URL_MISSING
```

Verified consequences:

- no JSON evidence artifact;
- no Markdown evidence artifact;
- no scheduler deployment field populated;
- no secret printed;
- `activationAuthorized: false`;
- package remains inactive.

## Updated Operational Gate

The operational release gate remains `BLOCKED`:

| Category | Blockers |
|---|---:|
| Release | 14 |
| CI | 15 |
| Governance | 12 |
| Approvals | 14 |
| Owners | 36 |
| Scheduler | 39 |
| Alerting | 17 |
| Credential rotation | 5 |
| **Total** | **152** |

The six new scheduler blockers are intentional authority requirements:

- deployment source-system reference;
- deployment attestation reference;
- deployment authority invalid-auth evidence reference;
- deployment attestation digest;
- deployment evidence hash;
- deployment attestation timestamp.

## Skill 017 Result

`REJECTED / NO-GO - HIGH-AUTHORITY RELEASE EVIDENCE IS INCOMPLETE`

Repository controls pass, but promotion remains blocked by:

- no immutable clean-commit release package and protected CI/deployment attestation;
- no scheduler evidence endpoint or reconciler base URL;
- no real product/security approvals or six named owner acceptances;
- no production alert transport evidence;
- 15 unresolved credential classes and 31 credential blockers;
- missing production-purpose secrets;
- missing safe production PostgreSQL target;
- missing statutory source-artifact hash verification and expert approval.

No package entered `ACTIVE_INTERNAL`. Phase 3 remains unauthorized.

## Next Execution

1. Freeze a clean reviewed commit and certified artifact.
2. Deploy the scheduler control-plane evidence endpoint with a managed bearer credential.
3. Run `npm run agent:scheduler:evidence:apply`.
4. Configure the real reconciler base URL and run `npm run agent:reconciler:evidence:apply`.
5. Supply credential-rotation, governance, approval, ownership, alert, secret, database, and statutory evidence.
6. Rerun the credential gate, operational gate, and skill 017.

