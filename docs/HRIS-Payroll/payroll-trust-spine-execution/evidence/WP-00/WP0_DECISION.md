# WP0 baseline control and ownership decision

Decision: `APPROVED_FOR_WP1`  
Decision time: `2026-08-21T20:10:36Z`  
Starting HEAD: `35b4cc6a06a50ee11de5bfce6b04993e38bd589a`  
Baseline mode: `EXPLICIT_OWNERSHIP_SNAPSHOT`

## Evidence accepted

- In-scope inherited files have path and SHA-256 ownership records in `execution-register.json`.
- Prisma validation passed.
- TypeScript typecheck passed.
- Lint passed with three inherited warnings and zero errors.
- Service-boundary ratchet passed at 0 active findings against a baseline of 0.
- Hard-delete and demo-trust scanners have zero active findings.
- Report trust is live-ready at 35/35.
- The report-trust gate's complete suite passed 320/320; its focused delegated-crypto mutation set passed 9/9.
- Offline POS replay is live-ready at 16/16.
- Focused payroll-presence Jest passed 4/4 in 3.277 seconds using `jest.payroll-trust-spine.config.cjs`.
- Focused POS passed 205 tests with 10 existing PostgreSQL-guarded skips.
- Compliance/regulatory passed 81/81.

## Non-blocking inherited warnings

- The raw-error scanner reports seven medium findings in purchasing/accounting code. They are outside the payroll roadmap and were not changed or hidden.
- The broad dirty tree prevents clean-candidate and production claims.

## Promotion boundary

WP1 may produce and review contracts only. WP2 implementation remains unauthorized until lifecycle, SoD, event, migration, rollback, and transition-manifest contracts are unambiguous and approved by the WP1 evidence gate.

