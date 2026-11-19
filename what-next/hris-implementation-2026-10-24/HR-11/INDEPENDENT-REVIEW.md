# HR-11 independent review

Reviewer `/root/hr09_independent_review` performed read-only source/test-definition review. All four findings are closed in the final reviewed source; no remaining concrete blocker identified. Verification execution belongs to the primary agent, not the reviewer.

| Finding | Fix | Evidence |
|---|---|---|
| R1 P2: event storage trimmed keys while receipt/replay lookup did not | Both command and recovery keys trim before lookup, child-event keys and storage | PostgreSQL whitespace-key exact retry/recovery |
| R2 P2: historical receipt disabled an unrelated current preview; incomplete row reconciliation | Separate recovered receipt state; batch/receipt references and source-row→employee links/status | EN/FR browser previews B, recovers A, commits B, then reloads and recovers B |
| R3 P2: preview hid mapped date/country/department/job title | Preview displays all six supported mapped fields before commit | Browser checks interpreted values; table screenshots |
| R4 P2: File.text silently replaced invalid UTF-8 bytes | Fatal UTF-8 decoding from arrayBuffer before replacing source | Browser uploads invalid-byte fixture, sees format error and retains prior source |

Other reviewed invariants: one existing employee master/owner; live tenant/manager/pilot checks; creator-scoped preview/receipt; server-issued digest/version; all-or-nothing transaction; organization profile lock; exact replay versus changed payload; no raw CSV retained; safe error CSV escaping; no production activation or qualified approval claim.
