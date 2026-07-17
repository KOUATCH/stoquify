# Verification

## Recommended Test Areas

- `services/pos/__tests__/`
- `lib/pos/__tests__/`
- POS receipt token and smoke tests

## Gates

```powershell
npm run typecheck
npm run receipt:token:config-gate
```

Use focused POS replay tests whenever offline event behavior changes.
