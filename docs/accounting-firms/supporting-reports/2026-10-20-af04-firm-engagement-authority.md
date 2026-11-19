# AF04 firm engagement authorization: verified services

**Updated:** 20 October 2026. **Status:** VERIFIED within AF04 scope.

AF04 reuses AF03 records and the existing named client mandates, permissions, sessions, module controls, evidence writers and event/outbox publication. Protected commands now create engagements, assign staff, explicitly enroll mandates, activate/suspend/end engagements, remove assignments and hand over to different staff. Version checks and idempotency receipts make retries safe.

Managed access requires the full current-authority intersection. Portfolio/work-desk reads recheck access; delegated evidence and export transactions serialize with revocation and suspension. Sticky managed scope keys and a partial unique index prevent older writers from bypassing enrollment through a duplicate legacy key.

## Evidence

- 538 focused tests passed across 16 suites.
- 27 real PostgreSQL cases passed on each clean and populated AF03-upgrade database, including races, replay, rollback and actual synthetic exports.
- 101 migrations applied on the clean database; 100→101 populated upgrade and both replays passed.
- Focused TypeScript, schema validation and workflow-contract checks passed.
- Actual retained acceptance replay is exercised against SQL; new finding replacement remains covered by existing mocked domain tests.

Canonical [result](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF04/RESULT.md>), [authority contract](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF04/AUTHORITY_AND_LOCK_ORDER.md>) and [roadmap status](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/STATUS.md>) contain the detailed evidence and operating limits.

## Next: AF05

Execute the existing AF05 engagement-workflows prompt. Build the firm setup, staff assignment and handover interface on these protected commands and retained metadata reads. Preserve existing consent and independent-review boundaries.

No production migration, deployment or real enrollment was performed. The owned test cluster was stopped; synthetic databases were retained. Production rollout needs duplicate-scope preflight, current managed readers/writers and the separate schema-promotion gate. AF16 release and pilot qualification remain open.
