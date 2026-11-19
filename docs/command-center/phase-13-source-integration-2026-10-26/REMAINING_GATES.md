# Remaining acceptance after the Phase 13 capture

These gates remain distinct from passing source, fixture and database checks. This task does not authorize production access or live deliveries.

| Priority | Gate | Completion evidence |
|---|---|---|
| P0 | Final combined source identity | Reconcile the exact later paths in `preservation.json` after concurrent work settles. Agree one candidate; review its changes and run the affected checks. Do not present successive captures of a moving workspace as one certified release. The two Phase 13 test repairs are explicitly recorded in `fixture-repairs.json`. |
| P0 | Authenticated runtime acceptance | Exercise the final application with disposable users and records, including the newly connected HR recovery wrappers, fresh-session denial, revoked authority, uncertain commands and explicit retry. The current browser fixture has synthetic action responses; older Command Center authenticated checks retain their older source identity. |
| P0 | Release artifact prerequisite | Phase 11's enforced prerequisite failed on HTTPS and live statement/invitation delivery configuration. Resolve that configuration through authorized release operations without printing secrets or enabling live delivery in this disposable test. No fabricated credentials, skipped check or weakened enforcement qualifies. |
| P0 | Trusted artifact and deployment process | Build/package the final candidate with the normal controls, retain a trusted digest, verify the exact runtime bytes, and exercise the approved migration/promotion/health/rollback stages in their authorized environments. No sealed artifact or production release is asserted here. |
| P1 | Human accessibility | Review retained contrast and hidden-focus observations; execute real screen-reader and native 200%/400% zoom procedures in EN/FR on the final runtime. Four fixture scans reporting no violations do not close this gate. |
| P1 | User productivity and capacity | Use representative users and agreed task/latency/error/data-volume criteria. Functional agent checks and synthetic contention tests do not substitute for human productivity or realistic sustained load. |
| P1 | Public policy/content | Obtain approved privacy/terms content and publication review. Existing route smoke checks do not approve that content. |

Use the existing [human acceptance procedure](../phase-9-parity-acceptance-2026-10-25/HUMAN_ACCEPTANCE.md), [artifact/schema controls](../../release/ARTIFACT_SCHEMA_PROMOTION.md), and [prior artifact findings](../phase-11-artifact-2026-10-26/REMAINING_GATES.md). No external messages, deployment, commit or staging operation was performed.
