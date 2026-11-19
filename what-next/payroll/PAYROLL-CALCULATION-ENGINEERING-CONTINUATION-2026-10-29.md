# Payroll calculation engineering continuation

Selected skill: aqstoqflow-payroll-kernel-hardener. Phase 0 scoped input, transaction and evidence hardening.

## Engineering continuation — Draft 3 / 29 October 2026

**Statutory approvals remain pending.** Four engineering selections are recorded below; completed substeps do not close ENG-02 through ENG-08. All D-01 through D-16 review statuses and all independent F-01 through F-22 outputs remain pending. The earlier 12 source-supported proposals are preserved.

| Selection | Implemented or selected | Exact remaining boundary |
|---|---|---|
| ED-01 / D-04, D-06, D-08 | Unknown is not zero. Supported YTD evaluation requires both explicit prior base and prior withheld amounts; each named adjustment requires an own, explicit, finite value. Current base and monetary rule values reject NaN/Infinity. Explicit zero remains valid. The fixture adapter preserves absent history instead of defaulting to zero. | Does not certify the supplied history as complete, select the legal tax year/method, supply certified mappings, or change rounding/refund/rate policy. |
| ED-02 / D-12 | For an owning Prisma client, calculation uses the existing payroll transition helper: SERIALIZABLE transaction, at most three attempts for P2034/P2002, re-query idempotency on every attempt, return 409 after exhaustion, do not retry domain errors, redact unexpected internal errors. No external side effect is added to the retry callback. | An injected TransactionClient inherits its caller transaction; caller owns isolation and retry. Same-day statutory membership, stale-history checks at approval/posting, real contention/rollback and uncertain-commit proof remain pending. This is not full ENG-04 completion. |
| ED-03 / D-11, D-13 | New accumulator proofs use version 2 and bind each ordered prior run/line identity, employee, currency, pay date, run status, document hashes, calculation-snapshot hash and recorded line amounts. observedHistoryHash binds that observed list and is included in the accumulator hash. Missing snapshots remain explicitly null. Existing frozen records are not migrated or rewritten. | A fingerprint proves which source data was observed, not legal inclusion or completeness. Legacy proof reads remain supported. Approval-time comparison/invalidation and migration acceptance are not implemented by this slice. |
| ED-04 / D-14, D-16 | Keep mocked/unit, source-integrity, PDF, real-database, statutory-review and release evidence separate. Synthetic zero values and test-only review labels never populate canonical reviewer records. Keep the September-only runner and October pending scope until admitted rules and supported inputs exist. | Independent statutory F-01 through F-22 expected outputs, real integrated acceptance and production admission remain pending. No missing attendance is inferred. |

**Verification:** 152 tests across five suites pass. Evidence is synthetic/unit and mocked service execution, including the real evaluator/service calls with mocked persistence, missing-input denial before run/event creation, conflict retries/replay, production-admission denial, fixture validation and register compatibility. Equal totals with changed prior status or snapshot produce a different observed-history hash; unchanged history produces the same hash. The original three-suite baseline passed 99 tests.

The broader run initially exposed synthetic fixtures relying on omitted zero inputs and an adapter defaulting missing YTD to zero. The adapter was corrected and synthetic scenarios now state their known zero amounts explicitly. No runtime country-pack rate, approval identity or signed fixture was filled by this change.

No real PostgreSQL, provider operation, full project typecheck or browser journey was executed. Mock retries do not establish database rollback or concurrent commit safety. PDF/source validation is separate evidence. See [retained engineering results](../../docs/unblock/PAYROLL-CALCULATION-ENGINEERING-RESULTS.json) and the [scoped task diff](../../docs/unblock/research/engineering-task.diff).

### Seven-task remaining work after this slice

| Task | Completed substep | Still required |
|---|---|---|
| ENG-02 | Explicit YTD/adjustment presence and finite-value checks in evaluator; fixture adapter preserves omissions | Approved algorithm and certified service input mappings; authoritative amounts still must be wired into the evaluator. Unsupported wiring now fails closed. |
| ENG-03 | Version-2 fingerprint binds observed historical source identities and snapshots | Approved tax-year/membership/opening-balance policy, period-gap/completeness checks and approval-time stale-history denial. |
| ENG-04 | Owning-client SERIALIZABLE transaction and existing three-attempt conflict/replay handling | Current production callers audited (both use owning client); future injected callers require an isolation/retry contract. Approved same-day/off-cycle policy; real PostgreSQL contenders, rollback, uncertain-commit and stale-history tests. |
| ENG-05 | Existing correction-only lifecycle preserved | Approved full/delta/reversal/negative/cross-year semantics; implementation and independent evidence. |
| ENG-06 | Invalid/non-finite money and absent required input denied | Approved adjusted bases, branch-specific social caps, tax/CAC storage, rounding and refund handling; no proposed statutory number installed. |
| ENG-07 | Five focused suites pass; proof change and register consumers checked | Independent statutory expectations, real integrated lifecycle and all eleven release families; no F-case marked independently approved. |
| ENG-08 | Release/runner/October boundaries retained | ENG-07 acceptance, admitted date-effective rules and supported D-15 scope before chronological full execution. |

### Engineering decision details and rollback

D-12 selects SERIALIZABLE for transactions owned by calculation and reuses the existing transition retry/error policy; supplied transaction clients remain the responsibility of their caller. This scope is explicit and is not a claim that every call path is proven serializable. No automatic external retry is introduced for an unknown commit outcome.

Current production caller audit: actions/payroll/payroll-control.actions.ts and prisma/disposable-business-workflows.ts both call calculatePayrollRun without an injected client, so both use the owning-client SERIALIZABLE/retry boundary. No additional production caller change is needed in this checkout. Future injected TransactionClient callers must establish isolation/retry explicitly; mocked callers are not database proof.

D-13 selects a versioned source fingerprint over the existing pay-date/run-ID/line-ID ordering. It does not select additional legal history members. Missing evidence remains missing, and existing version-1 snapshots are left untouched. A future approval gate must recompute and compare the selected history before accepting its evidence; a hash alone is not that gate.

Rollback only the hunks in the retained task diff and the added isolated Jest configuration. Preserve preexisting service edits and all frozen financial records. Future calculations using proof version 2 create new evidence; no database migration, historical backfill or production publication was performed. This does not authorize rewriting a retained snapshot during rollback.


Next slice: disposable PostgreSQL concurrency harness, then approved history/stale-evidence integration. Production callers were audited and use the default owning client. Statutory expert decisions remain prerequisites for formula changes.
