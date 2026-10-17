const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const nextJest = require('next/jest.js');
const root = process.cwd(), directory = __dirname, candidate = path.join(directory, 'candidate');
const paths = JSON.parse(fs.readFileSync(path.join(candidate, 'manifest.json'), 'utf8')).files.filter(row => row.file.endsWith('.ts')).map(row => ({
  path: path.join(root, row.file.replaceAll('__', '/')), candidate: path.join(candidate, row.file), sha256: row.sha256,
}));
for (const row of JSON.parse(fs.readFileSync(path.join(candidate, 'test-manifest.json'), 'utf8'))) paths.push({ ...row, path: path.join(root, row.path) });
for (const row of JSON.parse(fs.readFileSync(path.join(directory, '..', 'source-reversal-before-actions-86596587-b770-4d20-b03f-7d6f96f53984', 'deferred-action-candidates.json'), 'utf8'))) paths.push({ path: path.join(root, row.path), candidate: path.resolve(root, row.candidate), sha256: row.candidateSha256 });
for (const row of paths) if (crypto.createHash('sha256').update(fs.readFileSync(row.candidate)).digest('hex') !== row.sha256) throw Error('Candidate changed: ' + row.path);
module.exports = async () => {
  process.stderr.write('Candidate overlay: loading Next/Jest configuration\n');
  const config = await nextJest({ dir: root })({ rootDir: root, testEnvironment: 'jsdom', setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
    roots: ['<rootDir>/services', '<rootDir>/actions', '<rootDir>/lib'],
    modulePathIgnorePatterns: ['<rootDir>/what-next/', '<rootDir>/.codex-tmp/', '<rootDir>/.next/'],
    testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/what-next/', '<rootDir>/.next/'], cacheDirectory: path.join(directory, 'jest-cache') })();
  process.stderr.write('Candidate overlay: configuration loaded; starting five selected suites\n');
  for (const [pattern, value] of Object.entries(config.transform)) {
    const [delegate, delegateOptions] = Array.isArray(value) ? value : [value, {}];
    if (delegate.includes('jest-transformer')) config.transform[pattern] = [path.join(directory, 'jest-overlay-transform.cjs'), { delegate, delegateOptions, files: paths }];
  }
  return config;
};
