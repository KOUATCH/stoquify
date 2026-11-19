"""Record this scoped implementation and update review documents, never approvals."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, difflib, re

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/unblock'
WORK=ROOT/'docs/database-seed/payroll-unblock-workpapers'
NOW=datetime.now(timezone.utc).isoformat()
CID='STOQUIFY-CM-PAYROLL-CALCULATION-2026-10-29-DRAFT-3'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p): return json.loads(p.read_text(encoding='utf8'))
def save(p,x): p.write_text(json.dumps(x,indent=2,ensure_ascii=False)+'\n',encoding='utf8')

tests=load(OUT/'research/engineering-current-tests.json')
assert tests['success'] and tests['numFailedTests']==0 and tests['numFailedTestSuites']==0
assert tests['numPassedTestSuites']==5
count=tests['numPassedTests']
files=[
 'services/payroll/payroll-tax-rule-evaluator.ts',
 'services/payroll/payroll-control.service.ts',
 'services/payroll/payroll-country-pack-fixture-runner.ts',
 'services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts',
 'services/payroll/__tests__/payroll-control.service.test.ts',
 'services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts',
]
changes=[]
diff=[]
for name in files:
 p=ROOT/name; before=OUT/'research/engineering-before'/p.name
 changes.append(dict(file=name,beforeSha256=sha(before),afterSha256=sha(p)))
 diff.extend(difflib.unified_diff(before.read_text(encoding='utf8').splitlines(True),p.read_text(encoding='utf8').splitlines(True),fromfile='before/'+name,tofile='after/'+name))
(OUT/'research/engineering-task.diff').write_text(''.join(diff),encoding='utf8')

selections=[
 dict(id='ED-01',decisions=['D-04','D-06','D-08'],tasks=['ENG-02','ENG-03','ENG-06'],status='IMPLEMENTED_UNIT_VERIFIED',
  selection='Unknown is not zero. Supported YTD evaluation requires both explicit prior base and prior withheld amounts; each named adjustment requires an own, explicit, finite value. Current base and monetary rule values reject NaN/Infinity. Explicit zero remains valid. The fixture adapter preserves absent history instead of defaulting to zero.',
  limit='Does not certify the supplied history as complete, select the legal tax year/method, supply certified mappings, or change rounding/refund/rate policy.'),
 dict(id='ED-02',decisions=['D-12'],tasks=['ENG-04'],status='ROOT_TRANSACTION_IMPLEMENTED_MOCK_VERIFIED',
  selection='For an owning Prisma client, calculation uses the existing payroll transition helper: SERIALIZABLE transaction, at most three attempts for P2034/P2002, re-query idempotency on every attempt, return 409 after exhaustion, do not retry domain errors, redact unexpected internal errors. No external side effect is added to the retry callback.',
  limit='An injected TransactionClient inherits its caller transaction; caller owns isolation and retry. Same-day statutory membership, stale-history checks at approval/posting, real contention/rollback and uncertain-commit proof remain pending. This is not full ENG-04 completion.'),
 dict(id='ED-03',decisions=['D-11','D-13'],tasks=['ENG-03','ENG-07'],status='PROOF_V2_IMPLEMENTED_UNIT_VERIFIED',
  selection='New accumulator proofs use version 2 and bind each ordered prior run/line identity, employee, currency, pay date, run status, document hashes, calculation-snapshot hash and recorded line amounts. observedHistoryHash binds that observed list and is included in the accumulator hash. Missing snapshots remain explicitly null. Existing frozen records are not migrated or rewritten.',
  limit='A fingerprint proves which source data was observed, not legal inclusion or completeness. Legacy proof reads remain supported. Approval-time comparison/invalidation and migration acceptance are not implemented by this slice.'),
 dict(id='ED-04',decisions=['D-14','D-16'],tasks=['ENG-07','ENG-08'],status='VERIFICATION_AND_RELEASE_BOUNDARY_RECORDED',
  selection='Keep mocked/unit, source-integrity, PDF, real-database, statutory-review and release evidence separate. Synthetic zero values and test-only review labels never populate canonical reviewer records. Keep the September-only runner and October pending scope until admitted rules and supported inputs exist.',
  limit='Independent statutory F-01 through F-22 expected outputs, real integrated acceptance and production admission remain pending. No missing attendance is inferred.'),
]
result=dict(schema='stoquify-payroll-engineering-continuation.v1',generatedAt=NOW,contractId=CID,
 authority='User requested remaining engineering work without expert approval; Codex implementation, not independent expert or QA signature.',
 statutoryApprovalRecorded=False,productionUseAllowed=False,selectedSkill='aqstoqflow-payroll-kernel-hardener',phase='Phase 0: scoped calculation input, transaction and evidence hardening',
 selections=selections,changedFiles=changes,
 verification=dict(workflow='PASS; 196 unclassified package scripts',baseline='99 tests / 3 suites passed before changes',
  current=dict(passedTests=count,passedSuites=5,failedTests=0,classOfEvidence='SYNTHETIC_UNIT_AND_MOCKED_SERVICE',file='docs/unblock/research/engineering-current-tests.json',sha256=sha(OUT/'research/engineering-current-tests.json')),
  database='NOT_RUN: no disposable PostgreSQL contention/rollback execution in this slice',browser='NOT_RUN_NO_UI_CHANGE',statutoryIndependentFixtures='NOT_SUPPLIED',fullTypecheck='NOT_RUN',
  command='node node_modules/jest/bin/jest.js --config scripts/jest.payroll-calculation-engineering.config.cjs --runInBand --no-cache --json --outputFile docs/unblock/research/engineering-current-tests.json'),
 commandSideEffectReview='Installed Jest/Next transform without dir; inspected existing setup mocks Prisma and relevant services. No dotenv, app boot, migrations or database connection. Writes test-result JSON and transient test outputs only.',
 runReport='what-next/payroll/PAYROLL-CALCULATION-ENGINEERING-CONTINUATION-2026-10-29.md',
 taskDiff='docs/unblock/research/engineering-task.diff',
 limitations=['Seven parent engineering tasks remain pending; completed substeps are listed separately.', 'The skill-listed June close-invalidation report was absent; the retained August 22 immutability report and current source were used as historical/navigation context only. No historical DB result is claimed as fresh proof.'])
save(OUT/'PAYROLL-CALCULATION-ENGINEERING-RESULTS.json',result)

# Inspectable refresh of only changed code anchors, preserving prior hashes.
facts=load(WORK/'current-source-facts.json')
factChanges=[]
for s in facts['sourceFiles']:
 match=next((x for x in changes if x['file']==s['file']),None)
 if match:
  assert s['sha256']==match['beforeSha256'], 'Unexpected preexisting source-fact drift'
  factChanges.append(match)
  s['sha256']=match['afterSha256']
 else:
  assert sha(ROOT/s['file'])==s['sha256'], 'Unrelated source-fact drift requires inspection'
facts['engineeringRefresh']={'at':NOW,'reason':'Only input validation, transaction boundary, observed-history proof and fixture-input omission handling changed. Pack values, review states and coverage-family definitions were preserved.','changedAnchors':factChanges,'evidence':'docs/unblock/PAYROLL-CALCULATION-ENGINEERING-RESULTS.json'}
save(WORK/'current-source-facts.json',facts)

ret=load(OUT/'PAYROLL-CALCULATION-REVIEW-RETURN.json')
assert all(d['selectedTreatmentOrFormula'] is None and d['reviewedBy'] is None for d in ret['decisions'])
assert not ret['finalDecision']['approvedDecisionIds'] and ret['productionUseAllowed'] is False
ret['contractId']=CID
ret['engineeringUpdatedAt']=NOW
ret['engineeringSelections']=selections
for d in ret['decisions']:
 selected=[s['id'] for s in selections if d['id'] in s['decisions']]
 if selected:
  d['engineeringSelectionIds']=selected
  d['engineeringProgress']='Selected/implemented only within the attached ED scope; statutory decision, independent review and overall acceptance remain pending.'
save(OUT/'PAYROLL-CALCULATION-REVIEW-RETURN.json',ret)

register=load(ROOT/'docs/database-seed/payroll-unblock-register.json')
for e in register['entries']:
 selected=[s for s in selections if e['id'] in s['tasks']]
 if selected:
  e['engineeringSubsteps']=[{'id':s['id'],'status':s['status'],'selection':s['selection'],'remaining':s['limit']} for s in selected]
  if 'docs/unblock/PAYROLL-CALCULATION-ENGINEERING-RESULTS.json' not in e['evidence']:
   e['evidence'].append('docs/unblock/PAYROLL-CALCULATION-ENGINEERING-RESULTS.json')
  assert e['status']=='PENDING_ENGINEERING'
assert sum(e['status']=='PENDING_ENGINEERING' for e in register['entries'])==7
save(ROOT/'docs/database-seed/payroll-unblock-register.json',register)

section=f'''## Engineering continuation — Draft 3 / 29 October 2026

**Statutory approvals remain pending.** Four engineering selections are recorded below; completed substeps do not close ENG-02 through ENG-08. All D-01 through D-16 review statuses and all independent F-01 through F-22 outputs remain pending. The earlier 12 source-supported proposals are preserved.

| Selection | Implemented or selected | Exact remaining boundary |
|---|---|---|
'''
for s in selections: section+=f"| {s['id']} / {', '.join(s['decisions'])} | {s['selection']} | {s['limit']} |\n"
section+=f'''
**Verification:** {count} tests across five suites pass. Evidence is synthetic/unit and mocked service execution, including the real evaluator/service calls with mocked persistence, missing-input denial before run/event creation, conflict retries/replay, production-admission denial, fixture validation and register compatibility. Equal totals with changed prior status or snapshot produce a different observed-history hash; unchanged history produces the same hash. The original three-suite baseline passed 99 tests.

The broader run initially exposed synthetic fixtures relying on omitted zero inputs and an adapter defaulting missing YTD to zero. The adapter was corrected and synthetic scenarios now state their known zero amounts explicitly. No runtime country-pack rate, approval identity or signed fixture was filled by this change.

No real PostgreSQL, provider operation, full project typecheck or browser journey was executed. Mock retries do not establish database rollback or concurrent commit safety. PDF/source validation is separate evidence. See [retained engineering results](PAYROLL-CALCULATION-ENGINEERING-RESULTS.json) and the [scoped task diff](research/engineering-task.diff).

### Seven-task remaining work after this slice

| Task | Completed substep | Still required |
|---|---|---|
| ENG-02 | Explicit YTD/adjustment presence and finite-value checks in evaluator; fixture adapter preserves omissions | Approved algorithm and certified service input mappings; authoritative amounts still must be wired into the evaluator. Unsupported wiring now fails closed. |
| ENG-03 | Version-2 fingerprint binds observed historical source identities and snapshots | Approved tax-year/membership/opening-balance policy, period-gap/completeness checks and approval-time stale-history denial. |
| ENG-04 | Owning-client SERIALIZABLE transaction and existing three-attempt conflict/replay handling | Audit/enforce injected transaction caller contract; approved same-day/off-cycle policy; real PostgreSQL contenders, rollback, uncertain-commit and stale-history tests. |
| ENG-05 | Existing correction-only lifecycle preserved | Approved full/delta/reversal/negative/cross-year semantics; implementation and independent evidence. |
| ENG-06 | Invalid/non-finite money and absent required input denied | Approved adjusted bases, branch-specific social caps, tax/CAC storage, rounding and refund handling; no proposed statutory number installed. |
| ENG-07 | Five focused suites pass; proof change and register consumers checked | Independent statutory expectations, real integrated lifecycle and all eleven release families; no F-case marked independently approved. |
| ENG-08 | Release/runner/October boundaries retained | ENG-07 acceptance, admitted date-effective rules and supported D-15 scope before chronological full execution. |

### Engineering decision details and rollback

D-12 selects SERIALIZABLE for transactions owned by calculation and reuses the existing transition retry/error policy; supplied transaction clients remain the responsibility of their caller. This scope is explicit and is not a claim that every call path is proven serializable. No automatic external retry is introduced for an unknown commit outcome.

D-13 selects a versioned source fingerprint over the existing pay-date/run-ID/line-ID ordering. It does not select additional legal history members. Missing evidence remains missing, and existing version-1 snapshots are left untouched. A future approval gate must recompute and compare the selected history before accepting its evidence; a hash alone is not that gate.

Rollback only the hunks in the retained task diff and the added isolated Jest configuration. Preserve preexisting service edits and all frozen financial records. Future calculations using proof version 2 create new evidence; no database migration, historical backfill or production publication was performed. This does not authorize rewriting a retained snapshot during rollback.

'''

contractPath=OUT/'PAYROLL-CALCULATION-CONTRACT.md'
contract=contractPath.read_text(encoding='utf8')
assert '## Engineering continuation — Draft 3' not in contract
contract=contract.replace('DRAFT-2','DRAFT-3')
contract=contract.replace('## 1. Status vocabulary and scope',section+'## 1. Status vocabulary and scope',1)
contract=contract.replace('Missing optional monetary inputs become zero in the evaluator; this is not evidence that omitted history is legally zero.','Supported YTD mode now requires both explicit history amounts; named adjustments require explicit finite inputs. Explicit zero is accepted, but is not proof of complete history.')
contract=contract.replace('Calculation uses `inTransaction` without explicit isolation; a separate serializable helper exists.','Calculation now uses `inPayrollTransitionTransaction`: owning-client SERIALIZABLE with bounded conflict retries. Injected transactions inherit their caller’s settings.')
contract=contract.replace('No accepted concurrency contract in this draft','ED-02 selects owning-client isolation/retry; caller and real-database acceptance remain pending')
contract=contract.replace('Existing optional monetary inputs become zero','Earlier optional monetary inputs became zero')
contract=contract.replace('Source inspection and document/PDF validation are the evidence for this publication. No payroll calculation, real database test, provider operation, statutory approval or release was performed.','Source inspection, focused synthetic/mocked calculation tests and document/PDF validation support this revision. No real database test, provider operation, statutory approval or release was performed.')
contract=contract.replace('This revision updates review documents and source workpapers only. Runtime code and canonical approval states remain unchanged.','Draft 3 includes the scoped evaluator, fixture-runner and calculation-service changes described above; canonical approval states and statutory values remain unchanged.')
contractPath.write_text(contract,encoding='utf8')

checkPath=OUT/'PAYROLL-CALCULATION-REVIEWER-CHECKLIST.md'
check=checkPath.read_text(encoding='utf8').replace('DRAFT-2','DRAFT-3')
check=check.replace('## 1. How to complete the packet',f'''## Engineering handoff update — Draft 3

ED-01 through ED-04 in the contract record engineering choices and scoped implementation. {count} synthetic/mocked tests across five suites pass. Statutory approvals, reviewer signatures, independent expected amounts and the seven parent task completion gates remain pending.

- [x] Require explicit YTD totals and named adjustment inputs; reject non-finite money; keep unknown values distinct from zero in the fixture adapter.
- [x] Use the existing SERIALIZABLE/retry boundary for calculation-owned transactions; verify retry, replay, exhaustion and error handling with mocks.
- [x] Bind version-2 accumulator evidence to ordered historical identities, snapshots and line amounts; verify equal-total source changes alter its hash.
- [x] Preserve unreviewed admission denial and register/fixture compatibility in the focused unit lane.
- [ ] Engineering: audit/enforce callers supplying TransactionClient; run actual PostgreSQL concurrency, rollback and uncertain-commit tests.
- [ ] Engineering plus reviewer: define legal history membership and implement completeness and approval-time stale-history comparison/invalidation.
- [ ] Reviewer/accounting: supply approved calculation, correction, rounding/refund, tax/CAC and branch-base treatments, with independent F-01 through F-22 evidence.
- [ ] Dataset/legal owners: supply October scope and actual admitted rule/release evidence before runner expansion.

Checked items above mean scoped engineering verification only. They do not check any statutory box or sign D-12/D-13 on behalf of an independent reviewer. [Engineering results](PAYROLL-CALCULATION-ENGINEERING-RESULTS.json) retain the test output hash and before/after source hashes.

## 1. How to complete the packet''',1)
check=check.replace('No new payroll-engine unit test, real database test or live workflow execution is claimed.','Draft 3 ran the focused synthetic/mocked engineering suite recorded above. No real database test or live workflow execution is claimed.')
checkPath.write_text(check,encoding='utf8')

regPath=ROOT/'docs/database-seed/PAYROLL-UNBLOCK-REGISTER.md'
reg=regPath.read_text(encoding='utf8')
reg=reg.replace('## Counts',f'''## Engineering continuation — 29 October 2026

ED-01 through ED-04 select input completeness, calculation-owned transaction isolation/retries, versioned observed-history fingerprints and evidence/release boundaries. Scoped substeps now pass {count} synthetic/mocked tests in five suites. [Details and exact remaining work](../unblock/PAYROLL-CALCULATION-ENGINEERING-RESULTS.json) are also recorded on ENG-02/03/04/06/07/08 in the machine register. Seven parent engineering tasks remain pending; no statutory approval or real database certification was created. Counts below are unchanged.

## Counts''',1)
regPath.write_text(reg,encoding='utf8')

reportPath=OUT/'PAYROLL-UNBLOCK-REPORT.md'
report=reportPath.read_text(encoding='utf8')
# Preserve the dated historical account; put current continuation first.
first,rest=report.split('\n',1)
reportPath.write_text(first+'\n\n'+section+'\n## Earlier inventory and engineering record\n'+rest,encoding='utf8')
run=ROOT/'what-next/payroll/PAYROLL-CALCULATION-ENGINEERING-CONTINUATION-2026-10-29.md'
run.write_text('# Payroll calculation engineering continuation\n\nSelected skill: aqstoqflow-payroll-kernel-hardener. Phase 0 scoped input, transaction and evidence hardening.\n\n'+section.replace('(PAYROLL-CALCULATION-ENGINEERING-RESULTS.json)','(../../docs/unblock/PAYROLL-CALCULATION-ENGINEERING-RESULTS.json)').replace('(research/engineering-task.diff)','(../../docs/unblock/research/engineering-task.diff)')+'\nNext slice: injected-transaction caller audit and disposable PostgreSQL concurrency harness, then approved history/stale-evidence integration. Statutory expert decisions remain prerequisites for formula changes.\n',encoding='utf8')
print(json.dumps({'status':'PASS','tests':count,'engineeringSelections':4,'parentEngineeringTasksPending':7,'statutoryApprovalsRecorded':0}))
