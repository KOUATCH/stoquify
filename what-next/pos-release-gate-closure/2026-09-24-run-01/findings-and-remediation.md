# Findings and remediation

This register concerns gate accuracy and the safety of review tooling. It does not grant business-policy approval or production authority.

| ID | Finding | Disposition | Verification / remaining limit |
|---|---|---|---|
| GC-01 | Comment marker could exempt operational stock writers | FIXED: removed marker-only exemption; exact reviewed fixture and guard hashes required | Inventory negative regressions reject marker/copy/changed dependency; static scanner remains limited to direct calls |
| GC-02 | Line-pattern scanner missed multiline/bracket/optional calls and counted inert strings | FIXED: parse actual calls with existing TypeScript parser | Pre-edit mismatch reproduced; actual-call regression passes; dynamic aliases/raw SQL remain separate review boundaries |
| GC-03 | POS stock booster and supplier fixture could target application/nonlocal databases | FIXED: explicit dedicated disposable targets, production/redirect denial and connected identity checks | Guard tests and individual fixture invocation tests; no real fixture/database writes performed |
| GC-04 | Imported historical fixtures could bypass their caller's ownership check | FIXED: shared client verifies connected database identity and synthetic ownership before model operations | Identity/ownership mismatch prevents write callback; eleven entrypoints reject application target before Prisma construction |
| GC-05 | Approval gate accepted opaque signature references and arbitrary hashes without reading/verifying evidence | FIXED: independently trusted Ed25519 issuer attestations, artifact hashes, decision/contract/scope/role binding | Positive synthetic and negative tests; authentic issuer trust configuration and real approval records remain external |
| GC-06 | Future/expired approvals and mismatched effective versions could qualify | FIXED: strict timestamp/version/expiry and fresh-auth checks | Focused regressions; clock/trust-configuration authority remains an operator responsibility |
| GC-07 | Program could preserve declared PASSED despite missing external proof | FIXED: actual external and internal closure verification required for pass | Original false pass reproduced; forged/missing/stale/wrong-class evidence fails |
| GC-08 | Removing dependencies or external register items could make structural checks appear complete | FIXED: canonical exact dependency and evidence sets; missing/duplicate substitutions fail | Program regression tests; intentional policy changes now require corresponding reviewed gate-contract changes |
| GC-09 | Old candidate declaration and changed source could receive unsupported closure credit | FIXED verification: candidate HEAD, bound requirements and signed source manifest checked | Current August candidate is stale and stays blocked; issuer must attest manifest completeness and real scenario coverage |
| GC-10 | Build wrapper inspected ordinary .next even when NEXT_DIST_DIR selected isolated output | FIXED: inspect/report actual contained output; reject outside/root/link escapes | Five new tests failed before change plus one independently identified parent-link case; 23 pass after. Existing deletion guard preserved; run uses skipClean and a new directory |
| GC-11 | Historical gate descriptions did not reflect September cart/recovery and migration work | DOCUMENTED: current-source preflight and completed migration references | Frozen contract/program preserved; no stale NOT_IMPLEMENTED text treated as fresh runtime evidence |
| GC-12 | Missing accountable decisions, external environment/hardware evidence and cashier access | OPEN EXTERNAL REQUIREMENTS: 11 decision packets, nine procedures, exact role handoffs prepared | No invented identities, business approvals, provider responses, devices or pilot outcomes |

The temporary automatic-review rejection of the fixture manifest was resolved through the same approval mechanism after individual callsite review and executable guard tests supplied the missing evidence. It was not bypassed. Full chronological details remain in [inventory-review.md](inventory-review.md).

Changes are confined to gate/build verification tooling, guarded fixture execution paths, their tests and this evidence package. The current financial finalizer, stock kernel, schema, existing migration history and POS production capability flags are unchanged by this run.
