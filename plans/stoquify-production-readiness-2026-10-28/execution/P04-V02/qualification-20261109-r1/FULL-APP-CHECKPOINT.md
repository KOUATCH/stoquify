# Full-app qualification checkpoint

9 November 2026: isolated execution and cleanup are complete. P04-V02 remains blocked by confirmed findings. See `FULL-APP-OUTCOME.md`, `FULL-APP-EVIDENCE.json` and the independent outcome reviews. This final checkpoint supersedes the preparation-only notes below.

- Final candidate/artifact integrity and all 107 exercised critical current/frozen bindings passed. Qualification applies only to frozen candidate `p04-v02-full-6577e9e63dc7`; current whole-checkout qualification remains false. The original source-equality failure and four unrelated concurrent accounting changes remain preserved.
- Actual suites completed: baseline 21/22 raw passes (one independently corrected harness audit-count expectation), auth v4 93/116, provider 23/23, supplement 19/35, bounded follow-up 8/11. Failures are retained and independently classified, not normalized into a passing aggregate.
- All three local full-app databases now have zero sessions, with exact business/audit digest preservation. The owned PostgreSQL cluster stopped; port 55509 and runtime/proxy ports were released. Artifacts, databases and evidence remain retained.
- No product fixes, production flags/data changes, commits, pushes or deployment occurred. The 121 migration replay occurred only in the explicitly isolated local build database.

## Historical preparation checkpoint

- Current candidate: `p04-v02-full-6577e9e63dc7`; 9,480 captured checkout source files and 9,482 isolated candidate files. The two additions and one explicit synthetic alias-policy override are recorded in the manifests.
- Preparation and candidate admission passed. Installed dependencies copied physically: 152,806 files, 2.792 GiB, zero failures. This is not clean-install proof.
- Independent review reconciled 94 critical current source/dependency inputs.
- Fresh database preparation passed all 121 migration checksums. The empty build database and full-app clone are task-owned under `D:/p04-v02-fullapp-20261109-r1/postgres`, loopback port 55509. PostgreSQL PID 34440 is recorded in the private owner receipt. Do not stop it while the owned build/runtime is using it.
- Private Prisma generation passed exact canonical schema verification. Full-application lint passed with zero errors and 28 warnings. Next.js 15.5.27 compilation, type checking, static generation and artifact sealing passed. Artifact digest: `9f6fa8cf7b5a6d87476d2c1bac3833b479ab2745f4ae5d12f50322b0f59d06d0`; 5,311 runtime files. Independent artifact outcome review passed.
- At preparation, the reviewed runtime selected the versioned 116-group auth suite, 22-group browser/image baseline and 23 provider protocol cases. Eight initial synthetic actors, three tenants and three items were seeded with zero sessions. Actual execution and versioned follow-ups are now recorded in the final outcome. The 36 passing pure helper checks do not qualify application behavior.
- Runtime recipe admission and cleanup recipe review are recorded under `independent-review/`. Do not run retained outputs or reset existing targets. After a successful build, execute the reviewed seed, browser source admission and runtime once; then remove owned synthetic sessions, stop the exact owned cluster, and verify source/artifact integrity.

Parent P04 and production remain blocked. No product source, production state, deployment, commit or push has been changed.
