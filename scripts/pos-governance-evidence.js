const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

const SHA256 = /^[a-f0-9]{64}$/
const isText = (value) => typeof value === "string" && value.trim().length > 0
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex")

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

function timestamp(value) {
  if (!isText(value) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return NaN
  const result = Date.parse(value)
  // Date.parse normalizes some impossible dates (e.g. February 30).
  return Number.isFinite(result) && new Date(result).toISOString().slice(0, 19) === value.slice(0, 19)
    ? result : NaN
}

function containedFile(root, relativePath) {
  if (!isText(relativePath) || path.isAbsolute(relativePath) || relativePath.includes(":")) return null
  try {
    const realRoot = fs.realpathSync(root)
    const file = fs.realpathSync(path.resolve(root, relativePath))
    const relative = path.relative(realRoot, file)
    if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) return null
    return fs.statSync(file).isFile() ? file : null
  } catch { return null }
}

function evidenceContext(root, options = {}) {
  if (options.trustedKeys) return { root, now: options.now ?? Date.now(), trustedKeys: options.trustedKeys, trustError: null }
  const configured = process.env.POS_GATE_TRUSTED_PUBLIC_KEYS_PATH
  if (!configured) return { root, now: options.now ?? Date.now(), trustedKeys: {}, trustError: "TRUST_ANCHORS_NOT_CONFIGURED" }
  try {
    const trustFile = fs.realpathSync(configured)
    const relative = path.relative(fs.realpathSync(root), trustFile)
    if (!path.isAbsolute(configured) || (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))) {
      throw new Error("Trust anchors must be managed outside the candidate workspace")
    }
    const trustedKeys = JSON.parse(fs.readFileSync(trustFile, "utf8"))
    if (!trustedKeys || typeof trustedKeys !== "object" || Array.isArray(trustedKeys)) throw new Error("Invalid trust anchors")
    return { root, now: options.now ?? Date.now(), trustedKeys, trustError: null }
  } catch { return { root, now: options.now ?? Date.now(), trustedKeys: {}, trustError: "TRUST_ANCHORS_INVALID" } }
}

function verifyManifest(root, manifest) {
  if (!Array.isArray(manifest) || manifest.length === 0) return false
  const seen = new Set()
  return manifest.every((item) => {
    const file = item && containedFile(root, item.path)
    if (!file || seen.has(file) || !SHA256.test(item.sha256 || "")) return false
    seen.add(file)
    return sha256(fs.readFileSync(file)) === item.sha256
  })
}

// Verifies a trusted issuer's attestation, not real-world identity or hardware itself.
// Issuer keys and permitted evidence classes must be provisioned independently by CI/operators.
function verifyAttestation(context, reference, digest, expectedBinding, evidenceClasses) {
  const blocked = (reason) => ({ ready: false, reason })
  if (context.trustError) return blocked(context.trustError)
  if (!SHA256.test(digest || "")) return blocked("EVIDENCE_HASH_MISSING_OR_INVALID")
  const file = containedFile(context.root, reference)
  if (!file) return blocked("EVIDENCE_FILE_MISSING_OR_OUTSIDE_WORKSPACE")
  try {
    const bytes = fs.readFileSync(file)
    if (sha256(bytes) !== digest) return blocked("EVIDENCE_HASH_MISMATCH")
    const envelope = JSON.parse(bytes)
    const payload = envelope.payload
    const key = Object.prototype.hasOwnProperty.call(context.trustedKeys, envelope.keyId)
      ? context.trustedKeys[envelope.keyId] : null
    if (!key || envelope.schemaVersion !== "1.0.0" || !isText(envelope.signature)) return blocked("UNTRUSTED_OR_MALFORMED_SIGNATURE")
    if (!payload || payload.result !== "VERIFIED" || canonicalJson(payload.binding) !== canonicalJson(expectedBinding)) return blocked("EVIDENCE_SCOPE_MISMATCH")
    if (!evidenceClasses.includes(payload.evidenceClass) || !Array.isArray(key.evidenceClasses) || !key.evidenceClasses.includes(payload.evidenceClass)) return blocked("EVIDENCE_CLASS_NOT_AUTHORIZED")
    const verifiedAt = timestamp(payload.verifiedAt)
    const expiresAt = timestamp(payload.reviewOrExpiryAt)
    const validFrom = timestamp(key.validFrom)
    const validUntil = timestamp(key.validUntil)
    if (![verifiedAt, expiresAt, validFrom, validUntil].every(Number.isFinite) ||
      verifiedAt > context.now || expiresAt <= context.now || expiresAt <= verifiedAt ||
      verifiedAt < validFrom || expiresAt > validUntil || context.now >= validUntil) return blocked("EVIDENCE_EXPIRED_OR_FUTURE_DATED")
    if (!verifyManifest(context.root, payload.artifacts)) return blocked("SUPPORTING_ARTIFACT_MISSING_OR_CHANGED")
    const publicKey = crypto.createPublicKey(key.publicKeyPem)
    if (publicKey.asymmetricKeyType !== "ed25519" || !/^[A-Za-z0-9+/]{86}==$/.test(envelope.signature) ||
      !crypto.verify(null, Buffer.from(canonicalJson(payload)), publicKey, Buffer.from(envelope.signature, "base64"))) return blocked("SIGNATURE_INVALID")
    return { ready: true, reason: null, payload }
  } catch { return blocked("EVIDENCE_MALFORMED_OR_UNREADABLE") }
}

module.exports = { canonicalJson, containedFile, evidenceContext, isText, sha256, timestamp, verifyAttestation, verifyManifest }
