# Cash Command currency and shared presentation

2026-09-30T10:09:04.731Z. FA-CASH-COMMAND remains In progress. No workflow was added or closed.

## Corrections and user benefit

Cash Command omitted the tenant currency when rendering BIRiskOpportunityRadar. That shared component defaults to XAF, so a EUR or USD source amount could display the wrong unit. The dashboard now passes data.currency and locale; amounts are not converted or recomputed. Three focused cases cover EN/EUR, FR/EUR and FR/USD. A real isolated EUR tenant verifies a 125,000 EUR employee-recovery risk against the authoritative service value and rendered page.

The action board and evidence legend accept an optional locale, preserving English defaults for other consumers. Cash passes its locale through severity, state, evidence and freshness badges. French empty guidance, drawer metrics and module-control labels are localized. Shared typography, tokens, tone meanings and component structure are preserved. Selection, approval, operational health and evidence grades are not reinterpreted.

## Verification and scope

- 87 tests in three suites, changed-file lint and full TypeScript passed: [receipt](evidence/cash-presentation-checks-2b770803-f52d-4386-ab1c-6200fc5a5b7c.json). Existing shared English-default checks remain in the suite.
- Four actual views passed: populated and permission-restricted EN desktop (1440px) and FR mobile (320px), reduced motion and New York browser timezone. No page errors or horizontal overflow. EUR risk money, localized statuses, legend and empty guidance verified. Screenshots and timings: [runtime](lanes/environment/cash-presentation-16cee833-13ae-48a9-b1af-3724fa067d5d.json).
- Guarded disposable PostgreSQL fixtures; real authorization and service reads; external browser traffic fenced. Balance records, payment counts and journal counts remained unchanged during reads. Synthetic source records establish display/read behavior, not posting, payment or approval readiness.
- Failed first test attempt retained: [receipt](evidence/cash-presentation-checks-bc1914eb-32f1-41fd-9c59-98d425e240d2.json). Two French amount matchers normalized narrow/no-break spaces; the third expected high severity from a critical fixture. Corrected expectations retain exact currency and severity assertions. No failing business control was relaxed.
- Development view times were 11.3s, 9.0s, 7.1s, 4.9s. These include route loading/compilation and are not production budgets or certification.

## Review and operation

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command through an authorized organization. Risk values use that organization's currency. Restricted data remains omitted. Empty lists do not establish absence of risk. The proof legend explains evidence grades without granting authority.

Architecture/frontend/product/localization review: reuse existing presentation contracts and default compatibility. Finance/data review: preserve source amounts, nulls, grades, permissions and tenant currency. Security/privacy review: no change to admission; restricted views verified. Quality/SRE/rollout review: focused regression, local runtime evidence and no schema/deployment change. Statutory rules, commercial terms, integrations/events and AI behavior: not applicable to this presentation correction. No professional certification is claimed.

No migration or setup is required. If reverting, reverse only this renderer locale/currency patch, preserving earlier source-access, proof and UTC corrections. Other consumers remain on their prior default until explicitly localized. Server descriptions and action labels are still visibly English in the French screenshots; full EN/FR is not complete. Remaining proof subjects, genuine posted payroll, complete accessibility and latency requirements remain recorded in the workflow register.
