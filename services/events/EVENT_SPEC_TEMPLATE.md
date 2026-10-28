# Business Event Specification Template

Use one copy of this template for every money, stock, tax, payroll, supplier,
customer, cash, fiscal, or compliance event before wiring the producer.

## Identity

- Event type:
- Schema version:
- Owning service:
- Producer source:
- Tenant scope:
- Correlation source:

## Idempotency

- Idempotency key composition:
- Canonical payload definition:
- Payload hash algorithm: SHA-256 over stable canonical JSON.
- Same-key/same-payload replay result:
- Same-key/different-payload conflict handling:

## Transaction boundary

- Domain mutation committed with the event:
- Source/document hash:
- Ledger/posting batch impact:
- Audit evidence:
- Anomaly signals:
- Outbox messages created in the transaction:

External calls must occur after commit through a leased outbox worker.

## Controls

- Required permission/module gate:
- Fresh-auth/step-up requirement:
- Segregation-of-duties rule:
- Closed-period rule:
- Compensating event or correction path:

## Failure and operations

- Typed terminal errors:
- Typed retryable errors:
- Maximum attempts and backoff:
- Operator queue/readiness metric:
- User notification:
- Redaction rules:

## Verification

- Tenant isolation test:
- RBAC/permission denial test:
- Same-payload replay test:
- Different-payload conflict/audit test:
- Transaction rollback test:
- Worker retry/dead-letter test:
