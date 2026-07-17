# Transaction-History Security Proof Contract

## Exact Mission

Prove that every transaction-history table, drawer, export, action, proof subject, and public receipt is tenant-bound, least-privileged, module-entitled, freshness-aware, subject-redacted, abuse-resistant, and auditable. In `implement` mode, close only evidenced gaps inside the allowed edit boundary. In `verify` mode, prove the controls with negative tests.

## Required Surface Ledger

Cover inventory movements/adjustments/transfers; cash drawers/sessions/journals; payments/provider events/reconciliation; AP invoices/bank changes/payments; supplier and customer histories; every CSV/XLSX/PDF or certificate export; proof drawers; receipt management; and public receipt routes.

For each independently reachable surface, record:

| Surface and entrypoint | Data/service/model | Table permission | Drawer permission | Export permission | Action permission | Module + mode | Fresh-auth rule | Redacted fields | Read audit event | Tenant predicate | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|

Never inherit drawer, export, or action authority from table visibility. Record `none` only with a documented reason.

## Enforcement Contract

### Tenant isolation

- Derive `organizationId` from authenticated server context. Reject a conflicting caller value; do not use it as authority.
- Scope every root lookup and every independent supporting query by tenant. Return a generic not-found/forbidden result for a valid foreign-tenant ID.
- Validate tenant ownership before following relations. Flag models such as cash drawers that rely only on parent relations and lack a direct tenant key or composite tenant constraint.
- Never treat an object ID, receipt token payload, cursor, export job ID, or proof subject ID as proof of tenant access.

### RBAC, modules, and fresh auth

- Use canonical, server-enforced permissions for table, drawer, export, and each mutating action. Review compatibility aliases for privilege broadening.
- Enforce the catalog's exact module slug and required dependencies at the server entrypoint. `observe`, navigation hiding, page guards, and RBAC wildcards do not satisfy entitlement.
- Require explicit fresh-auth age for bulk/sensitive export, certificate/signoff, reconciliation override, bank/payment-destination evidence, receipt-token revocation, and similarly high-risk actions. Deny missing or stale freshness before service access.

### Redaction and proof registry

- Maintain an explicit proof registry: `subjectType -> root model/builder -> permission -> module -> sensitivity -> redaction policy -> audit event`.
- Reject unknown subject types. Tenant-scope the root subject before loading edges or evidence nodes.
- Redact by subject and role: provider references, bank/payment destinations, supplier bank changes, customer credit/contact data, salary/tax/social identifiers, internal tokens, and private notes. Redaction must remove or replace values, not merely hide UI elements.
- Audit sensitive proof reads with actor, tenant, subject type/ID, decision, redaction count/policy, timestamp, and correlation ID. Never log raw tokens, bank data, or unredacted payloads.

### Cursors, exports, and abuse

- Freeze traversal at `recordedThrough` and order pages deterministically by `(effectiveAt DESC, recordedAt DESC, id DESC)` or a documented equivalent tie-breaker with the same knowledge-cutoff semantics.
- Use an opaque authenticated cursor containing version, key ID, purpose, tenant ID, surface, normalized-filter hash, sort tuple, and expiry. Sign with HMAC-SHA-256 and compare tags in constant time. Reject malformed, modified, expired, cross-tenant, cross-surface, and filter-mismatched cursors before querying.
- Run exports server-side from the same normalized filter contract as rows and summaries. Require export permission, appropriate fresh auth, field allowlisting/redaction, row/byte/time limits, rate and concurrency limits, and start/completion/failure audit events.
- Neutralize spreadsheet formulas after canonicalization for cells beginning with `=`, `+`, `-`, `@`, tab, CR, or LF. CSV quoting alone is insufficient.
- Rate-limit expensive reads, public receipts, proof expansion, and exports using a deployment-appropriate shared limiter. Bound page size, date range, graph depth, export count, and retry/concurrency behavior.

### Cryptographic language

- `SHA-256`: call it a checksum, content fingerprint, or high-entropy-token lookup digest. It does not prove authenticity by itself. Recompute at the trust boundary and validate `sha256:<64 lowercase hex>` where a prefixed digest is required.
- `HMAC-SHA-256`: use for authenticity with a secret key, including purpose-scoped cursors and low-entropy identifiers. Include version/key ID/purpose/expiry and support rotation.
- `Digital signature`: use a vetted public-key signature when independent/offline verification or non-shared verification authority is required. State signer identity and key lifecycle.
- Use platform cryptography and constant-time verification. Never invent encryption, signature, randomness, or password-hashing schemes.

## Evidence Gate

Do not pass a surface without all applicable evidence:

- exact route/component/action/API/service/model/test paths and function names;
- trusted tenant source and query predicates for root plus supporting reads;
- explicit table/drawer/export/action permission decisions and module mode;
- fresh-auth age and pre-service denial evidence where required;
- returned sensitive fields and applied redaction policy;
- proof-registry entry and sensitive-read audit event;
- cursor payload/signature/verification path and deterministic ordering;
- export filter parity, completeness, limits, formula handling, and audit trail;
- focused test command and result, or a clearly labeled static-only proof gap.

## Mandatory Negative Tests

1. Missing auth, missing permission, permission-alias downgrade, and direct server-action/API invocation.
2. Foreign tenant ID at table, drawer, export, action, proof root, and supporting relation; assert no foreign fields and no service call when denial belongs at the entrypoint.
3. Missing, suspended, expired, wrong, and dependency-incomplete module entitlement; wildcard RBAC must still deny.
4. Missing/stale fresh auth for every designated sensitive read/export/action.
5. Role/subject-specific redaction snapshots and logs free of raw sensitive values.
6. Unknown proof subject, foreign proof subject, disallowed proof edge, and audited sensitive proof read.
7. Malformed, bit-flipped, wrong-key, expired, cross-tenant, cross-surface, and filter-mismatched cursor; same-timestamp pagination must have no duplicates or omissions.
8. Export beyond the visible page, oversized/date-wide export, repeated/concurrent export, unauthorized fields, formula payloads, and start/failure/completion audit events.
9. Missing/tampered/expired/revoked/wrong-sale public receipt token, contact redaction, `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, token-free logs, and rate-limit behavior.

## Exact Allowed Edits

- `audit`: no repository edits.
- `verify`: no persistent repository edits; use existing tests and disposable output outside the repository.
- `implement`: edit only user-named transaction-history files and their co-located tests under:
  - `app/**` and `components/**` for the named history table/drawer/export/receipt surface;
  - `actions/{inventory,pos,payments,purchasing,suppliers,customers,evidence}/**`;
  - `services/{inventory,pos,payments,reconciliation,purchasing,supplier,customer,evidence,security}/**`;
  - directly related types/schemas and tests for those files.
- Require explicit user authorization before changing `lib/security/**`, `services/_shared/**`, `services/modules/**`, permission/role seeds, `prisma/schema.prisma`, or migrations.
- Never edit unrelated product domains, accounting write kernels, dependency manifests/lockfiles, generated artifacts, CI/deployment configuration, or unrelated documentation.

## Exact Stop and Completion Conditions

Stop before editing and report `BLOCKED` when an edit falls outside the boundary; concurrent edits overlap the same lines; the required permission, module slug, redaction policy, or freshness rule is materially ambiguous; a schema/shared-auth change lacks explicit authorization; or the proposed change weakens an existing control.

`audit` is complete only when every required surface has a ledger row, every failed control has path/function evidence and a verification test, and current defects are separated from proposal-only risks.

`implement` is complete only when all targeted failed rows pass, focused negative tests pass, no unrelated files changed, and residual risk is reported. Stop as incomplete if required verification cannot run.

`verify` is complete only when all applicable mandatory negative tests run and pass and no open Critical/High transaction-history finding remains. Otherwise report `BLOCKED` or `FAILED` with the exact missing evidence; never claim a gate passed from static inspection alone.
