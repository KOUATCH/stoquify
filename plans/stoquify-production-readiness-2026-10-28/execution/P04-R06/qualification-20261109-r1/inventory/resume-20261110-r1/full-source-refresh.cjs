// Read-only source comparison; writes only new receipts in this inventory directory.
// No environment loading, application imports, dependency traversal, build or database access.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = 'E:/ohada saas/Focused projects/stoquify';
const packet = root + '/plans/stoquify-production-readiness-2026-10-28/execution/P04-R06/qualification-20261109-r1';
const output = path.join(packet, 'inventory', 'resume-20261110-r1');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const originalPath = path.join(packet, 'root-source-manifest.json');
const originalBytes = fs.readFileSync(originalPath);
const original = JSON.parse(originalBytes);
const selectorPath = path.join(root, 'scripts', 'candidate-snapshot.cjs');
const selectorSha256 = sha(fs.readFileSync(selectorPath));
if (selectorSha256 !== 'e60e513a6aadc490a72821bdcd371fdb2f2c1c0589ed2e392cf10c6a33ca6d46') throw new Error('Inspected selection helper changed');
const { included } = require(selectorPath); // Pure selection function from inspected helper; no capture/restore invocation.
const roots = new Set(['actions', 'app', 'components', 'config', 'hooks', 'i18n', 'lib', 'messages', 'prisma', 'public', 'services', 'src', 'types', 'validations', '_legacy-dashboard', 'tests', '__tests__', 'scripts', 'docs', 'design-system', '.github', 'vendor']);
async function fileInfo(relative) {
  if (relative.startsWith('/') || relative.includes(':') || relative.split('/').some(p => p === '..' || p === 'node_modules')) throw new Error('Unsafe input path: ' + relative);
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) return null;
  if (!fs.lstatSync(file).isFile()) throw new Error('Nonregular source input: ' + relative);
  const before = fs.statSync(file);
  const digest = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) digest.update(chunk);
  const after = fs.statSync(file);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error('Source changed while hashing: ' + relative);
  return { sha256: digest.digest('hex'), bytes: after.size };
}
async function main() {
  const startedAt = new Date().toISOString();
  const selectors = fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory() ? roots.has(entry.name) : included(entry.name)).map(entry => entry.name);
  const paths = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', ...selectors], { cwd: root, maxBuffer: 30e6, windowsHide: true }).toString().split('\0').filter(Boolean))].sort();
  const selected = paths.filter(file => fs.existsSync(path.join(root, file)) && included(file));
  const previous = new Map(original.files.map(file => [file.path, file]));
  const allPaths = [...new Set([...original.files.map(file => file.path), ...selected])].sort();
  const selectedSet = new Set(selected);
  const comparisons = [], additions = [], currentFiles = [];
  for (const file of allPaths) {
    const info = await fileInfo(file);
    const old = previous.get(file);
    if (old) comparisons.push({ path: file, previous_sha256: old.sha256, previous_bytes: old.bytes, current: info, status: !info ? 'missing' : info.sha256 !== old.sha256 ? 'changed' : 'unchanged', selected_now: selectedSet.has(file) });
    else additions.push({ path: file, ...info });
    if (info && selectedSet.has(file)) currentFiles.push({ path: file, ...info });
  }
  const finishedAt = new Date().toISOString();
  const changed = comparisons.filter(row => row.status === 'changed');
  const missing = comparisons.filter(row => row.status === 'missing');
  const selectionDropped = comparisons.filter(row => row.current && !row.selected_now);
  const identityRows = currentFiles.map(({ path, sha256, bytes }) => ({ path, sha256, bytes })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const sourceIdentity = sha(JSON.stringify(identityRows));
  const summary = { baseline_files: original.files.length, current_selected_files: currentFiles.length, unchanged: comparisons.filter(row => row.status === 'unchanged').length, changed: changed.length, missing: missing.length, added: additions.length, selection_dropped: selectionDropped.length };
  const receipt = { schema_version: 1, package_id: 'P04-R06', started_at: startedAt, finished_at: finishedAt, original_manifest: 'root-source-manifest.json', original_manifest_sha256: sha(originalBytes), original_captured_at: original.createdAt, original_head: original.head, selector_script: 'scripts/candidate-snapshot.cjs', selector_sha256: selectorSha256, selectors, method: 'Same inspected candidate source selection; git ls-files cached/others/exclude-standard for bounded roots, then streaming SHA256 of regular files. Installed dependencies not traversed or hashed. Source only; no runtime, browser, database or full typecheck proof.', summary, changed, missing, additions, selection_dropped: selectionDropped, comparisons, current_source_identity: sourceIdentity, interpretation: 'Any changed or newly added source outside the admitted one-line auth assertion requires separate ownership and admission; this inventory does not incorporate unrelated work into the qualification candidate.' };
  fs.writeFileSync(path.join(output, 'FULL-SOURCE-COMPARISON.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  fs.writeFileSync(path.join(output, 'CURRENT-FULL-SOURCE-MANIFEST.json'), JSON.stringify({ schema_version: 1, package_id: 'P04-R06', captured_at: finishedAt, source_identity: sourceIdentity, identity_algorithm: 'SHA256 of UTF-8 JSON.stringify(sorted path/sha256/bytes rows)', files: currentFiles, scope: original.scope, original_manifest_sha256: sha(originalBytes), comparison_receipt: 'FULL-SOURCE-COMPARISON.json', admitted: false }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ summary, sourceIdentity, changed: changed.map(({ path, previous_sha256, current }) => ({ path, previous_sha256, current })), missing: missing.map(row => row.path), added: additions.map(row => row.path), selectionDropped: selectionDropped.map(row => row.path) }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
