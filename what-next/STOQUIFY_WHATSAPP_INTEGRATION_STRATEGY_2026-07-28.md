# Stoquify WhatsApp Integration Strategy

Date: 2026-07-28  
Scope: Product, architecture, security, workflow, and SaaS growth strategy for integrating WhatsApp into Stoquify/AqStoqFlow.

## Executive Decision

WhatsApp should become Stoquify's controlled business communication and evidence companion, not a replacement for the dashboard.

The highest-value opportunity is to use WhatsApp where dashboards are weakest:

- reaching owners, managers, employees, suppliers, customers, and field operators who are not sitting inside the app;
- collecting missing evidence quickly through photos, PDFs, short replies, location, and structured forms;
- escalating blockers before they become close, payroll, cash, stock, or reconciliation failures;
- delivering low-friction confirmations, receipts, reminders, and summaries;
- improving adoption for clients with low digital literacy or mobile-first operations.

The safest first pilot is a WhatsApp "Evidence and Operations Notification Layer":

1. POS receipt delivery by WhatsApp link.
2. Owner morning digest with redacted proof links.
3. Manager action-center escalation for daily close, payment reconciliation, stock risk, and stale evidence.
4. Evidence intake for photos/documents, stored as draft evidence until reviewed in Stoquify.

Do not allow WhatsApp to directly mutate finance, payroll, statutory, entitlement, billing, or close-certification state in the first phase.

## Current Stoquify Context

Local inspection shows Stoquify already has many surfaces that can benefit from WhatsApp:

- `services/pos/receipt.service.ts` already models receipt delivery, customer phone/email, digital receipt URLs, WhatsApp receipt delivery requirements, delivery audit, public receipt tokens, and legal delivery blocking when country-pack policy is not satisfied.
- `services/pos/public-receipt-token.ts` already issues and verifies HMAC-style public receipt access tokens with expiry and receipt matching.
- `services/daily-habit/daily-habit-digest.service.ts` already composes role-aware digests for owners, managers, finance, accountants, stockkeepers, and weekly business habits.
- `services/owner-war-room/owner-war-room.service.ts` already builds owner morning briefs with cash-at-risk, payroll forecast, blocked close items, stale evidence, proof-linked actions, evidence grades, redactions, and drill-through subjects.
- `services/manager-action-center/*` and `components/manager-action-center/*` already provide branch close, review, sign-off, and payment reconciliation command surfaces.
- `services/evidence/proof-trail.service.ts` and `services/evidence/evidence-redaction.service.ts` already support proof trails and redacted evidence views.
- `services/reconciliation/payment-reconciliation-notifications.ts` already models idempotent reconciliation notifications with evidence references.
- Payroll has payslip self-service, payment evidence, declaration lifecycle, payroll register, country-pack review, privacy, and production-readiness boundaries.
- Inventory has transfers, movement history, stock events, adjustments, counts, reconciliation, background exports, and stock-to-cash finance surfaces.
- The latest module surface inventory is report-only, generated 2026-07-26, and shows 19 catalog modules, 337 mapped surfaces, 4 missing permissions, and 6 unmapped surfaces. This means WhatsApp integration must respect module/RBAC controls instead of creating a parallel permission system.
- Readiness reports show internal payroll/presence and ledger-close controls are ready in specific static or development scopes, but statutory, production close, authority submission, and production payroll effects remain gated.

## Current WhatsApp Platform Facts

Primary-source research confirms these constraints and capabilities:

- WhatsApp Business Platform Cloud API can send text, media, and template messages through the phone-number `/messages` endpoint, and each sent message has a unique ID trackable through webhooks.
- Webhooks are required for inbound messages, message statuses, delivery/read/failed feedback, media references, interactive replies, and customer-originated requests.
- Businesses may only initiate conversations with approved message templates. Free-form replies are allowed only inside the 24-hour customer-service window after the user's last message.
- WhatsApp Business policy requires mobile number possession plus opt-in permission before contacting a person, and opt-out/block/discontinue requests must be respected.
- WhatsApp pricing is per delivered message, based on recipient market and message category: marketing, utility, authentication, and service.
- Service messages are free inside the customer-service window; WhatsApp also describes free utility replies within user-initiated interactions and 72-hour free entry points from ads or page call-to-action.
- WhatsApp Flows can launch structured, rich interactions inside WhatsApp using interactive flow messages, flow tokens, screens, and data payloads.
- Media endpoints support image, document, audio, video, and sticker exchange; this makes WhatsApp useful for receipts, evidence photos, signed PDFs, supplier invoices, and field proof.
- The official Meta-hosted Node.js SDK documentation is archived, so Stoquify should prefer direct Cloud API integration or a well-reviewed provider abstraction instead of depending on an abandoned SDK as a core foundation.

## Integration Models

| Model | What It Is | Stoquify Fit | Primary Use | Complexity | Decision |
|---|---|---|---|---|---|
| WhatsApp Business App manual workflow | Staff manually message customers/suppliers from the Business App | Good as a temporary operating process for very small clients | Customer follow-up, supplier chasing, receipt support | Low | Use now as non-integrated SOP |
| Click-to-WhatsApp links | App opens a prepared WhatsApp chat URL | Very fast, low-risk bridge from dashboard to user communication | Supplier follow-up, customer collections, support handoff | Low | Use now |
| WhatsApp Cloud API outbound templates | Server sends approved templates | Strong fit for receipts, alerts, reminders, summaries | Utility notifications and controlled escalations | Medium | Pilot |
| Two-way webhook conversation | WhatsApp replies flow into Stoquify | Strong for evidence intake and action acknowledgements | Draft evidence, support, status replies | Medium-high | Pilot |
| Interactive buttons/lists | User selects from quick replies or lists | Strong for controlled low-risk responses | Acknowledge, request review, confirm receipt, classify evidence | Medium | Pilot |
| WhatsApp Flows | In-chat structured forms | Excellent for guided evidence and field reports | Stock count, delivery proof, supplier invoice intake, employee self-service | High | Later pilot |
| Media/document intake | Inbound images/PDFs become draft evidence | Excellent fit for proof-driven workflows | Receipt photos, delivery notes, signed approvals, supplier invoices | Medium-high | Pilot |
| Digital receipt delivery | Send tokenized receipt URL through WhatsApp | Already aligned with existing receipt service | POS receipts and customer proof | Low-medium | Use now/pilot |
| Owner/manager digest delivery | Redacted digest summary plus app links | Strong fit for daily habit and owner war room | Mobile daily review and escalation | Medium | Pilot |
| Approval notifications | Notify approvers; approval completed inside app | Strong if WhatsApp never performs final approval alone | Daily close, purchase order, reconciliation, payroll blockers | Medium | Pilot |
| Customer support assistant | Support bot plus human handoff | Useful for retention and onboarding | Help, onboarding, basic how-to, receipt lookup | Medium | Pilot |
| Supplier/customer communication hub | Message records linked to records | Valuable after consent/contact registry exists | PO updates, invoice requests, collections | Medium-high | Later |
| WhatsApp as authentication channel | OTP or login verification | Useful but sensitive | Step-up/authentication | Medium | Later |
| Marketing broadcasts | Campaigns/promotions | Not core to operational trust | Re-engagement, offers, announcements | Medium | Later/avoid early |
| Direct business-state commands | User types commands that mutate app state | Dangerous in controlled finance/payroll workflows | Stock adjustment, payroll approval, close sign-off | High | Avoid for now |

## Use-Case Matrix

| Use Case | Problem Solved | Module / Surface | Actor | WhatsApp Capability | Why Better Than Dashboard Alone | Controls Needed | Complexity | Decision |
|---|---|---|---|---|---|---|---|---|
| POS receipt delivery | Customers lose paper receipts or do not share email | POS, receipts | Cashier, customer | Utility template or service reply with tokenized receipt link | Customer receives proof immediately on their phone | Opt-in, receipt token expiry, legal-delivery country-pack check, delivery audit | Low-medium | Use now |
| Receipt resend request | Customer returns later asking for proof | POS public receipt | Customer, support | Inbound message, template reply | Reduces manual searching and phone calls | Verify phone/customer match, rate-limit, token audit | Medium | Pilot |
| Owner morning digest | Owners miss dashboard updates | Owner war room, daily digest | Owner | Utility template summary with app deep links | Owner sees urgent cash/stock/close issues without logging in first | Redaction, RBAC, no person-level payroll, proof link permissions | Medium | Pilot |
| Manager run sheet digest | Managers forget daily review tasks | Manager action center, daily close | Branch manager | Template with quick actions | Daily work appears where managers already communicate | Role match, location scope, app-only completion | Medium | Pilot |
| Payment reconciliation alert | Suspense and failed provider evidence age silently | Finance, payment reconciliation | Finance desk, manager | Template, buttons, webhooks | Accelerates exception resolution | Idempotency, evidence refs, no payment mutation | Medium | Pilot |
| Cash shortage escalation | Cash drawer leakage needs quick attention | POS, leakage, finance cash drawer | Manager, owner | Template alert with proof link | Faster than waiting for dashboard review | Fresh auth before resolution, audit, rate-limit | Medium | Pilot |
| Low-stock alert | Stockkeeper misses reorder signals | Inventory, purchasing | Stockkeeper, purchasing officer | Template or service message | Reaches field/store users in real time | Module entitlement, location scope, threshold policy | Medium | Pilot |
| Stock transfer request notice | Transfer requests are delayed | Inventory transfers | Store manager, stockkeeper | Interactive buttons/list | Speeds acknowledgement and coordination | Final approve/receive in app, no direct stock mutation | Medium | Pilot |
| Goods received photo proof | Paper delivery notes are lost | Purchasing, inventory, evidence | Receiver, supplier | Media inbound, draft evidence | Captures proof at the moment of receipt | Malware scan, file limits, OCR later, reviewer approval | Medium-high | Pilot |
| Supplier invoice request | AP waits for invoice documents | Purchasing/AP | Supplier, AP clerk | Template plus media reply | Supplier can reply with PDF/photo directly | Supplier identity mapping, draft evidence state, redaction | Medium-high | Pilot |
| Purchase order dispatch | Suppliers need simple PO communication | Purchasing | Purchasing officer, supplier | Template with PDF/link | Avoids email-only gap for informal suppliers | Approved PO only, no sensitive margin data, audit | Medium | Pilot |
| Customer payment reminder | Receivables need gentle follow-up | Finance receivables, customer ledger | Customer, finance | Utility/marketing template depending content | WhatsApp is more likely to be read than email | Consent, category correctness, dispute opt-out, no harassment | Medium | Pilot |
| Payment proof collection | Customers send payment screenshot manually | Finance, reconciliation, evidence | Customer, cashier, finance | Media inbound | Turns informal proof into controlled draft evidence | Anti-fraud review, no auto-posting, reconciliation match | Medium-high | Pilot |
| Payroll payslip notification | Employees do not know payslips are ready | Payroll payslip self-service | Employee | Utility template with app link | Mobile-first employee access | Consent, employee phone verification, no full salary in message | Medium | Pilot |
| Payroll correction reminder | Attendance/correction tasks delay payroll | Payroll, HRIS, attendance | Employee, manager | Template/buttons | Reaches people outside finance/payroll desk | Manager scope, no pay amounts, app-only correction | Medium | Pilot |
| Leave/attendance nudge | Presence data incomplete | HRIS, payroll presence | Employee, manager | Template or Flow | Reduces missing attendance before payroll close | HRIS permission, retention policy, audit | Medium-high | Later |
| Declaration/authority blocker alert | Payroll production blockers get missed | Payroll declarations, country packs | Payroll admin, accountant | Template summary | Makes blocked production status visible quickly | No statutory claim, no submission over WhatsApp | Medium | Pilot |
| Close-assurance blocker alert | Close evidence blockers stall reporting | Accounting close, assurance | Accountant, owner | Template with proof link | Keeps close work moving without overclaiming certification | Redaction, evidence grade, app-only sign-off | Medium | Pilot |
| Evidence photo upload | Field evidence never enters system | Evidence/proof trail | Field staff, manager | Media inbound | Solves "proof lives in someone's phone" problem | Draft-only, classification, reviewer acceptance, virus scan | Medium-high | Pilot |
| Field incident report | Incidents are reported late or informally | Operations, assurance, manager center | Field operator | WhatsApp Flow/media | Structured mobile reporting without app training | Flow token, location scope, app review | High | Later |
| Customer onboarding assistant | New clients struggle to adopt dashboards | Support, onboarding | Client admin, cashier, manager | Service conversation, bot, human handoff | Familiar channel reduces support burden | Human escalation, no sensitive data in bot answers | Medium | Pilot |
| Supplier onboarding | Supplier data and docs are incomplete | Supplier management, purchasing | Supplier, purchasing | Flow/media | Collects documents through mobile | Consent, vendor identity, draft review | High | Later |
| Owner approval nudge | Approvers are away from app | Manager action, purchasing, finance | Owner, approver | Template with deep link | Speeds approvals while preserving app controls | Approval only in app with fresh auth | Medium | Pilot |
| Quick acknowledgement | Users need to say "seen" without logging in | Dashboard, notifications | Owner, manager | Reply button | Helps track message reach/readiness | Acknowledgement cannot equal approval; audit | Medium | Pilot |
| Customer service receipt lookup | Customers contact support for receipts/orders | POS, customers | Customer support | Service bot + receipt link | Reduces support time | Phone/order verification, public token | Medium | Pilot |
| Daily habit streak reminder | Client usage drops after onboarding | Daily digest, SaaS growth | Owner/admin | Template | Builds routine around operating truth | Frequency caps, user preference center | Low-medium | Pilot |
| Training micro-lessons | Users do not learn workflows | Support, onboarding | Cashier, manager, accountant | Service message, template links | Meets users in mobile context | No hidden product claims, localized content | Low-medium | Pilot |
| Stock count Flow | Counts are done on paper | Inventory count | Stockkeeper | WhatsApp Flow | Structured count capture in WhatsApp | App review before posting, location/device/user binding | High | Later |
| Expense/document capture | Small expenses escape finance | Finance/evidence | Field staff, owner | Media inbound | Captures informal expense proof | Draft expense only, finance review, tax policy | Medium-high | Later |
| Direct payroll approval by reply | Fast approval desired | Payroll | Payroll approver | Button/reply | Convenient but risky | Fresh auth and SoD not guaranteed in WhatsApp | High | Avoid |
| Direct stock adjustment by reply | Fast stock correction desired | Inventory | Stockkeeper | Text command/button | Dangerous without app validation | Could bypass approval and close invalidation | High | Avoid |
| Statutory filing via WhatsApp | Authority submission shortcut | Payroll/compliance | Payroll admin | Message command | Not appropriate | Legal, identity, evidence, and authority risks | Very high | Avoid |

## High-Value Workflows

### 1. WhatsApp POS Receipt Delivery

Flow:

1. Cashier completes sale in Stoquify POS.
2. Customer gives phone number and consents to WhatsApp receipt delivery.
3. Stoquify issues a public receipt token using the existing receipt-token pattern.
4. Stoquify sends an approved utility template or service reply containing a receipt link.
5. WhatsApp message ID, status, destination, template, receipt ID, and user ID are written to audit.
6. Webhooks update delivery status: accepted, sent, delivered, read, failed.

Why it matters:

- It solves paper receipt loss and customer proof disputes.
- It reuses an already visible receipt-delivery surface.
- It is one of the lowest-risk integrations because the message can contain a link, not raw financial detail.

Controls:

- Do not send legally certified receipt claims where country-pack policy blocks legal delivery.
- Expire and revoke receipt tokens.
- Avoid sending full payment/card details.
- Treat WhatsApp delivery as delivery evidence, not legal/statutory certification unless the country-pack gate allows it.

### 2. Owner Morning Digest

Flow:

1. Daily habit/owner war room generates redacted owner summary.
2. Stoquify selects only safe fields: cash at risk, blocked close count, stale evidence count, proof-linked action count, stock risk count, redacted payroll aggregate.
3. WhatsApp sends a utility template to opted-in owners.
4. Links open the owner war room in Stoquify for full RBAC/fresh-auth access.

Why it matters:

- Owners often act from phones, not dashboards.
- WhatsApp creates a habit loop around evidence-backed decisions.
- It can surface blockers before the business day starts.

Controls:

- No person-level payroll data.
- No ledger details beyond safe summary.
- No approval through WhatsApp in phase one.
- Include evidence freshness and "open in Stoquify" links.

### 3. Manager Daily Close and Reconciliation Escalation

Flow:

1. Manager action center identifies pending close review, cash shortage, stale evidence, or reconciliation exception.
2. Stoquify sends a template to the location-scoped manager.
3. Manager can tap "Open Review", "I will handle", or "Escalate".
4. "I will handle" records a communication acknowledgement only.
5. Any sign-off, resolution, or cash/finance mutation happens inside Stoquify.

Why it matters:

- Branch close and reconciliation often fail because responsible people do not see dashboard alerts in time.
- WhatsApp makes escalation immediate without compromising controls.

Controls:

- Required permission: dashboard/manager-action-center plus location scope.
- Record acknowledgement separately from approval.
- Enforce idempotency so repeated messages do not create repeated actions.

### 4. Evidence Intake by Photo or Document

Flow:

1. Stoquify sends a request for missing evidence or receives inbound evidence from an opted-in, recognized contact.
2. Webhook receives media ID and metadata.
3. Stoquify downloads the media from WhatsApp, stores it in evidence storage, scans it, and creates a draft evidence item.
4. The evidence item is linked to a candidate subject: sale, purchase order, supplier invoice, payroll payment, inventory transfer, close run, or reconciliation exception.
5. A reviewer accepts, rejects, classifies, redacts, or links the evidence in-app.

Why it matters:

- It solves the common SMB problem where proof exists, but only in a phone chat.
- It can materially improve audit and close readiness.

Controls:

- Draft-only until reviewed.
- Strict media type/size rules.
- Malware scanning and content validation.
- Redaction before broader visibility.
- Preserve original WhatsApp message ID, sender, timestamp, hash, and reviewer history.

### 5. Supplier Invoice and PO Communication

Flow:

1. Approved purchase order is sent by WhatsApp to an opted-in supplier contact.
2. Supplier replies with invoice, delivery note, or confirmation.
3. Stoquify creates supplier communication and draft evidence records.
4. AP/purchasing clerk reviews and links the document to PO/AP workflow.

Why it matters:

- Many local suppliers operate by WhatsApp faster than email.
- This closes the gap between informal supplier communication and formal AP evidence.

Controls:

- Supplier phone number verification.
- Approved PO only.
- No auto-creation of payable liabilities from WhatsApp media.
- Finance/AP review before posting or close impact.

### 6. Payroll Employee Self-Service Notification

Flow:

1. Payroll run is finalized.
2. Employee receives a utility template saying payslip is available.
3. Message links to Stoquify self-service.
4. Payslip view happens in app after identity/RBAC check.

Why it matters:

- Employees may not check dashboards or email.
- Payroll trust improves when employees receive timely notice.

Controls:

- No salary amounts or sensitive payroll values in WhatsApp text.
- Phone ownership verification.
- Opt-in, opt-out, and employee privacy settings.
- Redacted preview only.

## Problems WhatsApp Solves That Dashboards Cannot Fully Solve

- Attention gap: dashboards require users to log in; WhatsApp reaches users where they already are.
- Evidence gap: field proof often starts as a photo or PDF in a phone chat.
- Digital literacy gap: many operators can reply to WhatsApp before they can use complex SaaS screens.
- Timing gap: blockers become expensive when discovered only during close, payroll, or reconciliation.
- Mobility gap: owners, stockkeepers, delivery receivers, and suppliers are often away from a desk.
- Trust gap: customers and employees trust immediate phone proof more than "we will email you later."
- Informality gap: WhatsApp is already where supplier/customer conversations happen; Stoquify can capture and govern that reality.

## Recommended Architecture

### Core Components

1. WhatsApp channel provider
   - Implement a provider interface, not provider-specific logic scattered across services.
   - Start with Cloud API or a trusted BSP adapter.
   - Store phone number ID, WABA ID, template IDs, provider account status, quality status, and environment.

2. Consent and contact registry
   - Store phone number, owner type, owner ID, tenant ID, contact role, consent categories, consent timestamp, source, status, and opt-out state.
   - Support separate consent for receipts, operations alerts, payroll notices, supplier communication, support, and marketing.

3. Outbound message service
   - Accept only typed events from domain services.
   - Resolve template, recipient, locale, channel preference, consent, RBAC, module entitlement, and redaction policy.
   - Queue messages instead of sending synchronously from business actions.

4. Inbound webhook route
   - Verify Meta webhook challenge and signatures.
   - Deduplicate by WhatsApp message ID.
   - Persist raw webhook envelope in a restricted audit table.
   - Route inbound messages to draft handlers, not direct state mutation.

5. Message audit and delivery state
   - Track outbound request ID, WhatsApp `wamid`, recipient, template, category, source entity, evidence subject, status, failure code, pricing category, and timestamps.
   - Update from webhook statuses.

6. Evidence intake pipeline
   - Download media using time-limited media URL.
   - Store hash, media metadata, sender, source message ID, and candidate link.
   - Scan, classify, redact, and create draft evidence.

7. Template registry
   - Manage approved template names, languages, categories, variables, redaction level, allowed modules, and owning domain.
   - Keep templates as configuration with review workflow, not hardcoded strings.

8. Notification preference center
   - User and tenant admins choose allowed channels, frequency, quiet hours, opt-out categories, digest thresholds, and emergency escalation rules.

9. Admin configuration surface
   - WABA/phone setup, webhook health, template approval status, message quality, error rates, monthly message spend estimate, and delivery dashboard.

### Proposed Data Model Additions

- `CommunicationChannelAccount`
- `CommunicationContact`
- `CommunicationConsent`
- `CommunicationTemplate`
- `CommunicationMessage`
- `CommunicationWebhookEvent`
- `CommunicationDeliveryStatus`
- `CommunicationInboundDraft`
- `EvidenceIntakeDraft`
- `CommunicationPreference`

These should be tenant-scoped and permission-protected. Raw webhook payloads and phone numbers should be restricted, redacted in reports, and encrypted or hashed where appropriate.

### Permission Model

Suggested new permissions:

- `communication.whatsapp.configure`
- `communication.whatsapp.templates.manage`
- `communication.whatsapp.messages.read`
- `communication.whatsapp.messages.send`
- `communication.whatsapp.webhooks.read`
- `communication.whatsapp.evidence.review`
- `communication.whatsapp.consent.manage`
- `communication.whatsapp.preferences.manage`

Suggested policy:

- Sending a receipt requires POS receipt permission plus customer consent.
- Sending owner digest requires dashboard/owner-war-room permission and safe redaction policy.
- Sending payroll notices requires payroll self-service or payroll admin permission and employee consent.
- Sending supplier PO messages requires purchasing supplier/PO permissions.
- Reviewing inbound evidence requires evidence review permission for the linked subject module.

## Security and Risk Controls

| Risk | Example | Control |
|---|---|---|
| Wrong recipient | Payslip or receipt sent to old phone number | Phone verification, opt-in evidence, last-four display, per-contact confirmation |
| Payroll privacy leakage | Salary details exposed in chat preview | No sensitive payroll amounts in WhatsApp; app link only |
| Finance data leakage | Cash position sent to unauthorized number | RBAC check, owner role validation, redaction, digest thresholds |
| Impersonation | Someone messages "approve payroll" from a saved number | No high-value approvals by WhatsApp; app fresh auth required |
| Consent breach | Business initiates messages without opt-in | Consent registry, category-specific opt-in, hard send block |
| Opt-out ignored | User replies STOP or blocks business | Webhook opt-out handling, preference update, suppression list |
| Template rejection | Message content mixes utility and marketing | Template governance, category review, copy approval |
| Message fatigue | Too many alerts cause blocks | Frequency caps, digest batching, severity rules |
| Evidence fraud | Fake payment screenshot uploaded | Draft-only evidence, reconciliation match, reviewer approval |
| Malware/file abuse | Inbound document contains malicious payload | File type/size limits, scanning, quarantine |
| Tenant leakage | Inbound phone maps to wrong tenant | Tenant-scoped contact registry, unique verification, manual conflict review |
| Legal overclaiming | Receipt or close message claims certification | Template wording tied to policy gates; no statutory claims unless certified |
| Cost runaway | Alert storm sends thousands of messages | Queue quotas, budget limits, per-tenant caps |
| Provider outage | WhatsApp temporarily unavailable | Fallback to in-app/email, retry with idempotency, outage banner |

## MVP Recommendation

### MVP Name

WhatsApp Evidence and Operations Notification Layer

### MVP Scope

Build four narrow workflows:

1. POS receipt delivery by WhatsApp link.
2. Owner morning digest with redacted metrics and Stoquify deep links.
3. Manager daily-close/reconciliation escalation with acknowledgement only.
4. Inbound evidence photo/document intake as draft evidence.

### MVP Non-Goals

- No payroll approval over WhatsApp.
- No stock adjustment over WhatsApp.
- No payment posting over WhatsApp.
- No statutory filing or authority submission over WhatsApp.
- No close certification over WhatsApp.
- No module entitlement activation/deactivation over WhatsApp.
- No marketing campaigns in the first release.

### MVP Success Criteria

- 95% of sent messages have auditable delivery state.
- 100% of outbound sends pass consent and tenant/RBAC checks.
- 0 high-risk business-state mutations occur from WhatsApp.
- Receipt delivery reduces manual receipt resend requests.
- Owner/manager digests increase daily review completion.
- Inbound evidence drafts are reviewable, redacted, linked, and rejectable.
- Opt-out is honored across categories.

## Decision: Use Now / Pilot / Later / Avoid

Use now:

- Manual WhatsApp Business App SOP for tiny clients.
- Click-to-WhatsApp links from customer, supplier, receipt, and support surfaces.
- POS receipt WhatsApp delivery pilot, because the receipt service already has phone/contact and delivery-audit concepts.
- Template copy and consent model design.

Pilot:

- Cloud API outbound templates.
- Webhook status tracking.
- Owner morning digest.
- Manager action escalation.
- Payment reconciliation blocker alerts.
- Evidence media intake.
- Supplier invoice/PO communication.
- Payroll payslip availability notice with app link only.
- Support/onboarding assistant with human handoff.

Later:

- WhatsApp Flows for stock count, supplier onboarding, field incident reporting, leave/attendance capture, and customer support forms.
- Product catalog messages for inventory/customer sales, only after commerce policy and product catalog governance are clear.
- Authentication templates for step-up or login verification.
- Marketing campaigns and retention messages.
- Multi-tenant embedded signup for clients managing their own WABA.

Avoid:

- Direct payroll approval by WhatsApp reply.
- Direct statutory filing by WhatsApp.
- Direct stock adjustment or inventory receive by WhatsApp.
- Direct payment posting or reconciliation sign-off by WhatsApp.
- Sending full payroll, bank account, payment card, or sensitive statutory identifiers in WhatsApp.
- Treating WhatsApp message delivery as legal, statutory, or close certification.

## Template Starter Set

Suggested first templates:

- `receipt_available`: "Your receipt from {{business_name}} is ready. View it securely here: {{receipt_link}}."
- `owner_morning_digest`: "{{business_name}} morning brief: {{cash_risk_summary}}, {{close_blocker_count}} close blockers, {{stale_evidence_count}} stale evidence items. Open Stoquify: {{dashboard_link}}."
- `manager_close_action`: "{{location_name}} has {{action_count}} close/reconciliation actions needing review today. Open Stoquify: {{action_link}}."
- `evidence_request`: "{{business_name}} needs evidence for {{subject_label}}. Reply with a photo or PDF, or open Stoquify: {{evidence_link}}."
- `supplier_invoice_request`: "{{business_name}} is missing invoice/supporting document for PO {{po_number}}. Reply with the PDF/photo or contact purchasing."
- `payslip_available`: "Your payslip for {{period_label}} is available in Stoquify. View securely here: {{self_service_link}}."

All templates should avoid sensitive raw amounts unless the relevant data is already customer-visible, expected, and policy-approved. Payroll templates should use availability notices, not pay values.

## Implementation Roadmap

Phase 0: Policy and design

- Define consent categories.
- Define message template governance.
- Define WhatsApp data retention and redaction policy.
- Define tenant/RBAC send rules.
- Prepare template copy for review.

Phase 1: Foundation

- Add channel provider abstraction.
- Add consent/contact registry.
- Add outbound message queue and audit table.
- Add webhook route with signature verification and idempotency.
- Add admin health/readiness page.

Phase 2: Low-risk outbound

- POS receipt delivery.
- Owner morning digest.
- Manager escalation.
- Delivery status dashboard.

Phase 3: Inbound evidence

- Receive media/document webhooks.
- Download and store media safely.
- Create draft evidence.
- Add reviewer UI for accept/reject/link/redact.

Phase 4: Structured workflows

- Pilot WhatsApp Flows for stock count, supplier invoice intake, and field incident reporting.
- Keep all business-state mutations inside Stoquify after review.

Phase 5: Growth and scale

- Add onboarding/support assistant.
- Add customer and supplier communication history.
- Add per-tenant usage caps and spend forecasts.
- Add optional embedded signup or BSP onboarding for client-managed WhatsApp accounts.

## Verification Commands For First Implementation

When implementation begins, run focused checks such as:

```powershell
npm test -- services/communication
npm test -- services/pos/__tests__/receipt*
npm test -- services/evidence/__tests__
npm test -- services/reconciliation/__tests__
npm run module:surface:inventory
npm run policy:gates
```

Also add manual smoke tests:

- Webhook verification challenge succeeds.
- Duplicate webhook delivery is idempotent.
- Opted-out contact cannot receive outbound template.
- Receipt send writes audit and delivery state.
- Inbound media creates draft evidence only.
- Payroll notice contains no salary or statutory-sensitive details.

## Sources

Local Stoquify sources inspected:

- `what-next/module-surface-inventory.md`
- `what-next/ci-release-readiness.md`
- `what-next/ledger-close-truth-readiness.md`
- `what-next/payroll/payroll-presence-readiness.md`
- `what-next/payroll/accounting-close-development-readiness.md`
- `what-next/payroll/payroll-regulatory-hardcode-gate.md`
- `services/pos/receipt.service.ts`
- `services/pos/public-receipt-token.ts`
- `services/daily-habit/daily-habit-digest.service.ts`
- `services/owner-war-room/owner-war-room.service.ts`
- `services/manager-action-center/manager-action-center.service.ts`
- `services/evidence/proof-trail.service.ts`
- `services/evidence/evidence-redaction.service.ts`
- `services/reconciliation/payment-reconciliation-notifications.ts`

Primary WhatsApp/Meta sources reviewed:

- WhatsApp Business Platform pricing: https://whatsappbusiness.com/products/platform-pricing/
- WhatsApp Business Messaging Policy: https://whatsappbusiness.com/policy/
- Meta official Postman WhatsApp Business Platform overview: https://www.postman.com/meta/whatsapp-business-platform/overview
- Meta official Postman Cloud API Messages folder: https://www.postman.com/meta/whatsapp-business-platform/folder/o48mro7/messages
- Meta official Postman Cloud API send Flow request: https://www.postman.com/meta/whatsapp-business-platform/request/56fec8h/send-published-flow-by-name
- Meta official Postman media reference: https://www.postman.com/meta/whatsapp-business-platform/folder/13382743-ecb27be5-4d27-4763-bbee-6a8002c04bf3
- WhatsApp Business Platform Node.js SDK docs, archived: https://whatsapp.github.io/WhatsApp-Nodejs-SDK/
- WhatsApp interactive message docs from the archived Meta-hosted SDK: https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/messages/interactive/
- Meta newsroom on business chats, opt-in, templates, quality checks, read rates, and marketing limits: https://about.fb.com/news/2025/04/ways-to-manage-your-businesses-chats-on-whatsapp/

## Final Recommendation

Integrate WhatsApp where it makes Stoquify warmer, faster, and closer to business reality: receipts, reminders, evidence, owner/manager attention, supplier/customer communication, and mobile-first support.

Keep the dashboard as the source of truth. Keep business-state changes inside Stoquify. Let WhatsApp carry signals, proof, and guided prompts into the platform, then let Stoquify's RBAC, evidence, audit, close, payroll, and finance controls decide what becomes truth.
