# HR-10 bounded child slices

Entry: HR-09 VERIFIED scoped evidence. Authorized continuation follows core-HR order HR-10 through HR-19, then HR-21 preparation/acceptance; live-payroll HR-20 and optional expansion remain conditional. No live pilot activation, production data, deployment, legal wording approval or external messages are implied.

## HR-10A — Employee and contract authoring

Reuse PayrollEmployee via HRIS employee owner, contract owner, contract-document evidence owner and lifecycle owner. Thin read composition and UI calling existing protected actions must separate create from update (existing upsert can merge matching employee identities), derive current actor/tenant, retain source-owned exact replay and reject stale updates. Create DRAFT only; expose existing reviewed-document and independent activation/onboarding transitions, and supported profile remedies. No new employee master or schema is planned.

Exit evidence: draft create/edit/replay; duplicate number/linked-user collisions; foreign references; contract draft/document/activation/onboard; service/action tests, real PostgreSQL transaction/uniqueness/rollback and EN/FR starter/renewal browser journeys.

## HR-10B — Compensation and scheduled maintenance

Reuse HRIS salary-change, component, payment-destination and lifecycle owners, preserving current permissions, salary redaction, independent review/application, frozen evidence and effective dates. Show pending changes and existing history. Unsupported repairs remain explicit. Each new operation can be disabled independently for pilot rollout.

Exit evidence: future transfer/leaver/salary facts unchanged today; independent reviews; rejection/rollback/replay; frozen restrictions; restricted-role and EN/FR browser journeys. Consolidated HR-10 acceptance requires both children and independent review closure.

Narrow intended ownership: new read-only people-authoring composition, actions, form/client and manage route; profile/directory links; focused tests and local evidence harness. Existing source-owner changes only for reproduced correctness defects required by these journeys. Read model must not expose raw payment details or undisclosed salaries. Keep approval evidence entry compatible until HR-14's dedicated workflow replaces manual hashes.

Verification commands will use the reviewed isolated mock, PostgreSQL and browser configurations, explicit existing owned loopback target and namespace-bounded fixtures. No application env fallback. Preserve all unrelated shared-checkout edits. Dependency/acceptance evidence is recorded in this directory and appended to the existing execution register.

Architecture adjustment: automatic review rejected a broad combined mutation adapter. It was not created. Existing protected actions remain independent; no added delegated permissions. New requests only expose existing contract activation/document owners with fresh context and pilot gates.
