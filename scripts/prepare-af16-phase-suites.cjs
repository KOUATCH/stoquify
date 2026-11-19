// Generate connection/output adapters for current phase tests; never edit old receipts.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), ts = require('typescript')
const c = require('./af16-verification-context.cjs')
const suites = {
  AF01: 'services/accounting/__tests__/accountant-portfolio.postgres.test.ts',
  AF03: 'services/accounting/__tests__/firm-engagement.postgres.test.ts',
  AF04: 'services/accounting/__tests__/firm-engagement-authority.postgres.test.ts',
  AF05: 'services/accounting/__tests__/firm-engagement-workflows.postgres.test.ts',
  AF06: 'services/accounting/__tests__/delegated-evidence-desk.postgres.test.ts',
  AF07: 'services/payments/__tests__/provider-formats.postgres.test.ts',
  AF08: 'services/accounting/__tests__/review-workpaper.postgres.test.ts',
  AF09: 'services/onboarding/__tests__/opening-position.postgres.test.ts',
  AF10: 'services/onboarding/__tests__/opening-cutover.postgres.test.ts',
  AF11: 'services/compliance/__tests__/obligation-register.postgres.test.ts',
  AF12: 'services/accounting/__tests__/advisory-outcomes.postgres.test.ts',
  AF13: 'services/accounting/__tests__/firm-practice.postgres.test.ts',
  AF16WORKER: 'services/events/__tests__/af16-outbox-recovery.postgres.test.ts',
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const output = path.join(c.root, '.codex-tmp/af16-tests'); fs.mkdirSync(output, { recursive: true })
const manifest = []
for (const [phase, file] of Object.entries(suites)) {
  const original = fs.readFileSync(path.join(c.root, file), 'utf8')
  let text = original, ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true), replacements = [], replaced = false
  for (const statement of ast.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) continue
    const call = statement.expression
    if (call.expression.getText(ast) !== 'jest.mock' || call.arguments[0]?.text !== '@/prisma/db') continue
    const options = []
    const visit = node => {
      if (ts.isNewExpression(node) && node.expression.getText(ast) === 'PrismaClient') {
        for (const prop of node.arguments?.[0]?.properties ?? []) {
          const name = prop.name?.getText(ast)
          if (['transactionOptions', 'log'].includes(name)) options.push(prop.getText(ast))
          else if (name !== 'datasources') throw Error('Unreviewed Prisma option: ' + name)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(call.arguments[1])
    const mock = `jest.mock("@/prisma/db", () => {
      const { PrismaClient } = require("@prisma/client"), target = process.env.AF16_POSTGRES_URL
      if (process.env.NODE_ENV === "production" || !target || process.env.AF16_CLUSTER_DIR !== ${JSON.stringify(c.cluster)}) throw Error("Explicit AF16 target required")
      if (target !== ${JSON.stringify(c.url(phase.toLowerCase()))}) throw Error("Wrong phase database")
      return { db: new PrismaClient({ datasources: { db: { url: target } }, ${options.join(',')} }) }
    })`
    replacements.push([statement.getStart(ast), statement.end, mock]); replaced = true
  }
  if (!replaced || replacements.length !== 1) throw Error('Expected one database mock: ' + file)
  for (const [start, end, value] of replacements.sort((a,b)=>b[0]-a[0])) text = text.slice(0,start)+value+text.slice(end)
  ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true); replacements = []
  const visit = node => {
    let module
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) module = node.moduleSpecifier
    if (ts.isCallExpression(node) && ['require','jest.mock','jest.requireActual'].includes(node.expression.getText(ast))) module = node.arguments[0]
    if (module && ts.isStringLiteral(module) && module.text.startsWith('.')) {
      const target = path.relative(c.root, path.resolve(c.root, path.dirname(file), module.text)).replaceAll('\\','/')
      if (target.startsWith('../')) throw Error('Module escapes root')
      replacements.push([module.getStart(ast), module.end, JSON.stringify('@/' + target)])
    }
    if (ts.isIdentifier(node) && node.text === '__dirname') replacements.push([node.getStart(ast), node.end, JSON.stringify(path.dirname(path.join(c.root, file)))])
    ts.forEachChild(node, visit)
  }
  visit(ast)
  for (const [start,end,value] of replacements.sort((a,b)=>b[0]-a[0])) text=text.slice(0,start)+value+text.slice(end)
  const phaseOutput = path.join(c.output, phase); fs.mkdirSync(phaseOutput,{recursive:true})
  text = text.replace(/docs\/accounting-firms\/roadmap-2026-10-19\/execution\/AF\d{2}\/\d{4}-\d{2}-\d{2}-run-\d{2}/g, path.relative(c.root,phaseOutput).replaceAll('\\','/'))
  text = `beforeAll(async () => {
    const fs = require("node:fs"), db = require("@/prisma/db").db
    const actual = (await db.$queryRawUnsafe("SHOW data_directory"))[0].data_directory
    if (fs.realpathSync(actual).toLowerCase() !== fs.realpathSync(process.env.AF16_CLUSTER_DIR!).toLowerCase()) throw Error("Wrong AF16 cluster")
  })\n` + text
  const target = path.join(output, phase + '.postgres.test.ts'); fs.writeFileSync(target,text)
  manifest.push({ phase, file, originalSha256: hash(original), generated: path.relative(c.root,target), generatedSha256: hash(text), phaseOutput,
    adaptations: ['Exact AF16 connection/cluster guard; original Prisma transaction/log options preserved', 'Resolve original relative modules/assets', 'Redirect receipts into AF16; original test bodies/assertions retained'] })
}
fs.writeFileSync(path.join(c.output,'phase-suite-adapters.json'),JSON.stringify(manifest,null,2))
console.log('Prepared '+manifest.length+' current PostgreSQL phase suites without modifying original tests.')
