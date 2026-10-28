# G0 human-input handoff

**Work package:** WP0 — program control and live baseline  
**Current decision:** `BLOCKED_EXTERNAL_INPUT_NO_PROMOTION`  
**Purpose of the requested decision:** authorize WP1 and controlled external-evidence collection only  
**Pilot activation:** not authorized  
**Production:** not authorized

## Source-truth result

A repository-wide search found no non-fixture real owner identity, acceptance artifact, statutory approval, or Cameroon pilot-scope approval that can be reused. Test identities and template values are deliberately excluded.

The coordination register is not a substitute for the gate-owned inputs. After genuine references are supplied and independently checked, they must be written to the canonical fields listed in `canonical-owner-field-crosswalk.json` and validated by their owning gates.

## Minimum decision required now

Approve or replace the proposed evidence-collection scope:

- country: `CM`;
- adapter: `CM_DGI_SANDBOX`;
- capability: `BOUNDED_EXTERNAL_SANDBOX_CONFORMANCE_ONLY`;
- production submission: disabled;
- live fiscal, payment, payroll, email, or authority effect: prohibited;
- approval purpose: WP1 and external evidence collection, not pilot activation.

Provide:

- approving executive-sponsor identity reference;
- approving product-owner identity reference;
- approval artifact reference;
- decision timestamp;
- approval expiry or review date, if applicable.

## Required owner roster

For every role in `owner-acceptance-register.json`, provide a real `directory://` or `identity://` reference, an acceptance artifact reference, and an acceptance timestamp. Operational roles also require a real backup, coverage window, accepted runbook version, and escalation reference.

The five owner objects immediately consumed by the enterprise external-intake gate are:

1. database/migration owner;
2. managed-secrets owner;
3. statutory country-pack owner;
4. credential-rotation owner;
5. operations/SRE owner.

The release chain additionally requires distinct product and security approvers; rollout, rollback, support, pilot, security-incident, and on-call primary/backup owners; a release manager; a qualified Cameroon reviewer; an independent statutory checker; a DGI/provider owner; an accessibility/localization reviewer; and an independent final reviewer.

## Required response format

Send only value-free references—never credentials, tokens, database URLs, signed URLs, request bodies, or secret values.

```text
ROLE:
  identityReference: directory://...
  backupIdentityReference: directory://...       # operational roles only
  acceptanceReference: approval://... or evidence://...
  acceptedAt: ISO-8601 timestamp
  acceptedRunbookVersion: ...                    # operational roles only
  coverageStartsAt: ISO-8601 timestamp           # operational roles only
  coverageEndsAt: ISO-8601 timestamp             # operational roles only
  escalationReference: evidence://...            # operational roles only

PILOT_SCOPE_DECISION:
  country: CM
  adapter: CM_DGI_SANDBOX
  capability: BOUNDED_EXTERNAL_SANDBOX_CONFORMANCE_ONLY
  productionSubmissionEnabled: false
  approvedByExecutiveSponsor: directory://...
  approvedByProductOwner: directory://...
  approvalReference: approval://...
  approvedAt: ISO-8601 timestamp
```

Qualified reviewer and checker submissions must also include qualification, appointment, conflict-declaration, and signed-return references. They must identify different natural persons.

## Promotion procedure

After the references are provided:

1. independently resolve the identities and approval artifacts;
2. reject placeholders, expired assignments, self-approval, or unresolved references;
3. update the WP0 register and the source-aligned gate inputs;
4. rerun external-input readiness in fail mode;
5. save the new hashes and WP0 decision;
6. authorize WP1 only if G0 passes with no unowned HIGH/CRITICAL invariant.

