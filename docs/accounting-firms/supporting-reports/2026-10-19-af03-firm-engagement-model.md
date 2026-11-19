# AF03 firm engagement model: verified foundation

19 October 2026. AF03 is VERIFIED within its additive schema and domain-contract scope.

Implemented firm/client engagements, versioned staff assignments, permanent links to existing named-accountant mandates, and immutable ordered transition history. Organization/User/tenant roles and existing consent services are reused; no new auth system, user relocation, legal-firm verification, backfill or client visibility was introduced.

Verification: 31 real PostgreSQL tests on each of clean and populated-upgrade databases; 100-migration clean apply/replay and 99→100 upgrade/replay; 268 existing service/component regressions; schema validation and focused portfolio types passed. No AF03 Prisma/SQL drift; existing unrelated repository drift remains. No UI change/browser rerun or production promotion.

Canonical [result](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF03/RESULT.md>) and [PDF](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF03/RESULT.pdf>).

Next: execute AF04 separately. AF03's temporary database fence allows links only to revoked mandates and prevents linked reactivation. AF04 must implement and verify managed mandate/engagement/assignment intersections before replacing that fence; AF05 supplies enrollment workflows afterward. Keep links/history on rollback. No live enrollment or deployment was performed.
