"""Idempotent Draft 4 evidence refresh; never populates approval fields."""
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
import hashlib, json, re, os

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'docs/payroll-blockers'
OLD = ROOT/'docs/unblock'
NOW = datetime.now(timezone.utc).isoformat()
ID = 'STOQUIFY-CM-PAYROLL-CALCULATION-2026-11-02-DRAFT-4'
def read(p): return json.loads(p.read_text(encoding='utf8'))
def save(p,d): p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()

run=read(OUT/'evidence/postgres-run.json')
tests=read(OUT/'evidence/service-transactions.json')
units=read(OUT/'evidence/unit-regression.json')
sql=read(OUT/'evidence/trust-spine.json')
assert run['passed'] and tests['numPassedTests']==7 and tests['numFailedTests']==0 and tests['numPendingTests']==0
assert units['numPassedTests']==152 and units['numFailedTests']==0 and all(c['passed'] for c in sql['checks'])
assert all(sha(ROOT/p)==h for p,h in run['sourceHashes'].items()), 'Retained DB run source drift'

LIMIT='Full new-payroll creation with admitted statutory rules, cross-month history membership, approval-time stale-history comparison, real network-loss testing, and the complete downstream lifecycle remain unverified. The acknowledgement-loss test injects a client error after a real commit; it does not cut the network. SQL approval checks exercise migrations/triggers directly, not the full authenticated approval service.'
SUMMARY='Real PostgreSQL: 7/7 service transaction tests and 3/3 SQL approval/rollback checks passed on a fresh local database after 120 migrations. Existing mocked/unit regression: 152/152 tests across five suites passed. Disposable-target guards: 7/7 pure checks passed.'
ED={'id':'ED-05','decisions':['D-12','D-13','D-14'],'tasks':['ENG-04','ENG-07'],
    'status':'SCOPED_REAL_POSTGRES_VERIFIED','selection':SUMMARY,'limit':LIMIT,
    'evidence':'docs/payroll-blockers/evidence/postgres-run.json'}

contract=OLD/'PAYROLL-CALCULATION-CONTRACT.md'
checklist=OLD/'PAYROLL-CALCULATION-REVIEWER-CHECKLIST.md'
section=f'''## Database engineering update — Draft 4

Updated 2 November 2026. {SUMMARY}

ED-05 closes the scoped transaction-proof gap. The fresh target is `{run['database']}`, localhost, PostgreSQL 17.5. No application dataset was reset or migrated. The database contains synthetic test records and is retained for inspection; reruns require a different fresh name.

| Evidence | Result | Exact boundary |
|---|---|---|
| Shared production transaction helper | PASS | Real Serializable write contention retries from a new snapshot; real uniqueness conflicts retry and exhaust at three attempts; failed attempts leave no audit rows. |
| Rollback and injected caller | PASS | Domain failure rolls back without retry. An injected transaction inherits caller isolation and rolls back with its caller; it is not upgraded to Serializable. |
| Commit acknowledgement | PASS, injected loss | Real commit followed by synthetic response loss; idempotent callback replay finds one retained event. No physical network interruption. |
| Calculation service | PASS, stored-run replay only | Two concurrent replays return the same stored run; changed payload and cross-tenant period access are denied. No new statutory run is calculated. |
| SQL approval race | PASS | Two pre-write snapshots; one winner, one SQLSTATE 40001 loser; exactly one transition, event, outbox and audit. Duplicate evidence rejected; injected failure rolls back all effects. |

The first SQL harness run timed out because it awaited both write-preparation phases while the close-source revision trigger serialized them. The harness now lets each contender proceed to commit after both snapshots are established and has bounded database statement/connection timeouts. The first service test run had six passes and one assertion defect (`statusCode` instead of `status`); this was corrected without changing runtime error behavior. Initial evidence is retained under `evidence/attempt-2026-10-29` in the publication folder.

{LIMIT}

All 16 decision records remain PENDING_REVIEW; all 22 independent fixture expectations remain null. ENG-02 through ENG-08 remain pending parent tasks. Current ENG-04 work is to integrate the verified boundary with approved history and same-day/off-cycle rules, then prove complete new-run/correction creation. ENG-07 still requires the full register, payslip, posting, declarations, payments and close lifecycle with independently approved expectations.

Workflow contract: passed at initial inspection on 29 October; recheck on 2 November failed on unrelated pre-existing `test:dev:startup -> next.config.mjs` fingerprint drift. This was recorded, not repaired by blindly updating the registry. The scoped test commands were individually inspected. No full project typecheck, browser journey or production release is claimed.

Evidence: [database engineering report](../payroll-blockers/PAYROLL-UNBLOCK-REPORT-2026-11-02-ENGINEERING-V4.md), [machine results](../payroll-blockers/PAYROLL-CALCULATION-ENGINEERING-RESULTS.json).

'''
for p in [contract, checklist]:
    text=p.read_text(encoding='utf8')
    text=text.replace('STOQUIFY-CM-PAYROLL-CALCULATION-2026-10-29-DRAFT-3',ID)
    text=text.replace('Prepared: 29 October 2026. Status:', 'Prepared: 29 October 2026; updated: 2 November 2026. Status:')
    text=text.replace('Source inspection, focused synthetic/mocked calculation tests and document/PDF validation support this revision. No real database test, provider operation, statutory approval or release was performed.', 'Draft 4 adds the scoped real database evidence above to the retained source inspection and mocked tests. No provider operation, statutory approval or production release was performed.')
    text=re.sub(r'^#{2,3} Database engineering update — Draft 4\n.*?(?=^#{2,3} |\Z)','',text,flags=re.S|re.M)
    text=text.replace('## Engineering decision details and rollback','### Engineering decision details and rollback')
    match=re.search(r'^## (?:Engineering|Historical)',text,re.M)
    assert match
    idx=match.start()
    text=text[:idx]+section+text[idx:]
    text=text.replace('## Engineering continuation — Draft 3','## Historical engineering continuation — Draft 3')
    text=text.replace('## Engineering handoff update — Draft 3','## Historical engineering handoff — Draft 3')
    text=text.replace('No database was queried for this draft.','The target dataset has not been queried for Draft 4; database tests used only the fresh synthetic target named above.')
    text=text.replace('No real PostgreSQL, provider operation, full project typecheck or browser journey was executed.','In the historical Draft 3 slice, no real PostgreSQL, provider operation, full project typecheck or browser journey was executed; the Draft 4 update above supersedes that database limitation.')
    p.write_text(text,encoding='utf8')

form_path=OLD/'PAYROLL-CALCULATION-REVIEW-RETURN.json'
form=read(form_path)
assert len(form['decisions'])==16 and all(d['status']=='PENDING_REVIEW' and d['selectedTreatmentOrFormula'] is None and d['reviewedBy'] is None for d in form['decisions'])
assert len(form['fixtures'])==22 and all(f['expectedOutput'] is None for f in form['fixtures'])
assert form['approvedScope'] is None and form['productionUseAllowed'] is False
form['contractId']=ID; form['engineeringUpdatedAt']=NOW
form['engineeringSelections']=[e for e in form['engineeringSelections'] if e['id']!='ED-05']+[ED]
for d in form['decisions']:
    if d['id']=='D-12': d['remainingEngineeringInput']='ED-02 transaction boundary and ED-05 scoped real database checks are complete. Future injected callers must own isolation/retry. New-run and correction creation, full lifecycle, approved same-day/off-cycle membership and approval-time stale-history checks remain pending. No statutory approval is implied.'
save(form_path,form)
save(OUT/form_path.name,form)

register_path=ROOT/'docs/database-seed/payroll-unblock-register.json'
register=read(register_path); counts=register['counts'].copy()
for e in register['entries']:
    if e['id'] in ['ENG-04','ENG-07']:
        e['engineeringSubsteps']=[s for s in e.get('engineeringSubsteps',[]) if s['id']!='ED-05']+[ED]
        if ED['evidence'] not in e['evidence']: e['evidence'].append(ED['evidence'])
        e['databaseVerification']=SUMMARY
    if e['id']=='ENG-04':
        e['currentValue']='Calculation owning-client transactions use Serializable with up to three conflict retries. Real PostgreSQL retry/rollback and stored-run replay are verified. Existing history query still uses strictly earlier pay dates; legal same-day/off-cycle membership remains pending.'
        e['action']='Integrate approved history membership and stale-history denial with complete new-run/correction creation, then verify full lifecycle. Preserve explicit caller-owned isolation for injected transactions.'
assert counts==dict(Counter(e['status'] for e in register['entries']))
register['engineeringUpdatedAt']=NOW; save(register_path,register)
reg_md=ROOT/'docs/database-seed/PAYROLL-UNBLOCK-REGISTER.md'
rt=reg_md.read_text(encoding='utf8')
rt=rt.replace('Current query uses strictly earlier pay dates and creation ordering; calculation uses inTransaction without explicit isolation. Design reviewed same-day/off-cycle ordering and stable concurrent history.', 'Calculation owning-client transactions use Serializable and bounded retries, now verified on PostgreSQL. History still excludes same-day runs; approved membership and complete new-run/correction proofs remain pending.')
rt=re.sub(r'## Database verification update — 2 November 2026\n.*?(?=\n## |\Z)','',rt,flags=re.S)
addition=f'''## Database verification update — 2 November 2026

{SUMMARY}

ED-05 records scoped ENG-04/ENG-07 progress; all seven parent engineering tasks remain pending. {LIMIT}

The canonical JSON register has been updated, including removal of the stale claim that calculation has no explicit transaction isolation. Statutory approvals, independent fixture expectations and dataset release gates are unchanged. See the [current engineering report](../payroll-blockers/PAYROLL-UNBLOCK-REPORT-2026-11-02-ENGINEERING-V4.md).

'''
insert=rt.find('\n## ')
rt=rt[:insert]+'\n'+addition+rt[insert:] if insert>=0 else rt+'\n'+addition
reg_md.write_text(rt,encoding='utf8')

# Refresh just the inspected export-only source change, preserving all other facts.
facts_path=ROOT/'docs/database-seed/payroll-unblock-workpapers/current-source-facts.json'
facts=read(facts_path)
for item in facts['sourceFiles']:
    if item['file']=='services/payroll/payroll-control.service.ts':
        current=(ROOT/item['file']).read_bytes()
        prior=current.replace(b'/** @internal Shared lifecycle boundary, also exercised against disposable PostgreSQL. */\nexport async function inPayrollTransitionTransaction',b'async function inPayrollTransitionTransaction')
        assert item['sha256'] in [hashlib.sha256(prior).hexdigest(),sha(ROOT/item['file'])]
        item['sha256']=sha(ROOT/item['file'])
    else: assert sha(ROOT/item['file'])==item['sha256'], 'Unrelated source-facts drift: '+item['file']
facts['databaseVerificationRefresh']={'at':NOW,'reason':'Export-only visibility of existing helper for real database tests; no calculation semantics changed.','evidence':ED['evidence']}
save(facts_path,facts)

result={'schema':'stoquify-payroll-blockers-engineering.v2','generatedAt':NOW,'contractId':ID,'selectedSkill':'aqstoqflow-payroll-kernel-hardener',
 'phase':'Phase 0: real transaction verification and harness repair','statutoryApprovalRecorded':False,'productionUseAllowed':False,'selection':ED,
 'database':{'file':ED['evidence'],'sha256':sha(OUT/'evidence/postgres-run.json'),'migrations':len(run['migrations']),'serviceTests':7,'sqlChecks':3,'applicationDatabaseChanged':False},
 'unit':{'passed':152,'suites':5,'file':'docs/payroll-blockers/evidence/unit-regression.json','sha256':sha(OUT/'evidence/unit-regression.json')},
 'guardChecks':{'passed':7,'file':'docs/payroll-blockers/evidence/target-guards.tap'},
 'workflow':'Initial PASS; 2 November recheck FAIL due unrelated test:dev:startup -> next.config.mjs fingerprint drift. Not repaired in this scope.',
 'runtimeChange':'Only export/document existing transaction helper for direct database tests; implementation body unchanged.',
 'harnessFix':'Avoid sequential preparation deadlock under organization close-source triggers; synchronize initial snapshots, finish each contender independently, bound timeouts, assert valid serialization/uniqueness conflict.',
 'limits':LIMIT,'sourceHashes':run['sourceHashes'],'remainingParentTasks':['ENG-02','ENG-03','ENG-04','ENG-05','ENG-06','ENG-07','ENG-08']}
save(OUT/'PAYROLL-CALCULATION-ENGINEERING-RESULTS.json',result)

report=f'''# Payroll unblock engineering report — Draft 4

Updated: 2 November 2026. Contract: `{ID}`. Statutory review and production admission remain pending.

## Completed engineering

ED-05 records the new scoped database verification and harness repair.

{SUMMARY}

The existing production transaction helper is exported with an internal-use annotation so database tests execute its actual code. Its isolation, retry, error and injected-client behavior is unchanged. A new guarded runner creates a fresh local target, refuses existing databases, applies migrations, verifies database identity and retains sanitized results. It never resets or seeds the application dataset. Test configuration has no application Next config, environment-file loader or Prisma mocks; Prisma migration configuration reads the local environment file but the runner explicitly fixes every database URL to the fresh target and does not invoke the seed command.

The SQL approval harness had a real orchestration defect under the current close-source revision trigger: awaiting both preparation phases held the first transaction open while the second waited on the same organization. The repair starts both snapshots before writes and lets each contender finish independently. Connection, statement and idle-transaction deadlines bound the race. The original timeout and assertion failure are retained in the first-attempt evidence folder.

## Verification results and limits

| Check | Result | Evidence meaning |
|---|---|---|
| Migration deploy | 120 migrations passed | Fresh `{run['database']}` on PostgreSQL 17.5; no application database mutation. |
| Production transaction helper | 6 tests passed | Real contention retry, uniqueness replay, three-attempt exhaustion, domain rollback, caller-owned transaction isolation, and injected acknowledgement-loss recovery. |
| Calculation service replay | 1 test passed | Concurrent stored-run replay, changed payload denial, cross-tenant period denial; no new statutory calculation. |
| SQL approval/rollback | 3 checks passed | One race winner and SQLSTATE 40001 loser; one complete evidence set; duplicate rejection; rollback of run/event/outbox/audit/transition. |
| Existing mocked/unit suites | 152 tests / 5 suites passed | Regression evidence only; not database or legal certification. |
| Disposable-target guard tests | 7 passed | Reject remote/protected/mismatched targets, production mode, arbitrary names and app-target reuse. |
| Workflow contract | Recheck failed | Unrelated `test:dev:startup -> next.config.mjs` fingerprint drift; needs owner review before registry refresh. |
| Full typecheck, browser, production | Not run | No project-wide or production readiness claim. |

{LIMIT}

## Exact remaining work and inputs

| Task | Verified progress | Remaining dependency and work |
|---|---|---|
| ENG-02 | Explicit finite input checks and missing-history denial retained | Expert-approved algorithm and adjustment dictionary; wire certified YTD and adjustment amounts into actual new-run calculation. |
| ENG-03 | Version-2 observed-history fingerprint retained | Reviewer-selected tax year, history membership and opening balances; then implement completeness/gap detection and approval-time history comparison. |
| ENG-04 | Shared Serializable/retry boundary now tested on PostgreSQL; production callers already audited | Approved same-day/off-cycle rules; full new-run/correction races, stale-history handling and lifecycle replay. Future injected callers must explicitly own isolation/retry. Physical network-loss injection remains separate coverage. |
| ENG-05 | Existing correction-only protections retained | Expert full/delta/reversal/negative/cross-year semantics and independent examples; implement chain membership without double counting. |
| ENG-06 | Invalid/non-finite input denial retained | Expert-approved adjusted bases, branch-specific caps, tax/CAC storage, rounding and refund rules; then update stored authoritative components. |
| ENG-07 | Seven service DB tests, three SQL checks and 152 unit tests passed | F-01 through F-22 independently calculated results; all eleven release families and integrated register/payslip/posting/declaration/payment/close proofs. |
| ENG-08 | September-only runner and release denial retained | Admitted rules for each pay date and owner-approved D-15 October scope before full chronological execution. The October observation cutoff remains 28 October; elapsed calendar time does not fill missing observations. |

All 16 composite decisions remain PENDING_REVIEW. No reviewer identity, signature, selected statutory formula, approval or independent expected amount was invented. Seven parent engineering tasks remain pending, with completed substeps recorded separately. The next engineering step is a complete new-run fixture through certified input/admission boundaries once the calculation contract and independent expected amounts are supplied. Source-history membership and correction semantics must precede their production implementation.

## Evidence and reproducibility

Run `node scripts/run-payroll-blockers-postgres.cjs --database stoquify_local_payroll_blockers_YYYYMMDD_<8 lowercase hex characters>` using a fresh name on the configured local PostgreSQL server. This is a mutating disposable-database lane, not an audit command. It refuses existing targets and retains the created database. Credentials are read in process and omitted from evidence. No public provider or remote service is exercised. Guard tests: `node --test scripts/__tests__/payroll-blockers-target.node.test.cjs`.

Retained [database run](evidence/postgres-run.json), [service test results](evidence/service-transactions.json), [SQL checks](evidence/trust-spine.json), [unit regression](evidence/unit-regression.json), [guard results](evidence/target-guards.tap), [engineering results](PAYROLL-CALCULATION-ENGINEERING-RESULTS.json), [calculation contract](PAYROLL-CALCULATION-CONTRACT.md), [reviewer checklist](PAYROLL-CALCULATION-REVIEWER-CHECKLIST.md) and [unblock register](PAYROLL-UNBLOCK-REGISTER.md).

Rollback only this slice's helper export, harness orchestration changes and newly added runner/tests if needed; preserve pre-existing edits and retained payroll records. The first and final disposable test databases are retained. No automatic database drop is part of this task.
'''
(OUT/'PAYROLL-UNBLOCK-REPORT-2026-11-02-ENGINEERING-V4.md').write_text(report,encoding='utf8')
(ROOT/'what-next/payroll/PAYROLL-BLOCKERS-DATABASE-VERIFICATION-2026-11-02.md').write_text(report.replace('(evidence/','(../../docs/payroll-blockers/evidence/'),encoding='utf8')

def copy_md(source):
    text=source.read_text(encoding='utf8')
    def relink(m):
        target=m[2]
        if '://' in target or target.startswith('#'): return m[0]
        original=(source.parent/target).resolve()
        local=OUT/original.name
        use=local if original.name in ['PAYROLL-CALCULATION-CONTRACT.md','PAYROLL-CALCULATION-REVIEWER-CHECKLIST.md','PAYROLL-CALCULATION-REVIEW-RETURN.json','PAYROLL-UNBLOCK-REGISTER.md'] else original
        return f'[{m[1]}]({os.path.relpath(use,OUT).replace(chr(92),"/")})'
    (OUT/source.name).write_text(re.sub(r'\[([^\]]+)\]\(([^)]+)\)',relink,text),encoding='utf8')
for p in [contract,checklist]: copy_md(p)
summary_rows='\n'.join(f'| {status} | {count} |' for status,count in counts.items())
engineering_rows='\n'.join(f"| {e['id']} | {e['currentValue']} | {e['action']} |" for e in register['entries'] if e['id'] in result['remainingParentTasks'])
(OUT/reg_md.name).write_text(f'''# Payroll unblock register — status summary

Updated 2 November 2026. This publication summarizes the complete 601-entry register retained in [canonical Markdown](../database-seed/PAYROLL-UNBLOCK-REGISTER.md) and [machine-readable register](payroll-unblock-register.json). No entry was removed or marked approved by this continuation.

{SUMMARY}

## Counts, unchanged

| Status | Entries |
|---|---|
{summary_rows}

## Seven parent engineering tasks

| Task | Current evidence | Remaining work |
|---|---|---|
{engineering_rows}

## Database substeps completed

ED-05 records actual PostgreSQL evidence for shared transaction isolation, bounded conflict retries, rollback, stored-run replay, changed payload and tenant denial. SQL tests prove one complete approval evidence winner, duplicate denial and atomic failure rollback. A client error injected after a real commit proves callback replay recovery; physical network-loss testing is not included.

{LIMIT}

All 16 composite review decisions remain PENDING_REVIEW and all 22 independently calculated fixture expectations remain null. No production authorization was recorded. See the [Draft 4 report](PAYROLL-UNBLOCK-REPORT-2026-11-02-ENGINEERING-V4.md), [calculation contract](PAYROLL-CALCULATION-CONTRACT.md), [reviewer checklist](PAYROLL-CALCULATION-REVIEWER-CHECKLIST.md) and [database evidence](evidence/postgres-run.json).
''',encoding='utf8')
for p in [OUT/contract.name,OUT/checklist.name]:
    text=p.read_text(encoding='utf8').replace('[source manifest](../unblock/PAYROLL-CALCULATION-SOURCE-MANIFEST.json)', '[current source manifest](PAYROLL-CALCULATION-SOURCE-MANIFEST.json)')
    p.write_text(text,encoding='utf8')
save(OUT/register_path.name,register)

manifest={'generatedAt':NOW,'contractId':ID,'classification':'ENGINEERING_EVIDENCE_WITH_STATUTORY_APPROVALS_PENDING',
 'sources':[{'file':p,'sha256':sha(ROOT/p)} for p in run['sourceHashes']],
 'documents':[{'file':str(p.relative_to(ROOT)).replace(chr(92),'/'),'sha256':sha(p)} for p in OUT.glob('*.md')],
 'reviewReturnSha256':sha(OUT/form_path.name),'statutoryDecisionsPending':16,'independentFixtureOutputsPending':22,
 'historicalResearchManifest':'docs/unblock/PAYROLL-CALCULATION-SOURCE-MANIFEST.json','researchNotReperformed':True,
 'counts':counts,'evidence':[{'file':str(p.relative_to(ROOT)).replace(chr(92),'/'),'sha256':sha(p)} for p in (OUT/'evidence').glob('*.json')]}
save(OUT/'PAYROLL-CALCULATION-SOURCE-MANIFEST.json',manifest)
print('Draft 4 updated; 16 decisions and 22 expected outputs remain pending; register counts unchanged.')
