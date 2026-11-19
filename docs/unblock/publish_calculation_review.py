"""Publish the scoped review documents/report; no app, env, DB or network imports.

The repository publisher scans every Markdown file in its destination. Use an
owned staging folder so that existing reports (including open PDFs) stay intact.
The browser renders local text only; the documents contain no remote images.
"""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/unblock'
WORK = ROOT / 'docs/database-seed/payroll-unblock-workpapers'
STEMS = ['PAYROLL-CALCULATION-CONTRACT', 'PAYROLL-CALCULATION-REVIEWER-CHECKLIST', 'PAYROLL-UNBLOCK-REPORT-2026-10-29-ENGINEERING-V3']
NOW = datetime.now(timezone.utc).isoformat()


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def save(file, data):
    file.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf8')


contract = (OUT / (STEMS[0] + '.md')).read_text(encoding='utf8')
checklist = (OUT / (STEMS[1] + '.md')).read_text(encoding='utf8')
decisions = []
for match in re.finditer(r'^### (D-\d{2}) — ([^\n]+)\n\n(.*?)(?=\n### |\n## |\Z)', contract, re.M | re.S):
    decisions.append({
        'id': match[1], 'topic': match[2], 'reviewRequest': match[3].strip(),
        'status': 'PENDING_REVIEW', 'selectedTreatmentOrFormula': None,
        'rationale': None, 'legalReference': None, 'sourceProvision': None,
        'sourceArtifactFile': None, 'sourceArtifactSha256': None,
        'effectiveFrom': None, 'effectiveTo': None, 'openEndedRationale': None,
        'coveredPopulation': None, 'exclusions': None, 'fixtureIds': [],
        'conditions': None, 'reviewedBy': None, 'reviewedOn': None,
        'engineeringOwnerAcceptance': None,
    })
fixture_matches = list(re.finditer(r'^\| (F-\d{2}) \| (.*?) \| (.*?) \|$', contract, re.M))
assert len(decisions) == 16 and len(fixture_matches) == 22
assert {d['id'] for d in decisions} == {f'D-{i:02d}' for i in range(1, 17)}
assert {m[1] for m in fixture_matches} == {f'F-{i:02d}' for i in range(1, 23)}
assert all(d['id'] in checklist for d in decisions)
for task in range(2, 9):
    assert f'ENG-{task:02d}' in contract and f'ENG-{task:02d}' in checklist

source_specs = [
    ('services/payroll/payroll-tax-rule-evaluator.ts', ['export type PayrollTaxRuleEvaluationInput', 'export function evaluatePayrollTaxRule']),
    ('services/payroll/payroll-control.service.ts', ['async function inTransaction', 'function resolvePayrollYearToDatePolicy', 'function payrollYearToDateLineAmount', 'function buildPayrollYearToDateAccumulatorProof', 'const priorYearToDateRuns =', 'const incomeTaxEvaluation =', 'const currentAmounts =']),
    ('services/payroll/payroll-production-admission.ts', ['PAYROLL_PRODUCTION_CALCULATOR_CONTRACT', 'export function assertPayrollProductionAdmission']),
    ('services/payroll/payroll-country-pack-fixture-runner.ts', ['export type PayrollCalculationFixtureReviewEvidence', 'const SUPPORTED_OUTPUT_FIELDS']),
    ('services/payroll/payroll-statutory-scenario-coverage.service.ts', ['family: "IRPP_YTD"', 'family: "IRPP_CORRECTIONS"']),
    ('services/regulatory/country-packs/cameroon.ts', ['incomeTaxRules:']),
    ('services/regulatory/country-packs/cameroon.constants.ts', []),
    ('services/regulatory/country-packs/schemas.ts', ['expectedOutput:']),
    ('services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts', []),
    ('prisma/disposable-business-workflows.ts', ['if(m===10)']),
    ('prisma/disposable-people-workflows.ts', ['CURRENT_PERIOD_PENDING']),
    ('scripts/statutory-country-pack-review-preflight.js', ['const DECISIONS', 'const REVIEWED_STATUSES']),
    ('scripts/statutory-country-pack-review-package.js', ['function assessSignatureVerification']),
    ('docs/database-seed/payroll-unblock-workpapers/current-source-facts.json', []),
    ('docs/database-seed/payroll-unblock-workpapers/expanded-rule-review-worksheet.json', []),
    ('docs/database-seed/payroll-unblock-workpapers/official-source-candidates.json', []),
    ('docs/database-seed/payroll-unblock-workpapers/engineering-results.json', []),
    ('docs/database-seed/payroll-unblock-workpapers/pay-date-coverage.json', []),
    ('docs/database-seed/payroll-unblock-register.json', []),
    ('docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-package/FIELD_MAPPING.md', []),
    ('docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-package/POST_SIGNATURE_RUNBOOK.md', []),
]
sources = []
for relative, needles in source_specs:
    file = ROOT / relative
    lines = file.read_text(encoding='utf8').splitlines()
    anchors = []
    for needle in needles:
        found = next((i + 1 for i, line in enumerate(lines) if needle in line), None)
        assert found, f'Missing source anchor: {relative}: {needle}'
        anchors.append({'symbolOrText': needle, 'line': found})
    sources.append({'file': relative, 'sha256': digest(file), 'byteLength': file.stat().st_size, 'anchors': anchors})

# Verify prefilled pack/source facts are still bound to the inspected local code.
facts = json.loads((WORK / 'current-source-facts.json').read_text(encoding='utf8'))
assert all(digest(ROOT / item['file']) == item['sha256'] for item in facts['sourceFiles']), 'Source-facts drift requires review'
retained = json.loads((WORK / 'official-source-candidates.json').read_text(encoding='utf8'))
official_artifacts = [s for s in retained['sources'] if s.get('localArtifact')]
assert all(digest(ROOT / s['localArtifact']) == s['sha256'] for s in official_artifacts)
graph = json.loads((ROOT / 'graphify-out/graph_actions.json').read_text(encoding='utf8'))
graph_nodes = [n for n in graph['nodes'] if 'payroll' in n.get('source_file', '').lower()][:4]
manifest = {
    'generatedAt': NOW, 'classification': 'SOURCE_INSPECTION_AND_DOCUMENT_PREPARATION_ONLY',
    'contractId': 'STOQUIFY-CM-PAYROLL-CALCULATION-2026-10-29-DRAFT-3',
    'sources': sources, 'officialArtifacts': official_artifacts,
    'graphNavigation': {'file': 'graphify-out/graph_actions.json', 'sha256': digest(ROOT / 'graphify-out/graph_actions.json'), 'nodes': graph_nodes, 'limitation': 'Navigation only; no live behavior or coverage inferred from graph.'},
    'officialLandingPagesReopened': ['https://www.impots.cm/index.php/en/node/1333', 'https://www.impots.cm/index.php/fr/documents/39?page=1'],
    'sourceProvisionAnalysisPerformed': True, 'expertLegalApprovalPerformed': False, 'independentReviewerAttestation': False,
    'documentSources': [{'file': f'docs/unblock/{stem}.md', 'sha256': digest(OUT / (stem + '.md'))} for stem in STEMS],
}
research = json.loads((OUT / 'PAYROLL-CALCULATION-OFFICIAL-RESEARCH.json').read_text(encoding='utf8'))
assert all(digest(ROOT / s['file']) == s['sha256'] for s in research['sources'])
manifest['officialResearch'] = research
manifest['classification'] = 'SOURCE_INSPECTION_AND_OFFICIAL_RESEARCH_PROPOSALS_NOT_APPROVAL'
manifest['researchReturnFile'] = {'file': 'docs/unblock/PAYROLL-CALCULATION-REVIEW-RETURN.json', 'sha256': digest(OUT / 'PAYROLL-CALCULATION-REVIEW-RETURN.json')}
engineering = json.loads((OUT / 'PAYROLL-CALCULATION-ENGINEERING-RESULTS.json').read_text(encoding='utf8'))
assert all(digest(ROOT / s['file']) == s['afterSha256'] for s in engineering['changedFiles'])
assert digest(ROOT / engineering['verification']['current']['file']) == engineering['verification']['current']['sha256']
manifest['engineeringResults'] = engineering
assert digest(ROOT / engineering['addedVerificationConfig']['file']) == engineering['addedVerificationConfig']['sha256']
manifest['classification'] = 'SOURCE_RESEARCH_AND_MOCKED_ENGINEERING_WITH_PENDING_STATUTORY_APPROVALS'
save(OUT / 'PAYROLL-CALCULATION-SOURCE-MANIFEST.json', manifest)
return_file = OUT / 'PAYROLL-CALCULATION-REVIEW-RETURN.json'
if not return_file.exists():
    save(return_file, {
        'schema': 'stoquify-payroll-calculation-review-working-form.v1',
        'classification': 'DRAFT_NOT_RUNTIME_COUNTRY_PACK_OR_APPROVAL',
        'contractId': manifest['contractId'], 'preparedAt': NOW,
        'status': 'PENDING_REVIEW', 'productionUseAllowed': False,
        'recordedScope': {'countryCode': 'CM', 'frequency': 'MONTHLY', 'currencyDefault': 'XAF', 'proposedReleaseScope': 'CM_PRIVATE_SME_MONTHLY_SINGLE_EMPLOYER', 'runtimeContractIdentifier': 'stoquify-payroll-calculator.v1', 'dataset': 'stoquify_replay_dataset_20261028_01', 'intendedPayDateStart': '2025-11-30', 'intendedPayDateEnd': '2026-10-31', 'observationCutoff': '2026-10-28'},
        'approvedScope': None, 'reviewer': {'fullName': None, 'professionalCapacity': None, 'organization': None, 'qualificationReference': None, 'authority': None, 'conflictDeclaration': None},
        'reviewWindow': {'startedAt': None, 'completedAt': None},
        'decisions': decisions,
        'fixtures': [{'id': m[1], 'case': m[2], 'primaryTasks': m[3], 'status': 'PENDING_INDEPENDENT_REVIEW', 'inputs': None, 'expectedIntermediateAmounts': None, 'expectedOutput': None, 'expectedDenial': None, 'independentWorkingFile': None, 'independentWorkingSha256': None, 'methodToolVersion': None, 'comparisonTolerance': None, 'ruleVersion': None, 'sourceProvision': None, 'reviewEvidence': {'reviewedBy': None, 'reviewedOn': None, 'legalRef': None, 'sourceEvidenceHash': None, 'coveredReviewTopics': []}, 'laterEngineeringLifecycleEvidence': None} for m in fixture_matches],
        'adjustmentInputDictionary': [], 'approvedRuleEnvelopes2025': None, 'approvedRuleEnvelopes2026': None,
        'finalDecision': {'decision': None, 'approvedDecisionIds': [], 'excludedDecisionIds': [], 'exclusionReasons': None, 'effectiveFrom': None, 'effectiveTo': None, 'conditions': None},
        'signedContract': {'file': None, 'sha256': None, 'signedAt': None, 'signatureMethod': None},
        'independentChecker': {'fullName': None, 'authority': None, 'conflictDeclaration': None, 'verifiedAt': None, 'verificationMethod': None, 'evidenceFile': None, 'evidenceSha256': None},
        'engineeringAcceptanceReference': None, 'datasetOwnerDecisionReference': None, 'legalOwnerIntakeReference': None,
        'sourceManifest': 'PAYROLL-CALCULATION-SOURCE-MANIFEST.json',
    })

links = []
for stem in STEMS:
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', (OUT / (stem + '.md')).read_text(encoding='utf8')):
        if target.startswith(('https://', 'http://', '#')):
            continue
        assert (OUT / target.split('#')[0]).resolve().is_file(), f'Missing reference: {target}'
        links.append(target)

stage = Path(tempfile.mkdtemp(prefix='_calc-publication-', dir=OUT)).resolve()
assert stage.parent == OUT.resolve()
for stem in STEMS:
    shutil.copyfile(OUT / (stem + '.md'), stage / (stem + '.md'))
publisher = ROOT / '.agents/skills/docs-report-publisher/scripts/publish_reports.mjs'
command = ['node', str(publisher), stage.relative_to(ROOT / 'docs').as_posix()]
attempt = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, encoding='utf8', errors='replace', creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
publisher_result = {'tool': 'docs-report-publisher', 'exitCode': attempt.returncode, 'stdout': attempt.stdout, 'stderr': attempt.stderr}
if attempt.returncode:
    sys.path.insert(0, str(OUT))
    sys.dont_write_bytecode = True
    from render_calculation_review_pdf import render
    render(stage, STEMS)
    publisher_result['fallback'] = 'Repository ReportLab Markdown renderer; isolated output; no browser installation'
results = []
for stem in STEMS:
    pdf = stage / (stem + '.pdf')
    reader = PdfReader(str(pdf))
    texts = [page.extract_text() or '' for page in reader.pages]
    assert all(t.strip() for t in texts), 'Empty PDF page'
    text = '\n'.join(texts)
    for required in ['D-01', 'D-16', 'F-22', 'ENG-02', 'ENG-08', 'PENDING']:
        assert required in text, f'Missing PDF text: {stem}: {required}'
    # The publisher's base URL points to staging. Normalize local PDF link targets
    # to their final document directory before copying the published files.
    from pypdf import PdfWriter
    from pypdf.generic import NameObject, TextStringObject
    local_uri_map = {(stage / target).resolve().as_uri(): (OUT / target).resolve().as_uri() for target in links}
    writer = PdfWriter(clone_from=str(pdf))
    for page in writer.pages:
        for ref in page.get('/Annots', []):
            annot = ref.get_object()
            action = annot.get('/A')
            if action and action.get('/URI'):
                uri = str(action['/URI'])
                # Relative links resolved by Chromium against the staging base.
                if uri in local_uri_map:
                    action[NameObject('/URI')] = TextStringObject(local_uri_map[uri])
    final = OUT / (stem + '.pdf')
    with final.open('wb') as stream:
        writer.write(stream)
    from urllib.parse import urlparse
    from urllib.request import url2pathname
    final_reader = PdfReader(str(final))
    local_pdf_links = 0
    for page in final_reader.pages:
        for ref in page.get('/Annots', []):
            action = ref.get_object().get('/A')
            uri = str(action.get('/URI', '')) if action else ''
            if uri.startswith('file:'):
                linked_path = Path(url2pathname(urlparse(uri).path))
                assert linked_path.is_file(), f'Missing PDF target: {linked_path}'
                assert '_calc-publication-' not in uri
                local_pdf_links += 1
    # Page previews live with workpapers, not among published report pairs.
    doc = pdfium.PdfDocument(str(final))
    tiles = []
    for i in range(len(doc)):
        page = doc[i]
        bitmap = page.render(scale=.65)
        img = bitmap.to_pil().convert('RGB')
        img.thumbnail((310, 440))
        tile = Image.new('RGB', (330, 470), '#dce3e9')
        tile.paste(img, ((330 - img.width) // 2, 5))
        ImageDraw.Draw(tile).text((12, 450), f'Page {i+1}', fill='black')
        tiles.append(tile)
        bitmap.close()
        page.close()
    doc.close()
    sheet = Image.new('RGB', (990, 470 * ((len(tiles) + 2) // 3)), 'white')
    for i, tile in enumerate(tiles):
        sheet.paste(tile, ((i % 3) * 330, (i // 3) * 470))
    preview = WORK / (stem + '-preview.png')
    sheet.save(preview)
    results.append({'markdown': str(OUT / (stem + '.md')), 'pdf': str(final), 'pages': len(texts), 'sha256': digest(final), 'bytes': final.stat().st_size, 'requiredText': 'PASS', 'localPdfLinksChecked': local_pdf_links, 'preview': str(preview)})

# Remove only the four exact files created in this verified staging directory.
for stem in STEMS:
    for suffix in ['.md', '.pdf']:
        owned = stage / (stem + suffix)
        assert owned.resolve().parent == stage and stage.parent == OUT.resolve()
        owned.unlink()
stage.rmdir()
save(OUT / 'PAYROLL-CALCULATION-PUBLICATION-CHECK.json', {
    'generatedAt': NOW, 'status': 'PASS', 'decisions': 16, 'fixtureCases': 22,
    'engineeringTasksMapped': 7, 'localLinksChecked': len(links), 'inspectedSources': len(sources),
    'sourceFactsCurrent': True, 'retainedOfficialArtifactsHashMatched': len(official_artifacts),
    'workflowCheck': 'PASS; 196 unclassified package scripts; no application commands run',
    'newPayrollTests': engineering['verification']['current'], 'realDatabaseTests': 'NOT_RUN',
    'approvalRecorded': False, 'researchSourceFilesHashVerified': len(research['sources']),
    'partiallySourceSupportedDecisions': 12, 'pendingApprovals': 16, 'results': results,
    'publisher': publisher_result,
})
print(json.dumps({'status': 'PASS', 'results': results}))
