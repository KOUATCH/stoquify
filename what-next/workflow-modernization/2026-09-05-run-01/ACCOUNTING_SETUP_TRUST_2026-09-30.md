# Accounting setup must be complete before certification

## Reproduction and correction

While following the Cash → accounting setup → close certification dependency, actual setup locking rejected 29 missing prerequisites but the trust service returned T4 and close assessment persisted READY. The owned fixture had accounting enabled, setup IN_PROGRESS, and one balanced manual journal created and independently posted through the real services. No certificate or payment was issued. Receipt: `lanes/environment/accounting-setup-trust-reproduction-5a1bf432-6c1f-4663-b118-3d9b9e4fe7d6.json`.

Root cause: `getAccountantPortalData` selected setupStatus but checked only accountingEnabled. The ledger module's readiness display used the same incomplete condition. Both now require accounting enabled and setup READY or LOCKED. Missing/unknown/in-progress states remain blocked.

Certified close export also checks current tenant accounting settings. A previously saved READY assessment cannot bypass incomplete current setup. Actual export refusal against the pre-fix saved assessment is recorded in `lanes/environment/saved-close-setup-gate-47455fec-dcfa-4a3a-a3ce-42d8a17dd57e.json`; the historical assessment remains retained and no export is created.

## Verification

- `evidence/accounting-setup-trust-checks-becd3992-a6b1-4f4c-b05a-00c3ca88c99d.json`: 164 tests / six suites, changed-file lint and the repository TypeScript check pass. Covers enabled-but-incomplete setup, READY/LOCKED, disabled accounting, ledger display consistency, old READY export refusal, close/invalidation and action regressions.
- `lanes/environment/accounting-setup-trust-corrected-ea1e926b-7a23-41df-bf6f-facedfac919b.json`: actual equivalent negative fixture now returns T2, blocks certification readiness and persists BLOCKED. The setup-lock gate still rejects the missing items. Only the explicitly synthetic journal is posted; no payment or certificate is created.
- `lanes/environment/setup-trust-browser-204b55ce-9823-4188-9e36-ea2e06ce5a9f.json`: actual EN 1440px / FR 320px keyboard assessment and draft download; persisted T2/BLOCKED, fresh inventory evidence, matching downloaded/stored hashes and unchanged financial source records. Screenshots/downloads accompany the receipt.
- Exact source archives retain originals. AST comparison limits the pack-service change to exportClosePack; signing/preparation invalidation declarations remain unchanged. Their prior boundary evidence is retained through an explicit hash transition. This does not recertify other workflows.

The first reproduction expected T4 without ledger activity, but correctly received T3 from an independent no-activity gate; the failed receipt is retained. A second observation established missing setup enforcement with T3/READY. The stronger reproduction then used actual balanced posting and established T4/READY despite incomplete setup. The file patch tool could not write the existing pack service; a guarded write preserving its exact original completed the same authorized change.

## Remaining setup dependency

The readiness service requires 13 posting purposes. The current default catalogue supplies nine of those; CASH_DRAWER_CLOSE, GOODS_RECEIPT, EXPENSE_APPROVAL and INVENTORY_ADJUSTMENT require further implementation/configuration review. This is an engineering/configuration gap, not a missing professional signature. No placeholder rule was installed to obtain READY. Existing inventory adjustment handling needs direction-aware analysis before proposing a generic default; its current consumer ignores rule conditions and applies absolute amounts.

Next work must establish supported rule behavior and valid setup through the existing services, then perform genuinely eligible system close certification and subsequent invalidation/recovery. System evidence is distinct from statutory approval.

## Use, rollout and review

Use `/en/dashboard/accounting/close/<periodId>` or `/fr/dashboard/accounting/close/<periodId>`. If setup is incomplete, complete required mappings, journals, current open period and valid posting rules in the existing accounting setup flow. An authorized accounting setup manager must lock it using fresh authentication. Run a new close assessment before requesting certification. The required account references, rule purposes and period dates come from the organization's configured chart, supported domain flows and accounting calendar; obtain professional validation where required for real use.

No migration or production action occurred. Retain existing packs as historical evidence; regenerate assessments after setup completion. Do not roll back this guard to enable certification. Concurrent configuration withdrawal, real production load and full native-screen-reader/zoom checks remain unverified. The new service denial text is English; French presentation of that newly added denial remains open. Existing EN/FR assessment/draft controls were exercised, not that denied-export toast.

Architecture/backend/data/security/control/audit/QA reviews cover current server-owned readiness, tenant-scoped lookup, retained history and affected exports. Frontend review covers consistent blocked ledger state and the listed browser scope. Finance: balanced synthetic journal only, no live money. Statutory: no certification claim. SaaS: capability selection cannot override setup. SRE: development observations only. AI, offline and provider transport changes: not applicable; no affected behavior. The Cash workflow and overall modernization goal remain in progress.
