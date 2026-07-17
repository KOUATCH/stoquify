# Stage 04 Private-Storage Substitution Readiness

## Run identity

| Field | Value |
| --- | --- |
| Run | `th-private-storage-substitution-readiness-20260715-013` |
| Trace | `4bb8d35a-0cff-4b5b-bd72-794ccad34d6c` |
| Mode | `audit` |
| Slice | `foundation-inventory` |
| Verdict | **BLOCKED** |
| Product edits | None |
| Stage 05 eligible | **No** |

## Executive result

Run013 audited whether Stoquify could automatically substitute another private object store after run012 proved that the configured UploadThing free app rejects private objects. It cannot do so safely from the current workspace:

- UploadThing is the only installed storage client.
- No AWS S3, Cloudflare R2, Azure Blob, Vercel Blob or MinIO client is installed.
- No credential names, bucket/container configuration or endpoint exists for those providers.
- No residency jurisdiction, DPA, key-management policy, retention policy, billing owner or approved cloud has been selected.

Adding a provider now would silently make a commercial and data-governance decision and could not be live-verified. Run013 therefore makes no dependency, package, credential, schema or product change.

## Decision matrix

| Option | Code impact | Immediate readiness | Strategic assessment |
| --- | --- | --- | --- |
| Paid UploadThing | No adapter change | Requires account upgrade, then rerun run012 | Fastest pilot unblock; private files and selectable regions are paid features, but current documented regions do not include Africa. |
| Amazon S3 | New SDK adapter and credentials | Not configured | Strong finance-grade baseline with private IAM, presigned reads, encryption, lifecycle and optional Object Lock. |
| Cloudflare R2 | S3-compatible SDK adapter and credentials | Not configured | Attractive S3 compatibility; location hints are best effort and guaranteed jurisdictions currently focus on EU/FedRAMP. |
| Azure Blob | New SDK adapter, managed identity and container | Not configured | Strong enterprise option with Entra user-delegation SAS and optional immutable WORM policies. |

Official capability evidence:

- UploadThing documents that [private files and regions require paid plans](https://docs.uploadthing.com/concepts/regions-acl) and currently describes [usage-based pricing](https://docs.uploadthing.com/blog/usage-based).
- Amazon S3 supports [time-limited presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html), [default encryption](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingEncryption.html), [lifecycle policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html), and [Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html).
- Cloudflare R2 documents [S3-compatible presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) and its [location-hint and jurisdiction model](https://developers.cloudflare.com/r2/reference/data-location/).
- Azure recommends [Entra-backed user-delegation SAS](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-create-user-delegation-sas-javascript) and supports [container immutability policies](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-policy-configure-container-scope).

## Recommendation

1. **Fastest pilot path:** upgrade the existing UploadThing app, retain the current adapter, and rerun the run012 live private canary. This introduces no code churn and immediately tells us whether private upload, signed read and deletion work on the paid account.
2. **Strategic production path:** keep `InventoryHistoryExportArtifactStore` provider-neutral and approve either Amazon S3 or Azure Blob according to Stoquify's deployment control plane, OHADA-market residency policy, DPA and managed-key strategy.
3. **Cost-sensitive alternative:** consider R2 only after its jurisdiction model is accepted; a location hint is not a residency guarantee.

Do not implement public object storage as a workaround. Application encryption is defense in depth, not a replacement for private bucket policy and controlled signed access.

## Required approval

Before another implementation run, provide one of these decisions:

- **UploadThing paid:** upgrade the configured app. No credentials need to be pasted; rerun012 will use the existing local token.
- **Amazon S3:** approve AWS and provide credential injection, bucket, region, KMS and lifecycle policy through the deployment environment.
- **Azure Blob:** approve Azure and provide subscription/storage/container plus managed-identity and retention policy.
- **Cloudflare R2:** approve R2 and provide account/bucket/API-token injection plus accepted jurisdiction.

The implementation run must also know whether the target is a pilot or production, the approved residency jurisdiction, DPA owner, legal-hold requirement and throughput/cost envelope.

## Evidence and verification

- Names-only package inventory: `PASS`; only UploadThing is installed.
- Names-only environment inventory: `PASS`; no alternate provider credentials were found.
- Run012 live private canary: `FAIL`; configured UploadThing account lacks private-object capability.
- Official provider documentation review: `PASS`.
- Secret values inspected or printed: `NO`.
- Product files modified: `NO`.

The structured inventory and decision matrix are saved in `logs/04-provider-substitution-readiness.json`.

## Remaining blockers

1. **High - `PRIVATE_STORAGE_PROVIDER_DECISION_REQUIRED`:** no approved private provider or paid UploadThing capability exists.
2. **High - `PRIVATE_OBJECT_STORAGE_CAPABILITY_UNAVAILABLE`:** the currently configured account fails the live private canary.
3. **High - `OBJECT_STORAGE_GOVERNANCE_UNCERTIFIED`:** residency, DPA, encryption-key ownership, retention, legal hold and deletion policy are undecided.
4. **Medium - `PROVIDER_DEPENDENCY_AND_CREDENTIALS_MISSING`:** every alternate provider requires a new SDK and deployment credentials.
5. **Medium - `PRODUCTION_LIKE_PLAN_EVIDENCE_MISSING`:** database performance certification remains pending after storage is unblocked.
6. **Medium - `PRODUCTION_DELIVERY_BINDING_PENDING`:** worker scheduling and later authenticated delivery remain pending.

## Verdict

**Stage 04 remains `BLOCKED`.** The next implementation run is intentionally not selected until the private-provider choice is approved. This is the point where human commercial and governance authority is required; additional code without that decision would be speculative and untestable.
