# WP8 decision — cross-domain ratification

Decision date: `2026-08-22`  
Decision: `PROGRAM_COMPLETE_INTERNAL_ENGINEERING_RATIFIED`  
Production authorization: `NO`

## Decision basis

The live numbered sequence was replayed against current source after the Payroll Trust Spine repair. The stale 2026-08-20 sequencing blockers no longer describe the repository:

- Skill 012: `APPROVED_FOR_013_INTERNAL_ENGINEERING_ONLY`.
- Skill 013: `APPROVED_FOR_014_INTERNAL_ENGINEERING_ONLY`.
- Skill 014: `APPROVED_FOR_015_INTERNAL_ENGINEERING_ONLY`.

No HIGH or CRITICAL invariant failed, no product code was changed in WP8, and historical reports were superseded by new dated ratification reports rather than overwritten.

## Live verification

- Purchasing/AP: `11/11`, including `goods_receipt_atomic_stock_posting`.
- Payroll presence: `14/14`.
- Payroll Trust Spine: `6/6`.
- Payments/declarations development: `9/9`.
- Payroll accounting-close development: `10/10`.
- Country-pack development: `11/11`.
- Report trust/export: `35/35`.
- Skill 013 focused tests: `375/375` across 7 suites.
- Offline POS replay: `16/16`.
- Skill 014 focused tests: `36/36` across 4 suites.
- Inventory boundary: zero active violations across 47 scanned call sites.
- Active skill 014 Prisma, placeholder/mock, and unsafe-error scans: zero findings.
- Prisma validation and TypeScript: passed.
- WP7 PostgreSQL evidence remains current: 76 migrations, exactly one concurrent approval winner, one SQLSTATE `40001` loser, duplicate rejection, and zero partial rollback evidence.

## Honest release boundary

The completed roadmap is internally engineering-ratified, not production-authorized. The following external or inherited blockers remain outside this repair program:

- qualified statutory source-artifact expert approval;
- production credentials, provider/authority, device-key, and representative environment evidence;
- managed production-database and controlled migration evidence;
- inherited destructive-migration exact-hash approvals;
- broad inherited dirty-tree provenance and inherited raw-error findings;
- final release, observability, DR, accessibility/browser, and operational signoff;
- a Windows lock on an unrelated generated report path that prevents an honest monolithic `policy:gates` claim.

## Promotion

Work Packages 0–8 are complete. The Payroll Trust Spine program has no remaining internal sequencing blocker. Skill 015 may start as a separate internal-engineering program, but this decision does not authorize live payroll, live POS fiscalization, real-money payment, statutory filing, or production release.

