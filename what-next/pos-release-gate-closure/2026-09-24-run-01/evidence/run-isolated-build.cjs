const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const root = path.resolve(__dirname, '../../../..')
const { runSafeBuild, renderSummary } = require(path.join(root, 'scripts/build-app-safe'))
const distDir = '.next-pos-gates-20260924'
const hash = data => crypto.createHash('sha256').update(data).digest('hex')
const save = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n')
const files = JSON.parse(fs.readFileSync(path.join(root, 'what-next/pos-enterprise-modernization/2026-09-23/evidence/source-final.json'), 'utf8')).files.map(f => f.path)
const snapshot = () => files.map(p => ({path:p, sha256:hash(fs.readFileSync(path.join(root,p)))}))
async function main() {
  if (fs.existsSync(path.join(root, distDir))) throw new Error('Unique output already exists; refusing reuse or cleanup.')
  const startedAt = new Date().toISOString()
  const before = snapshot()
  const configs = ['tsconfig.json', 'next-env.d.ts']
  for (const p of configs) fs.copyFileSync(path.join(root,p), path.join(__dirname, 'build-before-' + p + '.txt'))
  save('build-start.json', {startedAt, distDir, skipClean:true, timeoutMs:3600000, source:before})
  const result = await runSafeBuild({root, skipClean:true, timeoutMs:3600000, env:{...process.env, NEXT_DIST_DIR:distDir, BUILD_APP_SKIP_CLEAN:'1'}})
  save('build-result.json', {...result, startedAt, completedAt:new Date().toISOString(), sourceBefore:before, sourceAfter:snapshot()})
  console.log(renderSummary(result))
  process.exitCode = result.exitCode
}
main().catch(error => {save('build-runner-error.json',{message:error.message,at:new Date().toISOString()}); console.error(error.message);process.exitCode=1})
