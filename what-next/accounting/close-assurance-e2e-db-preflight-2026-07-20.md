# Close Assurance E2E Database Preflight

Checked at: 2026-08-09T08:04:17.278Z
Verdict: OK_TO_RUN_LOCAL_E2E

## Command

```powershell
npm run test:e2e:close-assurance
```

## Gates

- PASS: environment:not-production - No production environment markers are set.
- PASS: database:local-or-explicitly-approved - Database host is local and has no production marker.
- PASS: direct-url:local-or-absent - DIRECT_URL is absent, so no second write target was detected.

## Database Target

- DATABASE_URL: postgresql://postgres:***@localhost:5432/<database>
- Host class: local
- DIRECT_URL: absent

## Recommendation

The live close-assurance e2e smoke may be run against this local/dev database target.
