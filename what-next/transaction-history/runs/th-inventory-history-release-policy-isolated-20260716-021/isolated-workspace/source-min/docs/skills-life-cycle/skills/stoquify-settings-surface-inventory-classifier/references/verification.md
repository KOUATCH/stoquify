# Verification

Run from the Stoquify repository root.

```powershell
node <skill-root>\scripts\classify-settings-surfaces.test.js
npm run module:surface:inventory
node <skill-root>\scripts\classify-settings-surfaces.js --repo . --inventory what-next\module-surface-inventory.json --json-out <json-output> --md-out <markdown-output>
npm run typecheck
```

Validate that:

- JSON and Markdown report identical totals.
- `actions/roles/role-utils.ts` and `actions/roles/role-auth.ts` are helpers.
- The four reviewed public/token identity action files are not generic missing-permission findings.
- `actions/users/updateUserPassword.ts` is mixed protected/token-bound.
- Every unresolved executable surface has at least one finding and recommended action.
- Module enforcement remains report-only.
