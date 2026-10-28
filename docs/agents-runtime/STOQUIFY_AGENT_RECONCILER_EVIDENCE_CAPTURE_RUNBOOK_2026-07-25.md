# Stoquify Agent Reconciler Evidence Capture Runbook

**Date:** 2026-07-25  
**Scope:** Phase 2A controlled internal pilot  
**Activation authority:** None  
**Deployment provider:** Provider-neutral

## Purpose

This runbook collects real, sanitized evidence from the authenticated Agent Runtime reconciler readiness endpoint. It removes manual transcription of the three five-minute windows while preserving Stoquify's release and activation boundaries.

The collector:

- performs an ephemeral invalid-authentication probe;
- performs an authenticated readiness request;
- captures only allowed readiness fields and three window identities/timestamps;
- verifies the returned environment matches the requested environment;
- computes a SHA-256 evidence hash;
- emits JSON and Markdown without the bearer secret, authorization headers, or raw response;
- can patch only scheduler-readiness fields in the operational release register;
- cannot change release identity, approvals, owners, alert evidence, declared status, or activation fields.

## Required Managed Configuration

Provide these through the deployment or operator environment:

```text
STOQUIFY_AGENT_RECONCILER_BASE_URL
STOQUIFY_AGENT_RECONCILER_SECRET
STOQUIFY_AGENT_RELEASE_ENVIRONMENT
```

Optional:

```text
STOQUIFY_AGENT_RECONCILER_CAPTURE_TIMEOUT_MS=20000
```

The base URL must be HTTPS outside local development. The secret must contain at least 32 characters and must come from a managed secret store. Never place the secret in a command argument, URL, evidence file, shell history, ticket, or report.

## Commands

Capture a sanitized report:

```text
npm run agent:reconciler:evidence:report
```

Require ready evidence:

```text
npm run agent:reconciler:evidence:gate
```

Require ready evidence and apply only the scheduler-derived patch:

```text
npm run agent:reconciler:evidence:apply
```

Default outputs:

```text
what-next/agents-runtime/agent-reconciler-readiness-evidence.json
what-next/agents-runtime/agent-reconciler-readiness-evidence.md
```

The apply command updates:

```text
docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json
```

## Capture Sequence

1. Deploy the exact reviewed Stoquify artifact without activating any agent package.
2. Apply the additive migrations through the controlled release pipeline.
3. Configure the managed reconciler secret and healthy alert transport.
4. Run the scheduled worker every five minutes.
5. Wait for at least three consecutive completed windows.
6. Export the managed environment variables to the operator process without printing them.
7. Run `npm run agent:reconciler:evidence:gate`.
8. Review the generated JSON and Markdown for the expected environment, three windows, `401` invalid-auth proof, healthy alert transport, and `secretValuesPrinted: false`.
9. Run `npm run agent:reconciler:evidence:apply`.
10. Run `npm run agent:operational-release:report` and resolve the remaining governance, artifact, alert-lifecycle, and credential blockers.

## Evidence Contract

A ready capture requires:

- authenticated readiness HTTP `200`;
- invalid authentication HTTP `401`;
- exact environment match;
- readiness `ready: true`;
- five-minute interval;
- three required and three successful windows;
- allowed, sanitized blocker codes only;
- three valid run IDs with scheduled and completed timestamps;
- fresh heartbeat derived from the latest scheduled window;
- healthy alert transport;
- no stale active lease.

The evidence hash covers the sanitized capture before the register patch is added. The operational register stores the matching SHA-256 and value-free evidence reference.

## Failure Behavior

The collector fails closed with a stable code and no secret output when:

- the base URL is absent;
- HTTPS is not used outside local development;
- the managed secret is absent or too short;
- the environment name is invalid;
- the request times out or is unavailable;
- the response is larger than 100 KB;
- the response is not valid JSON;
- invalid authentication is not rejected;
- readiness is blocked or the environment differs;
- an unsafe or mismatched register is supplied to the apply command.

With no managed base URL, the local preflight returns:

```text
RECONCILER_BASE_URL_MISSING
```

It does not fabricate an evidence file.

## Deliberate Limit

The collector does not prove the server-side missing-configuration `503` by changing a live deployment. That evidence must come from an isolated deployment or controlled revision with the reconciler secret intentionally absent.

It also does not prove scheduler-provider configuration, workload identity, single-concurrency policy, immutable artifact deployment, alert acknowledgement/escalation, or credential revocation. Those remain separate value-free references in the operational release register.

## Security Boundary

The collector is an operator tool, not an agent tool. It has no Prisma access, no business mutation path, no package activation method, and no authority over approvals, owners, RBAC, entitlements, ledger posting, payments, stock, payroll, statutory filing, or close certification.

