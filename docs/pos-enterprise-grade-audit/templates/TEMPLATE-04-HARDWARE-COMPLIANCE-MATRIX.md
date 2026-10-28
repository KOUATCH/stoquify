# Hardware Compliance Matrix Template

Packet: `STOQUIFY-POS-PROD-GATE-<DATE>-<RUN_ID>`
Test date/time (UTC): `YYYY-MM-DDTHH:MM:SSZ`

Environment:
- Browser: `<name and exact version>`
- OS: `<name/build>`
- Pilot location: `<name/id>`
- Pilot terminal: `<name/id>`
- Test mode: `REQUIRED FOR PRODUCTION HARDWARE CERTIFICATION`

Use this template to remove the “hardware testing unproven” blocker.

## Test scope

- Scope declared: `CERTIFICATION / RESTRICTED SIMULATION / EXCLUDED`
- Why scope: `<hardware-in-loop scope and reason>`
- Evidence root: `<path>`

## Matrix

| Device / Feature | Test objective | Evidence step | Result (PASS/FAIL/NA) | Evidence path | Operator | Checker | Notes |
|---|---|---|---|---|---|---|---|
| Receipt printer | Print with exact fiscal/reprint workflow | `1. Trigger sale draft\n2. Issue receipt print\n3. Confirm print artifact` | `<...>` | `<path>` | `<name>` | `<name>` | `<notes>` |
| Cash drawer | Drawer open policy and close ownership | `1. Perform open command\n2. Confirm event log` | `<...>` | `<path>` | `<name>` | `<name>` | `<notes>` |
| Barcode scanner | Product look-up and add-to-cart flow | `1. Scan SKU\n2. Verify line-item creation` | `<...>` | `<path>` | `<name>` | `<name>` | `<notes>` |
| Customer display | Sale summary and tender confirmation | `1. Complete sale\n2. Confirm display payload` | `<...>` | `<path>` | `<name>` | `<name>` | `<notes>` |
| Payment terminal / POS integrator | Error and timeout behavior | `1. Simulate approved/pending/cancel\n2. Confirm state mapping` | `<...>` | `<path>` | `<name>` | `<name>` | `<notes>` |
| Offline device | Sync replay ordering and idempotency | `1. Create offline events\n2. Replay\n3. Reconcile events` | `<...>` | `<path>` | `<name>` | `<name>` | `<notes>` |
| Browser automation proof | EN/FR proof with auth session continuity | `1. Login on Edge\n2. Run smoke route matrix` | `<...>` | `<path>` | `<name>` | `<name>` | `<notes>` |

## Required hardware evidence

- Browser matrix file(s):
  - EN locale report: `<path>`
  - FR locale report: `<path>`
- Device integration logs:
  - `<path>`
- Hardware failure drill logs:
  - `<path>`
- Rehearsal videos/snapshots (if available):
  - `<path>`

## Exclusions and risk controls

If a device cannot be tested, list explicit exclusion and rationale:

- Printer: `INCLUDED / EXCLUDED` — `<reason>`
- Cash drawer: `INCLUDED / EXCLUDED` — `<reason>`
- Scanner: `INCLUDED / EXCLUDED` — `<reason>`
- Terminal: `INCLUDED / EXCLUDED` — `<reason>`
- Customer display: `INCLUDED / EXCLUDED` — `<reason>`

## Governance lock

- Hardware test lead: `<NAME / ROLE>`
- Hardware approver: `<NAME / ROLE>`
- Checker: `<NAME / ROLE>`
- Approval decision: `PASS / BLOCKED / CONDITIONAL`
- Conditions for release: `<conditions>`
- Signatures:
  - Lead signature: `<signature>`
  - Checker signature: `<signature>`
  - Signed at (UTC): `YYYY-MM-DDTHH:MM:SSZ`

## JSON payload (insert-ready)

```json
{
  "schemaVersion": "1.0.0",
  "evidenceId": "POS-HW-COMPLIANCE-<DATE>-<ID>",
  "gate": "G3A",
  "evidenceClass": "REFERENCE_HARDWARE",
  "candidate": {
    "commit": "0000000000000000000000000000000000000000",
    "tree": "0000000000000000000000000000000000000000",
    "dirty": false
  },
  "execution": {
    "command": "Hardware compliance evidence sweep",
    "environment": "pilot hardware environment",
    "startedAt": "2026-08-17T08:00:00Z",
    "finishedAt": "2026-08-17T09:00:00Z"
  },
  "result": {
    "status": "BLOCKED",
    "exitCode": null,
    "summary": "Hardware matrix completed; final status must be set to PASS only after all required devices are covered.",
    "artifactPaths": [
      "<path to this completed template>"
    ],
    "findingIds": [
      "hardware_scope_not_proven"
    ]
  },
  "privacy": {
    "redactionChecked": true,
    "containsSecrets": false,
    "containsPaymentCredentials": false,
    "containsUnnecessaryPii": false
  },
  "limitations": [
    "If specific hardware is out of scope, list explicit exception and approver acknowledgement."
  ],
  "review": {
    "status": "PENDING"
  }
}
```

