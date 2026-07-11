# AqStoqFlow Settings Identity Module Inventory Classification Packet Report

Date: 2026-07-11
Workspace: `E:\ohada saas\Focused projects\stoquify`
Mode: surgical implementation packet under the Enterprise Agent Upgrade roadmap.
Skill: `aqstoqflow-module-surface-inventory-gate`

## Packet Scope

This packet advances Phase 3 module entitlement report-mode cleanup. It does not enable hard module enforcement and does not change runtime RBAC behavior.

Selected slice: distinguish public identity and internal helper actions from operational settings/users enforcement candidates in the report-mode module surface inventory.

## Evidence Reviewed

- Active sprint brief: `C:\Users\J COMPUTER\.codex\attachments\d4300d6a-93c0-47d2-88d3-143976652de1\pasted-text-1.txt`, especially Phase 3 module entitlement guidance to triage `what-next/module-surface-inventory.md` in report mode first.
- Skill guidance: `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-surface-inventory-gate\SKILL.md`, especially report-mode, no hard enforcement, and evidence saved under `what-next/`.
- Current inventory before this slice flagged these high-confidence false positives as `unmapped, missing permission, enforcement candidate`:
  - `actions/roles/role-utils.ts`
  - `actions/users/createInvitedUser.ts`
  - `actions/users/createUser.ts`
  - `actions/users/sendResetLink.ts`
  - `actions/users/verifyOtp.ts`
- Source evidence:
  - `actions/roles/role-utils.ts` only formats/display-normalizes role and user names.
  - `actions/users/createInvitedUser.ts` delegates to `acceptInvitationWorkflow`, a token-bound invitation acceptance workflow.
  - `actions/users/createUser.ts` delegates to `createOrganizationOwner`, a public organization onboarding workflow.
  - `actions/users/sendResetLink.ts` delegates to `requestPasswordResetLinkWorkflow`, which returns a generic response and logs a password-reset security event.
  - `actions/users/verifyOtp.ts` delegates to `verifyEmailOtpWorkflow`, which validates the OTP and logs email verification.

## Implementation Summary

Changed the report-mode inventory classifier so exact public identity/helper action surfaces are marked as not applicable to tenant module entitlement enforcement instead of counted as active missing-permission/unmapped findings.

The classifier now recognizes:

- `actions/roles/role-utils.ts` as `not applicable: internal display helper`.
- `actions/users/createInvitedUser.ts` as `not applicable: token-bound invitation acceptance`.
- `actions/users/createUser.ts` as `not applicable: public organization onboarding`.
- `actions/users/sendResetLink.ts` as `not applicable: public password reset request`.
- `actions/users/verifyOtp.ts` as `not applicable: public email verification`.

This preserves the real operational settings/user surfaces as mapped enforcement candidates and avoids breaking public onboarding, invite acceptance, reset, and verification flows with inappropriate tenant module/RBAC requirements.

## Changed Files

Core code/test changes:

- `scripts/module-surface-inventory.js`
- `scripts/__tests__/module-surface-inventory.test.js`

Regenerated evidence artifacts:

- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `what-next/api-route-guard-inventory.md`
- `what-next/api-route-guard-inventory.json`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

Report artifact:

- `what-next/AQSTOQFLOW_SETTINGS_IDENTITY_MODULE_INVENTORY_CLASSIFICATION_PACKET_REPORT_2026-07-11.md`

## Inventory Result

Command:

```powershell
npm run module:surface:inventory
```

Result: passed. The refreshed module inventory now reports:

- Catalog modules: 20
- Surfaces inventoried: 306
- `missing permission`: 16
- `unmapped`: 36
- `not applicable: internal display helper`: 1
- `not applicable: public email verification`: 1
- `not applicable: public organization onboarding`: 1
- `not applicable: public password reset request`: 1
- `not applicable: token-bound invitation acceptance`: 1

Exact refreshed rows:

- `roles/role-utils.ts` -> `not applicable: internal display helper`
- `users/createInvitedUser.ts` -> `not applicable: token-bound invitation acceptance`
- `users/createUser.ts` -> `not applicable: public organization onboarding`
- `users/sendResetLink.ts` -> `not applicable: public password reset request`
- `users/verifyOtp.ts` -> `not applicable: public email verification`

## Focused Verification

Command:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath scripts\__tests__\module-surface-inventory.test.js
```

Result: passed.

- Test suites: 1 passed, 1 total
- Tests: 4 passed, 4 total

Focused coverage added:

- Builds a temporary repo with the five targeted public/helper action files.
- Asserts each file receives the intended `moduleApplicability` and classification.
- Asserts none of those records contain `missing permission`, `enforcement candidate`, or `unmapped`.

## Release Gate Results

All required gates passed.

```powershell
npm run prisma:validate
```

- Passed. Prisma schema is valid.

```powershell
npm run typecheck
```

- Passed.

```powershell
npm run lint
```

- Passed with 4 pre-existing warnings:
  - Three `@next/next/no-img-element` warnings.
  - One `import/no-anonymous-default-export` warning in `config/permissions.ts`.

```powershell
npm run policy:gates
```

- Passed.
- Inventory boundary: 0 active violations.
- Service boundary: 0 active violations.
- API guard inventory: no active issues.
- Workflow assurance runtime check: ready, 0 blockers.
- Workflow assurance release gate: ready, 37/37 checks, 0 blockers.
- Kontava moat release gate: ready, 0 blockers.
- Receipt token config gate: ready, 1 warning that production receipt token secret is not configured.
- Payroll immutability runtime: ready, 9/9 triggers, 14/14 forbidden mutation checks blocked, 0 blockers.
- Hard-delete gate: 0 active unsafe findings.
- Regulatory hardcode gate: pass, 0 active findings.
- Demo trust gate: 0 active production-visible findings.
- Raw error boundary gate: 0 active unsafe findings.

```powershell
npm test -- --runInBand
```

- Passed.
- Test suites: 294 passed, 294 total.
- Tests: 1532 passed, 1532 total.

```powershell
npm run build:app
```

- Passed.
- Safe build wrapper status: passed.
- Build warnings were the same unrelated lint warnings noted above.

```powershell
npm run verify:repo
```

- Passed.
- Included Prisma validate, typecheck, lint, policy gates, build, and full Jest.
- Final Jest inside `verify:repo`: 297 suites passed, 1546 tests passed.

## Controls Preserved Or Strengthened

- Tenant isolation: no runtime tenant-scope behavior changed; public identity flows remain token/data-driven where designed.
- RBAC: operational settings/users actions remain report-visible as mapped enforcement candidates; no public identity flow was incorrectly converted into RBAC-only behavior.
- Module entitlement: report-mode inventory signal improved by moving five non-entitlement surfaces out of the active enforcement candidate bucket.
- Auditability: identity service workflows already log security events for reset and email verification; this packet did not remove or weaken logging.
- Redaction and safe errors: no public payload shape or safe action error handling changed.
- Release gates: focused test, module inventory, policy gates, build, full test suite, and full repo verification are green.

## Residual Risks

- Module entitlement remains report/observe mode; hard enforcement was intentionally not enabled.
- The module surface inventory still reports `16` missing-permission and `36` unmapped classifications outside this packet.
- Remaining notable active findings include legacy inventory/item helper clusters, analytics actions, proof-trail actions, module service records, payroll setup/country-pack-review permissions, and the dashboard root missing a specific permission label.
- Public receipt token config gate still warns that the production receipt token secret is not configured in this environment.
- Lint/build still show 4 unrelated warnings.
- The worktree remains broadly dirty with pre-existing enterprise-upgrade changes and generated artifacts outside this packet.

## Next Safe Implementation Task

Run a focused module-surface cleanup packet for one real operational cluster still visible in `what-next/module-surface-inventory.md`. Recommended next slice:

`actions/modules/module-control.actions.ts` and `services/modules/module-control-contracts.ts`.

Why this slice:

- It is directly tied to module entitlement governance.
- `actions/modules/module-control.actions.ts` already has `MANAGE_SYSTEM_SETTINGS` and `protect`, but remains `unmapped` in the inventory.
- The service contract file remains visible as `unmapped, enforcement candidate`, and should either be classified as a non-runtime contract or mapped to the module-control/settings ownership model.

Required focused verification for the next slice:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath scripts\__tests__\module-surface-inventory.test.js scripts\__tests__\module-surface-enforcement-first-pass.test.js
npm run module:surface:inventory
npm run policy:gates
npm run verify:repo
```
