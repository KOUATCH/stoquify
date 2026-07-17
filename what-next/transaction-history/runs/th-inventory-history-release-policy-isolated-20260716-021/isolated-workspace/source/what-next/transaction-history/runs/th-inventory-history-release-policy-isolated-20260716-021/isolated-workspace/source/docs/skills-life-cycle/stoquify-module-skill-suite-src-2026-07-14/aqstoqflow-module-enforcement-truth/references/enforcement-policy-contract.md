# Enforcement Policy Contract

An effective decision must record:

- organization, module, surface, surface type, and access intent
- RBAC result and entitlement result as separate facts
- requested mode and effective mode
- policy version and surface registration version
- pilot cohort and kill-switch state
- entitlement source and lifecycle state
- dependency result
- decision, reason code, and safe unavailable behavior
- audit correlation identifier and decision timestamp

## Mode Resolution

Resolve `observe`, `pilot`, or `enforce` only in the central policy service. Omitted mode is `observe`. A pilot decision requires explicit cohort membership. A kill switch always returns safe observe behavior for the selected policy scope while retaining evidence.
