const fs = require('node:fs');
const ts = require('typescript');
const startedAt = new Date().toISOString();
const start = performance.now();
const { config } = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config, ts.sys, process.cwd());
const byRoot = {};
for (const file of parsed.fileNames) {
  const root = file.replace(process.cwd().replaceAll('\\', '/') + '/', '').split('/')[0];
  byRoot[root] = (byRoot[root] || 0) + 1;
}
const result = { startedAt, elapsedMs: Math.round(performance.now() - start), rootFiles: parsed.fileNames.length,
  byRoot, configDiagnostics: parsed.errors.map(e => ({ code: e.code, message: ts.flattenDiagnosticMessageText(e.messageText, '\n') })) };
fs.writeFileSync(`${__dirname}/typescript-enumeration.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
