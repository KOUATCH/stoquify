# Stoquify Approval Register — operating guide

**Proposed workflow; not implemented or adopted. Prepared 3 September 2026.**

## Stoquify Approval Register

How to establish it, use it, and obtain every required reference.

Status: proposed design — screens and automatic outputs are not yet implemented.

Purpose: one internal register for X1 now and other Stoquify approval workflows later.

You should only need to provide the real decision, the correct material, and the authority behind it. Once established, the register creates the references that your current form asks you to find.

### Your normal approval process

1. Open Governance → Approvals and choose the request assigned to you.

1. Read the exact document version, scope, conditions and expiry. Choose Approve, Reject, or Request revision.

1. Confirm your identity and the displayed decision. Stoquify checks your appointment and records the actual event.

1. Open the resulting record. Use Copy references or Copy X1 fields to reuse the generated values.

### What the system supplies

| Output | What it means |
| --- | --- |
| Approval record ID | Unique reference to the decision actually recorded. A draft request ID does not mean approved. |
| Decision timestamp | Server-recorded time of the native confirmation, shown with timezone. |
| Verification reference | The event proving which account confirmed this exact decision and under which authority. |
| SOURCE RECORD URI | A stable protected link to the record, approved version and verification evidence. |
| File hash | A check of the exact stored file bytes. It does not identify the signer. |

This is an authenticated internal approval process. It requires adoption by the actual owner and verification of people and authority. It does not require buying a commercial signing platform.

## Establish the register once

The first record does not need an earlier approval-system ID.

The administrator opens a setup draft. You identify the owner and the authority to establish this process; Stoquify assigns the draft reference. You can upload an existing authority source without first giving it a register URI.

| Information needed | Who supplies it and where to get it |
| --- | --- |
| Owning organization or project | You: actual business/project name and whether this starts with Stoquify development only. Use ownership records, not an assumed fixture tenant. |
| Owner identity and account | You: real name, role and existing account/contact. The administrator resolves the internal user ID and verifies the account binding. |
| Basis of authority | You: ownership evidence, executive mandate or appointment. For your independently owned project, an owner declaration can start setup with supporting ownership evidence. |
| Setup verifier | You name a suitable person who can check identity and authority against an independently established source. They record their check and its result. |
| Process and appointments | Owner: adopt the in-app confirmation method and appoint real people to scoped product, security/data and release responsibilities. |
| Validity, retention and recovery | Owner/control personnel: decide expiry limits, permitted role combinations, retention policy, archive owner and revocation/recovery responsibility. |
| Address and private storage | Administrator: obtain the real HTTPS origin and configured private evidence storage from hosting/infrastructure settings. Do not provide passwords here. |

### What makes setup effective?

The owner confirms the establishment charter after identity and authority checks. Appointees accept their appointments. The administrator activates the register only after those records and storage/access checks are complete. Stoquify retains the establishment record, its sources and verification history.

If a source or suitable verifier is missing, save the draft and identify the missing item. A role label or another account for the same person does not supply independent verification. Module development and document preparation can still proceed.

## Choose people and verify decisions

A technical login and business authority answer different questions.

| Responsibility | Needed from you / source |
| --- | --- |
| Register owner | Actual person entitled to adopt the process and appoint others. Supply authority source and scope from ownership or organizational records. |
| Administrator / controller | Person who manages accounts, evidence custody and register operation. An administrator does not receive business approval power automatically. |
| Product authority | Real person who owns product priorities and performance-budget decisions. Appointment states scope and validity. |
| Security / data authority | Person or people authorized over security, credential use and fixture-data custody. Obtain names from those actual responsibilities. |
| Independent technical reviewer | Person permitted to assess evidence independently of implementation/capture. Appointment and review history must show that independence. |

### How many people do I need?

There is no blanket five-person requirement. One person may cover compatible scopes when the adopted policy permits it. The proposed default separates product and security decisions and retains independent technical review. Existing domain rules still apply. If you are the sole developer, identify the missing reviewer instead of filling that role with a second account or a seeded persona.

### How native confirmation is verified

Stoquify displays the exact decision and document version, asks for fresh identity confirmation, checks the appointment, and records the event. Your approval ID, confirmation reference and timestamp are produced only after commitment. Replacing the file or changing the scope requires a new decision.

The native receipt is evidence of an authenticated internal decision. It is not represented as a third-party signing certificate. The organization adopts this verification method during setup.

### When someone leaves or loses authority

The owner or authorized delegate revokes the appointment, giving the record and reason. Stoquify preserves past history, records the change and prevents ineligible future use. A replacement receives a new appointment; nobody edits the old signer into a new person.

## Case: X1 product approval

Approve the proposed performance budgets and exact scope.

Start from the prepared X1 product form and its review bundle. The register submits an immutable version of both. The person actually appointed to product decisions reviews and confirms the request.

| What is needed | Your action and source |
| --- | --- |
| Decision | Choose Approve, Reject or Request revision after reviewing the form. This is your judgment; it cannot be taken from the database. |
| Budget and scope | Review the seven proposed signals in the existing product form. The technical team supplies current contracts and the frozen source bundle. |
| Reason or changes | If rejecting or revising, state the issue and desired changes. Revised material must be submitted again before approval. |
| Authority | Choose your valid product appointment in the register. Obtain a new appointment from the owner if none covers this scope. |
| Validity / conditions | Review the proposed 90-day validity in the existing form and any earlier invalidation on change or revocation. Changes require a revised request. |
| Identity confirmation | Use your own verified account and confirm the displayed decision. Do not substitute a seeded approver candidate. |

### The four values you receive

Stoquify supplies the product decision, product approval reference, verified decision timestamp and signature-verification reference. The Copy X1 fields action carries these into the existing intake. Each source column can use the permanent record link when it exposes the corresponding value and evidence.

### Where to find the prepared material

In docs/X1: X1_PRODUCT_PERFORMANCE_APPROVAL_FOR_SIGNATURE_2026-09-03.docx and X1_PRODUCT_APPROVAL_REVIEW_BUNDLE_2026-09-03.zip.

The form is currently unsigned. The technical team must freeze the exact current files when submitting. Existing measurements do not establish that the proposed budgets pass: the September 2 investigation found timing overhead and observations needing clarification.

Product approval authorizes assessment against the agreed budgets. It does not itself authorize credentials, evidence collection or release.

## Case: X1 security and evidence

Authorize the exact credentials, tenants and collection window.

The security/data request can cover several scopes in one record only when the signer has authority for each and the decision explicitly covers each. Otherwise collect the separate decisions and link them in a verified package.

| Information needed | Where to obtain it / what to confirm |
| --- | --- |
| Environment and target | Environment administrator: real non-production origin, database and approved test scope. Current local candidate: stoquify_replay_next_20260830. |
| Fixture tenants and data | Fixture/data owner: authorize tenant rds_org_001 and the rds_org_002 isolation probe if appropriate. Verify data classification and allowed access; these candidates are not approval. |
| Credential reference | Secrets/environment administrator: managed secret name or workload-identity reference and its allowed operations. Supply the reference, never the password or token. |
| Capture account / persona | Administrator: actual authorized evidence identity and permissions. Record any mapping to test personas separately from human approvers. |
| Permitted activity and window | Security/data authority: approve specific read/capture operations, start/end time, date filters and any limits. Do not infer production or write permission. |
| Redaction and retention | Data/control owner: identify what may appear in screenshots/logs, where artifacts may be stored, who may read them and how long to retain them. |
| Decision and confirmation | Each appointed authority reviews their scope and confirms Approve, Reject or Request revision using their own account. |

### The references you receive

Evidence decision, credential approval reference, seeded-data approval reference, verified approval timestamp and signature-verification reference. One complete decision can supply both approval references. Split decisions must retain their individual signatures and times; the package cannot invent a combined signature.

A permanent source link may be reused across fields when it exposes the relevant data and verification. Read-only credentials still require the authorization relevant to this evidence capture.

## Finish X1 and fill the old form

The record provides approval evidence; technical checks establish readiness.

| Existing intake field | Copy from the register |
| --- | --- |
| Product decision | Actual selected product decision. |
| Product approval reference | Issued product decision record ID. |
| Product approval timestamp | Verified product decision time with timezone. |
| Product signature reference | Product confirmation or verified signature-event reference. |
| Evidence decision | Actual security/data decision. |
| Credential approval reference | Record explicitly covering credential use. |
| Seeded-data approval reference | Record explicitly covering approved fixture data. |
| Evidence approval timestamp | Verified time of the complete authorization; retain constituent times when split. |
| Evidence signature reference | Verification evidence covering all required security/data scopes. |

For SOURCE RECORD URI, choose Copy record link. The reviewer must have access. Do not use an expiring download link or the unsigned form reference as an approval ID.

For “Approval register / controlled system”, copy the active register name and owning organization from Register details. The other registration fields come from the decision record above.

### What the technical team does next

Run fresh authenticated evidence after the latest required approval. Collect the 42 route observations across seven routes, two languages and three viewport sizes, with current build, fixture and measurement versions. Assess the other required performance signals and resolve zero-row observations against filters, permissions and actual fixture data.

### What the independent reviewer needs

Current approved scope, test results, evidence artifacts and hashes, timing definitions, fixture reconciliation, and an account/appointment independent of implementation and capture. Obtain technical material from the evidence run and CI; obtain authority from the register. Record the actual pass/fail assessment and reasons.

X1 advances only when its applicable approval and technical conditions pass. Approval of review delegation is not a completed technical review. Production release has its own authorization.

## Other cases the register will serve

Use a template that names the decision and its required authority.

| Case | Information needed from you | Where to get it |
| --- | --- | --- |
| Policy or procedure | Exact revision, purpose, affected scope, effective/expiry dates and decision. | Document owner and previous controlled version; appointing owner supplies authority. |
| Change / production release | Target, release/build, change plan, rollback, test evidence, window and responsible people. | CI/repository and release/infrastructure owners. Execution retains its separate gate. |
| Risk exception | Specific waivable requirement, reason, owner, mitigation and short expiry. | Risk owner and the policy defining what may be waived. Hard controls remain enforced. |
| Appointment / renewal | Real person, account, scope, limits, dates and acceptance. | Owner or authorized delegator; previous appointment and identity records. |
| Revoke / supersede | Existing record, reason, scope affected and replacement if any. | Record page and responsible authority. History is retained; changed content needs a new decision. |
| Paper / external signature | Final signed file, signer identity/authority, claimed signing time and verification evidence. | Original signer and signing provider/audit trail, or the adopted manual verification process. |
| Future purchasing / payroll / accounting links | Existing transaction/approval reference and exact domain scope. | The relevant module. Existing business approvals and financial controls remain authoritative. |
| Optional agent delegation | Bounded actions, authority source, validity and distinct machine identities. | Owner/security/identity administrators. Existing X1 POL-004 is required for that automation path. |

### If the signature is on paper

Upload the final signed scan as unverified. Under the adopted process, the signer can log in and confirm the exact uploaded version, or a designated verifier can check the original and identity through an independently established channel and retain the evidence. Store the claimed signing time separately from upload and verification times. Missing proof remains unverified.

Signing a scan again inside Stoquify creates a current confirmation event; it must not pretend to prove an earlier date. A hash confirms unchanged bytes, not who signed them. External signatures require authentic provider verification, not just a pictured signature.

## Your first setup worksheet

Fill what you know. Write “not yet available” for anything missing.

This worksheet is preparation, not an approval or an appointment. You do not need to supply record IDs, timestamps, hashes or SOURCE RECORD URIs here.

**Organization or personally owned project:** [Fill in]

Source: actual ownership/business records. State whether this initially covers Stoquify development only.

**Your real name, role and account/contact:** [Fill in]

Source: your own details and account profile. The administrator can retrieve the internal user ID.

**Your authority basis / existing source:** [Fill in]

Source: ownership evidence, executive mandate or appointment. If you own the project without an existing appointment document, state that fact.

**Person who can verify initial setup:** [Fill in]

Name, role and contact of someone able to check identity and authority against an independently established source.

**Product decision maker:** [Fill in]

Use a real person from your team or an appointed reviewer, not a seeded candidate.

**Security / data decision maker(s):** [Fill in]

Identify people responsible for security, credential use and fixture data; compatible scopes may be combined where allowed.

**Independent technical reviewer:** [Fill in]

Identify someone independent of implementation/capture, or state that the role is not yet filled.

**Internal confirmation method acceptable?:** [Fill in]

State accept / prefer external signing / need to decide. The establishment record will capture the actual adoption later.

Before activation, the owner and administrator will also complete validity, retention, revocation, real hosting address and private storage settings. The START_HERE worksheet lists those sources. Do not put passwords or sensitive identity documents into this file or chat.
