# WP5 decision — Close assurance and data trust

Decision: `APPROVED_FOR_WP6_INTERNAL_ENGINEERING_ONLY`

Captured: `2026-08-22T08:02:01Z`

Selected skills:

- `aqstoqflow-close-invalidation-completion`
- `aqstoqflow-payroll-accounting-close`

## Implemented boundary

- Added typed `PAYROLL_RUN_APPROVED` and `PAYSLIP_EMITTED` close-invalidation sources without changing the existing payroll-posted source contract.
- Approval and payslip emission now invalidate only affected certified-period evidence inside the same serializable payroll transition transaction, after tenant-scoped compare-and-set and before audit/event completion.
- Same-payload replay exits before invalidation; concurrency losers and downstream failures cannot apply the business event or leave a partial close-invalidation commit.
- Added one shared transition-evidence classifier for required review, approval, emission, and posting stages. Runtime rows must be verified and retain actor, timestamp, business-event, and monotonic version evidence. Any legacy bridge row remains explicitly `LEGACY_PARTIAL`; it is never promoted to verified history.
- Accountant data trust now hard-blocks emitted-unposted runs and missing post-cutover transition proof, while separately disclosing historical legacy-partial evidence.
- Close assurance consumes those blockers as failed checklist state and CRITICAL payroll findings, and its source manifest now includes `payroll_run_transitions`.
- Financial analytics becomes non-authoritative when transition proof is missing or legacy-partial.
- Branch profitability and released-payroll-payment assurance now accept only posted, paid, or archived runs; approved or emitted-unposted runs no longer qualify.

## Live verification

| Check | Result |
|---|---|
| Full WP5 focused suites | PASS — 175/175 across 8 suites |
| TypeScript project compile | PASS — no diagnostics |
| Focused ESLint | PASS — zero findings |
| Diff whitespace check | PASS |
| Service-boundary fail gate | PASS — 0 active violations |
| Purchasing/AP consolidation | READY — 11/11, including `goods_receipt_atomic_stock_posting` |
| Report trust/export | READY — 35/35 |
| Offline POS replay | READY — 16/16 |
| Workflow assurance static release gate | READY — 38/38 |
| Payroll presence | READY — 14/14 |
| CI release configuration | READY — 11/11 |

Focused negative coverage includes emitted-unposted detection, missing intermediate runtime stages, missing event links, legacy/runtime evidence mixing, approval/emission close invalidation order, CAS rollback, idempotent replay without duplicate invalidation, tenant-scoped transition reads, non-authoritative analytics, and posted-only downstream consumers.

## Non-WP5 blockers preserved

- The full policy chain is not production-green because qualified statutory source-artifact expert approval is absent (`11/12`). Production statutory automation remains fail-closed.
- The local workflow-assurance and payroll-immutability runtime checks could not query through the configured Prisma protocol. Migration replay itself applied all 76 migrations successfully to the isolated payroll test database; real PostgreSQL concurrency/failure-injection certification remains assigned to WP7.
- The inherited raw-error gate has 8 active findings; WP5 added no raw-error site and does not authorize cross-domain cleanup.
- The inherited accounting baseline bridge contains destructive SQL that lacks exact-hash approvals (`8/9` migration-safety checks).
- Release secrets and production database/provider evidence are not configured. Release evidence remains conditional and production is unauthorized.
- The broad dirty worktree still prevents a clean-candidate claim.

## File hashes

| File | SHA-256 |
|---|---|
| `services/accounting/close-assurance-pack.service.ts` | `AAE9074B6B3DF04AFF49EA6A89A1BC7135FA89E17FDA09F503F64547AB2336F9` |
| `services/accounting/close-assurance.service.ts` | `DC721DE85A3F3C7B10FA4E54BE905627AB71E101FC3A78A45EA5F32A27F705AB` |
| `services/payroll/payroll-control.service.ts` | `A0DE224E67507060C1F9AA624E9AC574E17547806DBB8A96059A80E34EA86F31` |
| `services/payroll/payroll-transition-evidence.ts` | `19066ECB84C4CB88E676EDB0216715E3B5058B507DA328AD512E44D87BB2B370` |
| `services/payroll/__tests__/payroll-transition-evidence.test.ts` | `EC6244E6E9D5D7B13CFAE21BF96A42B67512C4A1B74CC0DB5FBFAA98C9949F0C` |
| `services/payroll/__tests__/payroll-run-approval-transition.service.test.ts` | `A6A3EFE2B29577999D8CD9A769359A785431283DDFE5BD629A790F18F48783A8` |
| `services/accounting/data-trust.service.ts` | `F25A82B358EF2F039F38BCC3E6B37176D578731D8141F36598E21065D2A55943` |
| `services/accounting/__tests__/data-trust.service.test.ts` | `5EB6FEAA0B575C673DABB7C43A77AC00549BEFCC5E1CD538533C5A8E97A9301C` |
| `services/analytics/financial-analytics.service.ts` | `C98DEFA1EEFF3C26F8206C2D6A3A3EEFAFA268C89BF5002997B33253F9B7D98A` |
| `services/analytics/__tests__/financial-analytics.service.test.ts` | `EE636348CB12B314CC42CF98CE083A333C6D458C4A452F06E06F3C4590946829` |
| `services/snapshots/branch-operating-snapshot.service.ts` | `C71C2CAA4E664E8AC1BAD7986569CB738F65AC3EAE46F1CAD2D6B0261540779D` |
| `services/snapshots/__tests__/branch-operating-snapshot.service.test.ts` | `88C1145BF8516133F67A66E4D686B6F61F90C9BDE5749288B5684311789618A2` |
| `services/assurance/assurance-registry.service.ts` | `E96E38C948011DEE8E7D1C1A23979D1A51C0E9E0F97CEF605FF3585AB3C129DE` |
| `services/assurance/__tests__/assurance-registry.service.test.ts` | `77E14F89F623439593E98CBB7517D7ADFF4D82EC50FAB8875CC63FCAE67323F7` |

## Promotion limits

- WP6 is authorized only for internal read-model and operator-UX completion.
- WP7 and WP8 remain unauthorized until WP6 is independently verified.
- No production, statutory, database-migration, clean-candidate, or unrestricted payroll claim is made.
- Existing receipt inspection, purchasing/AP match-exception work, payroll calculation, payment, declaration, country-pack, and offline POS behavior was preserved.
