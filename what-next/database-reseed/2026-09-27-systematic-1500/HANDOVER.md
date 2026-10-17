# Local database reseed — 1,500 units per item

The authorized local database `localhost:5432/stoquify_replay_next_20260830` was updated on 2026-09-27. The application database setting remains unchanged. This was a preservation-first repair and enrichment, rehearsed on a restored candidate; no reset, constraint disabling, or deletion of protected history was used.

**Result: the stock and identity requirements are met; full workflow and historical-data readiness remains incomplete with the specific exceptions below.** Local synthetic evidence does not constitute production or statutory approval.

## Verified database results

| Requirement | Result | Evidence |
|---|---|---|
| Migration status | All 87 migrations applied; latest `20260920060000_pos_checkout_lifecycle`; history/catalog/runtime checks pass | [Source check results](checks/source/results.json) |
| Stock floor | All 41 items have at least 1,500 units on hand, summed across locations within their organization; no missing levels or excluded items | [Per-item quantities](source-final-stock.json) |
| Relationships | All 572 foreign keys checked; zero orphan, tenant, role-tenant, missing item-reference, reservation, valuation or movement-projection findings | [Integrity report](source-final-integrity.json) |
| Identity/access preservation | All 99 original users, 95 roles, 99 memberships, 30 credential accounts, 118 employees, and all established organization/location/customer/supplier/item identities retained with the compared names, credentials, scopes and permissions unchanged | [Preservation report](source-final-preservation-check.json) |
| Added supported access | 79 role records and 81 synthetic personas added; final 174 roles and 180 users across 3 organizations; 26 new employee links | [Role and reference reconciliation](source-reference.json) |
| Reference data | 8 meaningful unit definitions added; product-specific packaging and conversions replace ambiguous generic pack assignments; existing tax treatment retained with explicit classification-review limitations | [Reference report](source-final-reference-data.json) |
| Stock/ledger values | Organization 1: 57,620,125 XAF; organization 2: 56,858,075 XAF; zero monetary drift | [Canonical reconciliation](source-inventory-canonical-reconciliation.json) |
| Draft AP arithmetic | 24 draft invoices repaired with audit records; unsupported matched claims returned to exceptions | [Repair results](source-financial.json) |
| Linked scenarios | 29 customer-location relationships from actual existing sales, module draft configurations preserving active access, two draft time-policy foundations and 120 attendance entries | [Scenario results](source-scenarios.json) |

Inventory execution reconstructed 518 explicitly synthetic opening movements and rebuilt two mutable projections from their immutable movement history. Supported stock-adjustment and ledger services supplied the missing quantity, traceability and posting records. Original serial identities were retained; missing synthetic serials and their reservations were reconciled. No historical supplier evidence or external certification was invented.

The existing generic seed entry point was not used to reset the database. Its reused fixtures contain arithmetic and evidence defects. The reviewed execution entry point is `scripts/run-systematic-reseed.cjs`, with ordered `reference`, `scenarios`, `financial`, and `inventory` stages, `--apply`, and an explicit `--candidate` or `--source` target. A verified backup/restore is required by that entry point.

## Recovery and repeatability

The original custom-format backup remains in the Git-ignored `.seed-artifacts/2026-09-27-systematic-1500/source-before.dump`. Restoration into the isolated candidate reproduced every baseline table count and identity hash. [Backup/restore evidence](backup-restore.json) records its SHA256 and size. The original source remained unchanged throughout the initial rehearsal.

[Rerun evidence](rerun-verification.json) confirms unchanged business-row counts across repeated scenario, financial and inventory stages. The only row increase during that measured rerun was two execution audit entries. A further reference/persona rerun created no new personas. Earlier interrupted candidate stages were resumed using stable dataset keys, without resetting existing accounts or duplicating postings. Focused tests cover transaction failure and secret-handoff failure boundaries.

New credentials are available only in the Git-ignored `.seed-artifacts/2026-09-27-systematic-1500/source-verified-credentials.json`. The original credential artifact was retained. One stale historical password reference was skipped and replaced for verification by a separate synthetic persona; the original account password was not reset. [Sanitized verification counts](source-credential-verification.json) contain no secrets.

Restore into a separately named local database using the retained dump and the existing PostgreSQL tools. Recheck the target and compare the restored table/identity snapshots before any application switch. Do not overwrite the backup or remove the original history to hide a failed invariant.

## Remaining blockers

| Finding | Why it remains | Owner / next action |
|---|---|---|
| 24 historical receipt-to-movement mismatches | Immutable source movements and receipt lines disagree; rebuilding projections does not repair the original business evidence | Inventory/accounting: use an explicit corrective document/event lineage |
| 24 historical sales lines and associated header/line tax mismatches | Orders already have posted journals, issued receivable documents and payments | Finance: supported reversal/correction workflow and review; preserve original records |
| 48 original stock movements lack business-event evidence | Backfilling successful events would misrepresent the original operation | Inventory/events: review each listed source and add legitimate corrective lineage |
| 192 legacy generic JSON fields across eight model/field pairs | Provider, fiscal, payroll, offline and event evidence includes protected or provenance-sensitive records | Owning domain reviewers: replace operational scenarios through real services; quarantine malformed pending work through supported controls |
| Product tax classification and legacy role conflicts | Country pack does not provide a product exemption schedule; existing role assignments must be preserved | Country-pack/IAM reviewers: inspect the exact issues in `source-reference.json` |
| Statutory production gate | Real source-artifact expert approval is absent | Qualified country-pack reviewer: provide reviewed source and approval evidence |
| Lifecycle/browser coverage limits | A populated table or static gate does not establish every lifecycle, accessibility or operational journey | QA/domain owners: follow the per-model decisions and reviewer matrix |

The [final business audit](assurance/source-business-invariants.md), [evidence register](assurance/EVIDENCE_REGISTER.md), [all-model coverage](assurance/model-coverage.md), and [reviewer matrix](assurance/REVIEWER_MATRIX.md) distinguish verified behavior from remaining requirements. Protected historical records were retained, so this run does **not** claim that every existing record is meaningful or that the whole application is glitch-free.

## Verification and code repairs

Prisma schema validation, migration status/history/catalog, workflow runtime checks and the canonical read-only seed verifier pass against the original database. The repository typecheck passed. Focused tests cover reference/persona preservation, secret handoff, AP repair, stock planning, batch/expiry propagation, signed legacy cost handling and gate regressions. Detailed command and test artifacts are saved alongside this document.

The migration catalog was regenerated through its producer. Stale role-cockpit and purchasing/AP gate checks were updated to inspect the current service contracts, with negative regressions and the original check coverage retained. Production statutory approval remains blocked.

Browser and isolated POS smoke evidence is recorded separately from database integrity. The [POS smoke rerun](isolated-pos-smoke-rerun.json) completed a paid seven-item sale, verified exactly-once stock deductions and closed its shift on a separate local clone. Existing shifts and station names remained unchanged. The smoke verifier was updated to respect occupied terminals and submit the current cart revision; application checkout guards remain intact.

The browser exposed a genuine inventory display defect: the organization-wide item table and cards used only the first stocking location. The page, table and XLSX export now aggregate all returned locations and use stored inventory valuation. Four focused regressions pass; [source data through the same display helper](inventory-ui-summary-validation.json) matches the ledger totals above. Brioche can still legitimately show a low-stock alert: its preserved reorder threshold is 4,510 even though its on-hand stock meets this run's 1,500 minimum.

English and French route checks exercise the inventory data and localized navigation, plus read-only denial of role administration. Some pre-existing inventory content remains English on the French route; this run does not certify complete localization or accessibility. See `execution-manifest.json` for the final verification outcomes and artifact paths.
