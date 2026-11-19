# First actual attempt: fixture correction

The isolated attempt bed5458361 passed its first six cases and failed the bank self-approval expectation: the owner deliberately returns SOD_VIOLATION, while the case expected BUSINESS_RULE_VIOLATION. Parent approved correcting that exact expectation. No product guard changes.

The following negative-write case is now guarded by an actual retained pack and CLOSED/controlVersion1 period prerequisite before any write is attempted. Missing prerequisites fail the case; they are never skipped. This prevents an upstream failed seal from turning a supposed negative test into a new draft write.

Preserved case preimage SHA-256: 1b50484aa17b6dcb590e822160c20fc56ef4d75b4aec8bf245ae8aa00e59a4f5 (mixed-month.before-bank-sod.txt). Original failed attempt receipt SHA-256: 22f58dab40268dbcac39fd8941dc10eab5f5c8e8d9c319f621bb8578052df3cf (pg-attempt-bed5458361/pg-RESULT.json). The failed database and receipts remain untouched.

Only source/syntax preparation is performed here; no tests, application or database operations were executed by this correction.
