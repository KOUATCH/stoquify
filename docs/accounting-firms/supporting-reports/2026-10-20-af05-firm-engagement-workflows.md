# AF05 firm engagement workflows: verified

Updated 20 October 2026. Canonical [result and verification](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF05/RESULT.md>).

The existing Accountant Access route now supports firm setup, assignment, explicit enrollment, activation, suspension, handover and retained history using AF04. Client consent remains individual and separate. Named client grants/revocation reuse existing actions, and invitation delivery is shown separately from acceptance. Authorized handover summaries reuse the evidence work desk without transferring consent or changing original attribution.

Verification passed within this phase: 102 focused mocked/component tests, 541 regression tests (overlapping lanes), scoped TypeScript, five real PostgreSQL workflow tests, authenticated EN/FR desktop/mobile checks and six browser recovery checks. Four scoped axe scans reported zero violations. Browser harness failures and their subsequent recovery evidence remain archived; this is not a claim of a single uninterrupted passing run.

All database/browser mutations used the isolated synthetic local fixture. No production schema promotion, deployment, real enrollment or email delivery occurred. The matching Prisma client was generated in isolation because the shared client was stale.

The next justified step is [AF06: delegated evidence desk](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/prompts/AF06-delegated-evidence-desk.md>). It remains NOT_STARTED. Preserve existing domain writers, recipient ownership, independent review and current authorization; do not infer work authority from assignment.

Before production activation, deploy the AF03/AF04 schema and restrictive services through the approved release path and generate the matching client. AF16 still owns release and pilot qualification. Bounded staff/client selectors, production performance and whole-app accessibility remain outside this verification claim. Hiding AF05 mutation entry points during rollback must retain managed-access restrictions and authorized history.
