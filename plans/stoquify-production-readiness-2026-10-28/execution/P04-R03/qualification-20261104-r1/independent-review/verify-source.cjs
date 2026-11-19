// Independent read-only source comparison; writes only this review receipt.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../../..');
const evidence = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourcePath = 'actions/item/items.ts';
const beforeBytes = fs.readFileSync(path.join(evidence, 'source-before/actions/item/items.ts.source.txt'));
const currentBytes = fs.readFileSync(path.join(root, sourcePath));
const before = beforeBytes.toString('utf8').replaceAll('\r\n', '\n');
const current = currentBytes.toString('utf8').replaceAll('\r\n', '\n');
const names = ['getItemAction', 'listItemsAction', 'updateItemBasicInfoAction', 'updateItemDetailsAction', 'updateItemPricingAction', 'updateItemRelationsAction', 'updateItemStockAction', 'updateItemTrackingAction', 'deleteItemAction'];
let reversed = current.replace('import { ApplicationError, BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"', 'import { ForbiddenError } from "@/services/_shared/action-errors"');
const start = reversed.indexOf('import { ZodError } from "zod"\n');
const end = reversed.indexOf('export type PaginatedItems', start);
assert(start > 0 && end > start);
reversed = reversed.slice(0, start) + '\n' + reversed.slice(end);
for (const name of names) {
  const expression = new RegExp('const message = itemActionError\\(error, "' + name + '", "([^"]+)"\\)', 'g');
  assert.equal([...reversed.matchAll(expression)].length, 1, name + ' must have exactly one owned catch change');
  reversed = reversed.replace(expression, (_match, fallback) => 'const message = error instanceof Error ? error.message : "' + fallback + '"');
}
assert.equal(reversed, before, 'Unexpected edits outside helper/import and nine catch substitutions');
const manifest = JSON.parse(fs.readFileSync(path.join(evidence, 'source-before.json'), 'utf8'));
for (const file of manifest.files) assert.equal(hash(fs.readFileSync(path.join(evidence, file.snapshotPath))), file.sha256, 'Historical source bytes changed: ' + file.path);
const result = {
  reviewedAt: new Date().toISOString(), reviewer: 'r03_review', passed: true,
  productFiles: 1, sourcePath, beforeSha256: hash(beforeBytes), currentSha256: hash(currentBytes),
  repairedHandlers: names, unchangedExecutionBlocks: true,
  proof: 'Reversing only the new imports/local response helper and nine catch substitutions reproduces the entire pre-repair file after line-ending normalization.',
  preservedPreRepairSnapshots: manifest.files.length,
  responseContract: 'Existing canonical/logging helper, explicit operation fallback, typed plus fixed-literal public business messages, fixed auth/validation, framework flow retained.',
  otherItemListSurface: 'actions/item/listItemsAction.ts remains an unresolved distinct disclosure path; parent P04 and production must not advance.',
  noProductOrTestEditsByReviewer: true,
};
fs.writeFileSync(path.join(__dirname, 'SOURCE-REVIEW.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
