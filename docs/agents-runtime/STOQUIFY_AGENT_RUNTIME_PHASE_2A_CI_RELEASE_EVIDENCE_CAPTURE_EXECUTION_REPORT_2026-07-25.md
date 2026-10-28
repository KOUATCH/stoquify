# Stoquify Agent Runtime Phase 2A CI and Release Evidence Capture Execution Report

**Date:** 2026-07-25  
**Decision:** Repository implementation complete; external capture blocked pending an immutable CI/release attestation endpoint  
**Internal activation:** Not attempted and not authorized  
**Phase 3:** Not authorized

## Executive Result

Stoquify now has a provider-neutral, fail-closed CI and release evidence collector for the Phase 2A controlled-pilot boundary.

The collector binds a clean CI run to the exact inactive `PILOT_CERTIFIED` package, commit, artifact, deployment, package certification, manifest, evidence bundle, browser report, tenant allowlist, and role allowlist.

It rejects failed, dirty, stale, activated, uncertified, or hash-drifting evidence. A successful capture updates only `release` and `ci`.

## Implemented Artifacts

- `scripts/agent-ci-release-evidence-capture.js`
- `scripts/__tests__/agent-ci-release-evidence-capture.test.js`
- `docs/agents-runtime/STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_CAPTURE_RUNBOOK_2026-07-25.md`
- `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json`
- `scripts/agent-operational-release-gate.js`
- `scripts/__tests__/agent-operational-release-gate.test.js`
- `scripts/agent-phase2a-command-gate.js`
- `.env.example`
- `package.json`

## Security and Integrity Controls

### Endpoint and authentication

- Query-free HTTPS is required outside local development.
- Embedded credentials, query strings, and fragments are rejected.
- A managed bearer value of at least 32 characters is required.
- An ephemeral invalid value must receive `401`.
- Responses are capped at 150 KB.
- Raw responses, authorization headers, and bearer values are discarded.

### Immutable release binding

The capture binds:

- package ID and release version;
- `PILOT_CERTIFIED` state;
- commit SHA;
- artifact digest and reference;
- deployment reference;
- package-certification reference and hash;
- manifest and evidence-bundle hashes;
- sanitized browser-report hash;
- tenant and role allowlist references;
- shared CI/release capture SHA-256.

### CI controls

- CI status must be `PASSED`.
- Source tree must be clean.
- CI completion must be in the past and no older than 24 hours.
- Attestation must be in the past, no older than 24 hours, and generated after CI completion.
- Release and CI commit, artifact, artifact-reference, and browser-report values must match.

### Drift and activation controls

The updater refuses to overwrite any nonempty release identity with a different value.

It requires:

- current register state `PILOT_CERTIFIED`;
- current and captured `activatedAt` to remain null;
- activation requested and authorized to remain false.

### Mutation boundary

The updater can replace only:

- `release`;
- `ci`.

It preserves governance, approvals, owners, scheduler, alerting, credential rotation, declared status, and activation.

## Commands Added

```text
npm run agent:ci-release:evidence:report
npm run agent:ci-release:evidence:gate
npm run agent:ci-release:evidence:apply
```

## Operational Gate Hardening

The operational gate now additionally requires:

- immutable package-certification reference and hash;
- one CI/release capture hash on both sections;
- CI source-system reference;
- attestation reference and digest;
- invalid-auth evidence reference;
- CI and attestation timestamps no older than 24 hours;
- attestation ordering after CI completion;
- artifact-reference equality between CI and release.

The current register remains correctly `BLOCKED` with 146 external evidence requirements and always reports:

```text
activationAuthorized: false
```

## Focused Verification

| Verification | Result |
|---|---|
| CI/release collector tests | 9 passed |
| Operational gate tests | 21 passed |
| Governance collector tests | 9 passed |
| Alert collector tests | 9 passed |
| Reconciler collector tests | 8 passed |
| Combined evidence suites | 7 suites, 73 tests passed |
| Complete Jest | 473 suites and 2,852 tests passed; 3 suites and 15 tests skipped; intermittent forced-worker-exit warning observed after completion |
| Focused evidence suites with `--detectOpenHandles` | 7 suites and 73 tests passed cleanly; no open handle identified |
| Phase 2A static ratchet | Passed |
| Operational release report | `BLOCKED`, 146 blockers, activation false |
| Real CI/release collector preflight | Failed closed on `CI_RELEASE_EVIDENCE_URL_MISSING` |
| Secret values printed | No |

The full regression warning appeared only after all suites had passed. The focused open-handle run found no leak in the seven evidence suites; the repository-level warning remains a separate diagnostic follow-up and is not represented as resolved.

## External Attestation Contract

The complete configuration, response schema, source requirements, capture procedure, apply order, and failure modes are defined in:

`docs/agents-runtime/STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_CAPTURE_RUNBOOK_2026-07-25.md`

The endpoint must be backed by a protected CI/release or provenance system. A local dirty worktree or mutable artifact is not acceptable evidence.

## Remaining External Work

This implementation closes the repository ingestion and validation gap. It does not create an immutable CI run or deployment.

Completion still requires:

- authorization to freeze and commit the reviewed worktree;
- a protected branch and immutable CI run;
- a published artifact and digest;
- deployed-artifact identity;
- certified-package proof;
- sanitized browser-report hash from the same artifact;
- immutable tenant and role allowlist references;
- an authenticated CI/release attestation endpoint.

After those prerequisites exist, run:

```text
npm run agent:ci-release:evidence:apply
npm run agent:governance:evidence:apply
npm run agent:reconciler:evidence:apply
npm run agent:alert:evidence:apply
npm run agent:credential-rotation:evidence:apply
npm run agent:credential-rotation:gate
npm run agent:operational-release:gate
```

The release can advance only to independent review. Activation remains a separate protected ceremony, and Phase 3 remains unauthorized.
