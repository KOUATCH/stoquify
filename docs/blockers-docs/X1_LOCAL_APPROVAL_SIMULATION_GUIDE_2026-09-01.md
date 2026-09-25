# X1 Local Approval Simulation

## Purpose

This profile permits local development and functional testing without subscriptions to an approval platform, identity provider, secret manager, webhook host, or cloud evidence store.

It replaces external systems with deterministic local fixtures. It does not remove the external requirements for release, certification, or authoritative X1 activation.

## Configuration

Use:

`docs/blockers-docs/X1_APPROVAL_AUTOMATION_CONFIGURATION_LOCAL_ONLY_2026-09-01.json`

Do not replace or overwrite the authoritative configuration:

`docs/blockers-docs/X1_APPROVAL_AUTOMATION_CONFIGURATION_2026-08-31.json`

## Local substitutions

| External requirement | Local substitute |
| --- | --- |
| Approval platform | Repository-local file approval simulator |
| Approval workspace | `local://stoquify/x1/workspace` |
| Approval template | Existing repository POL-004 draft |
| Provider adapter | Built-in local file simulator identifier |
| Identity provider | Four distinct fixture service identities |
| Governance register | Identities embedded in the local profile |
| Secret manager | No external credentials used |
| Webhook callback | Repository-local file event queue |
| Evidence store | `what-next/evidence/finance-x1/local-simulation` |
| Retention policy | Ephemeral local evidence deleted when the local environment is reset |

## Mandatory boundaries

- The operator must set `X1_ALLOW_LOCAL_SIMULATION=true` explicitly.
- Only `localhost` and `127.0.0.1` application origins are permitted.
- Only the approved disposable non-production database is permitted.
- Production databases and shared-database resets are prohibited.
- All decisions are synthetic and must be visibly marked as local simulation.
- Local output is not authenticated evidence.
- Local output cannot release an X1 gate.
- No local process may populate real signature or approval-record fields.

## What can be tested locally

- Approval-package construction.
- Template variable binding.
- Distinct automation-role enforcement.
- Approve, reject, revise, expiry, and malformed-event behavior.
- Callback/event synchronization semantics.
- Contract and artifact hashing.
- Evidence manifest construction.
- EN/FR rendering and route coverage.
- Desktop, tablet, and mobile viewport execution.
- Redaction and tenant-isolation behavior against approved fixture data.
- Failure behavior when authoritative approval is absent.

## What remains blocked

- A legally or organizationally effective approval.
- A verifiable human signature.
- Formal appointment authority.
- Authenticated external-accountant release evidence.
- Product-budget approval.
- Security/control-owner evidence authorization.
- Production or externally certified X1 activation.

## Migration to real services

When subscriptions become available, copy only the intended business settings from the local profile into the authoritative configuration. Replace every `local://`, `local-sp://`, `embedded://`, `not-required://`, `file-event://`, and `builtin://` value with a real provider-issued reference. Never promote simulated decisions, IDs, signatures, or evidence artifacts.
