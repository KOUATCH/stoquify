#!/usr/bin/env node

// Reads the reviewed manifest only. Never executes the command being classified.
const fs = require("node:fs")
const path = require("node:path")
const crypto = require("node:crypto")

const REGISTRY = "docs/ecc/command-registry.json"
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const hashText = text => crypto.createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex")

function repositoryFile(root, relative) {
  if (typeof relative !== "string" || !relative || relative.includes("\\") ||
      path.posix.isAbsolute(relative) || /^[A-Za-z]:/.test(relative) ||
      relative.split("/").some(part => !part || part === ".." || part === ".")) {
    throw new Error(`Invalid repository-relative path: ${String(relative)}`)
  }
  const base = fs.realpathSync(root)
  const resolved = fs.realpathSync(path.join(base, relative))
  const inside = path.relative(base, resolved)
  if (inside === ".." || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside) || !fs.statSync(resolved).isFile()) {
    throw new Error(`Reference escapes repository or is not a file: ${relative}`)
  }
  return resolved
}

function delegatedScripts(script) {
  // A drift tripwire for the simple npm chains used here, not a shell parser.
  return [...script.matchAll(/\bnpm\s+(?:run(?:-script)?\s+([\w:.-]+)|(test)\b)/g)]
    .map(match => match[1] || match[2])
}

function validate(root, selectedCommand) {
  const errors = []
  let registry, scripts
  try {
    registry = JSON.parse(fs.readFileSync(repositoryFile(root, REGISTRY), "utf8"))
    scripts = JSON.parse(fs.readFileSync(repositoryFile(root, "package.json"), "utf8")).scripts
    if (registry.schemaVersion !== 1 || !registry.commands || typeof registry.commands !== "object" ||
        Array.isArray(registry.commands) || !Array.isArray(registry.requiredReferences) || !scripts || typeof scripts !== "object") {
      throw new Error("Unsupported or incomplete command registry")
    }
  } catch (error) {
    return { ok: false, errors: [error.message], classification: null, unclassifiedCount: 0 }
  }

  for (const reference of registry.requiredReferences) {
    try { repositoryFile(root, reference) } catch (error) { errors.push(`Required reference ${reference}: ${error.message}`) }
  }

  for (const [name, entry] of Object.entries(registry.commands)) {
    if (!entry || typeof entry.script !== "string" || typeof entry.auditAllowed !== "boolean" ||
        typeof entry.reason !== "string" || !entry.reason.trim() || !entry.lifecycle || typeof entry.lifecycle !== "object" || !entry.files ||
        typeof entry.files !== "object" || Array.isArray(entry.files)) {
      errors.push(`Incomplete reviewed classification: ${name}`)
      continue
    }
    if (!has(scripts, name) || scripts[name] !== entry.script) errors.push(`Script drift or missing command: ${name}`)
    for (const phase of ["pre", "post"]) {
      const actual = has(scripts, phase + name) ? scripts[phase + name] : null
      if (!has(entry.lifecycle, phase) || entry.lifecycle[phase] !== actual) errors.push(`Lifecycle drift: ${phase}${name}`)
      // Initial safe lanes have no npm lifecycle hooks. Adding one needs a separately
      // reviewed command/chain, not simply copying its text into the registry.
      if (entry.auditAllowed && actual !== null) errors.push(`Audit lane has an unapproved lifecycle hook: ${phase}${name}`)
    }
    if (entry.auditAllowed && Object.keys(entry.files).length === 0) errors.push(`Audit lane lacks reviewed runner files: ${name}`)
    for (const [file, fingerprint] of Object.entries(entry.files)) {
      try {
        const actual = hashText(fs.readFileSync(repositoryFile(root, file), "utf8"))
        if (!/^[a-f0-9]{64}$/.test(fingerprint) || fingerprint !== actual) errors.push(`Reviewed file drift: ${name} -> ${file}`)
      } catch (error) { errors.push(`Reviewed file ${name} -> ${file}: ${error.message}`) }
    }
    if (entry.auditAllowed) {
      for (const dependency of delegatedScripts(entry.script)) {
        if (!has(registry.commands, dependency) || registry.commands[dependency]?.auditAllowed !== true) {
          errors.push(`Unreviewed or prohibited npm dependency: ${name} -> ${dependency}`)
        }
      }
    }
  }

  let classification = null
  if (selectedCommand !== undefined) {
    if (!has(registry.commands, selectedCommand)) errors.push(`Unclassified command: ${selectedCommand}; review before use`)
    else {
      const entry = registry.commands[selectedCommand]
      classification = { command: selectedCommand, auditAllowed: entry?.auditAllowed === true, reason: entry?.reason }
      if (entry?.auditAllowed !== true) errors.push(`Prohibited in audit lane: ${selectedCommand}`)
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    classification,
    unclassifiedCount: Object.keys(scripts).filter(name => !has(registry.commands, name)).length,
  }
}

function main(argv = process.argv.slice(2)) {
  if (argv.length !== 0 && !(argv.length === 2 && argv[0] === "--command" && argv[1])) {
    console.error("Usage: node scripts/verify-agent-workflow-contract.js [--command <exact-package-script-name>]")
    return 1
  }
  const result = validate(path.resolve(__dirname, ".."), argv[1])
  for (const error of result.errors) console.error(error)
  if (result.classification) console.log(JSON.stringify(result.classification))
  console.log(`Workflow contract ${result.ok ? "passed" : "failed"}; ${result.unclassifiedCount} package scripts remain outside the reviewed manifest. No commands executed.`)
  return result.ok ? 0 : 1
}

if (require.main === module) process.exitCode = main()
module.exports = { validate, hashText, repositoryFile, delegatedScripts, main }
