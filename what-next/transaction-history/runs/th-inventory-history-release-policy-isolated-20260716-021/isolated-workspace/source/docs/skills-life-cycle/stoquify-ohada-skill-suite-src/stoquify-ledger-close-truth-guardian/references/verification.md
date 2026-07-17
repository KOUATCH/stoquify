# Verification

## Focused Commands

Run the smallest relevant focused tests for touched accounting paths.

```powershell
npm run typecheck
```

## Recommended Test Areas

- `services/accounting/__tests__/`
- `services/reconciliation/__tests__/`
- `services/events/__tests__/`
- `services/controls/__tests__/`

Use `npm run policy:gates` when source links, close assurance, or shared release gates change.
