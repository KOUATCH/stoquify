# Verification

## Recommended Test Areas

- `services/compliance/__tests__/`
- `services/payroll/__tests__/`
- declaration lifecycle tests
- country-pack readiness tests

## Gates

```powershell
npm run typecheck
npm run policy:gates
```

Run focused statutory tests for any adapter, country-pack, payroll, or declaration change.
