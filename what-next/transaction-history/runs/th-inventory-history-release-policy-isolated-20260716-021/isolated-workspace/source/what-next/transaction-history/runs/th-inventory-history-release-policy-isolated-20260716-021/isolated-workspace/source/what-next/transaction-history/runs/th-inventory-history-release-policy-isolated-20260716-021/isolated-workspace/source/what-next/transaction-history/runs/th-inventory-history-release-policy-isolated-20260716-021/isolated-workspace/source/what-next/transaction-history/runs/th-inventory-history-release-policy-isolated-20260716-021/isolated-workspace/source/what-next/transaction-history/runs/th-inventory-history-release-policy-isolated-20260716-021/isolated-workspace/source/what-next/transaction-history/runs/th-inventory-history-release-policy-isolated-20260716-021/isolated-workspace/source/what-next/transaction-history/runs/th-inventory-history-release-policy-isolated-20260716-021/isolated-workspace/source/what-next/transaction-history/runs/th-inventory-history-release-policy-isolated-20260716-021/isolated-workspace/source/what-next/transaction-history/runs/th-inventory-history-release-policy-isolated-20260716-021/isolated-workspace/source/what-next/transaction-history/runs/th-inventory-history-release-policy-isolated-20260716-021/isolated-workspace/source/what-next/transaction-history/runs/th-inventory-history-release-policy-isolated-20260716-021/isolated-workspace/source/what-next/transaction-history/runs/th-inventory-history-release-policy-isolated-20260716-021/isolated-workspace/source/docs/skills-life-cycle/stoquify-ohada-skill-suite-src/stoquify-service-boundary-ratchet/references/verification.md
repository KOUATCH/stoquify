# Verification

Choose the smallest honest command set.

## Focused Gates

```powershell
npm run service:boundary:fail
npm run api:guard:inventory:fail
npm run module:surface:inventory
```

## Broader Gates

```powershell
npm run policy:gates
npm run typecheck
```

Run broad gates only when the change touches shared wrappers, API guard scripts, module catalogs, or release readiness.
