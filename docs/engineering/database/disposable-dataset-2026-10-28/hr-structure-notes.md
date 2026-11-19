# Synthetic HRIS structure fixture

`prisma/disposable-hr-structure.ts` exports `seedHrisStructure(org, actors, out)` for the existing guarded disposable runner. It requires `NODE_ENV=test`, the retained schema-verified localhost database manifest, one of the three `synth12_*` organizations, and the fixed `2026-10-28T20:00:00Z` clock. The helper does not run on import.

The fixture creates reference configuration through Prisma because current application source has no authoring service for `HrisPosition`, `HrisEmploymentAssignment`, `HrisReportingRelationship`, or `HrisManagerDelegation`. The existing PostgreSQL tests also construct these records directly. This fixture is not evidence that an authoring, approval, browser, or legal-attestation workflow exists or was exercised.

Expected configuration per organization:

| Record | Count | Meaning |
| --- | ---: | --- |
| Position | 6 | The retained Retail/Operations job title at each of three actual employee locations |
| Primary employment assignment | 12 | Exactly one per retained employee, preserving department, location and job title |
| Direct reporting relationship | 11 | Synthetic owner employee manages the manager employee; the manager manages the other ten employees |
| People-read delegation | 1 | Manager delegates Operations reads to the existing payroll administrator employee during October 2026 |

Across three organizations this is 18 positions, 36 assignments, 33 reporting relationships and 3 delegations. The manager and owner retain their original job titles; application personas do not rewrite employment profiles. Branch setup units remain location references, while assignments use the retained department units. No new employee, contract, schedule or observation is created by this helper.

Position availability is November 1, 2025 through November 1, 2026, with an exclusive end. Assignments intersect that interval with each employee's actual hire/termination and active-contract interval. Reporting links intersect both assignments. Delegation intersects the relevant assignment intervals with October 2026. The root/manager/two-level structure excludes cycles and self-reporting; the Operations delegation excludes the delegate's own Retail record. The helper refuses unexpected retained structure rows, preventing an implicit merge with other assignments or delegations.

Both `*-hr-structure-reason.json` and `*-hr-structure-provenance.json` are written beneath the supplied output's `synthetic-documents` directory with exact UTF-8 bytes. Their SHA-256 hashes bind the required schema fields to actual synthetic fixture artifacts. Required `approvedById` references identify the existing synthetic owner account; the artifacts explicitly state that no real approval, signature, legal attestation, certification or approval UI is claimed. No external-attestation record is produced.

A serializable transaction and organization-specific advisory lock guard reference writes. Replay compares every scalar row field except creation/update timestamps; it does not silently update changed records. Existing artifact bytes must also match. A database rollback may leave its clearly labelled reference-plan files available for inspection and deterministic retry. Normal scope-reader audit rows are expected on every run; idempotence applies to the four reference tables and artifact bytes, not to suppressing real read audits.

The helper executes the existing `getHrisEmployeeDirectory`, `getOwnHrisEmployeeProfile` and `resolveHrisPeopleAccessScope` services. It asserts the manager's exact ten-person reporting scope, own employee identity, rejection of access to the owner and rejection at the exclusive end boundary. It records the payroll administrator's actual tenant-wide HRIS authority. Separately, it submits only that actor's existing `hris.people.read` capability to check a reduced-permission service projection of the five Operations reports, rejection before delegation start, and rejection of approval-decision authority. That projection does not change or claim to describe the full administrator session's scope.

Verification during authoring: current schema, services, seed persona mappings and repository workflow were inspected; `npm run agent:workflow:check` passed. Syntax/type checking is recorded in the implementation handoff. No database execution, mocked-unit run, rendered browser check or authoring UI test was performed by the fixture author. The parent runner must record any actual database execution and replay results separately.
