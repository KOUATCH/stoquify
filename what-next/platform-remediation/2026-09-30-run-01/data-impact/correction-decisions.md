# R09 — Local historical-data candidates and correction decisions

The aggregate scan completed at **2026-09-30T20:50:46.507Z** against the configured loopback PostgreSQL database. The connection and transaction were read-only, isolation was REPEATABLE READ, statements were limited to 15 seconds, locks to 2 seconds, each check had a savepoint, and the session ended with confirmed ROLLBACK. No record identifiers or credentials were emitted. `aggregate-impact.json` contains SQL, denominators and the schema/migration hashes.

## Findings requiring disposition

| Population | Candidate result | Interpretation |
| --- | --- | --- |
| 364 lines in 137 posted/reversed journals | 120 lines lack both base amounts; 24 journals cannot be tested for stored-base balance | Historical base-value completeness needs review. Missing values are not zero. Source, denomination and rate classification is required before selecting any remedy. |
| 244 lines with both base amounts | 0 stored-rate conversion mismatches | Only this complete-base population was arithmetically tested, using stored rate and two-decimal rounding. The scan does not validate the historical external exchange rate. |
| 113 complete-base journals; 137 nominal currency groups | 0 unbalanced groups in either tested population | The 24 journals with incomplete base values remain outside the base-balance denominator. |
| 137 posted/reversed journals with an assigned period | 22 entry dates outside assigned period bounds | Cause is unclassified: fixtures, business history, time boundary handling or incorrect assignment must be distinguished. This does not authorize editing posted dates or periods. |
| 24 accounting periods | 0 outside their fiscal year | This does not disprove the previously reproduced partial-month implementation defect. |
| 2 explicit posted/reversed reversal links | 0 manual reversals | The manual reversal denominator is zero. Absence of a local damaged example does not invalidate the generic-reversal defect or justify reopening that path. |
| 87 repository migrations; 87 completed distinct applied migrations | 0 missing, unexpected, checksum-mismatched or unfinished migrations | Name/checksum consistency at this snapshot is established. This is not a full live schema, privilege, index/default/type or production-drift certification. |

## Decision options — no automatic repair

Classification was subsequently run read-only against the verified retained restore. All **120 missing-base lines** belong to `POS_SALE` / `XAF` with a present, positive unit rate and denomination matching current settings; they affect **24 of 30 POS_SALE journals**. All **22 out-of-period journals** also belong to `POS_SALE` / `XAF`: **14 before period start, 8 after period end**, and **0 solely later on the same period-end calendar date**. The 8 foreign-currency lines are in 4 journals with unclassified source and complete base values, with no stored-rate conversion candidates. See `restore/candidate-classification.json` for the full denominators and snapshot timezone. This narrows investigation to POS provenance; it does not establish fixture status or historical accounting authority.

1. **Missing base values with supported historical currency/rate provenance:** Determine whether a read-only derived projection is sufficient. If the recorded denomination equals the proven historical base currency and the recorded rate is one, nominal amounts may supply a reviewed presentation value under the agreed report contract. Do not infer historical currency solely from today's settings; do not write those derived values back to posted rows automatically.
2. **Missing FX values or ambiguous historical settings:** Keep the affected certified output blocked. Recover original source/posting evidence and the effective exchange-rate/currency policy; prepare a restricted, auditable correction manifest for qualified review. Unknown facts must remain unknown rather than being replaced with today's rates or zero.
3. **Dates outside assigned periods:** A qualified accounting reviewer must distinguish an incorrect date, incorrect period, fixture issue and a timestamp/end-date convention. Choose a source-owned correction or approved reopen/reclose procedure appropriate to that case. Preserve original evidence; do not silently move posted history into another period.
4. **Source-owned correction:** Any repair affecting stock, payments, receivables, payables or payroll must compensate the source and ledger together using the owning workflow. Generic manual reversals are not a substitute for those effects.
5. **Fixture-only candidates:** Establish fixture provenance on the isolated copy before deciding that an anomaly has no business impact. Retain the baseline and diagnostics. A clean test fixture does not prove the original deployment is clean.

The follow-on marker classification establishes that every local missing-base candidate and every local period mismatch carries all four stable seed markers. The original seed function reproduces the exact aggregate pattern, and its future producer has now been corrected and checked without executing the seed. See `seed-producer-disposition.md`. No historical data was changed; production prevalence remains unknown.

The next artifact requiring review is a restricted per-case disposition manifest with accountable owner, provenance, proposed correction, expected source/ledger effects, replay/idempotency behavior, rollback, verification and audit links. **It has not been generated or applied** because this run intentionally emits aggregates only and has not established reviewer decisions. Fixture regeneration on a separate disposable copy is a distinct option from repairing business history.

The retained restore copy is the appropriate place for experiments. Its restore evidence proves structural/data-profile preservation, not the correctness of the copied historical business data. The R09 acceptance gate remains open until candidate provenance and approved disposition are established.
