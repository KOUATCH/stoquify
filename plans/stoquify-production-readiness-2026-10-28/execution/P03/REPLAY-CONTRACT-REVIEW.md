# Existing-account grant replay review

Independent reviewer audit_roadmap_review confirms source gap: inviteOrGrantAccountantAccess omits idempotencyKey; grant schema lacks it; active scope conflicts before replay lookup. Native loss outcome is still pending.

Proposed bounded correction, conditional on reproduced regression: optional grant key forwarded; tenant/key advisory transaction lock and applied BusinessEvent command receipt binding actor, normalized input and grantId. Preserve existing ACCOUNTANT_ACCESS_GRANTED event and notification outbox. No schema migration. Use stable omission marker for absent effectiveFrom.

Required negative evidence: changed actor/recipient/role/firm/consent/dates; different key active conflict; keyless compatibility; missing/wrong-tenant/incomplete receipts; rollback; concurrent same command; current permission/fresh-auth before replay; revoked/expired grants never recreated. No new business decision is needed for recovering an unchanged valid grant. Historical success after revocation/expiry is outside this repair and fails closed.
