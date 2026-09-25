# Referral metrics and accountant-access lifecycle

## Corrected behavior

The referral funnel now separates prepared attribution links, recorded redirect clicks, organization-registration events and invitations with recorded acceptance. The internal read contract uses `preparedLinks`, `clicks`, `registrations` and `acceptedInvitations`. Current source search found the affected consumer in ReferralFunnelDashboard and its tests; the action returns this server-owned model. Old report documents remain historical evidence.

Previously, every attribution row appeared as an issued link, although both current producers create attribution while queueing delivery. A queued link is not proof of sending or receipt. Every accountant-source CONVERSION event also incremented invitation activations. The registration producer normally accepts the invitation in the same transaction, but a conversion event alone is not the invitation lifecycle record and can misrepresent legacy records.

Accepted invitations now count each linked invitation once when its scoped append-only state chain contains ACCEPTED. This is a historical recorded acceptance count, not chain certification or current grant availability. The read selects no invitation email, token, user, grant or contact identifiers. Registrations remain recorded events, not verified accounts, paid subscriptions or completed onboarding. Clicks reflect the producer's per-link/per-UTC-day hashed-client deduplication; they are not unique people.

EN/FR messages live in `messages/referral-funnel/`. Each metric explains its meaning and limit. The read-start timestamp explicitly uses UTC. The campaign table has column scope, a caption and a named, keyboard-focusable horizontal scroll region. Existing dashboard tokens/components and shell are retained. Actual French mobile review shows readable wrapping and visible table focus; scrolling is required to inspect the later columns.

## Connected defect discovered and fixed

Actual accountant-access revocation failed with `Business event could not be recorded` and rolled back, leaving the grant ACTIVE. An isolated diagnostic observed Prisma rejecting `sourceType: "AccountantAccessGrant"`. BusinessEvent.sourceType is an optional AccountingSourceType enum; that string is not a member. Direct grant and expiry used the same invalid value.

The three producers now leave that accounting classification unset and retain the domain entity type in `metadata.sourceEntityType: "AccountantAccessGrant"`, together with the existing `sourceId`, grantId in the payload, eventType, idempotency key and audit/outbox records. No accounting enum is repurposed, no required evidence removed, and no schema change is needed. Source search found no downstream consumer relying on the previously invalid classification. Generic event input still accepts arbitrary strings and is a separate validation gap to review across producers.

Owned PostgreSQL verification now proves direct grant, revocation, expiry and renewal commit with four corresponding events and their domain references. The accepted invitation remains in historical totals after access revocation. These are service/database checks; the accountant administration UI and current authorization/fresh-auth transport paths still need complete runtime review.

## Evidence and limitations

See `evidence/referral-funnel-v150.json`. Final verification: 33 tests / five suites, six-file lint and typecheck. The isolated lifecycle uses real queue, click, conversion, invitation acceptance and access services. A deliberate legacy fixture has a registration event without an invitation; another organization has a private campaign. Results: 3 prepared links, 1 deduplicated click, 2 registrations and 1 recorded acceptance. The historical conversion-based formula would report 2 activations. Duplicate click/conversion requests do not inflate counts.

Actual EN/FR browser reads display the scoped rows even when an unrelated organization ID is supplied in the URL. Six desktop/tablet/mobile screenshots are retained; no final-run page errors. Table focus verified. Route-ready observations were EN 2,692 ms and FR 4,217 ms in local development, not a production benchmark or comparative improvement claim. Empty reads and source errors have service tests; this batch does not claim full browser failure or empty-state coverage. Selected financial counts and grant states stay unchanged during report reads, not every database table; access auditing remains expected.

Retained failures: first unit UI assertion ambiguously selected two region landmarks; corrected to the table's accessible name. Initial database fixtures violated real hash/source constraints and were corrected without relaxing them. The next run reproduced the actual revocation defect; a diagnostic confirmed the unsupported enum value and rollback. After that fix, a browser locator matched both shell and page headings; an exact heading locator completed the journey. These failures are distinct from the final pass.

The fixture consent inputs, accounts, grants, private envelopes and legacy anomaly are explicitly synthetic, confined to the owned database. No worker was invoked, no email or notification was sent, and no live customer or approval was activated. Test evidence is not organizational consent or X1 evidence.

Historical graph lookup found `api_referrals_referralcode_route_ts` in app community 25; the funnel action/component were absent from those older graphs. Current source traces the route to its guarded action, scoped read model and the two queue producers. Older graphs are not completion proof.

## User and operator guidance

Open `/en/dashboard/analytics/referrals` or `/fr/dashboard/analytics/referrals` with `analytics.read` authority. Use prepared links to inspect recorded queue intent, recorded clicks for captured redirects, registrations for recorded new organizations, and accepted invitations for historical invitation acceptance. Inspect the actual delivery register for delivery outcomes and the accountant access register for current permissions. This report cannot supply either proof.

For a discrepancy, give the authorized support operator the source/campaign, organization and read time shown. Support obtains attribution events and invitation lifecycle records through approved access; do not collect or paste private referral tokens, invite envelopes, recipient contact details or credentials into the report. Missing acceptance requires investigation of the invitation record, not insertion of an approval or an invented event.

After an earlier failed grant or revocation, an authorized administrator should inspect the current grant state before retrying through the normal controls. The reproduced failed transaction left the grant active. A passing screen or historical acceptance count does not establish revocation. Existing service retry/idempotency and fresh-auth requirements remain in force.

## Review and rollout

Architecture/backend/events: producer-to-count trace and preserved non-accounting entity references; generic event-source validation remains open. Database/security/IAM/privacy: tenant-filtered aggregate select, unchanged authority and atomic access transitions; source-level/action tests are not full cross-tenant browser certification. Finance/audit: no ledger/payment mutation by the report; access changes retain business events and audit/outbox records. Product/analytics/growth: metric names reflect recorded outcomes, no subscription or revenue claims. Frontend/localization/accessibility: existing components, EN/FR externalized copy, explicit UTC and keyboard table; full screen-reader, zoom and contrast review incomplete. SRE/support: retained attempts and local timing; all-time event volume is still unbounded. Statutory/country rules, POS/offline, purchasing/AP, payroll, payment-provider execution and AI: not applicable to these changes; their business behavior is unchanged. These are engineering reviews, not certifications.

Deploy the read contract, component and locale files together with the accountant-access producer correction through the normal reviewed release. No migration or database backfill. Preserve unrelated changes when preparing a bounded rollback. Rolling back the event correction restores a demonstrated failure to grant/revoke/expire access; do not roll it back casually. No production deployment performed.

Remaining: complete admin access journeys and authority checks; delivery/recipient proof; large-history aggregation/pagination; lifecycle evidence completeness; empty/failure/browser reflow and assistive-technology checks; wider event-producer source validation and the rest of the workflow register. The platform review remains incomplete.
