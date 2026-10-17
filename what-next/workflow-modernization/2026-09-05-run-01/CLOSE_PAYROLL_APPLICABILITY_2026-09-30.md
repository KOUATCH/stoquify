# Close payroll-pilot applicability

## Delivered correction

The July 2 payroll close-pack integration report scopes the pilot certificate requirement to a payroll close period. Current source required it even when the organization had no payroll period. It also selected the newest audit across all period runs, allowing one run's certificate to stand in for another. Both are corrected in `services/accounting/close-assurance-pack.service.ts`.

Applicability now comes from tenant-scoped persisted payroll periods: explicit accounting-period linkage **or** overlapping period dates. Module entitlement and navigation do not determine retained obligations. A successful query with no matching periods records `NO_RECORDED_PAYROLL_PERIOD` / `NOT_APPLICABLE`, no certificate and no pilot blocker. This is a bounded statement about recorded activity, not an assertion that all real-world payroll obligations are absent. Failed queries propagate and cannot become that result.

Any matching period requires payroll evidence. Missing runs and missing/wrong accounting-period links block certification. Each retained run needs its own latest matching pilot audit; an earlier passing audit cannot override a later blocked evaluation. Exports retain the redacted per-run certificate summaries. All other readiness, trust, inventory freshness, invalidation, permission, fresh-authentication and separation-of-duties gates remain effective.

## Verification and evidence

- `evidence/inventory-freshness-checks-9b51949c-104c-4217-9eaf-badf2f4d53b3.json`: 151 tests in five suites, changed-file lint and the repository's TypeScript command pass. Includes no-period applicability, failed query, unlinked period/missing run, uncovered second run and later blocked evaluation.
- `lanes/environment/close-payroll-applicability-dde18ac1-d803-44b3-a7d4-066417a95837.json`: actual assessment and draft exports on the guarded disposable database; no-period result, unlinked overlapping period, two separately blocked runs, and foreign-tenant period exclusion pass. No journal, payment or certified pack is created. Draft payroll rows are explicitly synthetic and unapproved.
- `lanes/environment/close-payroll-browser-34db658d-cf9a-4666-bf56-e8e34be2d0ca.json`: actual EN 1440px / FR 320px keyboard assessment and downloaded JSON; two required run certificates remain missing, certified controls remain disabled, inventory evidence is fresh, and downloaded/stored hashes agree. Both screenshots and downloads are retained beside the receipt. Financial source records remain unchanged.
- AST comparison against the exact pre-change archive verifies that only the pilot annex type and payroll evidence loader changed. Prior signing/preparation dependencies use unchanged invalidation functions; their previous runtime evidence remains applicable to that unchanged boundary. The new impact review binds the exact predecessor hashes instead of silently refreshing them.

The first edit-script invocation failed syntax parsing before any source writes. The first test run retained in `inventory-freshness-checks-0a5c8d16-1f47-4525-b03c-2bdb8489a3a7.json` had 150 passes and one erroneous test property path (`certification` instead of `export`); the assertion was corrected without relaxing product behavior.

Browser route readiness was 17,446ms EN / 12,812ms FR; assessments 5,037ms / 2,939ms. Export observations 12,185ms / 9,744ms include assertions/screenshots. Request interception disables browser cache; these development measurements do not establish a production performance pass.

## Operator guidance and rollout

Open `/en/dashboard/accounting/close/<periodId>` or the FR equivalent, run an assessment, and download a draft. Inspect `annexes.pilotCycleCertification.saved`: absent recorded periods show the bounded applicability reason; payroll periods show per-run evidence. For missing links, the payroll/accounting operator must identify the correct existing accounting period from its dates and approved accounting calendar. For missing certificates, use the real payroll pilot workflow and its required owners/evidence; do not create placeholder approvals.

No migration is required. Regenerate assessments/exports after rollout; retain older downloads as historical artifacts. Reverting this change reintroduces the overbroad no-payroll gate and incomplete multi-run check, so do not treat that as a safe production fallback. Keep affected certified exports withheld if rollout verification fails.

Architecture/backend/data/control/audit/QA reviews cover query scope, retained period membership, deterministic latest-per-run selection and additive redacted export metadata. UX/localization review covers the unchanged EN/FR controls and actual downloads; native speech and browser zoom remain unverified. Commercial review: selection cannot suppress the gate. Statutory approval is not supplied by this change. AI, offline/POS and provider transport changes: not applicable; no such behavior changed.

The no-payroll runtime still correctly reports accounting setup not ready and T2 trust. Next: complete the existing accounting setup lifecycle on an owned fixture, then trace actual eligible close certification. Broader recovery/accessibility, source-change concurrency and production-volume performance remain open. Cash and the overall modernization assignment remain incomplete.
