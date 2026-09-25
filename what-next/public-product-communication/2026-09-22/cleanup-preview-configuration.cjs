const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

// Run only after this task's build has exited. Preserve every unrelated setting.
const file = 'tsconfig.json';
const original = fs.readFileSync(file, 'utf8');
const before = JSON.parse(original);
const temporaryEntries = ['.next-public-communication/types/**/*.ts', '.next-public-communication-build/types/**/*.ts'];
const expected = { ...before, include: before.include.filter(entry => !temporaryEntries.includes(entry)) };
const updated = original.replace(/,\r?\n\s*"\.next-public-communication(?:-build)?\/types\/\*\*\/\*\.ts"/g, '');
assert.deepEqual(JSON.parse(updated), expected);
if (updated !== original) fs.writeFileSync(file, updated);

// The observed pre-resumption generated reference used the normal dev directory.
const generatedFile = 'next-env.d.ts';
const generatedBefore = fs.readFileSync(generatedFile, 'utf8');
const generatedAfter = generatedBefore.replace(/\.next-public-communication(?:-build)?\/types\/routes\.d\.ts/g, '.next-dev/types/routes.d.ts');
if (generatedBefore !== generatedAfter) fs.writeFileSync(generatedFile, generatedAfter);
const result = {
  completedAt: new Date().toISOString(),
  removedIncludes: before.include.filter(entry => temporaryEntries.includes(entry)),
  unrelatedConfigurationPreserved: true,
  generatedReferenceRestored: generatedBefore !== generatedAfter,
};
fs.writeFileSync(path.join(__dirname, 'configuration-cleanup.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
