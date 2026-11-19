# P04-V02 isolated full-app outcome

Execution and cleanup are complete; the candidate does not meet the P04-V02 acceptance gate. Independent outcome reviews confirm remaining authority and browser recovery defects. No product repair was implemented.

## Exact qualification scope

Candidate `p04-v02-full-6577e9e63dc7` was captured from 9,480 checkout source files, producing 9,482 candidate files with the separately admitted synthetic private-alias fixture. Its sealed artifact is `9f6fa8cf7b5a6d87476d2c1bac3833b479ab2745f4ae5d12f50322b0f59d06d0` and contains 5,311 runtime files. It is a qualification artifact with an explicit synthetic policy fixture, not a deployable production-policy artifact.

The full build passed lint (zero errors, 28 warnings), compilation, type checking, static generation and sealing. The private Prisma client matched the canonical schema. All 121 migration checksums were replayed and verified only in the task-owned local build database. Installed dependencies were physically copied; this does not establish clean-install reproducibility.

During the long build, unrelated accounting source changed. The original whole-checkout admission failed and remains preserved. Independent function-level reconciliation admitted the sealed artifact only. Final integrity verifies the frozen candidate, artifact and the union of 107 critical current/frozen source/dependency inputs. The whole current checkout and entire inventory import closure are not claimed byte-identical or qualified.

## Actual results

| Evidence lane | Raw result | Interpretation |
|---|---:|---|
| Private-media/browser baseline | 21 passed, 1 failed / 22 groups | One expected-six/actual-four module-audit harness mistake. Independent review confirmed six safe denials, no business/session changes, and the four correct audits. Raw failure retained. |
| Auth v4 | 93 passed, 23 failed / 116 groups | Real signed-session, API, database and browser evidence; confirmed defects, harness observations and incomplete focus coverage are classified separately. |
| Local provider protocol | 23 passed / 23 groups | Current authorized/denied actors, malformed/tampered/signed callbacks, method and module controls; exact database effects verified. Hosted provider configuration is not qualified. |
| Password and visible Refresh supplement | 19 passed, 16 failed / 35 groups | Password controls passed. Refresh exposed separate server module-boundary and client recovery findings. Eight recovery failures were a harness asynchronous-close race. |
| Bounded recovery/corroboration follow-up | 8 passed, 3 failed / 11 groups | Eight authorized recovery positives passed. Three failed Refresh envelopes corroborated retained private DOM/success feedback; the expected named denial-code marker was absent, so that narrower gate remains failed. |

These group counts include overlapping follow-ups and must not be summed into a coverage percentage. Pure helper checks, source inspection, builds, real database tests and browser execution remain distinct evidence classes.

## Findings supported by review

- Still-valid signed cookie caches allowed core auth reads after database revocation/expiry and an inactive actor check to expose private auth data. Current-app guards and forced fresh-session controls have separate results.
- Normal account unlink requests using revoked/expired cached sessions changed synthetic account records. Native snapshots prove the observed unauthorized account changes; query-override and other mutation results are recorded separately.
- Actual failed Refresh responses left previously loaded private item data visible and produced success feedback. Follow-up captures failure envelopes, but not the expected named denial codes. This is not a claim of newly delivered private bytes in those failed-response cases.
- With the inventory module suspended, the item Refresh server action delivered private item bytes. This is a separate server module-boundary finding, not merely retained client data.

Exact cases, hashes and bounded dispositions are in `independent-review/AUTH-V4-OUTCOME-REVIEW.json`, `SUPPLEMENT03-OUTCOME-REVIEW.json`, `FOLLOWUP04-OUTCOME-REVIEW.json` and `inventory/findings-classification-final.json`.

## Preserved failures and limits

The original checkout-equality failure, baseline audit-count failure, auth-v3 evidence-writer failure, historical-response-body inspection failures and supplemental recovery race remain preserved. Successor recipes and independent admissions are versioned; no original result was rewritten to pass.

Headless tab-focus visibility and actual native private-document BFCache-hit recovery remain explicit limits. History navigation alone does not establish a BFCache restoration. Provider evidence uses local synthetic protocol fixtures; it is not hosted OAuth/provider approval. This scope does not certify every Stoquify route or domain.

## Isolation and cleanup

Build/runtime/database storage remained under `D:/p04-v02-fullapp-20261109-r1`. The fresh build database plus full-app `r1`, `r2` and `r3` databases belong to the recorded cluster at loopback port 55509. R2/r3 were cloned from the verified empty 246-business-table build template; earlier databases and evidence were retained. Runtime/application and browser network controls admitted only the reviewed local targets.

The first and second finalizers removed 15 and two remaining synthetic sessions respectively; the third found zero after suite cleanup. `database/all-session-cleanup-verified.json` reconfirms zero across all three and exact business/audit/session digests against each finalizer. `database/cleanup-r3.json` proves the exact owned PostgreSQL PID 34440 stopped, no unrelated clients were present, and port 55509 was released. All four runtime receipts record released application/proxy ports and no cleanup errors. Files and snapshots remain retained.

Final source/artifact proof: `final-integrity-frozen-supplement03.json`. Machine-readable evidence index: `FULL-APP-EVIDENCE.json`. No product fixes, production changes, commits, pushes or deployment occurred.
