// Finalize only AF13 documentation after recorded synthetic verification succeeds.
const fs = require('node:fs'), path = require('node:path')
const root = path.resolve(__dirname, '..'), roadmap = path.join(root, 'docs/accounting-firms/roadmap-2026-10-19')
const phase = path.join(roadmap, 'execution/AF13'), run = path.join(phase, '2026-10-25-run-03')
const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
const browser = JSON.parse(read(path.join(run, 'browser-verification.json')))
const database = JSON.parse(read(path.join(run, 'postgres-final.json')))
const regression = JSON.parse(read(path.join(run, 'regression-final.json')))
if (!browser.passed || !database.success || !regression.success) throw Error('Verification is incomplete')
const snapshot = JSON.parse(read(path.join(run, 'browser-practice-export.json')))
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value
const hash = 'sha256:' + require('node:crypto').createHash('sha256').update(JSON.stringify(canonical(snapshot.report))).digest('hex')
if (hash !== snapshot.contentHash) throw Error('Downloaded snapshot hash does not reconcile')
fs.writeFileSync(path.join(run, 'export-reconciliation.json'), JSON.stringify({ passed: true, file: 'browser-practice-export.json', contentHash: hash,
  cohortCount: snapshot.report.cohortCount, currencies: snapshot.report.cohorts[0].summary.economics.map(row => row.currency) }, null, 2))
const edit = (file, transform) => fs.writeFileSync(file, transform(read(file)))
edit(path.join(phase, 'RESULT.md'), value => value
  .replace('**Implementation:** complete within the authorized synthetic development scope. **Verification:** focused types, 111 regressions and ten real PostgreSQL scenarios pass; final browser/publication evidence is recorded below.', '**Status:** VERIFIED within the authorized synthetic development scope. Focused types, 111 regressions, ten real PostgreSQL scenarios and the authenticated browser workflow pass.')
  .replace('- **Browser:** final authenticated outcome, EN/FR screenshots and scoped accessibility checks are in [browser-verification.json](2026-10-25-run-03/browser-verification.json). See the final browser status recorded before publication.', '- **Browser:** [browser-verification.json](2026-10-25-run-03/browser-verification.json) passes: real preparer/reviewer/client sign-ins; manual declaration/correction; independent review with password step-up; confidential budget and JSON export; current fee-permission removal. English/French at 1440px and 390px: four scoped axe scans with zero violations, no horizontal overflow and no page errors. Screenshots were reviewed separately. This does not certify the entire portal.'))
edit(path.join(phase, 'ACCESS_VERIFICATION_PLAN.md'), value => value.replace('See browser-verification.json and RESULT.md for the final authenticated browser outcome. It is reported separately from Jest and PDF rendering.', 'PASS: real three-role workflow, correction/review/step-up, JSON download and fee-permission removal. Four EN/FR desktop/mobile scoped axe scans: zero violations; no horizontal overflow or page errors. Separate from Jest and PDF rendering.'))
edit(path.join(roadmap, 'STATUS.md'), value => value
  .replace('AF13–AF16 NOT_STARTED.', 'AF13 VERIFIED within its synthetic development scope; AF14–AF16 NOT_STARTED.')
  .replace('The shared workflow-registry check passes in the AF12 run', 'The shared workflow-registry check passes in the AF13 run')
  .split('\n').map(line => line.startsWith('| [AF13 prompt]') ? '| [AF13 prompt](prompts/AF13-workload-economics.md) | VERIFIED | AF05, AF08 and AF12 reused; user-authorized synthetic development scope | [Result and evidence](execution/AF13/RESULT.md) — 111 regressions, ten real PostgreSQL scenarios, focused types, 118→120 populated upgrade/replay, authenticated workflow/export and four EN/FR desktop/mobile axe scans without violations | Manual effort, retained corrections, independent review, staffing plans and confidential currency-separated budgets verified. Live pilot demand/benefit and AF16 release remain deferred |' : line).join('\n')
  .replace('User explicitly selected AF09, AF10, AF11 and AF12 before AF16.', 'User explicitly selected AF09–AF13 before AF16; AF13 uses the documented synthetic-development override.')
  .replace('the bounded AF12 advisory workflow are technically verified', 'the bounded AF12 advisory and AF13 practice workflows are technically verified'))
edit(path.join(roadmap, '01_IMPLEMENTATION_ROADMAP.md'), value => value
  .replace('AF13–AF16 remain planned.', 'AF13 is verified within its synthetic development scope; AF14–AF16 remain planned.')
  .replace(/\*\*25 October 2026 discovery:\*\*[^\n]+/, '**25 October 2026 implementation:** AF13 is VERIFIED within the user-authorized synthetic development scope. The new firm desk reuses AF05/AF08/AF12 for manual effort, retained corrections, independent review, staffing plans, confidential currency-separated budgets and guarded JSON snapshots. Focused types, 111 regressions, ten PostgreSQL scenarios, populated 118→120 upgrade/replay and authenticated EN/FR desktop/mobile checks pass. [Result](execution/AF13/RESULT.md) and [scope override](execution/AF13/SYNTHETIC_DEVELOPMENT_SCOPE.md) record the evidence. Live demand/benefit validation and AF16 release remain deferred.'))
const index = path.join(root, 'docs/accounting-firms/README.md')
edit(index, value => value
  .replace('AF01–AF12 implementation evidence, AF13 prerequisite discovery', 'AF01–AF13 implementation evidence')
  .replace(/Stoquify remains under development\. AF13 application implementation[^\n]+/, 'Stoquify remains under development. AF13 is VERIFIED within its [authorized synthetic development scope](roadmap-2026-10-19/execution/AF13/SYNTHETIC_DEVELOPMENT_SCOPE.md). Its [result](roadmap-2026-10-19/execution/AF13/RESULT.md) records implementation, tests, migration preservation and browser evidence. Actual firm demand and benefit validation remain deferred; AF16 release qualification is still open.')
  .replace('AF13 discovery publication', 'AF13 implementation publication')
  .replace('Proposed practice metric contract', 'Implemented practice metric contract')
  .replace('Future access and verification cases', 'Access and verification record')
  .replace('AF13–AF16 remain not started.', 'AF13 is verified within its synthetic development scope; AF14–AF16 remain not started.')
  .replace('| Pilot demand decision |', '| Development decision and deferred pilot |')
  .replace('| AF13 implementation publication | Markdown | PDF |', '| AF13 implementation publication | Markdown | PDF |')
  .replace('| Continuation note |', '| Synthetic development authorization | [MD](roadmap-2026-10-19/execution/AF13/SYNTHETIC_DEVELOPMENT_SCOPE.md) | [PDF](roadmap-2026-10-19/execution/AF13/SYNTHETIC_DEVELOPMENT_SCOPE.pdf) |\n| Continuation note |'))
// Keep the follow-up copy byte-identical; publishing creates its matching PDF.
const followup = `# AF13 implementation follow-up — 25 October 2026\n\nAF13 is VERIFIED within the user-authorized synthetic development scope. See the [canonical result](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF13/RESULT.md>).\n\nThe firm desk reuses engagements, authority, workpaper decisions and AF12 advisory context for explicit plans, manual effort, retained corrections, independent review and confidential fee estimates. Guarded JSON export retains provenance. No billing, payroll or production change was made.\n\nVerification: focused types; 111 regressions; ten real PostgreSQL scenarios; populated 118→120 migration preservation/replay; real sign-in, correction/review/step-up and export; four EN/FR desktop/mobile scoped axe checks without violations. Reports are published as matching Markdown/PDF files.\n\nLive firm demand, actual decision usefulness and measured benefit remain deferred. AF11 country evidence and AF16 release qualification are unchanged. No next phase is automatically started.\n`
fs.writeFileSync(path.join(root, 'what-next/2026-10-25-af13-workload-economics.md'), followup)
fs.writeFileSync(path.join(root, 'docs/accounting-firms/supporting-reports/2026-10-25-af13-workload-economics.md'), followup)
console.log('AF13 status, roadmap, index and follow-up updated from passing receipts.')
