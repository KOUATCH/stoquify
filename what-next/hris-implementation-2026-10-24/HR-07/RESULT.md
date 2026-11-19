# HR-07 — Payroll admission assurance

Status: VERIFIED for the inventoried engineering boundaries. This is not national payroll approval. Baseline 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886 plus inherited edits. The production guard required no implementation change. Owned changes are focused negative tests in authority-adapter-execution, authority-adapter-worker and declaration-lifecycle test files, plus the isolated PostgreSQL suite.

| Boundary | Current proof / recovery |
|---|---|
| emitPayrollPayslips | Existing guard before payslip/event writes. Real database rejects unsupported run, rolls back authorization audit, retains status/version; exact committed replay works twice without new effects and changed payload conflicts. |
| postPayrollRun | Real-guard mocked denial before ledger/event writes; retained transition recovery precedes new-effect admission. |
| approveAndPostPayrollRun legacy entry | Real-guard denial when legacy write switch permits entry. |
| requestPayrollPaymentBatch / releasePayrollPaymentBatch | Real-guard mocked denials before batch/disbursement effects. Exact retained recovery remains in existing paths. |
| preparePayrollDeclarations | Real-guard mocked denial before declaration writes. |
| recordPayrollDeclarationEvidence submit/amend | Negative tests now delegate to the real admission function, rather than simply throwing a mocked gate error; no evidence/event write. Later settlement/rejection/acceptance evidence remains recovery. |
| enqueuePayrollAuthorityAdapterExecution | Negative case uses real admission; no queue metadata/event write. Exact matching existing execution is retained; changed evidence conflicts. |
| processPayrollAuthorityAdapterWorkerBatch | Real guard immediately before submission. Mocked and real-DB cases prove zero fake-adapter calls; failed outcome is safely classified. Real-DB lease/process-result collaborators are explicitly fake, not a live authority transport. |
| Employee archives, matched settlement/reversal bridge and inbox recovery | Existing historical evidence paths retained. Matched provider bridge consumes released/matched proof via the existing provider-fixture adapter contract; it is not proof of a live bank integration. No current-pack gate was added that could strand historical settlement/reversal recovery. |

Actions derive tenant/actor permissions through existing protect/RBAC and call these domain services. Current source search places all payroll payslip/payment-batch/declaration creates in payroll-control.service.ts. The separate compliance outbox belongs to another domain and is not certified here. No adapter, rate, country pack, approval hash or production release flag was promoted.

| Acceptance | Result |
|---|---|
| AC01 PASS | All listed new-effect paths have real-guard negative tests before their effects. Source inventory above; unit.json. |
| AC02 PASS | Unsupported/missing/unreviewed/stale families, scenario evidence, certified-input mismatch and forged requested metadata fail; published header alone insufficient. |
| AC03 PASS | Real PostgreSQL retained emission replay and changed-payload conflict; mocked queue/lifecycle retained recovery. |
| AC04 PASS | Real emission transaction denial rolls back authorization audit; real worker denies before fake adapter; no actual provider invoked. |
| AC05 PASS | CM monthly/single-employer technical release envelope unchanged; other countries/frequencies fail. All accepted fixture evidence is explicitly synthetic. |

Mocked: 73 tests in four suites passed. payroll-production-admission.test.ts runs the real guard with synthetic regulatory resolutions. Queue/worker/lifecycle negative cases now call the real guard; their other tests continue to isolate it and are not counted as regulatory admission proof. PostgreSQL: three cases passed with 51 earlier cases deliberately deselected and bounded cleanup. No live providers, full migration replay, statutory sign-off or production performance assessment.

Review: preserved current effect boundaries and replay identity; transaction/audit atomicity exercised; safe worker error categories omit raw provider payloads. No new infrastructure or employee master. Frontend/AI/inventory are not applicable. Rollback: keep new effects blocked under existing admission while retaining historical recovery; never loosen the gate to compensate for missing evidence. Next: HR-08 integrated source-bound gate, including an independent reviewer still to be supplied.
