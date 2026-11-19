# Close finding ownership and linked-resource scope

Development verdict: **GO_WITH_GATES** for the bounded service changes below. Production remains blocked. This follows the November 9 CA-06 audit and November 10 mixed-payment qualification; earlier evidence stays unchanged.

Current-source inspection confirms two gaps: generic assignment does not resolve assignee eligibility, and the comment writer resolves only the first supplied target while persisting secondary IDs. The existing UI supplies finding and run together, so valid aligned multiple references must remain supported. No foreign-data disclosure or certification bypass is claimed.

Acceptance:

1. A finding owner has a usable account and current home-role membership granting Close read/comment. The owner needs no online session, fresh password, assignment or approval permission.
2. A delegated owner additionally has current client consent with a named PREPARER/REVIEWER grant, active organizations/modules and valid managed engagement/assignment where applicable. Read-only, expired, revoked, ambiguous or mismatched authority denies. There is no period-specific grant field; current consent may cover work on historical client periods.
3. Assignee home lookup is only a hint. Client/candidate organizations lock in sorted order before existing assigner authority. Exact user/role/membership/module/grant facts lock through commit; current validity is checked again before publication and return. Existing Serializable retries and client-local assigner controls remain.
4. Every supplied comment target resolves to one organization/run/period. Findings, their optional checklist, evidence parents and review parents must be coherent. An explicit conflicting run is rejected. Valid aligned multi-reference comments succeed.
5. Finding mutation and review creation reject corrupt parent scope before any mutation, audit or workflow event. These are service-level protections; independent SQL foreign keys and direct-SQL reparenting remain a separate structural review requiring legacy-data evidence.
6. Focused mocked regressions and 13 real PostgreSQL ownership/scope cases pass. The previous eight-case earned mixed-payment monthly close passes again against current source in the same new isolated database.

Verification boundaries: no shared client generation, application startup, live delivery, production access, deployment or schema change. New database attempts use absent names; existing targets are not reset/dropped. Raw service results, fixture tokens and retained pack bytes stay private. Public summaries allow only phase/status/counts and reviewed metrics.

The real revocation case must prove the observed persisted-role revocation-first ordering. The expiry case must observe the public assignment waiting on its finding row while the grant expires, then prove complete rollback after release. PostgreSQL blocker identity establishes ordering; bounded wall-clock polling waits for actual expiry. These cases do not prove every interleaving. Mocked tests, PostgreSQL, static compilation and historical browser evidence remain separate classes.
