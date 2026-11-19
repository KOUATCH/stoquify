# P04-R02 — isolated full-application qualification

2 November 2026. **VERIFIED for the local package scope. P04 and production readiness remain blocked.** Independent review accepted completion against frozen candidate `p04-r02-full-ea52ca48cadd` and artifact SHA-256 `e64a4d3e8b3973f3439b7f387527e87b5dc7cd83b1873e289fc8dfdae80e4da8`.

The user classified cabin-1.jpg, cabin-2.jpg and profile.jpg as private. All originals and recovery copies are preserved. Guarded routing runs before static resolution, and runtime packaging excludes these public aliases while retaining their canonical private upload copies. Unknown duplicate-byte publication still fails closed.

## Verified outcomes

| Evidence class | Executed result | Scope |
|---|---|---|
| Current source and preservation | 9,136 frozen source files and six upload annex assets unchanged; all eight tested repair inputs and selected consumers match | The root checkout has 73 added and ten changed unrelated files, including payroll work and a migration. None were reverted; this is not a latest-whole-checkout certification. |
| Scoped tests | 91 route/routing/filesystem tests, 84 packing fixtures, six configuration tests and workflow validation passed | Authority and build adapters in scoped fixtures are mocked where documented; native filesystem operations are separately identified. |
| Qualification harness | Installed-Next origin regression 2/2; final cadence/readiness tests 18/18; private-alias protocol 18/18 | These validate the harness, not application authorization by themselves. |
| Full application build | Normal artifact chain passed compilation, types, lint, static generation, tracing, sealing and verification; 26 lint warnings, zero errors | Private dependency copy and exact generated Prisma schema proof; no clean-install reproducibility claim. |
| Actual artifact | 5,310 sealed files; six private upload mappings; three original alias exclusions plus one explicit synthetic alias exclusion | The fourth policy row is a declared qualification fixture. This is not a production-policy artifact. |
| Real sessions and HTTP | 18 real sign-ins returned 200; 352 recorded request assertions passed: 19 responses at 200, 117 at 400, 84 at 401 and 132 at 403 | Authorized synthetic GET/HEAD, anonymous/foreign/missing-permission/module-disabled requests, original-cookie revocation/expiry/changed-authority checks. |
| Original private aliases | All 270 denial-only probes passed, across nine actor states; proxy validated each upstream denial before forwarding; zero original private bytes forwarded | No original-owner positive request or original-image rendering was performed. |
| Rendered browser | All 22 checks passed at 1440×1000; EN/FR item list/edit images decoded; detail heading converged; default-cache/history/reload recovery passed | Private optimizer cache survived yet remained inaccessible. Actual authorized200 and revoked401 image responses were observed. No full localization/accessibility or upload/mutation certification. |
| Native database |120 migration checksums/schema verified; all 20 before/after business-state pairs matched | Final 242 of 245 business-table hashes unchanged. Users, roles and module grants changed only through documented logins and deliberate fixture transitions. |
| Cleanup | Application, HTTPS proxy, browser and egress proxy stopped; owned PostgreSQL PID 32788 stopped after two empty client inventories; ports 3192–3194 and 53528 released | All data retained, including 33 sessions (two expired) and 82 audit rows. Future fixture reuse requires bounded recovery. |
| Final review | Final integrity 12/12 passed; independent local completion accepted | Parent and release gates remain separate. |

## Evidence

- [Build result](build-result.json) and [retained artifact manifest](verified-artifact-manifest.json).
- [Successful runtime](runtime-result-retry02.json) and [full browser result](browser/p04r02-full-20261102-r3-retry02/result.json).
- [Database final capture](database/final-fixture-integrity.json), [field-level reconciliation](database/final-fixture-reconciliation.json) and [guarded shutdown](database/resume-20261102-r3-guarded-stop-1793643230069.json).
- [Final integrity](final-integrity-retry02.json), [independent review](independent-review/ASSESSMENT.md) and [machine verdict](independent-review/ASSESSMENT.json).
- [Local advancement gates](advancement-gates.json) and [resolved private-asset decision](../private-alias-exclusion-20261102/asset-decision.json).

## Retained failures and corrections

The prior r2 artifact refusal remains preserved. The initial r3 runtime failed because Next's loopback hostname normalization made an internal rewrite external, and rapid sign-ins triggered the real rate limiter. Retry01 corrected the transport and cadence but still failed on transient heading duplication, an auth-redirect navigation race and incomplete optimizer-probe validation. These are retained in runtime-result.json, runtime-result-retry01.json and their browser directories; none were relabeled as passes.

Retry02 used the same sealed artifact. The harness requested identity encoding for marked denial probes while retaining strict response checks, waited for one unique rendered heading, and observed actual login recovery before same-context cache probes. Independent review approved each bounded correction. No application source was changed to make these harness failures pass.

## Remaining release work and next action

R02-G09 remains deferred: original-tenant stored/computed reference census, original-owner authorized reads, hosted ingress/CDN exclusions, old public copies/cache invalidation, private storage and operator cutover. A fresh production-policy candidate must include concurrent checkout changes and pass clean-install/CI and release gates. French edit-form text still includes English labels; broader localization and accessibility remain UI work. Original item detail has no implemented photo consumer, so no detail-image claim is made.

**Next eligible package: P04-R01, reserved-code operating-scope delegation escalation.** Its first action is to refresh the bounded roles/access-request/invitation source and guard inventory, preserve the expected-red native regression, then prepare a reviewed repair with denial/no-write and privileged-administrator acceptance criteria. P04-R01 implementation is not included in this media qualification. P04-R03 and the broader P04 verification/decision packages remain pending.

No commit, push, production flag change, production migration or deployment was performed. Recovery copies and all failed receipts remain available. A rollback must preserve private serving and must not restore public exposure.
