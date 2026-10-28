# Refined Prompt: 20 Common SMB Fraud Patterns In OHADA And African Markets

Date: 2026-07-11
Workspace: E:\ohada saas\Focused projects\stoquify
Target output: Fraud mitigation report for `docs/fraud-mitigation`

```md
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Act as a senior enterprise SMB fraud-control and OHADA/African business operations team:
- Fraud risk analyst: identify the most common fraud and malpractice patterns affecting SMBs in OHADA-zone and wider African markets.
- SMB operations expert: explain how these frauds happen in real businesses such as shops, wholesalers, restaurants, pharmacies, hardware stores, distributors, schools, clinics, and service businesses.
- Accounting and internal-control expert: explain the financial, operational, tax, cash-flow, inventory, and trust consequences.
- Cybersecurity and access-control specialist: propose system controls such as RBAC, maker-checker, audit trails, alerts, reconciliations, approvals, and evidence requirements.
- Product architect: translate each fraud risk into practical features AqStoqFlow/Stoquify should implement.
- Layman-friendly communicator: explain everything clearly so SMB owners, managers, accountants, investors, and non-technical readers can understand.

## Mission

Create a clear, practical, owner-friendly report on the 20 most common ways fraud is carried out in SMBs in the OHADA zone and Africa in general.

The report must explain:

1. The fraud or malpractice
2. How it is usually carried out
3. The consequences for the SMB
4. What the business should do to limit the damage
5. Concrete system controls and product features AqStoqFlow/Stoquify should implement to mitigate or reduce the fraud

Use simple language, practical examples, and business-focused explanations.

Do not claim fraud can be completely eliminated. Explain that the system can make fraud harder to perform, harder to hide, faster to detect, easier to investigate, and riskier for dishonest behavior.

Prefer phrases such as:
- theft-resistant
- fraud-resistant
- evidence-controlled
- audit-ready
- owner-visible controls
- accountable workflows

Avoid absolute claims such as:
- theft-proof
- fraud-proof
- impossible to steal

## Required Fraud Categories

Cover 20 major fraud patterns, including but not limited to:

1. Inventory theft and stock shrinkage
2. Fake damages, expiry, and write-offs
3. Cash skimming and unrecorded sales
4. Sales void and cancellation abuse
5. Refund and return fraud
6. Unauthorized discounts and price overrides
7. Supplier overbilling and inflated purchases
8. Fake supplier invoices
9. Duplicate supplier payments
10. Supplier payment diversion through changed bank/mobile-money details
11. Short receiving from suppliers
12. Branch or warehouse transfer leakage
13. Customer collection theft
14. Unauthorized receivable write-offs
15. Payroll ghost workers
16. Fake overtime and attendance manipulation
17. Expense, petty cash, and staff advance abuse
18. Mobile-money, bank, and settlement reconciliation fraud
19. Master-data tampering, such as product prices, units, tax codes, supplier details, and user roles
20. Shared passwords, excessive permissions, and insider access abuse

You may add related examples such as delivery fraud, field sales leakage, production yield manipulation, tax document manipulation, or owner override abuse where useful.

## Output Structure

Start with an executive summary written for SMB owners.

Then provide a table with these columns:

- No.
- Fraud pattern
- How it is carried out
- Consequences for the business
- Controls to limit damage
- Concrete AqStoqFlow/Stoquify system solution

After the table, explain each fraud pattern in more detail using this structure:

### [Fraud Name]

**What it means:**
Explain in simple language.

**How it is carried out:**
Give practical examples from African/OHADA SMB operations.

**Consequences:**
Explain impact on cash, stock, profit, customer trust, accounting, tax, operations, staff culture, and owner decision-making.

**How to limit the damage:**
Explain business controls, staff procedures, approvals, reconciliations, and management practices.

**Concrete system controls to implement:**
List specific platform features such as:
- immutable ledgers
- physical counts
- blind counts
- variance workflow
- maker-checker approval
- user permissions
- fresh authentication
- audit trail
- evidence uploads or evidence hashes
- receipt numbering
- shift close and cash count
- bank/mobile-money reconciliation
- supplier invoice matching
- duplicate detection
- approval thresholds
- owner alerts
- exception dashboards
- accounting close blockers

**Positive impact:**
Explain how the control protects the owner, improves efficiency, increases trust, improves accounting accuracy, reduces losses, and makes the business easier to manage.

## System Control Themes To Include

Explain these themes in plain language:

1. Service-owned truth
Important business records should be created by trusted system workflows, not by silent manual edits.

2. Immutable audit trail
The system should remember who did what, when, and why.

3. Maker-checker approval
The person who creates a sensitive action should not be the same person who approves it.

4. Evidence-controlled actions
Sensitive actions require proof, such as receipts, count sheets, delivery notes, payment confirmations, or document hashes.

5. Reconciliation
The system compares records that should match, such as sales versus cash, purchase order versus goods received, and payroll register versus payment batch.

6. Owner-visible exception dashboard
Owners should see risks and unresolved issues directly, not hidden inside technical reports.

7. Role-based access control
Users should only access the actions needed for their job.

8. Period close and locks
Closed accounting periods should not be changed casually.

## Tone

Use a calm, professional, reassuring tone.

The reader should feel:
- "I understand how fraud happens."
- "I understand why it damages my business."
- "I understand what controls are being added."
- "I understand how this system helps me manage with more confidence."

## Final Summary

End with a simple summary answering:

1. What are the biggest fraud risks for SMBs?
2. Which controls matter most?
3. How does AqStoqFlow/Stoquify reduce the damage?
4. Why does the business become more trustworthy, efficient, and easier to manage?
5. What should be implemented first for the highest protection impact?

## Deliverable

Produce a polished report titled:

"20 Common SMB Fraud Patterns in OHADA and African Markets, and How AqStoqFlow Controls Them"

The report should be suitable for:
- SMB owners
- managers
- accountants
- investors
- product team
- implementation team
- sales and onboarding teams
```
