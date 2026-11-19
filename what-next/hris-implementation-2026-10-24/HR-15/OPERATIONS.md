# HR-15 operations and release boundary

No live configuration was selected or enabled. Engineering verification uses the owned synthetic PostgreSQL target and named synthetic encrypted store/scanner. The synthetic scanner verifies the protocol, not actual malware detection. A provider product integration or malware efficacy claim is not established.

## Admission and provider contract

Default `HRIS_DOCUMENT_HANDLING_ENABLED` is absent/disabled. Live admission requires an explicitly selected private gateway, qualified scanner, approved employer/country retention policy, secret management and operational ownership. `HRIS_DOCUMENT_GATEWAY_URL` must be HTTPS without credentials/query/fragment. Its bearer credential is `HRIS_DOCUMENT_GATEWAY_TOKEN`; it must not appear in logs. Changing gateway location changes its retained identity: historical originals fail closed until the correct provider is restored or a separately reviewed migration is completed.

The gateway must implement:
- PUT `/objects/<encoded opaque key>`: immutable ciphertext, exact-byte idempotent retry; return exact ciphertext SHA256 in `x-content-sha256` and key SHA256 in `x-immutable-object-sha256`. Conflicting writes fail. No public original URLs.
- GET same key: authenticated ciphertext only, bounded to 5 MB. The application authenticates AES-GCM tenant/document AAD, exact size and plaintext SHA256.
- DELETE same key: durable idempotent tombstone, including absent objects and in-flight PUTs; return key SHA256 in `x-tombstone-sha256`. Delayed PUTs must fail permanently. A generic object-store DELETE without this protection is incompatible.
- POST `/scan`: bounded plaintext scan, digest-bound CLEAN/REJECTED verdict, reference and digest. Scanner exceptions leave quarantine. Provider qualification must establish real malware detection; the implementation does not invent it.

`HRIS_DOCUMENT_POLICIES_JSON` is deployment-controlled approved policy data, never a request body. Each policy names exact organization, country, type, version, approval reference/author/date, effective interval, retention days, employee visibility and own-upload eligibility. No OHADA-wide rule or default retention is assumed. `HRIS_DOCUMENT_GRANT_SECRET` is at least 32 characters, deployment secret, used for actor/tenant/revision-bound 60-second grants. Grant tokens travel in POST bodies, not URLs.

## Recovery, retention and rollback

Object identity, ciphertext authentication material, immutable policy snapshot and request hash precede external upload. Exact upload retries use the same retained identity and ciphertext. Quarantine and rejected files cannot be downloaded. A scanner-clean pending file may be downloaded only by an independently authorized document reviewer; ordinary employee access waits for release.

Replacement approval serializes on the existing employee, preserves the prior version as SUPERSEDED and permits one approved successor. Validity expiry produces a scoped replacement item; it is separate from retention expiry. Holds and evidence bindings block deletion. Native employee/contract evidence triggers bind available originals and prevent newly attaching unavailable/deleted originals. Legacy metadata-only references survive unrelated updates; approving their matching original binds it immediately. Binding is irreversible in this slice.

Deletion claims disable access before provider contact and retain metadata. A lost delete response stays DELETE_PENDING; exact retry reconciles the durable provider tombstone. A hold arriving after the delete claim is rejected, not silently reported applied. A changed provider identity never marks the old object's deletion completed.

Disable uploads with `HRIS_DOCUMENT_UPLOADS_ENABLED=false` and downloads with `HRIS_DOCUMENT_DOWNLOADS_ENABLED=false`; metadata/status and authorized cleanup remain available when the main provider configuration is admitted. Disable all provider handling by removing the overall enable flag. Keep database originals, key material, tombstones, audit history and backups. Never roll back by dropping retained tables or restoring old mutable originals.

Five additive migrations are ordered 20261024150000 through 20261024150400. The follow-on migrations preserve the reviewed test history; all five form one release unit. Existing references are not backfilled into invented approved originals. UNBOUND storage rows fail closed and require operator reconciliation. The isolated runner uses its own test migration ledger and checks exact file hashes; it is not a production promotion runner. Only the explicitly named owned loopback target was changed. Production uses the existing reviewed artifact/schema promotion process.

The service uses parameterized SQL for this additive model with existing Prisma transactions and native employee locks. No generated-client engine replacement was performed. Schema validation is separate from runtime/database proof.

## Remaining live work

Qualify the gateway protocol and actual scanning; approve employer retention/hold policy and document types; provision explicit read/manage/retention permissions to named operators; test backup/key recovery, storage loss and retention operations; then authorize a limited pilot. No automatic role grant, public upload migration, external document upload, production migration, statutory certification or deployment occurred.
