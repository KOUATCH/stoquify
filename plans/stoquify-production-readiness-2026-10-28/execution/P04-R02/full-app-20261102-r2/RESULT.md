# P04-R02 full-app qualification — blocked at asset classification

2 November 2026. Candidate **p04-r02-full-eb25ee4e218c**. The E: storage blocker is resolved. The actual full Next.js build passed, but the normal release artifact command failed before sealing because three public assets match tenant-upload bytes. No artifact/runtime/browser pass is claimed.

## Evidence by class

| Evidence class | Actual outcome | Receipt |
|---|---|---|
| Source and isolated preparation | Passed: 9,068 frozen files, six asset annex entries, physical private dependency copy and exact Prisma 6.19.3 canonical-schema proof. Installed dependency reuse is not clean-install proof. | candidate-admission.json; retry03-private-client.json |
| Actual application build | Passed: Next 15.5.27 compile, types, static generation, tracing and optimization; safe build wrapper exit0. Lint: 0 errors / 26 warnings. Local secret preflight conditional 19/21 with 2 warnings for disabled live delivery; no production admission. | retry03-artifact-build.log |
| Artifact sealing | Failed: release:artifact exit1, `Legacy upload bytes outside private mapping`; planCopies rejected before artifact directory creation. | build-retry03-result.json |
| Native isolated PostgreSQL | Passed: retained synthetic fixture, schema/catalog and 120 migration checksums revalidated;245-table baseline digest unchanged, zero baseline sessions. Three exact synthetic item imageUrls/thumbnail references checked in READ ONLY transaction. No migration replay, original-tenant reference census or real-session evidence. | database/fixture-readiness.json; database/reference-inventory.json |
| Harness/source review | Reviewed full-app runtime/browser and integrity recipes. Prior 16 pure denial assertions qualify the harness only. | independent-review/RECIPE-REVIEW.md; browser/ |
| Real-session HTTP/browser | NOT RUN: artifact admission prevented runtime launch. Both delivery URLs, optimizer, EN/FR consumers, cache/revocation recovery and no-write request snapshots remain unqualified. | advancement-gates.json |
| Hosted/operator | NOT RUN; separate release requirement. | R02-G09 |

## Blocking classification

| Public path | Matching upload under public/uploads/cmp_org_005 | SHA-256 |
|---|---|---|
| public/images/cabin-1.jpg | a032d164-c607-4d66-9050-367cf45f0008.jpg | d1e189c5e05a7f1b135f6c84bf085d2e474fe2bd5ed975b2112fa826466d1225 |
| public/images/cabin-2.jpg | f2f43248-c73b-4104-a865-e0f02c2b0ace.jpg | 447974bd44d3bf2a74cec021b1e27a3f26cb5f2e7bedafa0502790eee69b7519 |
| public/images/profile.jpg | 56492210-f588-4db0-a970-f245e574ab06.jpg | 79b124faf6ee6312dd34ba999455e9d09ecb5c4d93ed63e494a414fd74f8a6d2 |

The raw preseal inventory contains 15 hash matches. Twelve are ordinary source/traced public/uploads copies already excluded by the packer. Only these three public/images aliases remain blocking. This is not 15 publication defects or an observed HTTP disclosure.

Independent source/history inspection traced all three unchanged public assets to commit 2b4441ce8e2b1f05fdd915eb211e46dee708ce02 (9 June 2026). Bounded searches found no literal consumer references or explicit approved-public classification. Computed and stored references remain unqualified. Public-path history alone does not authorize a public classification. See [classification receipt](packing-failure-classification.json). No asset contents were rendered or served.

## Required decision and resumption

**R02-ASSET-01**, owner: asset/product owner, reviewed by media/storage and application security. Classify each duplicate as private or explicitly approved public/demo; supply provenance/permitted use for public classification and reconcile affected references in an approved isolated target. A user question is pending. No deletion, silent exclusion or hash-guard exception has been made.

If private, prepare a bounded public-alias exclusion/quarantine repair that retains originals, private delivery compatibility and recovery mapping. Test alternate-name copies and authorized reads, then independently review. If public, document the evidence and reconcile it with the private-byte admission rule before considering a policy change. Neither branch may silently weaken privacy or break references.

After the decision and any reviewed repair, bind the resulting source to a new candidate, execute the actual artifact chain, then the already reviewed real-session/browser matrix. Advancement requires exact authorized bytes, safe denied bodies/no private bytes, unchanged business snapshots, both delivery paths plus optimizer and cache recovery, preserved mapping/artifact integrity, safe cleanup and independent final review.

P04-R02 and P04 remain blocked. R02-G09 hosted ingress/CDN/operator acceptance is separate. All failed attempts and scoped historical evidence are preserved. No commit, push, deployment, production flags, schema promotion or production-data changes.

## Preservation, cleanup and independent review

[Final integrity](final-integrity.json) passed preservation checks: all 9,068 frozen source files and six asset entries remain unchanged, all 11 repair inputs and 17 reviewed browser/source inputs are stable, and all three original/recovery-mirror pairs match their hashes. HEAD is unchanged. Concurrent work added 37 unrelated files and changed five unrelated files; these were preserved. Whole-worktree equality is therefore not claimed.

[Final database comparison](database/final-fixture-integrity.json) confirms the 245-table business digest is unchanged with zero sessions and audit rows. [Guarded shutdown](database/resume-20261102-r2-retry01-guarded-stop-1793635954332.json) found zero clients in both inventories, stopped only the owned PostgreSQL PID 9496 and verified port 53528 available. Databases are retained. No runtime/browser was started.

Execution receipt reconciliation remains **false** because the artifact command failed and no runtime/browser receipt exists. Preservation success does not pass R02-G08. [Independent assessment](independent-review/ASSESSMENT.md) confirms the blocked disposition. [Register validation](register-validation.json) preserves 54 packages, 183 edges, 57 domains, 14 global decisions and 18 production gates; 53 unrelated packages, historical evidence and deferred commitments are unchanged.
