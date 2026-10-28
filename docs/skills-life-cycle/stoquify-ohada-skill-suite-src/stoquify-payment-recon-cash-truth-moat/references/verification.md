# Verification

## Recommended Test Areas

- `services/payments/__tests__/`
- `services/reconciliation/__tests__/`
- `services/accounting/__tests__/`
- `services/controls/__tests__/`

## Gates

```powershell
npm run typecheck
npm run policy:gates
```

Run broad gates only after shared reconciliation, close, or accounting behavior changes.
