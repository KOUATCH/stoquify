#!/usr/bin/env node

const { createHash, randomBytes } = require("node:crypto")
const fs = require("node:fs")
const path = require("node:path")
const { inspect } = require("node:util")

const CANARY_BYTES = 4096
const PROVIDER = "uploadthing"

function parseArgs(argv = process.argv.slice(2)) {
  const options = { mode: "static", jsonOut: null, help: false }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--help") options.help = true
    else if (value === "--mode") options.mode = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else throw new Error(`Unknown argument: ${value}`)
  }

  if (!options.help && !["static", "live", "public-pilot"].includes(options.mode)) {
    throw new Error(`Unsupported mode: ${options.mode}`)
  }
  if (options.jsonOut !== null && (typeof options.jsonOut !== "string" || !options.jsonOut.trim())) {
    throw new Error("--json-out requires a path.")
  }
  return options
}

function inspectToken(environment = process.env) {
  const token = typeof environment.UPLOADTHING_TOKEN === "string"
    ? environment.UPLOADTHING_TOKEN.trim()
    : ""
  const legacyVariables = ["UPLOADTHING_SECRET", "UPLOADTHING_APP_ID"]
    .filter((name) => typeof environment[name] === "string" && environment[name].trim())

  if (!token) {
    return {
      token: null,
      present: false,
      structurallyValid: false,
      regionCount: 0,
      ingestHostConfigured: false,
      legacyVariables,
    }
  }

  try {
    const parsed = JSON.parse(Buffer.from(token, "base64").toString("utf8"))
    const structurallyValid = Boolean(
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.apiKey === "string" &&
      parsed.apiKey.startsWith("sk_") &&
      typeof parsed.appId === "string" &&
      parsed.appId.trim() &&
      Array.isArray(parsed.regions) &&
      parsed.regions.length > 0 &&
      parsed.regions.every((region) => typeof region === "string" && region.trim()),
    )
    return {
      token,
      present: true,
      structurallyValid,
      regionCount: structurallyValid ? parsed.regions.length : 0,
      ingestHostConfigured: structurallyValid && typeof parsed.ingestHost === "string" && Boolean(parsed.ingestHost.trim()),
      legacyVariables,
    }
  } catch {
    return {
      token,
      present: true,
      structurallyValid: false,
      regionCount: 0,
      ingestHostConfigured: false,
      legacyVariables,
    }
  }
}

function privateAclUnavailable(error, depth = 0, seen = new Set()) {
  if (depth > 5 || error === null || error === undefined) return false
  if (typeof error === "string") {
    return /private files are not allowed|paid tier[^.]*private files/i.test(error)
  }
  if (typeof error !== "object" || seen.has(error)) return false
  seen.add(error)
  const nested = ["message", "error", "cause", "response", "body", "data"]
    .some((key) => privateAclUnavailable(error[key], depth + 1, seen))
  if (nested || depth > 0) return nested
  return /private files are not allowed|paid tier[^.]*private files/i.test(
    inspect(error, { depth: 8, customInspect: false }),
  )
}

function createUploadThingCanaryProvider({ token, client, FileCtor, fetchImpl }) {
  async function uploadCanary({ bytes, customId, acl }) {
    const file = new FileCtor([bytes], "inventory-history-provider-preflight.bin", {
      customId,
      type: "application/octet-stream",
    })
    const result = await client.uploadFiles(file, {
      acl,
      contentDisposition: "attachment",
    })
    if (acl === "private" && privateAclUnavailable(result.error)) {
      throw new Error("PROVIDER_PRIVATE_ACL_UNAVAILABLE")
    }
    if (result.error || !result.data) throw new Error("PROVIDER_CANARY_UPLOAD_FAILED")
    if (result.data.size !== bytes.length || result.data.customId !== customId) {
      throw new Error("PROVIDER_CANARY_UPLOAD_MISMATCH")
    }
    const publicUrl = result.data.ufsUrl || result.data.url || result.data.fileUrl || null
    return { byteLength: result.data.size, publicUrl }
  }

  return {
    async uploadPrivateCanary({ bytes, customId }) {
      return uploadCanary({ bytes, customId, acl: "private" })
    },

    async uploadPublicPilotCanary({ bytes, customId }) {
      const uploaded = await uploadCanary({ bytes, customId, acl: "public-read" })
      if (!uploaded.publicUrl) throw new Error("PROVIDER_PUBLIC_CANARY_URL_MISSING")
      return uploaded
    },

    async readSignedCanary({ customId }) {
      const { ufsUrl } = await client.generateSignedURL(customId, {
        expiresIn: "1 minute",
        keyType: "customId",
      })
      const response = await fetchImpl(ufsUrl, {
        method: "GET",
        redirect: "error",
        cache: "no-store",
      })
      if (!response.ok) throw new Error("PROVIDER_CANARY_READ_FAILED")
      return Buffer.from(await response.arrayBuffer())
    },

    async readPublicCanary({ publicUrl }) {
      const response = await fetchImpl(publicUrl, {
        method: "GET",
        redirect: "error",
        cache: "no-store",
      })
      if (!response.ok) throw new Error("PROVIDER_PUBLIC_CANARY_READ_FAILED")
      return Buffer.from(await response.arrayBuffer())
    },

    async deleteCanary({ customId }) {
      const result = await client.deleteFiles(customId, { keyType: "customId" })
      if (!result.success || ![0, 1].includes(result.deletedCount)) {
        throw new Error("PROVIDER_CANARY_DELETE_FAILED")
      }
      return { deletedCount: result.deletedCount }
    },

    provider: PROVIDER,
    tokenBound: Boolean(token),
  }
}

async function defaultProviderFactory(token, runtime) {
  const { UTApi, UTFile } = runtime || await import("uploadthing/server")
  return createUploadThingCanaryProvider({
    token,
    client: new UTApi({ token, logLevel: "None" }),
    FileCtor: UTFile,
    fetchImpl: globalThis.fetch,
  })
}

function baseReport(mode, assessment, now) {
  const blockers = []
  const warnings = []
  if (!assessment.present) blockers.push("UPLOADTHING_TOKEN_MISSING")
  else if (!assessment.structurallyValid) blockers.push("UPLOADTHING_TOKEN_INVALID")
  if (assessment.legacyVariables.length) warnings.push("LEGACY_UPLOADTHING_VARIABLES_PRESENT")
  if (mode === "public-pilot") warnings.push("PUBLIC_UPLOADTHING_STORAGE_PILOT")

  return {
    schemaVersion: "1.0",
    summary: {
      generatedAt: now.toISOString(),
      mode,
      provider: PROVIDER,
      status: blockers.length ? "blocked" : "ready",
      blockerCount: blockers.length,
      warningCount: warnings.length,
      secretValuePrinted: false,
      providerIdentifierPrinted: false,
    },
    token: {
      present: assessment.present,
      structurallyValid: assessment.structurallyValid,
      regionCount: assessment.regionCount,
      ingestHostConfigured: assessment.ingestHostConfigured,
      legacyVariablesPresent: assessment.legacyVariables,
    },
    checks: [
      { id: "uploadthing_token_present", ready: assessment.present },
      { id: "uploadthing_token_runtime_shape", ready: assessment.structurallyValid },
    ],
    canary: {
      attempted: false,
      storageAcl: mode === "public-pilot" ? "public-read" : "private",
      privateUploadRequested: false,
      publicUploadRequested: false,
      signedReadVerified: false,
      publicReadVerified: false,
      integrityVerified: false,
      deleted: false,
      cleanupVerified: false,
      cleanupRequired: false,
      byteLength: 0,
      durationMs: 0,
    },
    blockers,
    warnings,
  }
}

function addBlocker(report, code) {
  if (!report.blockers.includes(code)) report.blockers.push(code)
  report.summary.blockerCount = report.blockers.length
  report.summary.status = "blocked"
}

async function runProviderPreflight(options = {}) {
  const mode = options.mode || "static"
  const assessment = inspectToken(options.environment || process.env)
  const now = options.now ? options.now() : new Date()
  const report = baseReport(mode, assessment, now)
  if (mode === "static" || report.blockers.length) return report

  report.canary.attempted = true
  const startedAt = Date.now()
  const bytes = options.randomBytes ? options.randomBytes(CANARY_BYTES) : randomBytes(CANARY_BYTES)
  const customId = `stoquify-history-preflight-${createHash("sha256").update(bytes).digest("hex")}`
  let provider
  let uploadAttempted = false

  try {
    provider = await (options.providerFactory || defaultProviderFactory)(assessment.token)
    uploadAttempted = true
    const publicPilot = mode === "public-pilot"
    report.canary.privateUploadRequested = !publicPilot
    report.canary.publicUploadRequested = publicPilot
    const uploadedArtifact = publicPilot
      ? await provider.uploadPublicPilotCanary({ bytes, customId })
      : await provider.uploadPrivateCanary({ bytes, customId })
    report.canary.byteLength = uploadedArtifact.byteLength
    report.checks.push({
      id: publicPilot ? "public_pilot_canary_upload" : "private_canary_upload",
      ready: uploadedArtifact.byteLength === bytes.length,
    })

    const downloaded = publicPilot
      ? await provider.readPublicCanary({ publicUrl: uploadedArtifact.publicUrl })
      : await provider.readSignedCanary({ customId })
    if (publicPilot) report.canary.publicReadVerified = true
    else report.canary.signedReadVerified = true
    report.canary.integrityVerified = downloaded.length === bytes.length && downloaded.equals(bytes)
    report.checks.push({ id: publicPilot ? "public_pilot_canary_read" : "signed_canary_read", ready: true })
    report.checks.push({ id: "canary_content_integrity", ready: report.canary.integrityVerified })
    if (!report.canary.integrityVerified) addBlocker(report, "PROVIDER_CANARY_INTEGRITY_FAILED")
  } catch (error) {
    addBlocker(
      report,
      error instanceof Error && error.message === "PROVIDER_PRIVATE_ACL_UNAVAILABLE"
        ? "PROVIDER_PRIVATE_ACL_UNAVAILABLE"
        : report.canary.byteLength > 0
        ? "PROVIDER_CANARY_READ_FAILED"
        : "PROVIDER_CANARY_UPLOAD_FAILED",
    )
  } finally {
    if (uploadAttempted && provider) {
      try {
        const cleanup = await provider.deleteCanary({ customId })
        report.canary.deleted = cleanup.deletedCount === 1
        report.canary.cleanupVerified = true
        report.checks.push({ id: "canary_cleanup", ready: true })
      } catch {
        report.canary.cleanupRequired = true
        report.checks.push({ id: "canary_cleanup", ready: false })
        addBlocker(report, "PROVIDER_CANARY_DELETE_FAILED")
      }
    }
    report.canary.durationMs = Date.now() - startedAt
  }

  return report
}

function resolveOutput(root, target) {
  const resolvedRoot = path.resolve(root)
  const resolvedTarget = path.resolve(resolvedRoot, target)
  const relative = path.relative(resolvedRoot, resolvedTarget)
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("--json-out must resolve to a file inside the current workspace.")
  }
  return resolvedTarget
}

function writeJsonReport(root, target, report) {
  const output = resolveOutput(root, target)
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8")
}

const HELP = `Usage: inventory-history-export-provider-preflight [options]

Options:
  --mode <static|live|public-pilot>
                       Validate token shape, private canary, or temporary public encrypted-artifact canary
  --json-out <path>     Write the redacted JSON report inside the current workspace
  --help                Show this help
`

async function main() {
  const options = parseArgs()
  if (options.help) {
    process.stdout.write(HELP)
    return
  }
  const report = await runProviderPreflight({ mode: options.mode })
  if (options.jsonOut) writeJsonReport(process.cwd(), options.jsonOut, report)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  process.exitCode = report.summary.status === "ready" ? 0 : 1
}

if (require.main === module) {
  void main().catch(() => {
    process.stderr.write("Inventory history export provider preflight failed.\n")
    process.exitCode = 1
  })
}

module.exports = {
  createUploadThingCanaryProvider,
  defaultProviderFactory,
  inspectToken,
  parseArgs,
  privateAclUnavailable,
  resolveOutput,
  runProviderPreflight,
  writeJsonReport,
}
