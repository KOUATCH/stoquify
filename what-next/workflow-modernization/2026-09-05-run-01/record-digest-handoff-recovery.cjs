const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = __dirname, repo = path.resolve(root, '../../..'), name = process.argv[2];
const pending = name === 'pending';
if (!pending && !/^digest-handoff-typecheck-[a-f0-9-]+\.json$/.test(name ?? '')) throw new Error('Require terminal typecheck receipt or explicit pending state');
const sourceFiles = ['services/daily-habit/daily-habit-digest.service.ts', 'app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx', 'app/[locale]/(dashboard)/dashboard/owner-war-room/owner-war-room-route-access.tsx', 'messages/en.json', 'messages/fr.json'];
const check = pending ? { command: 'node node_modules/typescript/bin/tsc --noEmit --pretty false', passed: null, sourceAfter: Object.fromEntries(sourceFiles.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex')])) } : JSON.parse(fs.readFileSync(path.join(root, 'evidence', name), 'utf8'));
if (!pending && !check.sourceStable) throw new Error('Changed source during typecheck');
for (const [file, hash] of Object.entries(check.sourceAfter)) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex') !== hash) throw new Error('Changed source after typecheck: ' + file);
const write = (relative, text) => { const file = path.join(root, relative), fd = fs.openSync(file, 'r+'); try { fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); } };
const index = {
  at: new Date().toISOString(), sourceHashes: check.sourceAfter,
  commands: {
    tests: 'node node_modules/jest/bin/jest.js --runInBand --runTestsByPath "services/daily-habit/__tests__/operating-route-access.test.tsx" "app/[locale]/(dashboard)/dashboard/owner-war-room/__tests__/page.test.tsx"',
    lint: 'node node_modules/eslint/bin/eslint.js "app/[locale]/(dashboard)/dashboard/owner-war-room/owner-war-room-route-access.tsx" "services/daily-habit/__tests__/operating-route-access.test.tsx"',
    typecheck: check.command,
  },
  results: { tests: '000c2e: 17 passed / two suites, including six new EN/FR recovery cases', lint: 'f1dc93: passed / two changed TypeScript files', diff: '9f815c: passed / changed route, tests and EN/FR messages', typecheckReceipt: pending ? null : name, typecheckSession: pending ? 13441 : null, typecheckState: pending ? 'running_with_20_minute_bound' : check.passed ? 'passed' : 'failed_or_timed_out', typecheckPassed: check.passed },
  reusedServiceEvidence: 'digest-operating-handoff-service.json',
  environment: {
    firstTypecheck: 'f3fd9f: generated Next types disappeared during server restart',
    secondTypecheck: '6229b6: exit 1, BeautifulRegisterForm.tsx(607,20) TS2304 Rocket undefined. It completed before the planned timeout stop acted (1a0214). No process was terminated for this check.',
    concurrentRegistrationChange: '9dfc9b: a Rocket import was subsequently present in the dirty registration file; this task did not edit that file.',
    resourceObservation: 'a8345b: approximately 500 MB free of 25 GB. e55ba5: stopped only verified task server ancestry; generated types retained. fc7365: approximately 687 MB free. Resource contention observed; application root cause not established.',
    restart: '75005a: task launcher 28720, log server-recovery-b632a2d1-9846-45b3-afb2-46113a90d553.out.log',
    loginProbe: '3e27b4: login request timed out after 48.9185481 seconds with a configured 45-second bound; browser matrix not repeated against this failed health probe.',
    finalServerState: '0ca6ce: stopped only verified owned server 22148, CLI 13124 and launcher 28720 to serialize checks. Port-3110 application is stopped.',
  },
  browserVerified: false, completeWorkflowVerified: false,
};
fs.writeFileSync(path.join(root, 'evidence/digest-handoff-recovery.json'), JSON.stringify(index, null, 2) + '\n', { flag: 'wx' });
let text = fs.readFileSync(path.join(root, 'DAILY_DIGEST_SOURCE_TRUTH_VERIFICATION.md'), 'utf8');
text = text.replace(/Standard typecheck terminal result: PENDING:[\s\S]*?restart\.\./, 'The initial pending typecheck later failed in an independently changed registration component (6229b6); the current result and subsequent recovery are recorded in [follow-up evidence](evidence/digest-handoff-recovery.json).');
const heading = '## Owner handoff denial localization and verification recovery — 2026-09-19';
if (text.includes(heading)) throw new Error('Follow-up already recorded');
text += `\n\n${heading}\n\nThe Owner destination's role-denial and missing-organization screens used English catalogue copy in French sessions. Its existing route guard now reads the EN/FR message catalogue for those two states, including actionable role/membership or organization-selection guidance. It retains the shared DashboardRouteState, localized return route, original permission/module checks and denied callback. Arbitrary error details are not exposed. Unknown surface definitions retain their existing fallback copy. No authority or domain-data contract changed.\n\n**Focused proof:** 17 tests in two suites pass, including six EN/FR cases covering missing organization, initial permission denial without domain reads, and later service-authority rejection through the denied callback. Changed TypeScript lint and four-file diff checks pass. Standard typecheck: ${pending ? 'still running in session 13441 with an automatic 20-minute bound; no pass claimed' : check.passed ? 'passed with stable affected source hashes' : 'did not pass; see the terminal diagnostics'}. [Commands, hashes and terminal evidence](evidence/digest-handoff-recovery.json). Prior ten-case persisted handoff service proof and 118 focused tests remain applicable to unchanged digest authority logic.\n\n**Runtime limit:** no additional browser pass is claimed. The task-owned app was restarted after the earlier checker ended; its login probe timed out after 48.9 seconds, so the full matrix was not repeated. Low free memory was observed. Only verified task-owned server processes were stopped, and the app is currently stopped. No database reset, seed, migration or external delivery occurred. The pending verifier now expects the French denial title and binds route/messages alongside the service source. Actual handoff, revocation, keyboard and narrow French screenshots remain pending for this revision. The earlier Owner/Manager direct-page grant receipts remain historical proof of their tested revision.\n\n**Guidance and review:** after restoring local server responsiveness, run the owned handoff verifier once and inspect the EN/FR screenshots. Users denied Owner access should ask their administrator to check current dashboard read permission and organization-wide operating authority; a role display name is insufficient. Missing-organization users return to the dashboard to select an active organization. Frontend/localization/security review is covered by the tests above; SRE/quality review retains the failed attempts and resource observations. Financial/statutory/provider behavior is unchanged. No full workflow closure or certification is claimed.\n`;
write('DAILY_DIGEST_SOURCE_TRUTH_VERIFICATION.md', text);
text = fs.readFileSync(path.join(root, 'DAILY_DIGEST_CLOSURE.md'), 'utf8').replace('Browser attempts timed out before assertions. Remaining:', 'Browser attempts timed out before assertions; Owner role/organization denial now has EN/FR recovery copy with focused route tests. Current browser verification remains pending. Remaining:');
write('DAILY_DIGEST_CLOSURE.md', text);
text = fs.readFileSync(path.join(root, 'reconcile-current-progress.cjs'), 'utf8');
text = text.replace("digest.runtimeStatus = 'operating_handoff_service_verified_browser_timeout';", "digest.runtimeStatus = 'operating_handoff_service_verified_browser_timeout';");
text = text.replace('const itemRead =', "digest.closureReview.verifiedCriteria.push('owner_handoff_denial_en_fr_route_recovery_unit_verified');\nconst itemRead =");
text = text.replace('Authority-aware handoffs implemented; ten EN/FR service cases verified', 'Authority-aware handoffs and localized Owner denial; service and route tests pass');
text = text.replace('Finish handoff browser proof when responsive; continue remaining labels', 'Restore local responsiveness, then verify handoff and denial in the browser');
const start = text.indexOf('**Since the previous report:**'), end = text.indexOf('**Priority rationale:**', start);
if (start < 0 || end < start) throw new Error('Missing progress anchors');
text = text.slice(0, start) + `**Since the previous report:** Owner role-denial and missing-organization guidance now use EN/FR messages. All 17 focused tests and changed-file lint/diff pass; ${pending ? 'standard typecheck is running with a 20-minute bound (session 13441)' : check.passed ? 'standard typecheck passes' : 'standard typecheck remains unsuccessful (see diagnostics)'}. Prior authority service evidence is retained. The local login probe timed out after restart; no new browser pass is claimed. The task-owned server is stopped to avoid overlapping compilation. One bounded route-copy criterion added; no workflow closed. [Detail and recovery evidence](DAILY_DIGEST_SOURCE_TRUTH_VERIFICATION.md#owner-handoff-denial-localization-and-verification-recovery--2026-09-19).\n\n` + text.slice(end);
write('reconcile-current-progress.cjs', text);
console.log(JSON.stringify({ typecheckPassed: check.passed, browserVerified: false, completeWorkflowVerified: false }));
