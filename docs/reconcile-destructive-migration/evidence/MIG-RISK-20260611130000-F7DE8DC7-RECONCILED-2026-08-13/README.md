# Destructive migration evidence workbench

This directory is a controlled workbench for packet `MIG-RISK-20260611130000-F7DE8DC7-RECONCILED-2026-08-13`.

Every file currently marked `TEMPLATE_NOT_EVIDENCE`, `PARTIAL`, `EXTERNAL_HUMAN_ACTION_REQUIRED`, or `NOT_APPLICABLE_PENDING_CHECKER` is incomplete and cannot authorize a migration, a resolve operation, or an approval-registry entry.

Rules:

- Never place database URLs, passwords, tokens, OAuth secrets, session values, account tokens, raw IP addresses, or personal data here.
- Store raw sensitive evidence in an approved evidence vault. Record only its immutable identifier, SHA-256, custodian, time, and redaction status here.
- Use UTC ISO-8601 timestamps and lowercase SHA-256 hashes.
- Do not change `prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql`.
- Run database-mutating rehearsals only on an explicitly attested disposable database.
- A real maker and a different authorized checker must complete A-01 and A-02.
- A-03 is conditional and must not be copied into `prisma/migration-risk-approvals.json` without an A-02 `APPROVE_EXACT_HASH` decision.

Run the local validator from the repository root:

```powershell
node scripts/prisma-destructive-migration-evidence-gate.js --mode report
```
