# DBakes pilot — confirmed scope and setup sheet

Recorded 25 October 2026 from the user's replies. This sheet records assignments; it does not create accounts, grant permissions or record acceptance on anyone's behalf.

| Item | Confirmed value / remaining action |
|---|---|
| Company | DBakes; legal entity identifier still to be confirmed |
| Country | Cameroon (CM) |
| HR operator | Shagang Oliver |
| Independent reviewer | Bolimare Solange |
| Payroll input recipient | Kouatchoua Ronald |
| Environment | A separate test environment for DBakes, selected by the user |
| Delivery mode | HR_CORE_WITH_HANDOFF; no live payroll processing |
| Workforce | Office and shifts, within the agreed 1–200 employee scope |
| Overnight policy | Entire shift assigned to its local start date |
| Proposed timezone | Africa/Douala, to be confirmed in employer configuration |

## Ordered environment preparation

1. Identify the hosting account/project and test URL, infrastructure owner, isolated database and protected-document store. The owned local synthetic PostgreSQL verification database is not the DBakes deployment. No production configuration or employee data should be copied by assumption.
2. Build the reviewed candidate, inspect its cumulative migration baseline and retain the artifact/schema checksums. Apply only the reviewed deployment procedure to the named test target after the deployment action is authorized.
3. Bind the three named people to verified tenant accounts through the existing identity flow. Obtain their account identifiers privately through the approved provisioning process; names alone cannot establish identity or permission grants. Keep an independent third payment-destination applier; do not assign this additional responsibility to Ronald without confirmation.
4. Approve DBakes employment, leave, holiday, shift and document retention policies. Configure the existing module/role boundaries and handoff recipient policy with real account IDs, approved template/version and approval reference. Keep unqualified document provider and live payroll admission disabled.
5. Start with synthetic office and shift employees. Run the authenticated UI protocol, tenant/role denials, recovery and cumulative upgrade/restore checks on the selected test candidate. Record provider qualification separately from synthetic storage/scanner tests.
6. Train Shagang Oliver and Bolimare Solange, then record their independent completion of daily tasks. Have Kouatchoua Ronald reconcile exact handoff rows and one correction/replacement. Name employee/manager participants, support and accountable release owners before operator acceptance.
7. Record an accountable pilot decision and limitations. Broader rollout remains a separate release action.

## Inputs still needed for environment activation

Hosting/project or test URL and infrastructure owner; verified account identifiers; support/release owner; employee/manager participants and independent payment applier; approved employer/provider policies; reviewed migration/restore targets. The user's environment selection settles the isolation choice, not these configuration facts. No invitation, external message, real payroll effect or deployment has been performed.
