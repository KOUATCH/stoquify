# X1 approval provider adapter contract

Place an organization-approved CommonJS adapter in this directory and reference it from `docs/blockers-docs/X1_APPROVAL_AUTOMATION_CONFIGURATION_2026-08-31.json`.

The adapter must export three asynchronous functions:

```js
module.exports = {
  async verifyDelegation(input) {},
  async createDraftApprovalPackage(input) {},
  async getApprovalPackage(input) {},
}
```

`verifyDelegation` must verify the signed `STOQ-X1-POL-004` record and signature through the authoritative provider. `createDraftApprovalPackage` must return one provider package and exactly three provider-issued draft record IDs for `STOQ-X1-POL-001`, `STOQ-X1-POL-002`, and `STOQ-X1-POL-003`. `getApprovalPackage` must return authenticated decisions, immutable signer directory IDs, authority references, signatures, decision times, and expiry times.

Mandatory controls:

- Retrieve credentials through workload identity and the configured secret-manager reference.
- Never place a secret value in configuration, logs, returned records, reports, or source control.
- Never derive approval IDs from filenames, tenant IDs, hashes, timestamps, or database fixture IDs.
- Preserve fresh authentication, authority provenance, signature evidence, and expiry.
- Fail closed on missing, ambiguous, expired, revoked, or unverifiable data.
- Do not mutate the Stoquify database from the provider adapter.

