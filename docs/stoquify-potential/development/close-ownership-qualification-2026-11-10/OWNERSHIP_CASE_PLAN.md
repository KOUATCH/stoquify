# Close ownership and relation qualification cases

Prepared for root review. No test, database, application or browser has been executed by the case author. The parent runner owns a new absent database and freezes this source plus its import closure before execution.

The case requires exact localhost:58033, public schema and `stoquify_replay_close_monthly_20261110_<10hex>` identity. It writes a new private ownership evidence file in the same owned context as the monthly fixture. Thirteen cases combine with the previous eight monthly cases for twenty-one tests, with no skipped/todo contract.

1. Eligible local/default owners; no recipient session or assignment permission.
2. Valid legacy named PREPARER/REVIEWER owners, including a historical period outside the current mandate's dates.
3. Managed PREPARER/REVIEWER owners after actual CREATE/ASSIGN/ENROLL/TRANSITION engagement commands. Initial consent remains synthetic configuration.
4. Missing/foreign/inactive/unverified/locked/no-contribution-role/foreign-role owners denied.
5. Read-only/expired/future/revoked/wrong-scope/wrong-named/managed-without-link grants denied.
6. Suspended/ended/read-only managed assignment and lost module/home authority denied.
7. Finding/run/evidence/review individual comments and valid aligned multi-target comments remain supported.
8. Foreign/missing/mismatched secondary targets and a conflicting explicit run are denied.
9. Stored finding/run/period/checklist/evidence graph corruption is rejected by services.
10. Owned-period review creation succeeds; a corrupt run with foreign period cannot create another review.
11. An actual public assignment waits behind a recipient-role write, observed through the exact writer PID and `pg_blocking_pids`; committed revocation then wins. No timer selects the winner.
12. An actual public assignment holds eligible recipient authority, then waits at its finding UPDATE behind an observed exact backend PID holding `FOR UPDATE` without mutation. The SQL barrier must be observed before the 15-second grant expiry. A bounded clock wait then passes actual expiry, releases the unchanged finding row and proves final publication-time denial with complete rollback. The clock wait does not choose race ordering, and no new finding version forces a serialization retry.
13. An owned audit trigger increments a nontransactional sequence before failing, proving the actual boundary was reached once. Assignment/audit/workflow rows roll back, and the trigger/function/sequence are removed in `finally`.

Every negative compares exact, ordered domain/audit/business-event/outbox/journal/posting-batch projections before and after. Detailed snapshots stay in process memory; evidence contains fixed safe labels/counts/booleans only. Positive findings remain ordinary assignments; no READY, T4, SIGNED or CERTIFIED state is fabricated. No original-provider, statutory, hosted-delivery or browser qualification is claimed. Structural SQL composite constraints remain outside this service-level test.

The prior explicit-future-helper-only case source is retained byte-for-byte as `before-public-expiry.txt`, SHA-256 `aa90474ff7daaf8210cc2085f48d5771b6639ff025753a954aec623515d76887`. The parent approved upgrading this source before any database execution.
