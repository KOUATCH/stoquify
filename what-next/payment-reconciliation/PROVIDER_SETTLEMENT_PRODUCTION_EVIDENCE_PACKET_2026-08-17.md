# Provider settlement production evidence packet — 2026-08-17

Decision: **BLOCKED_EXTERNAL_CONFIGURATION**  
Credential access by this run: **none**  
Real payment/customer data used: **none**

## Evidence status

| Evidence family | Status | Required pass evidence |
|---|---|---|
| Internal durable model and control contract | `PASS` | Payment/cash truth gate 14/14 |
| Provider account readiness | `PASS_WITH_LIMITATIONS` | Local readiness contract exists; real account mapping/approval absent |
| Callback signature and replay | `PASS_WITH_LIMITATIONS` | Local HMAC tests exist; named provider sandbox conformance absent |
| Provider statements | `PASS_WITH_LIMITATIONS` | Import/dedupe controls exist; no provider-originated sample/receipt used |
| Internal payment-to-provider matching | `PASS_WITH_LIMITATIONS` | Matching rules exist; no real settlement population tested |
| Fees/net settlement/batch decomposition | `NOT_TESTED` | Provider-specific statement and accounting tie-out |
| Suspense and exception ledger | `PASS_WITH_LIMITATIONS` | Canonical local control exists; production ledger/account mapping unproved |
| Reconciliation sign-off/certificate | `PASS_WITH_LIMITATIONS` | Local source-bound certificate exists; production actor/evidence absent |
| Close invalidation | `PASS` | Local gate verifies late-source drift invalidation |
| Production migration/runtime immutability | `BLOCKED_TECHNICAL` | Historical destructive migration gate and deployed trigger proof |
| Scheduler, alerting and dead-letter operations | `BLOCKED_EXTERNAL_CONFIGURATION` | Three successful windows, acknowledged alerts and recovery drill |
| Backup/restore/DR | `NOT_TESTED` | Target-specific backup, restore and reconciliation exercise |
| Production provider certification | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Provider/treasury/security/controller artifact-bound approval |

## Credentialless evidence capture plan

Engineering may build a fully redacted provider conformance harness without real credentials. The provider or authorized operator later supplies only: managed-secret references, environment identity, request/response hashes, redacted state summaries, timestamps and signed/immutable approval references. The packet must never contain access tokens, client secrets, raw signing keys, PAN/CVV/PIN, unmasked account numbers, raw customer MSISDNs or unnecessary customer PII.

## Mandatory pilot scenarios

- signed accepted event;
- invalid signature and timestamp skew;
- exact replay and conflicting replay;
- pending/unknown that remains non-successful;
- declined/failed;
- confirmed then settled;
- reversal/refund/chargeback/dispute;
- amount and currency mismatch;
- provider fee and net settlement;
- one-to-many and many-to-one batch settlement;
- statement duplicate and corrected statement;
- missing callback / statement-only credit;
- callback-only transaction / missing statement line;
- failed-but-debited and succeeded-not-credited suspense;
- outage, rate limit, retry exhaustion, dead letter and recovery;
- late evidence invalidating a signed run and accounting close.

## Maker-checker release rule

The provider integration operator may execute the sandbox run but cannot sign the reconciliation certificate or approve the settlement ledger account. Treasury/controller signs the financial tie-out; security approves credential/signature controls; an independent release checker verifies candidate and evidence hashes. Production activation requires all approvals after the final evidence timestamp.

Final condition: **internal evidence capture ready; production provider settlement not certified.**
