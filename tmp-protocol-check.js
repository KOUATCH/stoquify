const { PrismaClient } = require('@prisma/client')
const { existsSync, readFileSync } = require('fs')
const { resolve } = require('path')

function expandEnvValue(value) {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)}/g, (_, key) => process.env[key] || '')
}

function loadLocalEnv() {
  for (const envPath of [resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '.env')]) {
    if (!existsSync(envPath)) continue
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match || process.env[match[1]] !== undefined) continue
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[match[1]] = expandEnvValue(value).replace(/\\n/g, '\n')
    }
  }
}

loadLocalEnv()
const urls = [
  process.env.DATABASE_URL,
  (process.env.DATABASE_URL || '').replace(/^postgresql:\/\//, 'prisma+postgres://')
]

;(async()=> {
  for (const url of urls) {
    if (!url) continue
    process.env.DATABASE_URL = url
    const prisma = new PrismaClient()
    try {
      const out = await prisma.$queryRawUnsafe('SELECT 1 as ok')
      console.log(`OK ${url}`)
      console.log(out)
      await prisma.$disconnect()
      return
    } catch (e) {
      console.log(`ERR ${url} -> ${e.code || e.message}`)
    } finally {
      await prisma.$disconnect()
    }
  }
})();
