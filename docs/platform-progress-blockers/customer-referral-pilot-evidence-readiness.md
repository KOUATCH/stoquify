# Customer Referral Pilot Evidence Readiness

Generated: 2026-08-10T13:32:07.063Z
Status: `blocked`
Checks ready: 0/16

## Pilot binding

- Pilot ID: replace-with-pilot-id
- Exact release revision: not supplied
- Scope digest: d24a2a601434014b8315682661e1c749a07cf3685e79d5b9a7381022121215de
- Evidence references recorded: 1
- Evidence reference digest: 42673b6151013fd1bd796a4ebb6b535db124f0624cd643fe7c6819cf719b98de
- Raw evidence references printed: no
- Personal data printed: no

## Database evidence

- PostgreSQL target configured: no
- Read-only query succeeded: no
- Statement tokens: 0
- Sent deliveries: 0
- Granted external views: 0
- Recipient actions: 0
- Response access logs: 0
- Referral impressions: 0
- Referral clicks: 0
- Referral conversions: 0

## Checks

- blocked: pilot_manifest_valid
- blocked: exact_release_revision_attested
- blocked: real_user_production_pilot_attested
- blocked: pilot_database_is_postgresql
- blocked: read_only_evidence_query_succeeded
- blocked: immutable_statement_snapshot_exists
- blocked: statement_hash_and_source_evidence_valid
- blocked: statement_specific_referral_token_valid
- blocked: consented_statement_delivery_sent
- blocked: redacted_external_view_logged
- blocked: recipient_response_captured_and_logged
- blocked: referral_impression_logged
- blocked: referral_click_logged
- blocked: referral_conversion_attributed
- blocked: referred_organization_activated
- blocked: end_to_end_event_sequence_complete

## Blockers

- pilot_manifest_valid
- exact_release_revision_attested
- real_user_production_pilot_attested
- pilot_database_is_postgresql
- read_only_evidence_query_succeeded
- immutable_statement_snapshot_exists
- statement_hash_and_source_evidence_valid
- statement_specific_referral_token_valid
- consented_statement_delivery_sent
- redacted_external_view_logged
- recipient_response_captured_and_logged
- referral_impression_logged
- referral_click_logged
- referral_conversion_attributed
- referred_organization_activated
- end_to_end_event_sequence_complete

## Safety

- The database query runs in a repeatable-read, read-only transaction.
- The scoped database URL is never written to evidence.
- The manifest must attest a real production cohort, tenant consent, and exclusion of seed/test data.
- The report binds the pilot IDs and evidence references through SHA-256 digests without retaining PII.
- Readiness requires the exact deployed Git revision and the full statement-to-activation event sequence.
