# HR-10 — Guided employee, contract and compensation administration

**Status: VERIFIED — bounded engineering scope.** HR-10A employee/contract and HR-10B compensation/lifecycle are complete within the supported operations below. Date: 2026-10-24. Dependency: HR-09 scoped evidence. Next eligible slice: HR-11, authorized to continue automatically.

Baseline HEAD: 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886, dirty shared checkout recorded in baseline-status.txt. Changes are uncommitted. No production database, live pilot, legal-template approval, deployment, payment or external message was performed.

## Delivered behavior

- EN/FR /[locale]/dashboard/people/manage is linked from directory and profile, gated by the existing setup pilot and current HR manager role. It composes the single PayrollEmployee master and existing contract, document, payment, compensation and lifecycle owners.
- Explicit draft creation rejects duplicate number/account collisions. Explicit editing binds employee ID and version, preserves omitted legal name and rejects stale writes. Exact profile and contract-create retries recover one outcome; changed payloads conflict. Contract recovery applies current salary redaction.
- An operator can prepare a contract or renewal draft, submit signed-document scan/retention evidence, request independently reviewed activation, complete payment-destination request/review/application, then request/review/apply onboarding. Payment setup now accepts draft starters and active employees; lifecycle/payment concurrency is serialized and later ineligible status is rechecked.
- Salary request/review/application keeps the existing three-person rule; future contract versions leave today's current-contract selection correct. Employment changes remain pending until effective. Pending history and source blockers are visible; approval inbox remains the rejection/recovery owner.
- Form drafts cannot silently move between employees. Stale navigation responses cannot replace a later selection. Refresh adopts current profile values with their version. Errors retain fields; committed writes with failed refresh are distinguished. Salary review is unavailable when source amounts are redacted.
- Supported corrections are profile fields and the source-owned request/review/apply transitions. Reviewed contract wording, employee-number reconciliation and component-definition changes are explicitly directed to responsible source workflows. Direct editing of an existing contract draft and generic component-catalog authoring are not provided by this page; contract preparation creates a new draft. No approved wording or country rules are generated.

## Acceptance

| Criterion | Result | Evidence |
|---|---|---|
| AC01 draft to approved effective employment without DB edits | PASS | Real owner-driven starter test and EN/FR browser starter reach ACTIVE through separate document, contract, payment and lifecycle actors |
| AC02 duplicate identities and tenant isolation | PASS | Concurrent create/retry, duplicate number/account, foreign user/location/employee and rollback cases |
| AC03 future employment and compensation leave today correct | PASS | HR-10 salary/current-contract and scheduled-leaver cases; shared HR correctness future-transfer regression; browser pending change/status |
| AC04 independent approval and retained frozen history | PASS | Own document/contract/lifecycle approval denial, salary/payment three-person application; lock/status race tests; shared 60-case frozen/correction/scope regression |
| AC05 visible supported blocker remedies | PASS | Profile/account, contract/document, payment and lifecycle forms; time setup link and explicit unsupported/frozen remedies; EN/FR rendered journeys |

## Verification classes

- Source: current owners, protected action permissions and existing graph relationships inspected. Independent reviewer closed R1–R7; see INDEPENDENT-REVIEW.md.
- Mocked unit/action/component: **56/56**, six suites, unit-final.log. New request-action tests mock protect, check server identity override, fresh-context consistency, pilot call and enforced-module options. Existing protected actions retain their original server controls.
- Real PostgreSQL: **13/13 HR-10 suite cases**, including one integrated browser case, postgres-browser-final.log. **60/60 shared correctness cases**, prior-correctness-postgres.log. Target strictly loopback 127.0.0.1:55464 / stoquify_local_hris_20261024; synthetic namespaces only, per-suite cleanup asserts zero owned organizations.
- Browser: two complete EN/FR starter→salary→renewal-draft→scheduled-leaver journeys with requester/checker/applier/limited role switches; six resulting 360/768/1440 captures, plus four limited/denied EN/FR captures = **10 recorded results**. Keyboard submit/status focus, restricted forms, no overflow and no JS errors checked. Actual React/project CSS and real services/PostgreSQL; synthetic HTTP role cookie. Not a full Next/BetterAuth/production-entitlement or screen-reader certification. Screenshots were inspected; status/event/document labels are localized.
- Focused TypeScript: **0 diagnostics**, no emit/incremental metadata. Workflow contract passes; 196 unrelated commands remain outside reviewed manifest. No schema change or schema promotion. Whitespace check recorded separately.
- Provider, qualified legal/HR policy and production activation checks: **NOT_RUN**, outside this engineering slice. Actual mandatory fields, reviewed templates and operator identities still require employer agreement before rollout.

## Ownership and release

Exact owned file hashes and command logs are in evidence.json. New read composition retains owner audit writes. No new employee master, approval engine, schema, package or role broadening. The rejected combined mutation adapter was replaced with client dispatch to existing actions; no rejected code was installed. Earlier failing runs and review repairs are retained as historical evidence, superseded by the final lanes above.

Rollout: enable only reviewed pilot organizations after actual employer acceptance. Entry-page pilot gating does not revoke existing source actions; those retain their current permissions. To roll back this guided entry, remove its pilot access/navigation and new contract request entry points while preserving issued IDs, contracts, approvals, events and effective history. Do not delete imported or approved history. Individual source workflows remain governed by their existing authorization and deployment controls.

Review lenses: architecture/backend/data/security/privacy/UX/product/quality/release/SRE/SaaS applied through existing ownership, exact replay, stale protection, current roles/redaction, audit/locks, failure recovery and scoped pilot evidence. HR/records/compensation controls retained. Statutory/finance: no new legal rules, tax calculations or accounting postings. Providers, AI, POS/inventory, purchasing and recruitment: not applicable to changed surfaces.
