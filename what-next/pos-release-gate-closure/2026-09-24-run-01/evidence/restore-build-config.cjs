const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const root = path.resolve(__dirname, '../../../..')
const distDir = '.next-pos-gates-20260924'
const hash = data => crypto.createHash('sha256').update(data).digest('hex')
if (!fs.existsSync(path.join(__dirname,'build-result.json'))) throw new Error('Build has not completed; configuration must remain untouched.')
const beforeTs = fs.readFileSync(path.join(__dirname,'build-before-tsconfig.json.txt'))
const beforeEnv = fs.readFileSync(path.join(__dirname,'build-before-next-env.d.ts.txt'))
const currentTs = fs.readFileSync(path.join(root,'tsconfig.json'))
const currentEnv = fs.readFileSync(path.join(root,'next-env.d.ts'))
const original = JSON.parse(beforeTs.toString())
const cleaned = JSON.parse(currentTs.toString())
cleaned.include = cleaned.include.filter(p => p !== distDir + '/types/**/*.ts')
if (JSON.stringify(original)!==JSON.stringify(cleaned)) throw new Error('Concurrent/non-build TypeScript configuration difference; refusing overwrite.')
const priorReference = beforeEnv.toString().match(/\.\/(\.next[^"\r\n]*)\/types\/routes\.d\.ts/)
if (!priorReference) throw new Error('Original generated route reference is not recognized.')
const expectedEnv = beforeEnv.toString().replace('./'+priorReference[1]+'/types/routes.d.ts','./'+distDir+'/types/routes.d.ts')
if (currentEnv.toString()!==expectedEnv && !currentEnv.equals(beforeEnv)) throw new Error('Concurrent/non-build next-env difference; refusing overwrite.')
const records=[]
for(const [name,before,observed] of [['tsconfig.json',beforeTs,currentTs],['next-env.d.ts',beforeEnv,currentEnv]]){
 const target=path.join(root,name)
 if(!fs.readFileSync(target).equals(observed))throw new Error('Configuration changed during guarded cleanup: '+name)
 fs.writeFileSync(target,before)
 records.push({path:name,beforeSha256:hash(before),observedBuildSha256:hash(observed),restoredSha256:hash(fs.readFileSync(target)),exactRestore:fs.readFileSync(target).equals(before)})
}
const result={completedAt:new Date().toISOString(),method:'Validated only run-owned include/reference changes; restored exact saved bytes',directoriesDeleted:0,files:records}
fs.writeFileSync(path.join(__dirname,'build-config-cleanup.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
