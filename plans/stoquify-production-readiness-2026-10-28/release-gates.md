# Production-readiness gates

All gates are OPEN for the combined candidate. Historical scoped evidence is reusable only after applicability review. Conditional gates activate when their capability is exposed/promised; M2 gates remain pending even if excluded from M1.

| Gate | Applicability | Packages | Required evidence | Exit |
|---|---|---|---|---|
| R01 Candidate/source integrity | mandatory | P01, P02 | source+manifest | Manifest binds source, selected untracked inputs, lock/vendor, migrations, configs, flags and evidence; no unexplained drift. |
| R02 Compilation and required checks | mandatory | P02, P31 | compiler+unit+CI | Current configured and required scoped checks pass with zero silently skipped required cases; no broad strictness weakening. |
| R03 Authority, tenant and data security | mandatory | P04, P05, P03 | source+native DB+authenticated browser+security review | Every admitted journey has server-owned current authority; denial, tenant crossing, revoked/expired assurance and export/privacy cases pass; confirmed blockers resolved. |
| R04 Transaction/value integrity | mandatory | P07, P08, P09, P10, P11 | native DB+reconciliation+browser | No duplicate logical business effects or unexplained quantity/value/money imbalance; expected rejects preserve state; applicable taxable scope qualified separately. |
| R05 Mixed-version and recovery | mandatory | P07, P12, P13 | native DB+HTTP+mixed-artifact browser | Supported app/worker/artifact pair and flags pass replay/lease/stale-tab/rollback; unsafe combinations excluded; explicit reservation/older-key recovery. |
| R06 Country/fiscal admission | mandatory_for_real_financial_scope | P17 | qualified review+runtime fixtures | Applicable financial/tax claims have effective qualified source and tested admission; unreviewed or unsupported cases fail closed. Zero-tax fixture is not sufficient. |
| R07 HR/handoff acceptance | conditional_HR_exposed_M2_required | P14, P15 | native DB+authenticated browser | Selected employee/lifecycle/time/compensation/self-service journeys and correction/handoff immutability pass with proper privacy. |
| R08 Protected originals/provider operation | conditional_originals_exposed_M2_required | P16 | nonproduction provider+native DB+browser+recovery | Actual approved storage/scanner contracts, grant expiry, quarantine and key/object restore demonstrated; simulation labelled separately. |
| R09 Statutory payroll and outputs | conditional_payroll_exposed_M2_required | P17, P18a, P18b, P19, P20 | qualified review+native DB+browser+provider where applicable | Approved monthly employer cases tie input, component, register, payslip, payment/declaration and accounting proof; no missing applicable component. |
| R10 Payment/delivery integrations | selected_providers_only | P21, P22 | provider+native DB+HTTP+ops | Actual enabled contract samples/receipts, auth, duplicate/unknown outcome and settlement/delivery truth proven; simulation not live proof. |
| R11 Archive/commercial rights | mandatory_for_proposed_paid_M1 | P05, P23, P24 | policy+native DB+download+support | Promised categories complete with tenant-safe manifest and retrieval; hold/retention/stop/read/export policy approved and tested. |
| R12 Reporting/AF/command center | mandatory_for_exposed_surfaces | P25, P26, P27, P28 | native DB+authenticated browser+coverage | Reports reconcile, source/stale/partial truth preserved, real authenticated workflows pass and all 57 domains have disposition. |
| R13 User experience/public content | mandatory_for_exposed_surfaces | P29, P30 | rendered+manual+performance+content approval | Approved performance/device/accessibility budgets; real human keyboard/screen-reader/zoom acceptance; EN/FR/private recovery and public policy/content approved. |
| R14 Native build/artifact | mandatory | P31 | isolated install/build+trusted artifact | Clean intended install with native lifecycle, locked inputs and complete immutable runtime identity; exact tested artifact promoted. |
| R15 Migration/restore | mandatory | P32 | disposable real DB+restore+timed recovery | Current clean and populated upgrade, failure/replay/backfill and backup/key restore meet approved objectives; histories/digests reconcile. |
| R16 Hosted release/operations | mandatory | P33, P34 | nonproduction deployment rehearsal+operations | Reviewed schema/artifact promotion, protected target, cohort health, compatible rollback, monitoring/alerts/support and sustained workload accepted. |
| R17 Operator and release decision | mandatory | P35 | operator pilot+signed decision | Named operators complete agreed workflows and recovery; independent domain/release owners accept current gate matrix and explicit exclusions. |
| R18 Expanded HR/payroll/wider rollout | M2 | P36 | employer pilot+expanded release decision | All inherited required HRIS/payroll children and affected M1 gates requalified on expanded artifact; repeated-team value and support capacity accepted. |

GO requires current candidate identity, every applicable gate accepted by accountable owners, no mandatory skipped/unknown case, and explicit release/operator decision. No plan document or total test count is a release certificate.

Expansion policy: baseline M1/M2 excludes X01–X04 enforceably. Earlier exposure requires D14 approval and a validated scope/graph mutation replacing later-milestone prerequisites. These are not implied conditional back-edges to P35/P36. D01 initial qualification-scope approval precedes dependent capability execution; final scope is reconfirmed at release.
