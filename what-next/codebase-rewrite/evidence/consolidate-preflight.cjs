// One-time, guarded source transformation. Not used by the application at runtime.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const file = path.join(root, 'services/leakage/pos-cash-shortage-production-activation-preflight.ts');
const before = fs.readFileSync(path.join(__dirname, 'pos-cash-shortage-production-activation-preflight.ts.before.txt'), 'utf8');
const source = ts.createSourceFile(file, before, ts.ScriptTarget.Latest, true);
const aliases = new Map(source.statements.filter(ts.isTypeAliasDeclaration).map(node => [node.name.text, node]));
const edits = [], changed = [];
const compact = value => value.replace(/\s+/g, '');
const quote = JSON.stringify;
for (const node of source.statements) {
  if (!ts.isFunctionDeclaration(node) || !node.body || !node.name?.text.startsWith('buildPosCashShortageProductionActivationSlice')) continue;
  const statements = node.body.statements;
  if (statements.length !== 4 || !statements.slice(0,3).every(ts.isVariableStatement) || !ts.isReturnStatement(statements[3])) continue;
  const declarations = statements.slice(0,3).map(statement => statement.declarationList.declarations[0]);
  const [upstream, items, ready] = declarations;
  if (!ts.isCallExpression(upstream.initializer) || items.name.text !== 'items' || ready.name.text !== 'ready') continue;
  const upstreamName = upstream.name.getText(source);
  const call = upstream.initializer.getText(source);
  if (!/^[A-Za-z0-9_]+\(input\)$/.test(compact(call))) continue;
  const itemMatch = compact(items.initializer.getText(source)).match(new RegExp(`^\\[${upstreamName}\\.([A-Za-z]+),\\.\\.\\.${upstreamName}\\.items\\]asconst$`));
  if (!itemMatch || compact(ready.initializer.getText(source)) !== `${upstreamName}.status==="ready"`) continue;
  const returned = statements[3].expression;
  if (!ts.isObjectLiteralExpression(returned)) continue;
  const properties = returned.properties;
  const nameKey = properties[0]?.name?.getText(source);
  if (properties.map(property => property.name?.getText(source)).join(',') !== `${nameKey},status,tone,${upstreamName},itemCount,items,text,activationAuthorized`) continue;
  if (!nameKey.endsWith('Name') || !ts.isPropertyAssignment(properties[0]) || !ts.isStringLiteral(properties[0].initializer)) continue;
  const label = properties[0].initializer.text;
  const expectedBody = `{
    const ${upstreamName} = ${call};
    const items = [${upstreamName}.${itemMatch[1]}, ...${upstreamName}.items] as const;
    const ready = ${upstreamName}.status === "ready";
    return { ${nameKey}: ${quote(label)}, status: ready ? "ready" : "blocked", tone: ready ? "clear" : "attention", ${upstreamName}, itemCount: items.length, items,
      text: ready ? \`${label} is clear: \${${upstreamName}.text}\` : \`${label} needs attention: \${${upstreamName}.text}\`, activationAuthorized: false, };
  }`;
  if (compact(node.body.getText(source)) !== compact(expectedBody)) continue;
  const alias = aliases.get(node.type?.getText(source));
  if (!alias || !ts.isTypeLiteralNode(alias.type)) continue;
  const members = alias.type.members;
  if (members.map(member => member.name?.getText(source)).join(',') !== `${nameKey},status,tone,${upstreamName},itemCount,items,text,activationAuthorized`) continue;
  const sourceType = members[3].type.getText(source);
  const expectedType = `{ ${nameKey}: string; status: "ready" | "blocked"; tone: "clear" | "attention"; ${upstreamName}: ${sourceType}; itemCount: number; items: readonly string[]; text: string; activationAuthorized: false; }`;
  if (compact(alias.type.getText(source)) !== compact(expectedType)) continue;
  edits.push({ start: alias.type.getStart(source), end: alias.type.end,
    text: `EvidenceLayer<\n  ${quote(nameKey)}, ${quote(upstreamName)},\n  ${sourceType}\n>` });
  edits.push({ start: node.body.getStart(source), end: node.body.end,
    text: `{\n  const source = ${call.replace(/\s+/g, ' ')};\n  return buildEvidenceLayer(\n    ${quote(nameKey)}, ${quote(label)},\n    ${quote(upstreamName)}, source, source.${itemMatch[1]},\n  );\n}` });
  changed.push(node.name.text);
}
const helper = `
// Retained evidence contracts share one implementation for their repeated wrapper shape.
// Names, nested source objects, property order, text, and activation authority stay stable.
type EvidenceLayer<Name extends string, SourceKey extends string, Source> =
  Record<Name, string> & Record<SourceKey, Source> & {
    status: "ready" | "blocked";
    tone: "clear" | "attention";
    itemCount: number;
    items: readonly string[];
    text: string;
    activationAuthorized: false;
  };

function buildEvidenceLayer<
  Name extends string,
  SourceKey extends string,
  Source extends { status: "ready" | "blocked"; items: readonly string[]; text: string },
>(nameKey: Name, name: string, sourceKey: SourceKey, source: Source, sourceName: string): EvidenceLayer<Name, SourceKey, Source> {
  const items = [sourceName, ...source.items];
  const ready = source.status === "ready";
  // The internal callers supply distinct literal name/source keys; computed keys
  // need an assertion to retain those literal property names in the return type.
  return {
    [nameKey]: name,
    status: ready ? "ready" : "blocked",
    tone: ready ? "clear" : "attention",
    [sourceKey]: source,
    itemCount: items.length,
    items,
    text: ready ? \`\${name} is clear: \${source.text}\` : \`\${name} needs attention: \${source.text}\`,
    activationAuthorized: false,
  } as EvidenceLayer<Name, SourceKey, Source>;
}
`;
let after = before;
for (const edit of edits.sort((a,b) => b.start-a.start)) after = after.slice(0,edit.start)+edit.text+after.slice(edit.end);
after += helper;
const metrics = { functionsConsolidated: changed.length, linesBefore: before.split('\n').length-1,
  linesAfter: after.split('\n').length-1, bytesBefore: Buffer.byteLength(before), bytesAfter: Buffer.byteLength(after), functions: changed };
console.log(JSON.stringify({ ...metrics, functions: undefined }, null, 2));
if (process.argv.includes('--write')) {
  if (changed.length < 100) throw new Error('Unexpectedly few exact pattern matches; no source written');
  if (fs.readFileSync(file, 'utf8') !== before) throw new Error('Source changed since baseline; no source written');
  fs.writeFileSync(file, after);
  fs.writeFileSync(path.join(__dirname, 'preflight-consolidation.json'), JSON.stringify(metrics,null,2)+'\n');
}
