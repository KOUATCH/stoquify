# Signed Authentication Attestation Template

Packet: `STOQUIFY-POS-PROD-GATE-<DATE>-<RUN_ID>`

## Scope

- Organization: `Stoquify`
- Release class: `Production / Statutory`
- Environment: `localhost` (or intended environment)
- Scope boundaries:
  - Host: `<host>`
  - Port: `<port>`
  - Database: `<database>`
  - Target schema: `<schema>`
  - Restore schema: `<restore_schema>`
- Approved operation type:
  - Migration replay: `YES / NO`
  - Evidence generation: `YES / NO`
  - Browser smoke: `YES / NO`
  - Hardware-in-loop: `YES / NO`

## Operator block

- Operator name: `<NAME>`
- Operator role: `<ROLE>`
- Approval/assignment timestamp (UTC): `YYYY-MM-DDTHH:MM:SSZ`
- Identity proof: `<sso / certificate / hardware token / etc>`
- Fresh authentication challenge used for this execution:
  - Method: `<MFA / smart card / password + MFA / etc>`
  - Challenge timestamp: `YYYY-MM-DDTHH:MM:SSZ`
  - Provider request ID: `<id>`
- Source evidence (no secret leakage): `<path>`
- Decision: `AUTHORIZED / DENIED`
- Signature: `<signature / certificate>`
- Signature timestamp: `YYYY-MM-DDTHH:MM:SSZ`

## Checker block

- Checker name: `<NAME>`
- Checker role: `<ROLE>`
- Checker review timestamp (UTC): `YYYY-MM-DDTHH:MM:SSZ`
- Independent authentication check completed: `YES / NO`
- Checked artifacts:
  - `<artifact / logs / command output>`
  - `<artifact / logs / command output>`
- Decision: `APPROVE / REJECT / CONDITIONAL_APPROVE`
- Signature: `<signature / certificate>`
- Signature timestamp: `YYYY-MM-DDTHH:MM:SSZ`

## Session integrity controls

- Login source IP / CIDR: `<ip-or-range>`
- Session tokens or credentials stored in command output: `NOT_PRESENT`
- Command audit trail path: `<path to command logs>`
- Time-window monotonicity check:
  - Started: `YYYY-MM-DDTHH:MM:SSZ`
  - Finished: `YYYY-MM-DDTHH:MM:SSZ`
  - Duration: `<duration>`
- Cross-device mismatch detected: `YES / NO`

## Required evidence file list

- Attested command sequence log: `<path>`
- Migration execution log: `<path>`
- Browser auth bootstrap screenshot/log: `<path>`
- Approval packet hash snapshot: `<path>`

## Declaration

- This attestation is complete only for the run scope above.
- Missing or stale controls are listed in unresolved items below.

## Unresolved items

- `item_1`: `<unresolved control>`
- `item_2`: `<unresolved control>`
- `item_3`: `<unresolved control>`

## JSON payload (insert-ready)

```json
{
  "schemaVersion": "1.0.0",
  "evidenceId": "POS-PROD-AUTH-ATTESTATION-<DATE>-<ID>",
  "gate": "G3A",
  "evidenceClass": "QUALIFIED_REVIEW",
  "candidate": {
    "commit": "0000000000000000000000000000000000000000",
    "tree": "0000000000000000000000000000000000000000",
    "dirty": false
  },
  "execution": {
    "command": "Authentication and authorization attestation collection",
    "environment": "localhost / <database> / <schema>",
    "startedAt": "2026-08-17T08:00:00Z",
    "finishedAt": "2026-08-17T08:00:00Z",
    "configurationVersions": {
      "auth_provider": "<provider>",
      "rbac_version": "<version>"
    }
  },
  "result": {
    "status": "BLOCKED",
    "exitCode": null,
    "summary": "Signed operator/checker authentication attestation pending.",
    "artifactPaths": [
      "<path to this completed template>"
    ]
  },
  "privacy": {
    "redactionChecked": true,
    "containsSecrets": false,
    "containsPaymentCredentials": false,
    "containsUnnecessaryPii": false
  },
  "limitations": [
    "Populate unresolved authentication controls if any remain."
  ],
  "review": {
    "status": "PENDING"
  }
}
```

