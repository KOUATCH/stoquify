// Types-only compiler reproduction. No auth import, environment file, DB or app.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../..');
const ts = require(path.join(root, 'node_modules/typescript'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const digest = file => hash(fs.readFileSync(file));
const sourceFile = path.join(root, 'lib/auth.ts');
const before = fs.readFileSync(sourceFile, 'utf8');
const newline = before.includes('\r\n') ? '\r\n' : '\n';
const oldLine = '    ...ctx,' + newline;
const newLine = '    ...(ctx as NonNullable<Parameters<ReturnType<typeof getSession>>[0]>),' + newline;
assert.equal(before.split(oldLine).length, 2, 'Exactly one raw ctx spread required');
const after = before.replace(oldLine, newLine);
const start = before.indexOf('  const resolved = await getSession()({');
const end = before.indexOf('  })', start) + '  })'.length;
assert(start > 0 && end > start);
const expression = before.slice(start, end);
function compile(fragment) {
  const text = 'import { getSession } from "better-auth/api"\ndeclare const ctx: any\nasync function proof() {\n' + fragment + '\nconst session = resolved.response\nreturn session?.user?.id\n}\n';
  const virtualFile = path.join(root, '__close_auth_typing_proof.virtual.ts');
  const options = { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, noEmit: true, skipLibCheck: true, types: [], lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'] };
  const host = ts.createCompilerHost(options), original = host.getSourceFile;
  host.getSourceFile = (file, version, onError, createNew) => path.resolve(file) === virtualFile ? ts.createSourceFile(file, text, version, true) : original(file, version, onError, createNew);
  host.writeFile = () => { throw Error('Types-only proof may not emit files'); };
  const program = ts.createProgram([virtualFile], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).map(item => ({ code: item.code, file: item.file ? path.relative(root, item.file.fileName).replaceAll('\\', '/') : null, message: ts.flattenDiagnosticMessageText(item.messageText, '\n') }));
  return { text, diagnostics, parsedFiles: program.getSourceFiles().length };
}
assert.equal(process.argv[2], 'prove'); assert.equal(process.argv.length, 3);
const id = crypto.randomBytes(5).toString('hex'), directory = path.join(__dirname, 'proof-' + id); fs.mkdirSync(directory);
const write = (name, content) => fs.writeFileSync(path.join(directory, name), content, { flag: 'wx' });
write('auth.before.txt', before); write('auth.proposed.txt', after);
const oldProof = compile(expression), newProof = compile(expression.replace(oldLine, newLine));
write('old-proof.txt', oldProof.text); write('new-proof.txt', newProof.text);
const emitOptions = { compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.ESNext }, fileName: 'auth.ts' };
const emittedBefore = ts.transpileModule(before, emitOptions).outputText, emittedAfter = ts.transpileModule(after, emitOptions).outputText;
const receipt = { checkedAt: new Date().toISOString(), passed: oldProof.diagnostics.length === 1 && oldProof.diagnostics[0].code === 2339 && /Property 'response' does not exist on type 'Response'/.test(oldProof.diagnostics[0].message) && newProof.diagnostics.length === 0 && emittedBefore === emittedAfter,
  classification: 'Installed SDK declaration types only; no application/auth runtime imported, no environment/database/browser/build qualification',
  beforeSourceSha256: hash(before), proposedSourceSha256: hash(after), transpiledJavaScriptSha256: hash(emittedBefore), emittedJavaScriptIdentical: emittedBefore === emittedAfter,
  oldDiagnostics: oldProof.diagnostics, newDiagnostics: newProof.diagnostics, parsedFiles: { old: oldProof.parsedFiles, proposed: newProof.parsedFiles },
  versions: Object.fromEntries(['typescript', 'better-auth', 'better-call'].map(name => [name, JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'))).version])),
  installedDeclarations: ['node_modules/better-auth/dist/api/routes/session.d.mts', 'node_modules/better-call/dist/endpoint.d.mts'].map(file => ({ path: file, sha256: digest(path.join(root, file)) })),
  sourceUnchangedDuringProof: digest(sourceFile) === hash(before), directory, runnerSha256: digest(__filename) };
receipt.passed &&= receipt.sourceUnchangedDuringProof;
write('RESULT.json', JSON.stringify(receipt, null, 2) + '\n'); console.log(JSON.stringify(receipt)); process.exitCode = receipt.passed ? 0 : 1;
