# Gate closure matrix

Generated 2026-09-24T09:07:34.739Z. The full machine-readable criteria, stop conditions and next actions are in [gate-closure-matrix.json](gate-closure-matrix.json). Current gate pass counts are reported separately by fresh gate output. Historical program declarations are not silently overwritten.

| Gate | Purpose | Dependencies | Disposition |
|---|---|---|---|
| G1 | Architecture and control contract freeze | None | BLOCKED_AUTHENTIC_APPROVALS |
| G2 | Transaction and access trust | G1 | BLOCKED_DEPENDENCY; INDEPENDENT_PREFLIGHT_PARTIAL |
| G3A | Provider-authoritative payment truth | G2 | BLOCKED_DEPENDENCY; INDEPENDENT_PREFLIGHT_PARTIAL |
| G3B | Immutable receipt and fiscal-source truth | G2 | BLOCKED_DEPENDENCY; INDEPENDENT_PREFLIGHT_PARTIAL |
| G4 | Bounded POS workstation release candidate | G2, G3B | BLOCKED_DEPENDENCY; INDEPENDENT_PREFLIGHT_PARTIAL |
| G5 | Store financial close | G3A, G3B, G4 | BLOCKED_DEPENDENCY; INDEPENDENT_PREFLIGHT_PARTIAL |
| G6 | Physical fulfillment truth | G2 | BLOCKED_DEPENDENCY; INDEPENDENT_PREFLIGHT_PARTIAL |
| G7 | Financial order-to-cash and returns | G3A, G3B, G6 | BLOCKED_DEPENDENCY; INDEPENDENT_PREFLIGHT_PARTIAL |
| G8 | Operational readiness candidate | G3A, G3B, G4, G5, G6, G7 | BLOCKED_DEPENDENCY; INDEPENDENT_PREFLIGHT_PARTIAL |
| G9 | Bounded pilot and production expansion | G8 | BLOCKED_DEPENDENCY; INDEPENDENT_PREFLIGHT_PARTIAL |

The frozen August program contains implementation descriptions older than the September POS corrections. In particular, current cart version/revision checks and durable commit-result recovery exist; older NOT_IMPLEMENTED labels cannot be treated as fresh source findings. Neither their existence nor the prior 21 PostgreSQL cases proves all G2 requirements. Reconcile every work package against the current source and complete scenario matrix after G1.

The application postingCycle migration is recorded complete in [what-next/pos-enterprise-modernization/2026-09-23/evidence/application-migration-result.json](../../pos-enterprise-modernization/2026-09-23/evidence/application-migration-result.json). It must not be applied again. French drawer rendering/filter/keyboard and null-balance correction evidence is retained; cashier, actual multi-viewport, screen-reader and physical hardware coverage remains separate.

Inventory callsite dispositions are supplied by the inventory review in this run. No governance status, selected option or frozen approval register was changed.
