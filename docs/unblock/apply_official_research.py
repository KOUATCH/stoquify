"""Apply reviewed-source research to draft documents only; never approve rules.

No application imports, database connections, environment loading or network.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, re

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/unblock'
NOW = datetime.now(timezone.utc).isoformat()
CID = 'STOQUIFY-CM-PAYROLL-CALCULATION-2026-10-29-DRAFT-2'

def read(name): return (OUT/name).read_text(encoding='utf8')
def save(name, value): (OUT/name).write_text(json.dumps(value, indent=2, ensure_ascii=False)+'\n', encoding='utf8')
def digest(file): return hashlib.sha256(file.read_bytes()).hexdigest()

# Inspection scope is deliberately explicit: downloaded is not fully reviewed.
specs = [
 ('S-01','DGI consolidated tax code, edition 2026','docs/database-seed/payroll-unblock-workpapers/DGI-CGI-2026.pdf','https://www.impots.cm/sites/default/files/publications/CODE%20GENERAL%20DES%20IMPOTS%202026%20%20VERSION%20FRANCAISE.pdf','Arts 24–34, 65 bis, 67–71, 74 bis, 80–84; PDF pp.58–61, 70, 73–76','Text extraction of first 120 pages; targeted provisions inspected. Not an audit of the whole code.'),
 ('S-02','CNPS decree 2016/072 of 15 February 2016','docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/CNPS-Decree-2016-072-contribution-rates.pdf','https://www.cnps.cm/images/documentutile/decret%20fixant%20taux%20de%20cotisations%20sociales%20et%20plafonds%20des%20rmunrations_baremes%202.pdf','Arts 2–4, 8–10; PDF pp.1–3; classification annex pp.4–5','Retained signed decree/OCR inspected; temporal applicability and employer classification require review.'),
 ('S-03','DGI consolidated tax code, edition 2024','docs/unblock/research/DGI-CGI-2024.pdf','https://www.impots.cm/sites/default/files/documents/CGI%202024%20version%20francaise.pdf','Arts 33–34 PDF p.57; art 65 bis pp.66–67; art 74 bis pp.70–71','Targeted historical comparison; not a substitute for a complete 2025 amendment review.'),
 ('S-04','DGI finance circular 2024','docs/unblock/research/DGI-finance-circular-2024.pdf','https://www.impots.cm/sites/default/files/documents/Circulaire%20LF%202024.pdf','Section 1.15, paragraphs 112–113, PDF p.19','Scanned contents and p.19 visually inspected; implementation text referred to in paragraph 113 not recovered.'),
 ('S-05','DGI finance circular 2025','docs/unblock/research/DGI-finance-circular-2025.pdf','https://www.impots.cm/sites/default/files/documents/CIRCULAIRE%20LF2025..pdf','Contents PDF p.2','Retained 68-page scan; contents inspected only. Absence from contents is not proof of no amendment.'),
 ('S-06','DGI finance circular 2026','docs/unblock/research/DGI-finance-circular-2026.pdf','https://impots.cm/sites/default/files/publications/circulaire%20lf%202026%20VF%20%281%29-compress%C3%A9.pdf','Section 1.12, paragraphs 144–146, PDF p.29','Contents and exceptional-income section visually inspected; not a full circular review.'),
 ('S-07','DGI indicative IRPP and other payroll withholding table','docs/unblock/research/DGI-IRPP-bareme.pdf','https://www.impots.cm/sites/default/files/documents/BAREME%20IRPP_DSSI%20final.pdf','PDF p.1; gross monthly salary / IRPP / CAC columns','Undated indicative table, first-page sample rows visually inspected. Effective applicability not established.'),
 ('S-08','DGI indicative local development tax table','docs/unblock/research/DGI-TDL-bareme.pdf','https://www.impots.cm/sites/default/files/documents/BAREME%20TDL_DSSI%20final.pdf','PDF p.1','Discovery and first-page text extraction only; 2025/2026 local-tax applicability unresolved.'),
 ('S-09','DGI non-professional annual declaration circular, 20 March 2024','docs/unblock/research/DGI-IRPP-declaration-circular.pdf','https://www.impots.cm/sites/default/files/documents/circulaire%20d%C3%A9claration%20IRPP.pdf','PDF pp.1–4, particularly paragraph 12','Cover, contents and p.4 visually inspected. Its June deadline must not override the differing 2026 code.'),
 ('S-10','Finance law 2024/013 of 23 December 2024 for 2025','docs/database-seed/payroll-unblock-workpapers/DGI-finance-law-2025.pdf','https://www.impots.cm/sites/default/files/documents/loi_n_2024_013_du_23_12_2024-web.pdf','Cover / document identity','Retained scanned law; no claim of complete provision-by-provision payroll review.'),
]
sources=[]
for sid,title,file,url,provisions,scope in specs:
 p=ROOT/file
 sources.append(dict(id=sid,title=title,file=file,url=url,sha256=digest(p),bytes=p.stat().st_size,provisions=provisions,inspectionScope=scope,expertVerified=False))
byid={s['id']:s for s in sources}

# Every paragraph distinguishes a populated proposal from a missing decision.
decisions=[
 ('D-01',['S-01','S-02','S-03','S-04','S-06'],
  'Use separate date-effective 2025 and 2026 envelopes. CGI arts 24–25 and 30 support residence/source-based scope, with treaty exceptions. The 2024 code already contains the benefit schedule and 4,800,000 FCFA expense cap, corroborated by circular 2024 paragraphs 112–113. Circular 2026 paragraphs 144–146 expressly changes the qualifying exceptional-income abatement from 25% to 35% for the 2026 reform. These are source-backed candidates, not an approved 2025 consolidated rule set.',
  'Qualified reviewer: confirm complete 2025 amendment chain and operative dates, residency/treaty exclusions, employee/employer categories and whether exceptional income is supported or explicitly denied. Return signed 2025/2026 envelopes; do not extrapolate CM-2026.1 backwards.'),
 ('D-02',['S-01','S-07'],
  'CGI art 69 states annual progressive brackets; art 81 requires employer withholding at each payment. The DGI indicative table supplies monthly comparisons. Candidate annual ordinary-income model: G = approved annual taxable gross including approved benefits; E = min(30% × G, 4,800,000 FCFA); R = qualifying mandatory employee retirement contributions; B = G − E − R − 500,000 FCFA. Apply art 69 to the reviewed nonnegative taxable base and CAC = 10% of principal IRPP under art 71. This is an annual model proposal, not an approved monthly or YTD algorithm. The base definition and benefit construction need review before this notation is executable.',
  'Reviewer must select monthly conversion/annualization, partial-year/joiner treatment, cap consumption and regularization. Do not feed annual thresholds directly into current-month gross or treat P(Y+A)−W as validated by these provisions. Resolve exceptional-income art 65 bis separately.'),
 ('D-03',['S-01'],
  'CGI art 74 bis(5), PDF p.75, expressly requires the annual pay/withholding statement for the preceding calendar year. Arts 68 and 81 tie salary liability/withholding to availability/payment. Proposed tax accumulation window: January 1 through December 31, independent of the tenant accounting fiscal year, with actual payment/availability date recorded separately from earning period.',
  'Reviewer to approve tax-year mapping for payroll and delayed/backdated/cross-year corrections; engineering to define the Cameroon local-date/time-zone conversion. The annual statement supports the calendar proposal but does not prescribe every internal YTD algorithm.'),
 ('D-04',['S-01'],
  'Art 74 bis(2),(5) requires annual income and withholding information; art 80 accounts for source withholding/advances in annual liability. Preserve separate actual payments, withholding, remittance and supported opening balances. Proposed internal gate: required unavailable history is an error, while genuine zero requires affirmative evidence.',
  'Payroll reviewer/owner must decide prior-employer and off-cycle membership; engineering must map real payment/withholding facts to POSTED/PAID and correction statuses, gap detection and approved opening-balance migration. The statute does not define application statuses.'),
 ('D-05',['S-01','S-02','S-03','S-04'],
  'CGI arts 31–34 support qualifying exemptions, inclusion/valuation of benefits and deduction of mandatory retirement contributions. Art 33 percentage valuations on gross taxable salary: housing 15%; electricity 4%; water 2%; each domestic worker 5%; each vehicle 10%; food 10%; telephone 5%; fuel 10%; guarding 5%; internet 5%. Unlisted benefits use actual cost; cash equivalents use actual amount unless expressly exempt. CNPS pension is 4.2% employee + 4.2% employer. Family rates are 7% general, 5.65% agricultural, 3.7% private education. Decree art 4 limits pension/family remuneration to 750,000 francs monthly / 9,000,000 annually. Occupational risk is employer-only A 1.75%, B 2.5%, C 5% on remuneration less professional expenses (art 8); art 4 does not extend that ceiling to occupational risk. Family contributions are also employer-only (art 10).',
  'Reviewer must validate branch-specific remuneration/exemptions, benefit valuation denominator and anti-double-counting, cap allocation across irregular/multiple payments, sector/risk classification and current applicability. Do not import the tax 30% expense deduction into the social base without its own authority. The common capped service base conflicts with the proposed ATMP treatment. Leave/overtime/recovery amounts remain unresolved pending operative labour instruments and applicable collective agreements.'),
 ('D-06',['S-01','S-02'],
  'Prefill a proposed logical dictionary for professionalExpenseDeduction (30%, annual cap 4,800,000), mandatoryRetirementDeduction (actual qualifying employee contribution), annualSalaryAllowance (500,000), benefitValuations (art 33), professionalExpenseReimbursementExclusion (art 31 conditions), irppPrincipal and cacSurcharge (10% of principal). Exceptional income is a separate eligibility/calculation branch, not a generic percentage adjustment. Other payroll levies require their own obligation catalogue.',
  'Payroll/engineering owners must bind each logical item to certified source fields, determine sign and stage, period allocation, required evidence, missing-input denial and actual evaluator keys. No invented field mapping or omission-as-zero is authorized.'),
 ('D-07',['S-01','S-03','S-04','S-06'],
  'Populate annual IRPP brackets: first 2,000,000 FCFA at 10%; next 1,000,000 at 15%; next 2,000,000 at 25%; excess over 5,000,000 at 35% (art 69). Art 29 supplies annual salary allowance 500,000; art 34 supplies 30% expense deduction capped 4,800,000/year and mandatory retirement deduction; art 71 adds CAC equal to 10% of principal tax. Art 81 exempts gross monthly salary strictly below 62,000 from employer withholding; exactly 62,000 is not inside that exemption, although calculated liability can be zero. Art 65 bis adds conditional exceptional-income treatment, including the 2026 35% abatement; it is not a general bonus exemption.',
  'Reviewer to approve boundary/decimal representation, deduction order and monthly allocation, exceptional-income eligibility and three-year history, any dependant relief and other exemptions, and bounds. No independently verified basis was found here for a new dependant deduction or a universal minimum/maximum tax. The below-62,000 withholding exemption must not be generalized into exemption from every payroll levy.'),
 ('D-08',['S-01','S-02','S-07'],
  'Official amounts are expressed in francs/FCFA: the CNPS ceiling is 750,000 francs, not 7,500 francs. Proposed contract display unit is one FCFA; require an explicit storage-unit conversion rather than infer units from MinorUnits names. Indicative-table p.1 shows gross 64,000 → principal IRPP 45 and CAC 4, and gross 65,000 → IRPP 110 and CAC 11. These are source comparison rows, not proof of a universal tie rule or intermediate rounding sequence.',
  'Reviewer must supply applicable scale/tie rule and rounding stage for each tax/contribution, correction, total and declaration; engineering must reconcile unit names and residual allocation. Do not adopt two decimals or infer half-up/half-even from a few table rows.'),
 ('D-09',['S-01','S-03'],
  'CGI art 74 bis(4), 2026 PDF p.75 and 2024 p.71, allows an overpayment shown by the annual declaration to be refunded or applied to future taxes at the taxpayer’s request, after validation by competent services. Preserve an identifiable overpayment claim and the validation/request evidence. This establishes a procedure; it does not authorize automatic employer net-pay refunds or a silent negative-tax clamp.',
  'Reviewer must distinguish employer correction from taxpayer annual claim, choose the allowed interim treatment, authority and evidence, and map approved credits/refunds into future withholding, declarations and ledger. Current zero floor is not approved merely because the annual refund procedure exists.'),
 ('D-10',[],
  'No determinative official prescription for application correction/reversal identity or full-versus-delta storage was found in the reviewed sources. Retain the proposed invariant of one economic effect per correction chain, preserving actual payment/withholding and year attribution.',
  'Reviewer and engineering must decide replacement/delta semantics, reverse/reissue treatment, negative deltas, already-paid/declared cases and downstream recomputation. A legal provision about annual claims does not settle this data model.'),
 ('D-11',['S-01','S-02'],
  'Arts 81–82 distinguish withholding shown on a payslip from later remittance; art 74 bis requires annual gross gains and withholding detail. Proposed distinct outputs: gross taxable income, professional-expense allowance, deductible pension, annual allowance allocation, net taxable base, principal IRPP, CAC, total tax withheld, remitted amount, each employee/employer social contribution, and correction deltas. Keep raw/current/annual bases and trace distinct; do not report employer charges as employee deductions.',
  'Reviewer/accounting owner must select the authoritative YTD base, stored full/delta identities, payslip/declaration/journal mappings and net-pay reconciliation. Validate whether current incomeTaxAmount includes CAC; never assume it does.'),
 ('D-12',[],
  'Official sources reviewed do not select database isolation, ordering keys or retry mechanics. Retain the engineering proposal: stable sequence and history revision, conflict detection, atomic calculation persistence, stale-history recomputation/denial and idempotent retry.',
  'Engineering owner must supply the transaction/locking or revision design and real PostgreSQL contention/rollback evidence; reviewer confirms same-day/off-cycle policy constraints. No external legal signature can substitute for concurrency tests.'),
 ('D-13',[],
  'Official sources reviewed do not establish application hash formats or snapshot-version semantics. Retain immutable bindings among certified inputs, rule version, source/approval artifacts, included history and correction ancestry, with downstream invalidation when dependencies change.',
  'Engineering/QA owners must approve evidence schema, history revision, stale-data denial, migration and invalidation; reviewer accepts calculation trace sufficiency. Real evidence must come from execution, not hash-shaped placeholders.'),
 ('D-14',['S-07','S-01','S-02'],
  'Add official-table benchmark rows as a separate evidence class: gross 63,500 → IRPP 12 / CAC 1; 64,000 → 45 / 4; 65,000 → 110 / 11 (S-07 p.1). Extend F-02/F-08/F-09/F-11/F-18 for the 62,000 withholding boundary, each annual bracket, 750,000 branch-specific social cap, 4,800,000 annual expense cap, CAC separation and exceptional-income version transition. Proposed tolerance remains exact equality after approved rounding.',
  'Reviewer must confirm the undated table’s applicability and independently calculate the complete fixture suite with intermediate amounts. Benchmarks do not establish rounding, irregular-pay/YTD behavior or independent approval; all 22 expected-output records remain pending.'),
 ('D-15',[],
  'Official tax research cannot supply missing October attendance after 28 October or prove period completion. Preserve the observed cutoff and intended 31 October pay date as separate facts.',
  'Dataset owner must provide supported completion evidence or explicitly leave October pending. Any change in salary/absence projection policy requires payroll review; statutory sources do not justify fabricated attendance.'),
 ('D-16',['S-01','S-09'],
  'CGI arts 81–82 require withholding at payment and remittance by the 15th of the following month. Art 74 bis(5) requires the preceding-calendar-year pay/withholding statement by 15 March. The 2026 art 74 bis(1) has category-specific annual taxpayer filing dates: 31 July for specified high personalities/public/parapublic employees, 30 September for private employees of DGE/CIME/CSI taxpayers, 31 October for other individuals. The 2024 circular’s June date must not be copied as the 2026 rule. Keep these obligations separate from the internal calculation/posting/release sequence.',
  'Reviewer to establish effective declaration calendars and employer/taxpayer classification, including 2025 rules and any extensions. Engineering/operations must agree chronological/idempotent execution; legal owner must complete actual admission. A research-backed deadline does not certify remittance or release.'),
]

research_decisions=[]
for did,refs,proposal,remaining in decisions:
 status='PARTIALLY_SOURCE_SUPPORTED_PROPOSAL' if refs else ('NO_DETERMINATIVE_SOURCE_FOUND' if did=='D-10' else 'OWNER_ENGINEERING_DECISION')
 research_decisions.append(dict(id=did,researchStatus=status,proposedTreatmentOrFormula=proposal,remainingInput=remaining,sourceIds=refs,approvalStatus='PENDING_REVIEW'))

research = dict(schema='stoquify-payroll-official-research.v1',contractId=CID,researchedAt=NOW,
 classification='SOURCE_BACKED_PROPOSALS_NOT_EXPERT_APPROVAL',productionUseAllowed=False,
 counts=dict(decisions=16,partiallySourceSupported=12,noDeterminativeSourceFound=1,ownerEngineeringDecisions=3,approved=0),
 sources=sources,decisions=research_decisions,
 scopeLimitations=[
  'No complete 2025 consolidated code recovered. DGI links returned 404; 2024/2026 comparison plus retained 2025 law/circular is evidence for review, not proof of no intervening amendments.',
  'Circular 2024 paragraph 113 refers benefit/expense implementation details to a specific text; that text is not recovered here.',
  'CNPS labour-code link supplies a 13-page contents index, not operative labour provisions. MINFOPRA labour-code/overtime download links returned 404. No numeric leave/overtime/recovery policy was filled from those indexes.',
  'No complete amendment or treaty search; source status and inspection limits are recorded per artifact.',
  'CCF, FNE, CRTV and TDL need an explicit dated obligation catalogue. Undated table labels/values alone do not establish 2025/2026 applicability or levy ownership.',
 ],
 officialBenchmarks=[dict(sourceId='S-07',pdfPage=1,grossMonthlyFCFA=g,irppPrincipalFCFA=i,cacFCFA=c,status='UNDATED_INDICATIVE_NOT_APPROVED_FIXTURE') for g,i,c in [(63500,12,1),(64000,45,4),(65000,110,11)]])
save('PAYROLL-CALCULATION-OFFICIAL-RESEARCH.json',research)

ret=json.loads(read('PAYROLL-CALCULATION-REVIEW-RETURN.json'))
assert ret['productionUseAllowed'] is False and not ret['finalDecision']['approvedDecisionIds']
assert all(d['status']=='PENDING_REVIEW' and d['selectedTreatmentOrFormula'] is None and d['reviewedBy'] is None for d in ret['decisions'])
ret.update(contractId=CID,researchUpdatedAt=NOW,officialResearchFile='PAYROLL-CALCULATION-OFFICIAL-RESEARCH.json')
for d,r in zip(ret['decisions'],research_decisions):
 assert d['id']==r['id']
 d.update({k:r[k] for k in ['researchStatus','proposedTreatmentOrFormula','remainingInput','sourceIds']})
 d['sourceEvidence']=[{k:byid[s][k] for k in ['id','file','url','sha256','provisions','inspectionScope']} for s in r['sourceIds']]
 d['rationale']='Research proposal populated from the cited official provisions; the selected/approved treatment remains null.' if r['sourceIds'] else 'An accountable owner decision is still required; no statutory answer is inferred.'
 d['legalReference']='; '.join(byid[s]['title']+': '+byid[s]['provisions'] for s in r['sourceIds']) or None
 d['conditions']=r['remainingInput']
 d['fixtureIds']=re.findall(r'F-\d{2}',d['reviewRequest'])

dictionary=[
 ('professionalExpenseDeduction','SUBTRACT_FROM_GROSS','30% of approved taxable gross, limited to 4,800,000 FCFA/year','S-01','CGI art 34'),
 ('mandatoryRetirementDeduction','SUBTRACT_FROM_GROSS','Actual qualifying mandatory employee retirement contribution; CNPS candidate 4.2% subject to approved branch base/cap','S-01','CGI art 34; S-02 arts 3–4'),
 ('annualSalaryAllowance','SUBTRACT_FROM_ANNUAL_BASE','500,000 FCFA/year; period allocation pending','S-01','CGI art 29'),
 ('benefitValuations','GROSS_COMPOSITION','Art 33 schedule or actual cost/amount where prescribed; avoid double counting','S-01','CGI arts 32–33'),
 ('professionalExpenseReimbursementExclusion','GROSS_EXCLUSION_IF_ELIGIBLE','Only qualifying professional expense reimbursements; evidence of purpose/use required','S-01','CGI art 31'),
 ('irppPrincipal','PROGRESSIVE_TAX','Annual 10/15/25/35% brackets; monthly method pending','S-01','CGI art 69'),
 ('cacSurcharge','SEPARATE_TAX_COMPONENT','10% of IRPP principal; rounding pending','S-01','CGI art 71'),
 ('exceptionalIncome','SEPARATE_ELIGIBILITY_AND_ALGORITHM','Art 65 bis conditional quotient/special-abatement branch; 2026 change 25% to 35%','S-06','Circular 2026 paragraphs 144–146'),
]
ret['adjustmentInputDictionary']=[dict(proposedLogicalKey=k,stage=stage,proposedTreatment=value,sourceId=sid,provision=provision,unit='FCFA unless a rate',currency='XAF',status='PROPOSED_NOT_APPROVED',runtimeInputKey=None,certifiedSourceRecordField=None,allocationMethod=None,missingInputPolicy='PROPOSED_DENY_IF_REQUIRED',reviewedBy=None) for k,stage,value,sid,provision in dictionary]
ret['officialComparisonBenchmarks']=research['officialBenchmarks']
for fixture in ret['fixtures']:
 if fixture['id'] in ['F-01','F-02','F-08','F-09','F-11','F-18']:
  fixture['researchExpansion']='Include 2025/2026 exceptional-income transition, 62,000 withholding boundary, annual brackets, 750,000 pension/family versus uncapped ATMP, 4,800,000 expense cap, benefit valuations and separate CAC where relevant. Independent expected outputs and rounding remain pending.'
save('PAYROLL-CALCULATION-REVIEW-RETURN.json',ret)

contract=read('PAYROLL-CALCULATION-CONTRACT.md')
contract=contract.replace('DRAFT-1','DRAFT-2')
contract=contract.replace('It does not select a statutory formula or certify the present implementation.','Revision 2 adds source-backed proposed treatments from official Cameroon publications. No statutory treatment is approved, and the present implementation is not certified.')
contract=contract.replace('No choice is preselected.','Research proposals are populated; the approved selection remains pending.')
contract=contract.replace('No keys are selected yet.','Proposed logical keys are now populated in the structured return; certified field mappings and runtime keys remain pending.')
for r in research_decisions:
 pattern=r'(^### '+r['id']+r' — [^\n]+\n\n)(.*?)(?=\n### |\n## |\Z)'
 m=re.search(pattern,contract,re.M|re.S)
 assert m
 original=m[2].split('\n\n**Research update')[0].rstrip()
 source_label=', '.join(r['sourceIds']) if r['sourceIds'] else 'No determinative official rule for this internal choice'
 block=f"\n\n**Research update — {r['researchStatus']}.** {r['proposedTreatmentOrFormula']}\n\n**Evidence:** {source_label}; exact artifacts, provisions and inspection limits are in section 10 and the research index.\n\n**Still required:** {r['remainingInput']}\n"
 contract=contract[:m.start(2)]+original+block+contract[m.end(2):]
contract=contract.replace('this draft does not adjudicate their provisions.','revision 2 now records targeted source analysis and proposals, while expert approval remains pending.')
contract=contract.replace('Rollback consists only of removing the new review-draft artifacts; existing code, approval templates, register statuses and earlier reports are preserved.','This revision updates review documents and source workpapers only. Runtime code and canonical approval states remain unchanged.')
contract=contract.replace('The reviewer must decide whether each contribution requires that same ceiling.','Research S-02 now supports separate capped pension/family and uncapped occupational-risk bases; the reviewer must approve the applicable treatment before implementation.')
summary='''## Research revision — 29 October 2026

**12 of 16 decisions now have partially source-supported proposals; 0 are approved.** D-10 has no determinative prescription for application correction identity in the inspected sources; D-12, D-13 and D-15 require engineering/owner decisions. All 16 remain PENDING_REVIEW and ENG-02 through ENG-08 remain pending. This count measures populated research, not completed tasks.

The main findings are separate CNPS branch ceilings, the 30% professional-expense deduction capped at 4,800,000 FCFA/year, the 500,000 annual salary allowance, annual progressive IRPP, 10% CAC, calendar-year reporting, the validated annual refund/credit procedure, and the 2026 exceptional-income change. Dates, calculation method, rounding and independent fixtures still need qualified review. The [official research index](PAYROLL-CALCULATION-OFFICIAL-RESEARCH.json) records proposals, exact source hashes and remaining questions for every D-ID.

'''
contract=contract.replace('## 1. Status vocabulary and scope',summary+'## 1. Status vocabulary and scope',1)
contract+='''
## 10. Official-source research and conflict register

Page references are one-based PDF pages; printed page numbers may differ. The research index records the complete SHA-256 and inspected scope for each source. A retained file is not a claim that every page or every subsequent amendment was reviewed.

| Source | Official authority and exact evidence | Inspection / applicability limit |
|---|---|---|
'''
for s in sources:
 contract+=f"| {s['id']} | [{s['title']}]({s['url']}) — {s['provisions']} | {s['inspectionScope']} |\n"
contract+='''
### Material conflicts and engineering consequences

1. **Shared social ceiling:** CNPS decree art 4 covers pension/family; art 8 has a distinct occupational-risk base. ENG-02/ENG-06 must support branch-specific bases, with F-08 above 750,000. Employer sector and risk classification remain inputs requiring evidence.
2. **Incomplete IRPP candidate:** the current placeholder does not establish the 30% deduction/cap, 500,000 allowance, principal tax or CAC. ENG-02/ENG-06 need reviewed calculation stages and stored outputs. Do not label annual brackets as a monthly formula.
3. **Effective-year differences:** the 4,800,000 cap and expanded benefits already appear in official 2024 material; they are not a newly inferred 2026 reform. Circular 2026 expressly changes the conditional exceptional-income abatement from 25% to 35%. F-01/F-09 must cover approved transitions or deny exceptional income outside scope. The complete 2025 amendment set still needs confirmation.
4. **Indicative table limits:** S-07 sample monthly gross/IRPP/CAC rows are 63,500/12/1; 64,000/45/4; 65,000/110/11. They are not signed independent fixtures, do not specify the whole algorithm, and do not settle rounding or date applicability. Preserve them separately from approved expectedOutput values.
5. **Calendar and refund distinctions:** calendar-year annual reporting and taxpayer refund validation constrain design but do not select internal YTD correction mechanics. ENG-03/ENG-05/ENG-06 must preserve amounts rather than silently erase overwithholding. Employer remittance, taxpayer annual declaration and annual pay statement have different deadlines.
6. **Wider payroll obligations:** the official tables also identify CCF, FNE, CRTV and TDL. The legal owner must provide an obligation catalogue with payer, base, rate, threshold, exemptions and effective dates, or reasoned exclusions. This packet does not certify a complete payslip merely because IRPP/CNPS candidates are populated. Do not infer levy ownership from ambiguous table headers.
7. **Unrecovered implementation sources:** circular 2024 paragraph 113 refers benefit/expense implementation details to a specific text, still needed. The CNPS labour-code URL returned a contents index; official labour/overtime download links were unavailable. Full operative labour rules, collective agreements, employee classification and supported attendance are still needed for F-18.

### Exact remaining approval and input bundle

- Qualified reviewer: complete 2025 source/amendment chain and dates; approve ordinary/exceptional-income eligibility, monthly/annual/YTD method, partial-year/prior-employer rules, benefit and social bases, cap consumption, other levies, rounding, credits/refunds and correction-year policy.
- Reviewer plus independent checker: independently calculated F-01 through F-22 as applicable, intermediate steps, approved tolerance, verified source bytes, signed scope, credentials/conflicts and authentic signature validation. The three official benchmark rows are not a substitute.
- Payroll/engineering/accounting owners: certified dictionary mappings, actual runtime key names, distinct principal/CAC and withheld/remitted outputs, authoritative YTD amounts, correction identity, concurrency strategy, immutable evidence and ledger/declaration mapping.
- Dataset/release owners: D-15 October completion or explicit pending scope, D-16 chronological lifecycle and actual admission evidence. Research does not generate missing attendance, settlement or release approval.

No automatic legal approval was recorded. Proposed numbers may be used to prepare review workpapers; executing production payroll still requires the established review and admission gates.
'''
(OUT/'PAYROLL-CALCULATION-CONTRACT.md').write_text(contract,encoding='utf8')

check=read('PAYROLL-CALCULATION-REVIEWER-CHECKLIST.md').replace('DRAFT-1','DRAFT-2')
check=check.replace('Literal CNPS pack values retained for comparison; IRPP executable rule still unavailable.','Official CNPS/IRPP proposals now populated for review; no approved executable IRPP rule yet.')
check=check.replace('Retained DGI 2026 code and 2025 finance law; 2025 consolidated code not established by the retained inventory.','Official 2024/2026 codes, 2024–2026 circulars, CNPS decree and indicative tables retained; full 2025 rule chain still unresolved.')
check=check.replace('Source-backed implementation facts in the contract are not preselected answers.','The contract and structured return now contain source-backed proposals for 12 decisions. Approved selections remain blank; distinguish a source fact from acceptance of its application.')
check=check.replace('The return form deliberately leaves legal decisions, expected statutory amounts, identities, signatures and approval hashes null.','The return form now populates research proposals, source references, remaining questions, logical input candidates and official comparison rows. Approved selections, independent fixture expected outputs, identities, signatures and approval hashes remain null.')
new='''## Research review action sheet — revision 2

**12 decisions partially supported; all 16 approvals pending.** Read the matching D-record in the [updated contract](PAYROLL-CALCULATION-CONTRACT.md), then accept, amend or reject its proposed treatment. The [research index](PAYROLL-CALCULATION-OFFICIAL-RESEARCH.json) identifies exact provisions, artifact hashes and inspection limits. Approval fields are intentionally separate from research fields.

| Decision | Prefilled research / exact remaining response | Evidence |
|---|---|---|
'''
for r in research_decisions:
 new+=f"| {r['id']} | {r['remainingInput']} | {', '.join(r['sourceIds']) or r['researchStatus']} |\n"
new+='''
### Priority validation checklist

- [ ] Confirm pension/family ceilings versus the separate occupational-risk base (S-02 arts 2–4, 8–10); approve sector/risk classification and verify above-ceiling cases.
- [ ] Confirm the 30% professional-expense deduction, 4,800,000 annual cap, 500,000 allowance, mandatory pension deduction and each benefit valuation; resolve circular 2024 paragraph 113's implementation text.
- [ ] Approve monthly/annualized/YTD method using annual brackets and payment-time withholding; explicitly cover joiners, variable pay, prior employers and annual cap allocation.
- [ ] Keep principal IRPP and 10% CAC separate; test below/at/above 62,000 gross monthly withholding boundary and each annual bracket. Do not treat this threshold as exemption from every levy.
- [ ] Approve qualifying exceptional-income handling, including the 2026 25%-to-35% change and three-year-history requirements; ordinary recurring bonuses are not automatically exceptional.
- [ ] Reconcile calendar-year reporting, payment/availability date, employer remittance by following-month 15th and annual statement by 15 March. Confirm category-specific annual taxpayer dates; do not use the 2024 circular's June date as the 2026 rule.
- [ ] Approve taxpayer-requested, authority-validated annual refund/credit treatment and separately define employer correction behavior; avoid losing overwithholding evidence through a zero floor.
- [ ] Supply CCF/FNE/CRTV/TDL obligation applicability, current rates/bases and payer allocation, or explicit justified scope exclusions. Confirm labour/collective-agreement rules for leave/overtime/recoveries.
- [ ] Verify source dates and amendments, then independently compute all applicable F-cases. S-07 indicative rows 63,500/12/1; 64,000/45/4; 65,000/110/11 are benchmarks only, not approved expected outputs or a rounding specification.

Research cannot complete D-10's correction contract or D-12/D-13/D-15 owner decisions. Obtain the named responses in the table, then execute the existing engineering and release gates. No box above has been checked by automation.

'''
check=check.replace('## 4. Reviewer decision checklist',new+'## 4. Reviewer decision checklist',1)
(OUT/'PAYROLL-CALCULATION-REVIEWER-CHECKLIST.md').write_text(check,encoding='utf8')

# Preserve original retrieval timestamps from the first successful acquisition.
idx=json.loads(read('research/retained-source-index.json'))
first={'DGI-IRPP-bareme.pdf':'2026-10-29T12:40:10.241289+00:00','DGI-TDL-bareme.pdf':'2026-10-29T12:40:21.075333+00:00','DGI-IRPP-declaration-circular.pdf':'2026-10-29T12:40:31.868812+00:00'}
for s in idx:
 if Path(s.get('file','')).name in first:
  s['retrievedAt']=first[Path(s['file']).name]
  s['retrievalTimestampNote']='Restored from first successful download tool output; subsequent cached inspection timestamp retained separately.'
save('research/retained-source-index.json',idx)

assert len(research_decisions)==16 and sum(bool(d['sourceIds']) for d in research_decisions)==12
assert all(d['status']=='PENDING_REVIEW' and d['selectedTreatmentOrFormula'] is None and d['reviewedBy'] is None for d in ret['decisions'])
assert all(f['expectedOutput'] is None for f in ret['fixtures'])
print(json.dumps({'status':'PASS','sourceSupportedProposals':12,'approvalPending':16,'officialSourceFiles':len(sources),'runtimeChanges':False}))
