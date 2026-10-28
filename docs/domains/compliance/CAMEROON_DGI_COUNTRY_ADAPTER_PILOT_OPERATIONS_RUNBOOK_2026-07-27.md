# Cameroon DGI Country Adapter Pilot Operations Runbook

Date: 2026-07-27  
Adapter: `CM_DGI_SANDBOX`  
Environment: `SANDBOX` only  
Statutory effect: `SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION`

## Purpose

This runbook operates the first country authority adapter through the shared
compliance contract without claiming that Stoquify is connected to, approved by,
or certified by Cameroon DGI.

POS sale, payment, stock, cash, and ledger posting remain server-authoritative and
independent of authority availability. Disabling this adapter stops authority
submissions; it does not undo or block valid POS or accounting facts.

## Hard boundaries

- Do not create or select a `PRODUCTION` adapter configuration.
- Do not store a client secret, token, password, private key, or raw credential in
  a country pack, action payload, audit record, log, dashboard, or evidence summary.
- Store only an opaque reference using an approved secret-manager URI:
  `vault://`, `aws-secretsmanager://`, `azure-keyvault://`, or
  `gcp-secretmanager://`.
- Do not classify a sandbox acceptance reference as a certified fiscal artifact.
- Do not promote the adapter because a public DGI web page exists. Production
  promotion requires the actual technical contract, external conformance proof,
  independent review, regulator credential provisioning, and release approval.

## Initial configuration

Use the protected `configureCountryAdapterPilotAction` with:

- a secret-manager credential reference;
- credential expiry, when supplied by the authority or secret policy;
- official specification title, version, publication date, URL, and SHA-256
  document hash, only when the actual technical document is available.

The action derives tenant and actor identity from the protected session, requires
fresh authentication and `compliance.adapters.manage`, records audit and business
event evidence, and returns credential presence only.

Missing specification or review evidence produces a degraded health state but does
not prevent controlled sandbox fixtures. It continues to block production claims.

## Sandbox fixtures

Configure fixture behavior only in controlled test or sandbox data:

- `ACCEPT`: returns a `CM-SBX-*` reference and no production certification.
- `REJECT`: records a terminal rejection and visible operator exception.
- `OUTAGE`: schedules a bounded retry without rejecting the fiscal document.
- `RATE_LIMITED`: schedules a bounded retry using the retry-after policy.

Run the focused tests before a pilot:

```powershell
npx jest --runInBand --runTestsByPath `
  "services/compliance/__tests__/country-adapter-pilot.service.test.ts" `
  "actions/compliance/__tests__/country-adapter-pilot.actions.test.ts" `
  "services/compliance/__tests__/cameroon-dgi-sandbox.adapter.test.ts" `
  "services/compliance/__tests__/certification-outbox-processing.test.ts" `
  "services/compliance/__tests__/compliance-center.service.test.ts" `
  "scripts/__tests__/country-adapter-pilot-gate.test.js"
```

## Health monitoring

The Compliance Center exposes, without returning the credential reference:

- configuration and health status;
- credential presence and expiry;
- official specification version/date/hash readiness;
- independent review status and evidence hash;
- open submission count and oldest queue age;
- retry, rejection, failure, and dead-letter work.

Interpretation:

- `HEALTHY`: active sandbox configuration with credential, provenance, review, and
  no visible queue exception.
- `DEGRADED`: expiring credential, retry backlog, missing official specification,
  or pending expert review.
- `BLOCKED`: missing/expired credential, inactive configuration, rejection,
  failure, or dead letter.
- `DISABLED`: tenant kill switch is active.

## Credential rotation

1. Provision the replacement secret in the external secret manager.
2. Run `rotateCountryAdapterCredentialAction` with the new opaque reference,
   expiry, and reason.
3. Confirm `AUTHORITY_CREDENTIAL_ROTATED` exists in the business-event and audit
   trail.
4. Confirm no returned action result, log, dashboard payload, or evidence summary
   contains the reference.
5. Revoke the previous secret through the secret manager after the controlled
   overlap window.

Expired credentials fail closed before adapter submission.

## Independent review

The actor who configured the adapter cannot approve its review. A separate actor
with `compliance.adapters.approve` and fresh authentication records:

- review status;
- review date;
- reviewer qualification;
- affirmative conflict declaration;
- SHA-256 hash of the signed review evidence.

Review evidence improves provenance but does not override the sandbox-only adapter
or production submission block.

## Disable and containment

1. Run `disableCountryAdapterAction` with the scoped configuration ID and reason.
2. Confirm status `DISABLED` in the Compliance Center.
3. Confirm pending attempts fail closed as configuration errors.
4. Continue normal POS and ledger operations.
5. Preserve submissions, fiscal documents, audit records, and evidence.
6. Rotate credentials and investigate queue exceptions before reconfiguration.

There is no destructive rollback. Re-enablement occurs through a fresh,
audited configuration or credential-rotation workflow.

## Deployment

The migration is additive and must be applied through the controlled Prisma
production migration runbook:

`prisma/migrations/20260727143000_country_adapter_pilot_foundation/migration.sql`

Do not run a production migration from this pilot workflow. Validate first:

```powershell
npm run prisma:validate
npm run prisma:migration:safety:gate
npm run country:adapter:pilot:gate
npm run regulatory:hardcode:fail
```

## Production promotion checklist

Production remains blocked until all of the following are independently proven:

1. Actual DGI technical specification with version, publication/effective dates,
   canonical hash, endpoint, authentication, payload, response, retry, rejection,
   and certification artifact contracts.
2. Successful conformance tests against an authority-controlled sandbox.
3. Independent legal/accounting/technical review with signed evidence and
   conflict declaration.
4. Regulator-issued production credentials provisioned through the approved secret
   manager.
5. Production adapter implementation registered separately from
   `CM_DGI_SANDBOX`.
6. Security, outage, replay, idempotency, evidence, and rollback exercises.
7. Enterprise release-gate approval.

Until then, the pilot may support engineering and sandbox integration only.
