// Read-only instrumentation of the scanner in memory; never changes its file or verdict.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const crypto = require('node:crypto');
const ts = require('typescript');
const gatePath = path.resolve('scripts/report-trust-export-gate.js');
const source = fs.readFileSync(gatePath, 'utf8');
const file = ts.createSourceFile(gatePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const selected = new Set([
  'hasCustomerSettlementCompensatingReversalFoundation',
  'hasSignedCustomerStatementExternalAccessFoundation',
  'hasConsentedCustomerReferralLaunchFoundation',
]);
const edits = [];
function clausesOf(expression) {
  if (ts.isParenthesizedExpression(expression)) return clausesOf(expression.expression);
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    return [...clausesOf(expression.left), ...clausesOf(expression.right)];
  }
  return [expression];
}
for (const fn of file.statements) {
  if (!ts.isFunctionDeclaration(fn) || !selected.has(fn.name?.text)) continue;
  const ret = fn.body.statements.findLast(ts.isReturnStatement);
  const clauses = clausesOf(ret.expression);
  const entries = clauses.map(clause => {
    const expression = clause.getText(file);
    let missing = '[]';
    if (ts.isCallExpression(clause) && ts.isPropertyAccessExpression(clause.expression) && clause.expression.name.text === 'every') {
      missing = `${clause.expression.expression.getText(file)}.filter(marker => !(${clause.arguments[0].getText(file)})(marker))`;
    }
    return `{ expression: ${JSON.stringify(expression)}, ready: Boolean(${expression}), missingMarkers: ${missing} }`;
  });
  const replacement = `__capture(${JSON.stringify(fn.name.text)}, [${entries.join(',\n')}])`;
  edits.push({ start: ret.expression.getStart(file), end: ret.expression.end, replacement });
}
let instrumented = source;
for (const edit of edits.sort((a, b) => b.start - a.start)) {
  instrumented = instrumented.slice(0, edit.start) + edit.replacement + instrumented.slice(edit.end);
}
instrumented = 'const __captures = []; function __capture(name, clauses) { __captures.push({name, clauses}); return clauses.every(c => c.ready); }\n' + instrumented + '\nmodule.exports.diagnosticCaptures = __captures;\n';
const mod = new Module(gatePath, module);
mod.filename = gatePath;
mod.paths = Module._nodeModulePaths(path.dirname(gatePath));
mod._compile(instrumented, gatePath);
const report = mod.exports.buildReportTrustExportReadiness(process.cwd(), { mode: 'fail' });
const captures = mod.exports.diagnosticCaptures.map(c => ({ name: c.name, clauseCount: c.clauses.length,
  failed: c.clauses.filter(clause => !clause.ready) }));
const output = { generatedAt: new Date().toISOString(), gateHash: crypto.createHash('sha256').update(source).digest('hex'),
  scanSummary: report.summary, blockers: report.blockers, captures };
fs.writeFileSync(path.join(__dirname, 'report-gate-diagnosis.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
