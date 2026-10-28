# Skill 15 Self-Service Development Authorization

Recorded at: 2026-07-19T20:03:55.427Z  
Environment scope: `DEVELOPMENT_AND_TEST_ONLY`  
Authorization status: `ACCEPTED_FOR_DEVELOPMENT_EXECUTION`  
Production use allowed: **No**

## Authorization source

The workspace user authorized Skill 15 self-service execution in the active Codex task and clarified that the platform remains in development mode and needs authorization-dependent paths available for comprehensive HRIS testing.

User instruction:

> Given that we are still in dev mode and want to test all the aspects of the HRIS, we will need to unblock gates when authorization is required so we can develop all aspects of the platform. Please consider this the signed authorization for the Skill 15 execution block.

The user's real-world identity and signature were not independently verified by Codex. This record proves the development instruction captured in the workspace, not legal identity or non-repudiation.

## Authorized scope

- Execute and verify `aqstoqflow-hris-payroll-15-self-service` in development and test environments.
- Exercise employee-own, manager-scoped, payslip, redaction, navigation, route, responsive, accessibility, and negative-RBAC test paths.
- Create clearly marked non-production fixtures and test evidence when necessary.
- Continue to Skill 16 browser/accessibility verification using development-only sessions and data.

## Controls that remain mandatory

- Tenant isolation and own-employee access checks.
- Manager scope and delegation boundaries.
- Server-owned approvals and maker-checker separation.
- Sensitive-field redaction and audit evidence.
- Fresh authentication for sensitive exports or changes.
- Test-data labeling and separation from production data.
- HRIS ownership of people truth and payroll consumption of certified snapshots.

## Explicit non-authorizations

This development authorization does not:

- certify Cameroon statutory formulas or country-pack legal correctness;
- substitute for qualified reviewer identity, fixture-family decisions, or a signed statutory approval artifact;
- permit production payment release, declaration submission, accounting close certification, or provider/authority calls;
- permit bypassing tenant, employee, manager, RBAC, redaction, audit, or maker-checker controls;
- permit client state to become HRIS approval or payroll truth;
- mark the overall HRIS/payroll system production-ready.

## Decision

Skill 15 development execution is authorized and unblocked. Skill 16 development/browser verification may proceed. Production-readiness gates remain fail-closed until their distinct evidence requirements are satisfied.
