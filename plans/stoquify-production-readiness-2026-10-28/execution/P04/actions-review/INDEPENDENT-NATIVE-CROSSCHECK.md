# Independent native authority cross-check

Reviewer: actions-review agent, which did not author or execute the native test. Checked 2026-10-29. Only this report was added for this cross-check.

**Conclusion: P04-F01 is confirmed at the native service-composition boundary.** The failed assertion is the intended authorization invariant, not fixture setup or a mocked role/member service result. Production qualification remains failed.

Reviewed [native test](../guard-review/shared-guards.postgres.test.ts), [execution receipt](../native-authority-result.json), [Jest result](../native-authority-jest.json) and [repair packages](../repair-and-qualification-packages.json). All nine source fingerprints captured in the native receipt still match current files. Jest reports 23 passed / 1 failed; the sole failure is at test line 202, expecting `LOCATIONS` and receiving `TENANT` with `locationIds:null`. The receipt explicitly distinguishes harness completion from `securityQualificationPassed:false`.

## Why the finding follows from real service behavior

The fixture stores a verified actor with `dashboard.read`, `roles.create`, `roles.permissions.assign`, `users.read` and `users.roles.assign`, a nonprivileged `branch_manager` role, and a current password-assured session. Actor and recipient each initially resolve to their own managed location. These baseline assertions pass.

The test calls real `createOrganizationRole`, which rereads tenant authority and stored session under transaction locks. It creates an actual `Admin` role with only `dashboard.read`; the assertion `role.code === "admin"` passes. Both `canGrantMemberRole` and the real member-access preview admit assignment. Real `changeMemberAccess` uses the reviewed revision and stored fresh session, then persists the role membership. Fresh RBAC loading reads the recipient's actual database roles. The recipient still has only `dashboard.read` and `isSuperUser:false`; both assertions pass before the final scope check.

The real operating-scope resolver grants tenant scope from the persisted `admin` code. Better Auth transport does not manufacture that code or the role assignment. The result demonstrates same-tenant operating/location scope expansion. It does not demonstrate cross-tenant access or actual downstream private-data extraction.

## Evidence limits and no-write claims

`next/headers` and Better Auth `getSession` are stubs. The recipient transport stub models a new login after assignment; it supplies no actual newly minted signed cookie/session. This is not proof that a revoked cookie remains usable, and it does not qualify deployed action HTTP routing or Better Auth cache behavior. The real actor session is validated by the write services.

Twenty-one denial cases use the shared denial helper: handler never called, response has `data:null`, private response canary absent, and unchanged digests/counts for the selected organizations/users/roles/sessions/locations/module configuration, grant and command rows. Security audit rows are deliberately excluded. The two other passing cases check foreign-role filtering and managed-location filtering. Consequently, **23 passes do not mean 23 zero-write checks**, and the digest does not cover every application table. The escalation characterization intentionally creates a role and assignment before failing; it is not a denied-write example.

## P04-R01 acceptance review

The proposed contract correctly covers explicit scope authority, legitimate administrator behavior, current authority, independent review, existing-role inventory and rollback without restoring the vulnerability. Before implementation, make these cases explicit in its bounded test matrix:

- All recognized codes (`admin`, `administrator`, `super_admin`) and normalization variants; preserve legitimate trusted owner/admin provisioning.
- Both new and preexisting custom reserved-code roles; assignment, invitation and access-request application; reviewed updates and concurrent authority changes.
- An empty-permission reserved-code role combined with `dashboard.read` from another role. Current permission-array policies make this a source-supported variant; this run did **not** execute it.
- Positive allowed controls and denied recipient scope/private-output assertions after a real new signed session, separately from stale/revoked-cookie checks. Include allowed audit effects explicitly when asserting no unauthorized writes.

No change to the test, application, repair register or main work register was made by this review.
