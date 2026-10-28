#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const root = process.cwd()
const registryFile = path.join(root, "services", "agents", "tools", "command-tools.ts")
const packageFile = path.join(root, "package.json")

const prohibitedKeyPatterns = [
  /prisma/i,
  /ledger.*post|post.*ledger/i,
  /journal.*post|post.*journal/i,
  /statutory.*fil|fil.*statutory/i,
  /payroll.*approv|approv.*payroll/i,
  /close.*certif|certif.*close/i,
  /cash.*adjust|adjust.*cash/i,
  /stock.*write.?off|write.?off.*stock/i,
  /stock.*adjust|adjust.*stock/i,
  /permission.*(change|grant|revoke)|(change|grant|revoke).*permission/i,
]

const forbiddenPhaseOneDependencies = [
  "ai",
  "@ai-sdk/",
  "langchain",
  "inngest",
  "@trigger.dev/",
  "langfuse",
  "helicone",
  "litellm",
  "@modelcontextprotocol/",
]

function main() {
  const findings = []
  if (!fs.existsSync(registryFile)) {
    findings.push("MVP registry file is missing.")
  } else {
    const source = fs.readFileSync(registryFile, "utf8")
    const keys = Array.from(source.matchAll(/\bkey:\s*"([^"]+)"/g), (match) => match[1])
    const toolTypes = Array.from(source.matchAll(/\btoolType:\s*"([^"]+)"/g), (match) => match[1])
    const riskLevels = Array.from(source.matchAll(/\briskLevel:\s*"([^"]+)"/g), (match) => match[1])

    if (keys.length === 0) findings.push("MVP registry contains no tool definitions.")
    if (new Set(keys).size !== keys.length) findings.push("MVP registry contains duplicate tool keys.")
    for (const key of keys) {
      if (prohibitedKeyPatterns.some((pattern) => pattern.test(key))) {
        findings.push(`Prohibited tool key registered: ${key}`)
      }
    }
    if (toolTypes.length !== keys.length || toolTypes.some((value) => value !== "read_only")) {
      findings.push("Every Phase 1 tool must declare toolType read_only.")
    }
    if (riskLevels.length !== keys.length || riskLevels.some((value) => value !== "read_only")) {
      findings.push("Every Phase 1 tool must declare riskLevel read_only.")
    }
  }

  const packageJson = JSON.parse(fs.readFileSync(packageFile, "utf8"))
  const dependencyNames = Object.keys({
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  })
  for (const dependency of dependencyNames) {
    if (forbiddenPhaseOneDependencies.some((prefix) => dependency === prefix || dependency.startsWith(prefix))) {
      findings.push(`Phase 1 must not add agent dependency: ${dependency}`)
    }
  }

  if (findings.length > 0) {
    console.error("Stoquify agent tool registry gate failed:")
    for (const finding of findings) console.error(`- ${finding}`)
    process.exit(1)
  }

  console.log("Stoquify agent tool registry gate passed: static MVP tools are read-only and dependency-neutral.")
}

main()

