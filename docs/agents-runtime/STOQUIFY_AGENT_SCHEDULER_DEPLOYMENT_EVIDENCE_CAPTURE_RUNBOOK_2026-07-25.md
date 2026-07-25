# Stoquify Agent Scheduler Deployment Evidence Capture Runbook

**Date:** 2026-07-25  
**Scope:** Agent Runtime Phase 2A scheduler deployment authority  
**Activation:** Permanently separate; this runbook cannot authorize activation

## Purpose

This runbook captures independent, value-free proof that the five-minute Agent Runtime reconciler was deployed by an approved scheduler control plane with the expected release identity and safety policy.

It complements, but does not replace, reconciler readiness evidence:

- scheduler deployment evidence proves what was deployed and by which authority;
- reconciler readiness evidence proves that the deployed workload is currently healthy and has completed three real five-minute windows.

Neither collector can activate an agent.

## Commands

```powershell
npm run agent:scheduler:evidence:report
npm run agent:scheduler:evidence:gate
npm run agent:scheduler:evidence:apply
```

`report` and `gate` write value-free capture artifacts after a successful HTTP exchange. `apply` additionally updates only the `scheduler` deployment fields in the operational register, and only when every check passes.

## Configuration

Configure these variables in the protected release environment:

```text
STOQUIFY_AGENT_RELEASE_ENVIRONMENT=internal_pilot
STOQUIFY_AGENT_SCHEDULER_EVIDENCE_URL=https://scheduler-control-plane.example/evidence/stoquify-agent-runtime
STOQUIFY_AGENT_SCHEDULER_EVIDENCE_SECRET=<managed secret, at least 32 characters>
STOQUIFY_AGENT_SCHEDULER_EVIDENCE_TIMEOUT_MS=20000
```

Requirements:

- the endpoint must be query-free HTTPS outside local development;
- the bearer secret must come from a managed secret store;
- the endpoint must reject a generated invalid bearer credential with HTTP 401;
- the valid request must return HTTP 200 and the contract below;
- no secret, authorization header, raw environment, token, database URL, connection string, or private key may appear in the payload.

## Authority Response Contract

```json
{
  "data": {
    "ready": true,
    "environment": "internal_pilot",
    "sourceSystemReference": "scheduler-control-plane://provider/environment",
    "attestationReference": "attestation://agent-runtime/scheduler/release",
    "attestationDigest": "sha256:<64 lowercase hexadecimal characters>",
    "attestedAt": "2026-07-25T13:25:00.000Z",
    "release": {
      "packageId": "package-id",
      "releaseVersion": "release-version",
      "packageState": "PILOT_CERTIFIED",
      "commitSha": "<40 or 64 hexadecimal characters>",
      "artifactDigest": "sha256:<64 lowercase hexadecimal characters>",
      "deploymentReference": "deployment://environment/release",
      "activatedAt": null
    },
    "scheduler": {
      "provider": "managed-scheduler",
      "scheduleReference": "scheduler://environment/reconciler",
      "workloadReference": "workload://environment/stoquify",
      "authType": "MANAGED_SECRET",
      "managedCredentialReference": "secret-manager://reconciler/current",
      "intervalMinutes": 5,
      "singleConcurrency": true,
      "leaseSafe": true,
      "concurrencyEvidenceReference": "evidence://scheduler/concurrency",
      "timeoutMs": 120000,
      "deployedCommitSha": "<same commit as release>",
      "deployedArtifactDigest": "sha256:<same artifact as release>",
      "deployedAt": "2026-07-25T12:00:00.000Z",
      "missingConfigHttpStatus": 503,
      "missingConfigEvidenceReference": "evidence://scheduler/missing-config-503",
      "failureAlertReference": "alert://scheduler/failure-policy"
    }
  }
}
```

`WORKLOAD_IDENTITY` is also accepted as `authType`. The managed credential field must remain a reference, never a credential value.

## Required Checks

A capture is ready only when:

1. invalid authentication returns 401;
2. authorized evidence returns 200 and `ready: true`;
3. the environment matches the release environment;
4. all references and hashes are structurally valid;
5. the attestation is no more than 24 hours old and not in the future;
6. deployment occurred before attestation;
7. the package is exactly `PILOT_CERTIFIED` and inactive;
8. package, release, commit, artifact, and deployment reference match the frozen operational release;
9. scheduler commit and artifact match that release;
10. cadence is exactly five minutes;
11. single-concurrency or lease-safety proof exists;
12. timeout is positive and below 300 seconds;
13. missing configuration is proven to return 503;
14. failure-alert provenance is present.

## Guarded Apply Boundary

A successful apply may update:

- provider and scheduler/workload references;
- authentication type and managed credential reference;
- cadence, concurrency, lease, timeout, and related evidence references;
- deployed commit, artifact, and timestamp;
- missing-configuration and failure-alert evidence references;
- source authority, attestation, evidence hash, and invalid-auth proof.

It cannot update:

- scheduler readiness, heartbeat, or successful windows;
- CI, governance, approvals, owners, alerting, or credential rotation;
- declared operational status;
- package state or release activation;
- `activation.requested`, `activation.authorized`, or `activation.activatedAt`.

Existing non-null deployment identity is immutable. Conflicting evidence fails closed instead of replacing it.

## Execution Order

1. Freeze a clean reviewed commit and certified artifact.
2. Deploy the reconciler with a five-minute schedule and managed authentication.
3. Publish the independent scheduler authority endpoint.
4. Run `npm run agent:scheduler:evidence:apply`.
5. Confirm the operational register changed only in scheduler deployment fields.
6. Run `npm run agent:reconciler:evidence:apply`.
7. Run `npm run agent:credential-rotation:gate`.
8. Run `npm run agent:operational-release:gate`.
9. Rerun skill `017-aqstoqflow-enterprise-release-gate`.

## Current Preflight Result

The 2026-07-25 preflight returned:

```text
SCHEDULER_EVIDENCE_URL_MISSING
```

No capture artifact was written, no secret was printed, no operational register field was populated, and activation remained false/false/null.

