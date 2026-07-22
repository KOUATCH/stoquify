#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const root = process.cwd()
const agentsRoot = path.join(root, "services", "agents")
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"])
const allowedDbFiles = new Set([
  "services/agents/agent-context.service.ts",
  "services/agents/agent-runner.service.ts",
])
const allowedAgentDelegates = new Set([
  "agentDefinition",
  "agentSkillDefinition",
  "agentToolDefinition",
  "agentRun",
  "agentStep",
  "agentEvidenceLink",
  "agentFeedback",
  "agentCostLedger",
  "agentPolicyIncident",
])
const mutationOperations = new Set(["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"])
const forbiddenServiceCalls = [
  "signReconciliationRun",
  "approveManualMatch",
  "approveSuspensePosting",
  "postJournalEntry",
  "postToLedger",
  "approvePayroll",
  "certifyClose",
  "applyStockAdjustment",
  "approveStockTransfer",
  "changeUserPermission",
]

function main() {
  const findings = []
  for (const absoluteFile of walk(agentsRoot)) {
    const file = path.relative(root, absoluteFile).replace(/\\/g, "/")
    if (file.includes("/__tests__/") || /\.(test|spec)\.[jt]sx?$/.test(file)) continue
    const source = fs.readFileSync(absoluteFile, "utf8")

    if (source.includes("@/prisma/db") && !allowedDbFiles.has(file)) {
      findings.push(`${file}: Prisma DB import is outside the reviewed agent governance boundary.`)
    }
    if (/\bnew\s+PrismaClient\s*\(/.test(source)) {
      findings.push(`${file}: direct PrismaClient construction is prohibited.`)
    }

    const calls = source.matchAll(/\b(?:db|tx)\.([A-Za-z_]\w*)\.([A-Za-z_]\w*)\s*\(/g)
    for (const match of calls) {
      const [, delegate, operation] = match
      if (mutationOperations.has(operation) && !allowedAgentDelegates.has(delegate)) {
        findings.push(`${file}: prohibited business mutation ${delegate}.${operation}().`)
      }
      if (file.endsWith("agent-context.service.ts") && operation !== "findFirst") {
        findings.push(`${file}: context resolver may only perform the reviewed organization read.`)
      }
    }

    for (const call of forbiddenServiceCalls) {
      const pattern = new RegExp(`\\b${call}\\s*\\(`)
      if (pattern.test(source)) findings.push(`${file}: prohibited action call ${call}().`)
    }
  }

  if (findings.length > 0) {
    console.error("Stoquify agent prohibited-action gate failed:")
    for (const finding of findings) console.error(`- ${finding}`)
    process.exit(1)
  }

  console.log("Stoquify agent prohibited-action gate passed: no business write path is present in services/agents.")
}

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(absolute))
    else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) files.push(absolute)
  }
  return files
}

main()
