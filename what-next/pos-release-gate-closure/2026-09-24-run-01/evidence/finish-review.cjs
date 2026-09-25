const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const root = path.resolve(__dirname, '../../../..')
const out = path.dirname(__dirname)
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'))
const optional = name => fs.existsSync(path.join(__dirname,name)) ? read(name) : null
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')
const save = (name, value) => fs.writeFileSync(path.join(__dirname,name),JSON.stringify(value,null,2)+'\n')
const now = new Date().toISOString()
const inventory = read('inventory-after-command.json')
const governance = read('governance-verification.json')
const wrapper = read('build-wrapper-final-results.json')
const build = optional('build-result.json')
const cleanup = optional('build-config-cleanup.json')
const finalTypecheck = optional('typecheck-final-result.json')
const typecheck = finalTypecheck || read('typecheck-result.json')
const buildSourceDrift = build ? build.sourceBefore.filter((entry, index) => entry.sha256 !== build.sourceAfter[index]?.sha256) : []
const schema = read('prisma-validate-result.json')
const invHashes = read('inventory-source-hashes.json').files.map(f=>({path:f.file,sha256:f.sha256}))
const hashes = [...invHashes,...governance.files]
const drift = hashes.filter(f=>hash(f.path)!==f.sha256)
const finalSource = [...new Set([...hashes.map(f=>f.path),'scripts/build-app-safe.js','scripts/__tests__/build-app-safe.test.js'])].map(p=>({path:p,sha256:hash(p)}))
save('review-final-source.json',{generatedAt:now,files:finalSource,priorVerifiedSourceDrift:drift})
save('review-summary.json',{
 generatedAt:now, inventory:{exit:inventory.exitCode,activeFindings:0,reviewedFixtureCallsites:24},
 governance:governance.verification, focusedTests:{suites:7,passed:106,composition:'inventory 38 + governance 45 + build wrapper 23; no reruns added'},
 wrapper, typecheck, schema, build:build ? {status:build.status,exit:build.exitCode,childExit:build.build?.exitCode,cleanedOutput:build.cleanedNext,completedAt:build.completedAt} : {status:'RUNNING'},
 cleanup, buildSourceDrift, sourceDrift:drift, productionAuthorized:false, cashierBrowser:'BLOCKED_PENDING_AUTHORIZED_LOGIN',
 decisionPackets:11, externalProcedures:9, actualApprovalsCreated:0, applicationDatabaseMutations:0,
})
const buildText=build ? `**${build.status.toUpperCase()}**, wrapper exit ${build.exitCode}, child exit ${build.build?.exitCode ?? 'not run'}; output cleanup ${build.cleanedNext ? 'occurred — inspect incident' : 'disabled/not performed'}` : '**RUNNING**; no build pass claimed'
const cleanupText=cleanup ? `Recorded in [configuration cleanup](evidence/build-config-cleanup.json).` : 'Configuration cleanup pending build completion.'
const md=`# POS release gate closure review

Updated ${now}. Scope: inventory boundary findings, governance gate integrity, evidence/approval preparation, and the recorded isolated-build verification defect. This is an engineering closure report, not production approval.

## Outcome

- **Inventory boundary passed:** exit ${inventory.exitCode}, zero active findings. All 20 original findings and four previously comment-exempt fixture writes have individual dispositions. Exact source and guard hashes bind 14 reviewed fixture paths.
- **Governance tooling hardened:** five original false-pass regressions reproduced and corrected. G1 remains 13/13 structural and 0/11 authentic decisions; program is 12/12 structural and 0/10 gates, 0/9 external evidence.
- **106 focused tests pass** across seven distinct suites: inventory 38, governance 45, build wrapper 23. Scoped lint passed. These are tooling/guard tests, not 106 real checkout scenarios.
- Fresh project TypeScript and Prisma validation exited ${typecheck.exit} and ${schema.exit}. ${finalTypecheck ? "The final TypeScript run covers the edited source after exact build-configuration restoration." : "The initial TypeScript run preceded final tooling changes; the final run is pending."}
- Application build: ${buildText}. Compilation, type validation and all nine static pages completed; Windows EPERM denied symlink creation during standalone packaging. See [build verification](build-verification.md). ${cleanupText} POS source changes during the build: ${buildSourceDrift.length} of ${build?.sourceBefore.length ?? "pending"} captured files.
- **11 decision packets and nine external verification procedures** are prepared. No accountable owner, authentic approval, production trust key or external result was invented.
- Cashier browser verification remains blocked: the retained EN POS tab still shows permission-required content. The user intends to switch accounts, but completion has not been observed. The existing French drawer evidence is preserved.

## Practical improvements

Operational stock writers can no longer qualify for a demo exemption by adding a comment. Previously unsafe demo targets now require explicit local disposable databases, with production/redirect and connected-identity checks. Historical fixtures enforce their ownership preflight even when imported. The inventory scanner reads real call expressions and detects multiline/bracket/optional access.

Governance no longer accepts arbitrary typed signature references, expired/future approvals, removed dependency/register entries, or a declared PASSED status unsupported by actual external/closure evidence. Signed evidence binds the exact contract, decision, release scope, issuer authority assertion, timestamps and artifacts. Real identity and external facts remain the trusted issuer's responsibility.

The build verifier checks NEXT_DIST_DIR instead of accidentally accepting or inspecting an unrelated .next build. Root/outside paths and existing links, including parents of absent output, are rejected. Existing recursive-cleanup restrictions remain intact. The running application build was launched against a new direct child directory before the final parent-link guard was added; that direct target is unaffected, and the final guard has separate red/green regression evidence.

## Reviewable deliverables

- [Gate matrix](gate-closure-matrix.md) and [full criteria/data](gate-closure-matrix.json)
- [Inventory review](inventory-review.md) and [24 callsite dispositions](inventory-callsite-dispositions.json)
- [Governance review](governance-review.md) and [verifier contract](approval-verifier-contract.md)
- [Eleven decision packets](approval-packets.md)
- [Nine external verification procedures](external-verification-procedures.md) and [capture template](external-evidence-capture-template.json)
- [Current-source preflight and reviewer coverage](preflight-and-review-coverage.md)
- [Findings/remediation](findings-and-remediation.md)
- [Rollout, owner handoffs and rollback](rollout-and-rollback.md)
- [Build outcome and packaging handoff](build-verification.md)
- [Fresh browser observation](evidence/browser-observation.json)
- [Evidence index](evidence-index.md) and [machine-readable result](evidence/review-summary.json)

## What remains before release

Security/IAM and CI owners must designate the authentic approval issuer and configure its public trust anchors independently; the gate currently reports TRUST_ANCHORS_NOT_CONFIGURED. Required owners must review/sign D-01 through D-11. The recorded program candidate is an older HEAD and must be reconciled to an actually reviewed candidate before its evidence is accepted. Do not update it merely to silence the check.

Later business gates retain their own technical acceptance, provider/country/hardware, close, inventory/returns policy, operations and pilot requirements. Follow dependency order and the concrete procedures. The inventory boundary pass does not approve G6 or authorize a live rollout.

The application postingCycle migration is already complete; this run performs no database migration or financial mutation. The dirty working tree and unrelated changes are preserved. Verified gate-source drift at consolidation: ${drift.length}. Frozen contract, approval register and business program artifacts remain unchanged.
`
fs.writeFileSync(path.join(out,'README.md'),md)
fs.writeFileSync(path.join(out,'evidence-index.md'),`# Evidence index

All paths below are local artifacts. Failed originals remain evidence of the defect, not a failed final implementation. Historical POS financial/browser results stay in the prior run and are not counted as fresh execution.

| Evidence | Scope/result |
|---|---|
| [Inventory after](evidence/inventory-after.md) / [exit](evidence/inventory-after-command.json) | Fail mode, 0 active |
| [Inventory guard/tests](evidence/inventory-green-tests.json) | 3 suites, 38 passes; mock/VM clients, no real DB execution |
| [Inventory original failures](evidence/inventory-red-tests.json) | Two expected pre-edit scanner failures |
| [G1 after](evidence/contract-after.md) | Expected exit 1, missing authentic approvals |
| [Program after](evidence/program-after.md) | Expected exit 1, dependency/external/closure requirements |
| [Governance verification](evidence/governance-verification.json) | 45 tests, scoped lint, source hashes, unchanged business artifacts |
| [Governance original failures](evidence/governance-regressions-original.log) | Five demonstrated original false passes |
| [Build wrapper first red](evidence/build-wrapper-focused-red.log) | Five original isolated-output regressions |
| [Parent-link red](evidence/build-wrapper-ancestor-red.log) | Independent review finding reproduced |
| [Final wrapper tests](evidence/build-wrapper-final-green.log) / [exits](evidence/build-wrapper-final-results.json) | 23 pass, scoped lint clean |
| [Typecheck](evidence/${finalTypecheck ? "typecheck-final-result.json" : "typecheck-result.json"}) / [log](evidence/${finalTypecheck ? "typecheck-final.log" : "typecheck.log"}) | ${finalTypecheck ? "Final edited source after configuration restoration" : "Initial source; final run pending"}; exit ${typecheck.exit} |
| [Prisma validation](evidence/prisma-validate-result.json) | Exit 0, no migration |
| [Build log](evidence/build.log) / [start](evidence/build-start.json) | ${buildText} |
| [Packet provenance](evidence/packet-provenance.json) | 11 decisions, nine procedures, exact frozen hash |
| [Final source hashes](evidence/review-final-source.json) | Changed-scope inventory/governance/build files and verified-source drift |

Execution brief: [requested scope](execution-brief.txt). Git baseline and HEAD were recorded before edits. The initial default Jest discovery runs produced no results and were stopped; focused Node configurations supplied the actual test evidence. Initial filesystem-denied writes did not execute. The fixture-manifest auto-review rejection was resolved through the same mechanism after individual evidence was completed; no remaining permission block exists.
`)
const problems=[]
let links=0
for(const file of fs.readdirSync(out).filter(f=>f.endsWith('.md'))){
 const text=fs.readFileSync(path.join(out,file),'utf8')
 for(const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
   let target=match[1].replace(/^<|>$/g,'').split('#')[0]
   if(!target || /^[a-z]+:\/\//i.test(target))continue
   links++
   if(!fs.existsSync(path.resolve(out,decodeURIComponent(target))))problems.push({file,target})
 }
}
save('documentation-links.json',{generatedAt:now,linksChecked:links,missing:problems})
if(drift.length || problems.length)process.exitCode=1
console.log(JSON.stringify({sourceDrift:drift.length,linksChecked:links,missingLinks:problems.length,build:build?.status||'RUNNING'}))
