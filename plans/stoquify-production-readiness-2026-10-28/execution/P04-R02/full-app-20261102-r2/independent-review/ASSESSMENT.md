# Independent full-app qualification outcome — r2

2 November 2026. **BLOCKED — artifact admission failed; P04-R02 must not advance.**

Candidate: `p04-r02-full-eb25ee4e218c`, with 9,068 captured source files including the synthetic public-control image, and six upload annex assets. This reviewer inspected recipes, current source contracts and execution receipts. The reviewer did not execute the application, database, build or browser.

## Verified distinctions

| Evidence class | Reviewed outcome |
| --- | --- |
| Preparation/source admission | Passed for the fresh E: candidate and physical private dependency copy. This is not clean-install proof. |
| Real disposable database readiness | Catalog and 120-migration checks passed for the exact template/build/full databases; the 245-table retained synthetic baseline matched and sessions were zero. This is not fresh migration replay or actual session qualification. |
| Persisted references | Three declared synthetic item references in `imageUrls` and `thumbnail` matched their expected legacy URLs and candidate asset hashes in a read-only transaction. Original-tenant database references remain unqualified. |
| Private Prisma client | Generated successfully; exact output of the hash-pinned installed Prisma `merge_schemas` transform matched generated schema bytes while the original frozen schema hash remained unchanged. |
| Normal application build | Retry03 completed Next compilation, configured type validation, static generation and the safe build wrapper with exit 0. Lint reported zero errors and 26 warnings. |
| Artifact packaging/admission | Failed after the successful build: `Legacy upload bytes outside private mapping`. Failure occurred before artifact directory/manifest creation. |
| Runtime, real sessions and rendered consumers | Not run because the required artifact was not admitted. No denied-byte or authorized-read gate is inferred from the successful compiler. |

Local secret preflight remained conditional with live delivery disabled and release enforcement off. It supplies local qualification setup only, not production provider approval. Hosted ingress/CDN/operator admission remains separate.

## Blocking asset classification

The raw pre-seal inventory contains 15 hash matches. Twelve are the six source and six traced `public/uploads` copies that the existing packer recognizes and excludes before private mapping. They are not twelve additional publication defects. The three unfiltered public aliases are:

| Public input | Byte-identical upload |
| --- | --- |
| `public/images/cabin-1.jpg` | `public/uploads/cmp_org_005/a032d164-c607-4d66-9050-367cf45f0008.jpg` |
| `public/images/cabin-2.jpg` | `public/uploads/cmp_org_005/f2f43248-c73b-4104-a865-e0f02c2b0ace.jpg` |
| `public/images/profile.jpg` | `public/uploads/cmp_org_005/56492210-f588-4db0-a970-f245e574ab06.jpg` |

The recorded repository history places these unchanged public files in commit `2b4441ce8e2b1f05fdd915eb211e46dee708ce02` on 9 June 2026. The scoped literal-reference search found no current matches, but computed references and original-tenant database URLs were not qualified. Neither public-path history nor absence of literal references establishes approved public classification or permission to remove them.

The confirmed finding is byte duplication between files treated as private upload candidates and public packaging inputs. This is not a new rendered/HTTP disclosure reproduction or proof that these long-tracked public files are confidential. No artifact was created and the originals were not served or rendered by this qualification.

Stopping dependent qualification at this classification gate is appropriate. Preserve the bytes, reference inventory and fail-closed hash guard. Obtain the owner decision: private copies must be preserved and excluded from public publication; approved public assets need explicit provenance and a narrowly reviewed classification policy. Do not infer either choice from filenames, age, or a passing build. Then rebind the affected candidate and repeat artifact, real-session and browser admission.

## Retained failures and recovery

Earlier failures remain separate receipts: database startup timeout with successful bounded cleanup; Windows preload-path parsing before Prisma; raw-schema equality corrected to the generator's exact canonical transform; competing-build refusal after lint; and the read-only reference query corrected from nonexistent `imageUrl` to current `imageUrls`/`thumbnail`. These qualification-runner corrections did not change application source, schema or production controls. Other active build processes were preserved.

The outside-checkout runtime recipe and final-integrity/guarded database-cleanup recipes were reviewed, but no runtime was launched. Final preservation and cleanup receipts have now been reconciled. Package advancement remains blocked.

Evidence: `../preparation.json`, `../candidate-admission.json`, `../database/resume-20261102-r2-retry01-readiness.json`, `../database/reference-inventory.json`, `../retry03-private-client.json`, `../retry03-artifact-build.log`, `../build-retry03-result.json`, `../packing-failure-inventory.json`, and `../packing-failure-classification.json`. Recipe review is recorded in `RECIPE-REVIEW.md`.

No commit, deployment, production flag change or production data migration is authorized by this assessment.

## Final preservation, cleanup and register review

Final integrity passed for all 9,068 frozen source files and six asset annex entries, all 11 repaired inputs and 17 reviewed consumer/source inputs, and three original/recovery-mirror pairs. HEAD is unchanged. Concurrent root work added 37 unrelated files and changed five, with no selected-input drift; those changes were preserved. Whole-worktree equality is not claimed. Artifact/runtime execution reconciliation remains false because no artifact was admitted or runtime launched.

The final 245-table synthetic business digest matches the admitted baseline, with zero sessions and audit rows. Guarded cleanup observed zero other clients in both inventories, stopped only owned PostgreSQL PID 9496 and verified port 53528 released. Databases and source/asset evidence remain retained. These are preservation and cleanup results, not denied-request behavior.

Independent comparison with before-register-publication.json confirms that all 53 unrelated packages, dependency definitions, 57 domains, 14 global decisions, 18 production gates and deferred commitments are unchanged. Only E20 was added to the evidence catalog; E01–E19 remain identical. The validated register retains 54 packages and 183 dependency edges. RESULT, current gates, CURRENT/NEXT and ROADMAP section 11 consistently keep P04-R02/P04 blocked at local decision R02-ASSET-01 and keep real-session/browser evidence unrun. No publication inconsistency found.

Additional reviewed receipts: ../final-integrity.json; ../database/final-fixture-integrity.json; ../database/resume-20261102-r2-retry01-guarded-stop-1793635954332.json; ../register-validation.json.
