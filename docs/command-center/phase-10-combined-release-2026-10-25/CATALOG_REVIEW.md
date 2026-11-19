# Combined catalog review — 25 October 2026

The latest source has 120 migrations, while the prior manifest named 118. The two unmanifested additions were reviewed before manifest reconciliation:

| Migration | Behavior | Verification and limits |
| --- | --- | --- |
| `20261025180000_firm_practice_records` | Adds retained versioned PLAN/EFFORT/FEE records; tenant-bound engagement, period and actor relationships; unique version/idempotency indexes; immutable revision trigger | Successfully replayed in a fresh database. No backfill or financial posting. Existing records are not updated by this migration. |
| `20261025180100_firm_practice_integrity` | Makes required JSON kind, reviewer and effort-subject values explicit so SQL UNKNOWN cannot admit invalid nullable union fields | Adds checks to the preceding table. A populated target containing invalid practice rows would require separate remediation; this rehearsal does not invent legacy data or waive validation. |

Every previous manifest entry, raw SQL byte and timestamp exception was preserved. No migration was renamed, no SQL edited, no exception broadened and no production-risk approval authored. The fresh 120-migration ledger and populated 118-to-120 upgrade both matched exact SQL hashes.

The two additions sort before the already-present HRIS handoff migrations. The upgrade runner therefore selects the exact prior 118 identities by name, rather than assuming that the prior catalog is the first 118 entries of the new sorted catalog.

Schema comparison remains ready with 240 intentional naming/default/retained-evidence differences and zero unexpected structural statements. No generated diff was applied. Manifest admission is not production deployment authorization; target-specific policy and historical migration risk controls remain in force.
