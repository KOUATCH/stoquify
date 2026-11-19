# Parent-scope fixture correction

The first fresh123 attempt `pg-attempt-c662f9dcbd` passed nineteen of twenty cases. Only `parent-scope-drift-rejected` failed, at the third statement moving an OPEN period to a foreign organization/fiscal year. The owned database cluster stopped and all attempt evidence remains unchanged.

The original fixture creates periodNumber1 in both fiscal years. Moving the first period into the second `(organizationId,fiscalYearId)` cohort while retaining periodNumber1 therefore also violates the existing unique `(organizationId,fiscalYearId,periodNumber)` key. The expected scope errors were 23503/23514. Jest's incompatible pretty-format formatter obscured the received SQLSTATE and serialized `failureDetails` as an empty object. The unique-key collision explanation is a source-derived inference, not an observed 23505 value from that failed receipt.

The parent approved two bounded testcase changes before a new absent-database run:

- Set `periodNumber=99` in that coherent move, removing the unrelated unique-key collision. The expected denial remains strictly 23503/23514 and the complete fixture/source snapshot must still remain unchanged.
- Make unexpected SQLSTATE failures report their explicit code, constraint and message instead of depending on the failing pretty-format matcher. Unexpected success or any unapproved SQLSTATE still fails qualification.

The original case bytes are preserved in `scope-integrity.before-period-number.txt`, SHA-256 `35886dc394f1beae609c028edf7c0295ea9228fa5640e9470fe8ec45abfe4474`. No product, schema, migration SQL, runner, database or old qualification receipt was changed by this correction. No test or database operation was executed by the case author.
