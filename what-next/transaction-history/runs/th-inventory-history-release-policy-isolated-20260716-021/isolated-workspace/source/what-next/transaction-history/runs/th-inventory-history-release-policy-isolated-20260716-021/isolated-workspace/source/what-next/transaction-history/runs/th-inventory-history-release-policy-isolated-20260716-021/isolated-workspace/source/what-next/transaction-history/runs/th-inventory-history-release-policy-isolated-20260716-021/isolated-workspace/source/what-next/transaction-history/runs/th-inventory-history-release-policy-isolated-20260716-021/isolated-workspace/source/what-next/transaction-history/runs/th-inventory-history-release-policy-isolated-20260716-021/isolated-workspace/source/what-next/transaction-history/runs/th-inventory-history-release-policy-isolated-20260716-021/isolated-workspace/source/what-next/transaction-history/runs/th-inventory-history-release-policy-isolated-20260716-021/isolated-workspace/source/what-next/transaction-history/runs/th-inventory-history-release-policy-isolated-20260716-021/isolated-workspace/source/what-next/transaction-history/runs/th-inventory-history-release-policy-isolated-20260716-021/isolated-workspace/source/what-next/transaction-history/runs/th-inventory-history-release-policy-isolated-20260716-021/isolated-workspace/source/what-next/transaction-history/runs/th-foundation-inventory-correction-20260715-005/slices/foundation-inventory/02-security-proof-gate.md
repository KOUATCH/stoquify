# Stage 02 Security And Proof Gate

## Run identity

- Run: `th-foundation-inventory-correction-20260715-005`
- Trace: `51783d07-4481-4580-be21-7e9312f8d71a`
- Slice: `foundation-inventory`
- Mode: `implement`
- Agent: Security Architect
- Verdict: **PASS**

## Boundary decision

This run creates an internal inventory correction service only. It does not authorize or create an action, API route, page, component, export, public receipt, proof drawer, or client-visible payload. The absence of an externally reachable command is an enforced scope decision, not an implicit permission grant.

Stage 03 may implement the service and persistence contract only when it accepts tenant and actor context from a trusted caller, enforces a distinct requester and approver, rejects cross-tenant originals and dependent records, writes no sensitive free-form payload into logs, and emits durable audit/business evidence in the same transaction. A later action-specific run must independently implement and test the protected entrypoint.

## Exact edit boundary

Stage 02 wrote only:

- `what-next/transaction-history/runs/th-foundation-inventory-correction-20260715-005/slices/foundation-inventory/02-security-proof-gate.json`
- `what-next/transaction-history/runs/th-foundation-inventory-correction-20260715-005/slices/foundation-inventory/02-security-proof-gate.md`

No product file changed.

## Permission and control matrix

| Surface and entrypoint | Data/service/model | Table permission | Drawer permission | Export permission | Action permission | Module + mode | Fresh-auth rule | Redacted fields | Read audit event | Tenant predicate | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Internal correction service, no external entrypoint | Proposed inventory reversal service over original adjustment, movements, batch, journal and source link | N/A - no table | N/A - no drawer | N/A - no export | Trusted service caller only in this run | N/A at service; future entrypoint must enforce `inventory` | Caller contract requires verified requester/approver; future entrypoint must use 300-second fresh auth | Reason is controlled text; no bank, contact, credential, token or private-note fields returned | Atomic business event, inventory audit and ledger audit required | Every root and dependent lookup must include trusted `organizationId` | PASS for internal-only Stage 03 boundary |
| Future correction action, explicitly excluded | Same service | Separate read permission required if later listed | Separate detail permission required if later added | Separate export permission required if later added | `inventory.adjust.approve` | `inventory`, `enforce`, write intent | `freshAuth: { maxAgeSeconds: 300 }` before service invocation | Allowlisted response only; no raw internal evidence payload | Protected-action RBAC decision plus correction audit correlation | Derive organization/user from protected context; reject conflicting input | BLOCKED from exposure until a dedicated security implementation run |

## Required Stage 03 security invariants

1. Require non-empty trusted `organizationId`, requester, approver, original adjustment ID, reason, effective date, and idempotency key through a strict schema.
2. Reject requester equal to approver before any database write.
3. Root the original adjustment lookup by both `id` and `organizationId` and tenant-scope every original movement, journal, source link, item, location, and inventory-level lookup.
4. Treat IDs, reason text, and idempotency keys as hostile input; trim and bound text and never use an ID as tenant authority.
5. Preserve the original records and prohibit a second reversal through database uniqueness, transactional conflict handling, and idempotent replay.
6. Emit actor IDs, tenant, original/correction IDs, decision, reason, correlation/idempotency identity, and timestamps without logging credentials, tokens, contact data, or unrestricted payloads.
7. Return only the correction identity, original identity, movement/journal references, and status needed by a trusted server caller.
8. Do not claim SHA-256 authenticity. Any report or evidence hash remains an integrity fingerprint unless backed by a separate signature trust chain.

## Existing controls preserved

- `inventory.adjust.approve` is classified critical and maps to `APPROVE_STOCK_ADJUSTMENTS` in `lib/security/rbac-permissions.ts:93` and `:157`.
- `protectAction` performs fresh-auth verification before permission, module and handler execution and defaults to 300 seconds through `requireFreshAuth` in `lib/security/auth-session.ts:132`.
- The current inventory action pattern derives organization and actor from trusted context before invoking services; the future reversal action must use the stronger approve permission and fresh-auth option.
- Run `003` already passed the inventory tenant, entitlement, recorded-cutoff, minimization, hash-language and fail-closed reconciliation controls. This run does not reopen or weaken them.

## Verification

Command:

`jest --runInBand actions/inventory/__tests__/inventoryMovementActions.test.ts lib/security/__tests__/rbac-permissions.test.ts services/security/__tests__/step-up-auth.service.test.ts`

Result: PASS, 3 suites and 28 tests. The suites cover inventory action authorization, critical-permission mapping, and step-up assurance behavior. They do not test a correction endpoint because none exists or is authorized in this run.

## Residual risk and handoff

Stage 03 is eligible to build only the internal service and database controls. No external user can invoke the new capability until a later run adds a protected action with `inventory.adjust.approve`, enforced `inventory` entitlement, 300-second freshness, trusted tenant derivation, maker-checker actor derivation, audit assertions, and direct-invocation negative tests. Stage 04 remains dependent on Stage 03 accounting evidence.
