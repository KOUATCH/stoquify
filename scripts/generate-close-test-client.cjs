// Generate a test-only client without touching the application's locked engine.
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const root = path.resolve(__dirname, '..')
const directory = path.join(root, '.test-artifacts', 'close-coverage')
fs.mkdirSync(directory, { recursive: true })
const source = fs.readFileSync(path.join(root, 'prisma', 'schema.prisma'), 'utf8')
const schema = source.replace(/generator client\s*\{/, 'generator client {\n  output = "./client"')
if (schema === source) throw new Error('Prisma client generator not found')
const target = path.join(directory, 'schema.prisma')
fs.writeFileSync(target, schema)
const result = spawnSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'generate', '--schema', target], { cwd: root, stdio: 'inherit', timeout: 180000 })
process.exitCode = result.status === 0 ? 0 : 1
