# R00 validation guide

R00 GUIDE | Revision 1.0 | 7 October 2026

DRAFT — AWAITING HUMAN VALIDATION

Organization or project legal owner: [To complete]

Start with the decision workbook. Confirm what the first supported product will include, appoint real reviewers, and record each decision against an exact version. These are internal governance templates, not statutory forms. No signature or approval has been supplied.

| Document | Use and who completes it |

| --- | --- |

| 02 Decision workbook | Owner drafts answers to D01–D08; each relevant specialist reviews their scope. One brief and one response page per decision. |

| 03 Reviewer appointments | Owner/delegator proposes named appointments; appointees accept and a verifier checks authority and independence. |

| 04 Approval record | Duplicate for each decision and signing authority. Reviewers record conclusions; authorized decision maker records the outcome; verification follows. |

| 05 Evidence and open items | Delivery lead tracks evidence, missing people/answers, restrictions and R00 acceptance. This document itself needs no signature. |

What you can decide yourself

If you hold the relevant project/business authority, you can choose the target customer and product scope (D01), optional priorities (D06), propose appointments and accept commercial constraints. Final D01/D06 decisions still require joint concurrence from the roles in document 03. Your authority is not established by this pack; complete the authority fields. D03 and D08 require operational/security or release input. D07 requires SRE and finance input.

What needs another reviewer

D02 needs qualified accounting review. D04 needs privacy/records, HR and security review. D05 needs qualified Cameroon expertise and provider/submission authority for each capability. Independent technical review cannot be supplied by a second account for the implementer. Compatible roles may be combined only where the adopted policy and stricter domain controls permit it. [S5, S6]

What you sign

First confirm appointments in document 03 after authority checks; each appointee accepts. Then use document 04 for the exact completed decision sheet and its evidence. Do not sign a blank proposal or approve all eight decisions through an unexplained blanket signature. The guide and checklist are working aids.

How to validate and return the pack

<!-- page break -->

1 Read the brief

Open document 02. Read the confirmed facts, proposal, alternatives and due gate for each decision. A proposed recommendation is not your selected decision.

2 Complete the response

Answer every numbered question. Enter the exact selected option and rationale. Use “not yet available” for missing facts; do not invent thresholds, legal periods or reviewer names.

3 Check supporting evidence

Open each cited item. Check scope, date, version and whether it actually supports the choice. Ask for demonstrations or worked examples where a policy affects calculations or workflow.

4 Appoint reviewers

Use document 03. Establish names, relevant qualifications, authority, scope, validity and conflicts. Obtain acceptance. If a role is missing, assign someone to obtain it and record the capability restriction.

5 Obtain scoped conclusions

Give the relevant specialist the sheet and evidence. Ask what is correct, uncertain and missing, what cases were checked and what would invalidate their conclusion. Do not turn a technical review into legal certification.

6 Record the outcome

Use document 04: approve, reject or request revision. Conditional approval requires named conditions, owners and due gates and is not final acceptance. A deferral/not-applicable decision needs a reason and capability restriction.

7 Freeze before signing

Resolve edits, identify final revision, filenames and pages, and freeze the evidence bundle. A custodian can calculate a SHA-256 file digest to detect later changes. A digest does not prove identity or approval.

8 Sign and verify

Use the adopted internal method. Paper: sign the exact final pages, retain the original, scan and verify identity/authority through an established channel. Native confirmation may be used only if the deployed register and verification process are available and qualified; its availability is not established here.

9 Return privately

Place completed documents and authority evidence in an access-controlled approved repository. Send only a secure reference to the custodian. Do not commit identity scans, signatures, private employee data or credentials to the public code repository.

10 Reconcile and maintain

Custodian checks exact version, scope, signer authority and verification, then records the decision. Keep signing, receipt and verification dates separate. Changes or revoked authority require a new review; retain superseded/revoked history.

Acceptance limits and a worked example

<!-- page break -->

R00 can advance when every in-scope capability has a named accountable owner, release boundary, acceptance scenario and evidence location; decisions and valid deferrals are recorded and reviewer appointments are verified. Later-stage decisions need owners, due gates and operating restrictions. The delivery lead prepares the evidence and product owner/QA lead review it. R00 is not complete merely because forms exist. [S2, S8]

After R00, the actual software and operating evidence must still pass the relevant gates: security/tenant isolation, data and financial integrity, HRIS/payroll workflows, country/provider qualification, build and authenticated browser checks, recovery and pilot/release acceptance. Scope approval is not production, payment or filing authorization. No legal conclusion about signature enforceability is made by this internal guide.

Fictional example only not an approval

Example D06: Fictional owner A, supported by fictional customer B, selects “defer customer-cohort analytics for the first pilot.” Reason: the fictional pilot has no reviewed customer-identity/consent dataset or defined retention-analysis need. Restriction: no cohort-analytics capability is promised or enabled for that pilot. Reopen when a customer requirement and suitable data/consent review exist. Fictional domain reviewer C agrees only with this scope decision. Evidence: a fictional customer interview and data assessment. These names and references are illustrative, do not appear in live appointment fields, and confer no approval.

Sources and reuse

S1 defines these eight R00 decisions; S8 defines package gates. S2 is the current execution record. S3 confirms your operating choices; S4 records research limits. S5/S6 provide the existing appointment and verification process. S7 is used only to prevent mistaken reuse of separate POS G1 decisions or unverified people/signature images. R00 D01–D08 is not POS G1 D-01–D-11.

This pack adapts the existing process to R00 because the existing X1/G1 forms approve different objects. It does not replace those controls or create a new approval platform. Source paths and hashes are listed in SOURCE_INDEX.md and decision-data.json beside these documents.
