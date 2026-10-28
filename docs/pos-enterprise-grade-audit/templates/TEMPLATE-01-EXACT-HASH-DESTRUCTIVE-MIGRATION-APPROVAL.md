# Exact-Hash Destructive Migration Approval Template

Packet: `STOQUIFY-POS-PROD-GATE-<DATE>-<RUN_ID>`

Scope:
- Release intent: `PRODUCTION`
- Environment: `localhost / <port> / <database> / <schema>`
- Migration chain reviewed: `<migration_file_list>`
- Blocker addressed: `destructive_sql_is_exact_hash_approved`

Objective:
- Authorize each destructive migration only when exact migration artifacts are hash-locked and maker/checker approved.

## 1) Destructive SQL inventory

Fill one row per statement.

| Migration file | Object | Statement summary | Why destructive is required | Risk level | Reversal/compensation |
|---|---|---|---|---|---|
| `20260611130000_accounting_auth_baseline_bridge/migration.sql` | `DROP TABLE` | `<canonicalized sql>` | `<why required>` | `HIGH/MEDIUM/LOW` | `<how controlled>` |
| `...` | `...` | `...` | `...` | `...` | `...` |

## 2) Exact artifact lock

- Manifest path: `<path>`
- Manifest hash (sha256): `0000000000000000000000000000000000000000000000000000000000000000`
- Migration file hashes:
  - `20260611130000_accounting_auth_baseline_bridge/migration.sql` => `<sha256>`
  - `...` => `<sha256>`
- Replay command hash (sha256): `<sha256>`
- Commit hash: `0000000000000000000000000000000000000000`
- Tree hash: `0000000000000000000000000000000000000000`
- Evidence path list:
  - `<path 1>`
  - `<path 2>`

## 3) Replay evidence (required)

1. Restore rehearsal schema used: `<restore_schema>`
2. Restore rehearsal status: `PASS / FAIL`
3. Restore rehearsal evidence file: `<path>`
4. Target replay status (post rehearsal): `PASS / FAIL`
5. Target replay evidence file: `<path>`
6. Historical migration replay status (if applicable): `PASS / FAIL`
7. Historical migration replay evidence file: `<path>`

## 4) Governance and approval

### Maker declaration

- Name: `<NAME>`
- Role: `<ROLE>`
- Identity and fresh-auth proof: `<method + timestamp + source>`
- Declared approval timestamp (UTC): `YYYY-MM-DDTHH:MM:SSZ`
- Decision: `APPROVE_DESTRUCTIVE_MIGRATION_REPLAY`
- Conditions: `<list of conditions>`
- Signature: `<signature / certificate>`
- Signed at: `YYYY-MM-DDTHH:MM:SSZ`

### Checker declaration

- Name: `<NAME>`
- Role: `<ROLE>`
- Identity and fresh-auth proof: `<method + timestamp + source>`
- Checker decision timestamp (UTC): `YYYY-MM-DDTHH:MM:SSZ`
- Decision: `VERIFY_EXACT_HASH_AND_APPROVE`
- Conditions: `<list of conditions>`
- Signature: `<signature / certificate>`
- Signed at: `YYYY-MM-DDTHH:MM:SSZ`

## 5) Unresolved conditions and close requirements

- Required remediation before production gate can continue:
  - `<unresolved conditions or "NONE">`
- If condition remains open, status:
  - `CONDITIONALLY_APPROVED` / `APPROVED` / `REJECTED`

## 6) JSON payload (insert-ready)

```json
{
  "schemaVersion": "1.0.0",
  "evidenceId": "POS-PROD-EXACT-HASH-APPROVAL-<DATE>-<ID>",
  "gate": "G3B",
  "evidenceClass": "QUALIFIED_REVIEW",
  "candidate": {
    "commit": "0000000000000000000000000000000000000000",
    "tree": "0000000000000000000000000000000000000000",
    "dirty": false
  },
  "execution": {
    "command": "exact-hash approval for destructive migration set",
    "environment": "localhost / <database>",
    "startedAt": "2026-08-17T08:00:00Z",
    "finishedAt": "2026-08-17T08:00:00Z",
    "sourceHashes": {
      "migration_manifest": "0000000000000000000000000000000000000000000000000000000000000000",
      "replay_script": "0000000000000000000000000000000000000000000000000000000000000000"
    }
  },
  "result": {
    "status": "BLOCKED",
    "exitCode": null,
    "summary": "Exact-hash approval required for destructive SQL and replay safety controls before production.",
    "artifactPaths": [
      "<path to this completed template>"
    ],
    "findingIds": [
      "destructive_sql_is_exact_hash_approved"
    ]
  },
  "privacy": {
    "redactionChecked": true,
    "containsSecrets": false,
    "containsPaymentCredentials": false,
    "containsUnnecessaryPii": false
  },
  "limitations": [
    "Populate with any residual environment or data assumptions."
  ],
  "review": {
    "status": "PENDING"
  }
}
```

