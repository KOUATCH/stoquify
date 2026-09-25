# Organization setup and account handoff

Implementation record, 6 September 2026. This guide describes the supported account model. The accompanying checkpoint receipt records verification and its limits.

## What changed

Settings → Company now offers **Set up another organization** / **Configurer une autre organisation**. It opens guidance with links to owner registration and sign-in. The former create operation could save an active company and an administrator role without any owner, membership or creation audit; the new company then disappeared from the tenant-scoped directory. That operation now rejects the unsupported transition without writing records.

Stoquify currently stores one organization on each user and makes email addresses unique across users. It does not yet support one account belonging to several organizations. Signing in to a separate company's account is the supported existing-account handoff. Multi-organization membership and a switcher remain engineering work.

## Create a company with its owner

1. Open **Settings → Company → Set up another organization**.
2. Choose **Open owner registration**. It opens in a new tab; opening it does not change the current workspace or create a company.
3. The intended owner completes the registration steps and reviews the company and requested capabilities.
4. The owner explicitly submits the reviewed registration. The existing registration service creates the company, scoped administrator role, owner, credential and registration audit together.
5. Follow the verification screen. A created account remains unverified until the owner completes email verification. Creation alone does not establish subscription eligibility, operational setup, statutory approval or X1 completion.

If someone else will own the company, give that person the registration link. They enter their own password and acceptance. Do not fill another person's credentials or accept terms on their behalf.

| Input | Who supplies it | Where to obtain it |
| --- | --- | --- |
| Business purpose and requested capabilities | Intended owner or business lead | Their actual operating needs; capability selection records intent, not activation evidence |
| Company name and displayed regional/business details | Intended owner | The company's existing records and agreed operating setup |
| Owner name and contact details | Intended owner | Their own identity and contact details |
| Owner email | Intended owner | A mailbox they control, using an address not already registered in Stoquify |
| Password and confirmation | Intended owner | Create a password meeting the displayed policy; never supply it in an approval document or support ticket |
| Required registration acceptance | Intended owner | Read the terms linked in the form and provide their own acceptance |
| Email verification code | Intended owner | The verification message for this registration, when delivery is available; never invent a code or mark delivery complete from a local test |

The isolated verification environment sends no external email. Local registration evidence therefore does not prove live email delivery or the entire onboarding journey.

## Use an existing company account

Save unfinished work first. From the same guidance dialog, choose **Sign in to an existing organization** and enter that account's existing credentials. Sign-in changes the browser's active account across tabs. Reload existing application tabs and confirm the displayed company before continuing work.

Obtain credentials from your own account setup or authorized invitation workflow. If you do not have access, ask the company's administrator to arrange it; knowledge of a company ID does not confer access. Use the existing password recovery process if necessary. This is separate-account sign-in, not a multi-organization membership switch.

## Failure and recovery

- Closing the setup dialog makes no records and returns focus to its opener.
- Keep a registration draft when the form reports a recoverable failure. Follow the displayed retry interval; do not repeatedly create accounts to resolve uncertainty.
- If registration may have completed, use its verification handoff or the existing recovery route. Do not ask an operator to reset abuse counters or manually mark the owner verified.
- Login fields remain disabled until their submit handler initializes. Both login forms use POST and suppress referrer information. A failed sign-in preserves entries for correction; passwords must not appear in URLs or retained evidence.
- Existing ownerless organization records require individual reconciliation. This change does not delete them, assign an arbitrary owner, or transfer membership. An operator must identify the affected company, intended owner and original creation circumstances before a separately reviewed repair.

## Review and rollout limits

No schema migration, database reset, live customer activation, external message or production deployment is included. Preserve current tenant and permission guards. A source rollback does not undo accounts already registered; reverting to the old ownerless-create operation would restore the demonstrated defect.

The component reuses the existing dashboard dialog, semantic tokens and buttons, with EN/FR text, explicit new-tab names and opener-focus restoration. Native screen-reader, browser zoom, comprehensive contrast, complete sign-in failure/recovery coverage and full multi-organization lifecycle review remain open. The organization directory's legacy CSV export is a separate workflow requiring further review.

## Review responsibilities for this batch

| Responsibility | Evidence or bounded conclusion |
| --- | --- |
| Architecture, backend and API | Current single-organization user model verified in source; unsafe create boundary rejects without effects; existing owner registration reused |
| Database and migration | Actual local records show one owner, credential and registration audit per successful registration; current organizations, credentials, roles and grants unchanged; no schema change |
| Security, IAM and privacy | Fresh/current actor identity bound at the legacy action; tenant-scoped directory checked after separate-account sign-in; login initialization and credential-URL defect corrected; no claim about all provider/session paths |
| Frontend, UX, accessibility and localization | EN/FR actual journeys, dialog keyboard focus return and 390/768/1440 reflow verified; native assistive technology and complete visual accessibility remain open |
| Product and operations | Company setup now leads to a usable owner account instead of an inaccessible company row; guide identifies the responsible person and source for each input |
| Audit and records | Registration audit checked against persisted effects; existing ownerless records are retained for controlled reconciliation; no invented retention policy |
| Quality and release | Focused test, typecheck, lint and actual-browser evidence bound to source v31; platform and full release verification remain incomplete |
| SRE, performance and cost | Local route-ready observations are 17,312 ms EN and 11,070 ms FR; development observations only, without an approved performance-budget claim; no infrastructure/provider addition |
| SaaS packaging and support | Requested capabilities remain setup intent; no prices, entitlement, billing or live-customer activation inferred from registration |
| Finance, reconciliation and ledger/close | No accounting transaction, financial record or ledger mutation in this batch; no professional approval supplied |
| OHADA, statutory and country rules | Not applicable to changed behavior: no statutory calculation or country rule is changed; selected setup details are not compliance evidence |
| POS/offline, purchasing/AP and HRIS/payroll | Not applicable to changed behavior: no domain transaction or offline replay path is changed |
| Analytics and data governance | New workflow coverage and immutable source evidence recorded; no analytics calculation changed |
| Payments/providers and API/events | No payment provider or new event consumer; registration's existing email delivery remains unverified against a live provider |
| AI and agent governance | Not applicable to changed behavior: no agent, model, automated approval or action authority is introduced |
| Rollout and recovery | Preserve current controls and signed-in tenant scope; use the existing owner workflow; do not automatically repair old orphan records or clear X1 |

These are engineering review responsibilities, not independent professional approvals.
