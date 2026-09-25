# Stoquify Approval Register — start here

**Setup worksheet · 3 September 2026 · Draft; completing this file creates no authority or approval.**

The proposed register will generate IDs, timestamps, hashes and links. You will not need another approval platform to obtain them. First we need the real people and the business authority behind decisions. Write **“not yet available”** where necessary; do not invent references.

## Information to provide now

| Question | Your answer | Where to obtain it |
| --- | --- | --- |
| What organization or personally owned project operates the register? Initially Stoquify development only? | **[Fill in]** | Project/business ownership records and intended scope. A fixture tenant is not automatically the owner. |
| What is your real name, role and work email / existing Stoquify account? | **[Fill in]** | Your details and account profile. An administrator can retrieve the internal user ID later. |
| Are you the owner, a director, or a delegated decision maker? What establishes that authority? | **[Fill in]** | Ownership record, executive/board mandate, contract or appointment. If you independently own the project without an appointment document, say so; prepare an owner establishment declaration with supporting ownership evidence. |
| Who can verify the owner's identity and authority for initial setup? | **[Name / role / contact, or not yet available]** | A suitable authorized colleague, officer or project representative able to check an independently established source. A second login for the same person is not independent verification. |
| Who handles product, security/data, and independent technical review? | **[Real names / roles / contacts, or missing roles]** | Actual team or appointed external reviewers. Compatible scopes may be combined where documented; independent review and stricter domain rules still apply. |
| Is authenticated confirmation inside Stoquify suitable for your internal approvals? | **[Accept proposed method / prefer external signing / need to decide]** | Owner's process decision. If another method is required, identify the requirement and its source. |

Do not paste passwords, tokens, private keys or identity-document scans into chat or commit them to this repository. The working register must provide private uploads for authority evidence. Sensitive personal details can be supplied through setup once built.

## Information before activation, with administrator help

| Item | Proposed starting point | Final source / responsible person |
| --- | --- | --- |
| Register name and scope | Stoquify Approval Register; development and non-production X1 first. | Owner confirms organization and scope. |
| Authority limits/conflicts | Scoped appointments, expiry, product/security separation as default, independent technical review. | Owner and responsible control/release personnel confirm matrix and permitted combinations. |
| Decision validity | Product form proposes 90 days; security permission covers a specific capture window. | Product/security authorities choose dates; system validates them. |
| Retention / archive owner | Proposed pilot setting: retain all register history with deletion disabled; agree the archival policy before production use. | Owner explicitly adopts the pilot setting; records owner supplies the applicable longer-term policy. No universal legal period is assumed. |
| Register address | Protected page under the approved Stoquify HTTPS origin. | Deployment administrator obtains origin from hosting; system generates each record path. |
| Evidence storage / recovery | Private versioned storage, restricted downloads, recoverable backups. | Infrastructure administrator supplies configured storage reference and restore evidence, never raw secrets here. |
| Revocation / recovery | Named owner/delegate; logged events; independently checked recovery. | Owner appoints responsible people. Recovery cannot silently appoint a new owner. |

## For X1 product approval

Open the prepared request, read the exact product form and source bundle, choose **Approve / Reject / Request revision**, and confirm identity. Stoquify supplies product approval reference, decision timestamp, signature-verification event and SOURCE RECORD URI after the actual decision. You do not invent these values.

Existing form: `docs/X1/X1_PRODUCT_PERFORMANCE_APPROVAL_FOR_SIGNATURE_2026-09-03.docx`; its review bundle is beside it. Submission must freeze and hash the exact current versions. Budget approval does not mean performance tests passed.

## For security and evidence authorization

Confirm exact non-production environment, allowed actions, credential **reference**, fixture tenants/data, capture identity, collection window, redaction and retention. Obtain these from the environment administrator, secret-store metadata and data owner. Prepared local database/tenant values are candidates to review, not authorization. A record may cover credentials and seeded data together only if signer authority and explicit decision cover both.

## What happens next

After implementation and establishment, verified product/security approvals can satisfy corresponding X1 conditions. Fresh measurements, the 42 route observations and independent technical review must satisfy the remaining gate. New appointments, policy revisions, changes, revocation and renewal then use the same register.

See `STOQUIFY_APPROVAL_REGISTER_OPERATING_GUIDE_2026-09-03.docx` for daily instructions and every case, and `STOQUIFY_APPROVAL_REGISTER_BLUEPRINT_2026-09-03.md` for the implementation plan.
