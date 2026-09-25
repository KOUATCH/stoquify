const fs = require("fs")
const os = require("os")
const path = require("path")
const crypto = require("crypto")
const { canonicalJson, sha256 } = require("./pos-governance-evidence")

const NOW = Date.parse("2026-09-24T12:00:00Z")

// Keys are generated only for isolated temporary test fixtures; never configured for the CLI.
function signedFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stoquify-governance-unit-"))
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519")
  const trustedKeys = { "unit-only": {
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }),
    evidenceClasses: ["ARTIFACT_BOUND_APPROVAL", "PROVIDER_SANDBOX"],
    validFrom: "2026-01-01T00:00:00Z", validUntil: "2028-01-01T00:00:00Z",
  } }
  fs.writeFileSync(path.join(root, "source.txt"), "Synthetic unit evidence only")
  const artifacts = [{ path: "source.txt", sha256: sha256(fs.readFileSync(path.join(root, "source.txt"))) }]
  let sequence = 0
  return {
    root, trustedKeys,
    context: { root, now: NOW, trustedKeys },
    sign(binding, overrides = {}, envelopeOverrides = {}) {
      const payload = { binding, result: "VERIFIED", evidenceClass: "ARTIFACT_BOUND_APPROVAL",
        verifiedAt: "2026-09-24T11:02:00Z", reviewOrExpiryAt: "2027-01-01T00:00:00Z", artifacts, ...overrides }
      const envelope = { schemaVersion: "1.0.0", keyId: "unit-only", payload,
        signature: crypto.sign(null, Buffer.from(canonicalJson(payload)), privateKey).toString("base64"), ...envelopeOverrides }
      const reference = `proof-${sequence++}.json`
      const bytes = JSON.stringify(envelope)
      fs.writeFileSync(path.join(root, reference), bytes)
      return { reference, sha256: sha256(bytes), envelope }
    },
    dispose() {
      const resolved = fs.realpathSync(root)
      if (path.dirname(resolved) !== fs.realpathSync(os.tmpdir()) || !path.basename(resolved).startsWith("stoquify-governance-unit-")) throw new Error("Unexpected test cleanup target")
      fs.rmSync(resolved, { recursive: true, force: true })
    },
  }
}

module.exports = { NOW, signedFixture }
