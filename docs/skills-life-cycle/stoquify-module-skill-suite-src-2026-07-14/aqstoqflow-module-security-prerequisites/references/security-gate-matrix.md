# Module Security Gate Matrix

| Priority | Control | Required proof |
|---|---|---|
| P0 | Tenant administrators cannot switch organization scope | Negative POS read/write/archive tests and session-derived tenant scope |
| P0 | Privileged role assignment has a grant ceiling | Separate permission, authority comparison, wildcard denial, maker-checker policy where required |
| P0 | Step-up authentication is real evidence | Persisted challenge timestamp and method bound to session and risk class; missing evidence fails closed |
| P1 | Tenant uploads are private | Non-public storage, authenticated delivery or short-lived signed URL, private cache, direct-path denial |
| P1 | Break-glass is explicit | Platform identity, target tenant, reason, ticket, expiry, approval, MFA, alerts, victim-tenant audit |
| P1 | Tenant isolation is centrally enforceable | Scoped repository/client or equivalent compound predicates plus adversarial tests |

## Release Decision

P0 controls block privileged Module Workbench commands, tenant entitlement overrides, and broad enforcement. P1 controls block production readiness for the affected surfaces and must have an owner, deadline, and compensating control if deferred.
