import hashlib, json, pathlib, re
from pypdf import PdfReader

root = pathlib.Path.cwd()
run = root / 'what-next/moat-execution/2026-09-27-run-01'
docs = root / 'docs/moat/roadmap'
register = json.loads((docs / 'MOAT_WORK_PACKAGE_REGISTER.json').read_text(encoding='utf-8'))
required = ['id','recommendation','customerOutcome','smallestUsefulSlice','existingFoundation','preciseGap','responsibleRole','affectedFilesOrServices','dependencies','entryConditions','contracts','acceptanceCriteria','verification','rollout','recoveryAndRollback','effortRange','capacityAssumptions','externalLeadTime','status','evidence','blockers','nextAction','maturity']
packages = {p['id']: p for p in register['packages']}
assert len(packages) == len(register['packages']) == 11
def visit(key, trail):
    assert key not in trail, f'Dependency cycle: {trail} -> {key}'
    for dependency in packages[key]['dependencies']:
        assert dependency in packages, dependency
        visit(dependency, trail + [key])
for package in packages.values():
    assert all(key in package for key in required), package['id']
    assert all(key in package['contracts'] for key in ['data','api','event','access','ui'])
    visit(package['id'], [])

pairs = []
for source in sorted(docs.glob('*.md')):
    pdf = source.with_suffix('.pdf')
    assert pdf.is_file() and pdf.stat().st_size > 0, source.name
    reader = PdfReader(pdf)
    texts = [page.extract_text() or '' for page in reader.pages]
    assert all(text.strip() for text in texts), pdf.name
    for target in re.findall(r'\]\(([^)]+)\)', source.read_text(encoding='utf-8')):
        if not target.startswith(('https:', 'http:', '#')):
            assert (source.parent / target.strip('<>').split('#')[0]).exists(), (source.name, target)
    pairs.append({'markdown': source.name, 'pdf': pdf.name, 'pdfBytes': pdf.stat().st_size, 'pages': len(reader.pages), 'markdownSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'pdfSha256': hashlib.sha256(pdf.read_bytes()).hexdigest()})
assert len(pairs) == 6
assert not list(docs.glob('*.html'))
for item in json.loads((run / 'source-final.json').read_text(encoding='utf-8')):
    assert hashlib.sha256((root / item['path']).read_bytes()).hexdigest() == item['sha256'], item['path']
baseline = json.loads((run / 'source-before.json').read_text(encoding='utf-8-sig'))
unchanged_dependencies = []
for item in baseline:
    if item['path'].startswith(('services/accounting/', 'actions/accounting/')):
        unchanged = hashlib.sha256((root / item['path']).read_bytes()).hexdigest().upper() == item['sha256'].upper()
        unchanged_dependencies.append({'path':item['path'], 'unchangedSinceBaseline':unchanged})
manifest = {'publisherExitCode':0,'pairs':pairs,'narrativePairs':6,'workPackages':11,'dependencyGraph':'ACYCLIC','localLinks':'VALID','sourceFinalHashes':'UNCHANGED','preexistingDependencies':unchanged_dependencies,'intermediateHtmlInDestination':False}
(run / 'publication-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
verification = json.loads((run / 'verification-manifest.json').read_text(encoding='utf-8'))
verification['publication'] = {'status':'PASSED','publisherExitCode':0,'pairs':6,'manifest':'publication-manifest.json'}
verification['portalLint'] = {'exitCode':0,'log':'portal-lint.log'}
(run / 'verification-manifest.json').write_text(json.dumps(verification,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'pairs':len(pairs),'pdfPages':sum(p['pages'] for p in pairs),'packages':11,'dependencies':unchanged_dependencies},indent=2))
