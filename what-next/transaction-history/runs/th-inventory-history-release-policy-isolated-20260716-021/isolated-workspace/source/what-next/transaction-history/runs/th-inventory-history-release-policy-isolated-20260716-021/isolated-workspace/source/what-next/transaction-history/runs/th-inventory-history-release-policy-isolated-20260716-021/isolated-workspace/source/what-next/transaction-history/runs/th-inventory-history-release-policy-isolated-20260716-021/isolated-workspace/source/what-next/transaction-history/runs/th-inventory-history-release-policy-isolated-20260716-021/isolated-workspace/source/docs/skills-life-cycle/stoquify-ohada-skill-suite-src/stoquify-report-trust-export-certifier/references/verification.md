# Verification

## Recommended Test Areas

- report component tests
- export service tests
- accounting report tests
- payroll/compliance export tests

## Gates

```powershell
npm run typecheck
npm run policy:gates
```

Add snapshot or focused assertions for provenance, redaction, currency, period state, and row counts when report behavior changes.
