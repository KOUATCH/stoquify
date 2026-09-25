const fs = require("fs")
const path = require("path")
const { signedFixture } = require("../pos-governance-test-fixture")
const { canonicalJson, evidenceContext, sha256, timestamp, verifyAttestation, verifyManifest } = require("../pos-governance-evidence")

describe("POS governance issuer evidence", () => {
  let fixture
  const binding = { kind: "UNIT_ONLY", gateId: "G3A", scope: { merchant: "synthetic" } }
  beforeEach(() => { fixture = signedFixture() })
  afterEach(() => fixture.dispose())
  const verify = (proof, expected = binding, classes = ["ARTIFACT_BOUND_APPROVAL"]) =>
    verifyAttestation(fixture.context, proof.reference, proof.sha256, expected, classes)

  it("accepts exact evidence bytes signed by the configured issuer", () => {
    expect(verify(fixture.sign(binding)).ready).toBe(true)
  })
  it("canonicalizes nested object keys while preserving array order", () => {
    expect(canonicalJson({ z: [2, 1], a: { b: true, a: "é" } })).toBe('{"a":{"a":"é","b":true},"z":[2,1]}')
  })
  it.each([
    ["future dated", { verifiedAt: "2026-09-25T11:00:00Z" }, {}, "EVIDENCE_EXPIRED_OR_FUTURE_DATED"],
    ["expired", { reviewOrExpiryAt: "2026-09-24T11:59:00Z" }, {}, "EVIDENCE_EXPIRED_OR_FUTURE_DATED"],
    ["impossible timestamp", { verifiedAt: "2026-02-30T11:00:00Z" }, {}, "EVIDENCE_EXPIRED_OR_FUTURE_DATED"],
    ["local test in place of external evidence", { evidenceClass: "LOCAL_UNIT" }, {}, "EVIDENCE_CLASS_NOT_AUTHORIZED"],
    ["unknown signer", {}, { keyId: "untrusted" }, "UNTRUSTED_OR_MALFORMED_SIGNATURE"],
    ["forged signature", {}, { signature: Buffer.alloc(64).toString("base64") }, "SIGNATURE_INVALID"],
    ["missing artifacts", { artifacts: [] }, {}, "SUPPORTING_ARTIFACT_MISSING_OR_CHANGED"],
  ])("rejects %s", (_label, payload, envelope, reason) => {
    expect(verify(fixture.sign(binding, payload, envelope))).toEqual({ ready: false, reason })
  })
  it("rejects mutation even when the replacement file hash is supplied", () => {
    const proof = fixture.sign(binding)
    proof.envelope.payload.binding.scope.merchant = "another"
    const bytes = JSON.stringify(proof.envelope)
    fs.writeFileSync(path.join(fixture.root, proof.reference), bytes)
    proof.sha256 = sha256(bytes)
    expect(verify(proof, proof.envelope.payload.binding).reason).toBe("SIGNATURE_INVALID")
  })
  it("rejects a changed file whose register digest was not updated", () => {
    const proof = fixture.sign(binding)
    fs.appendFileSync(path.join(fixture.root, proof.reference), " ")
    expect(verify(proof).reason).toBe("EVIDENCE_HASH_MISMATCH")
  })
  it("rejects changed source/evidence artifacts", () => {
    const proof = fixture.sign(binding)
    fs.writeFileSync(path.join(fixture.root, "source.txt"), "changed")
    expect(verify(proof).reason).toBe("SUPPORTING_ARTIFACT_MISSING_OR_CHANGED")
    expect(verifyManifest(fixture.root, proof.envelope.payload.artifacts)).toBe(false)
  })
  it("rejects another scope and a signer without provider authority", () => {
    const proof = fixture.sign(binding)
    expect(verify(proof, { ...binding, gateId: "G3B" }).reason).toBe("EVIDENCE_SCOPE_MISMATCH")
    fixture.trustedKeys["unit-only"].evidenceClasses = ["ARTIFACT_BOUND_APPROVAL"]
    const provider = fixture.sign(binding, { evidenceClass: "PROVIDER_SANDBOX" })
    expect(verify(provider, binding, ["PROVIDER_SANDBOX"]).reason).toBe("EVIDENCE_CLASS_NOT_AUTHORIZED")
  })
  it("rejects path escapes and does not fetch remote references", () => {
    for (const reference of ["../outside.json", "https://example.invalid/evidence", path.join(fixture.root, "source.txt")]) {
      expect(verify({ reference, sha256: "a".repeat(64) }).reason).toBe("EVIDENCE_FILE_MISSING_OR_OUTSIDE_WORKSPACE")
    }
  })
  it("rejects malformed JSON and removed/revoked trust anchors", () => {
    const proof = fixture.sign(binding)
    delete fixture.trustedKeys["unit-only"]
    expect(verify(proof).ready).toBe(false)
    fs.writeFileSync(path.join(fixture.root, proof.reference), "{invalid")
    proof.sha256 = sha256("{invalid")
    expect(verify(proof).reason).toBe("EVIDENCE_MALFORMED_OR_UNREADABLE")
  })
  it("does not accept a candidate-provided trust store", () => {
    const prior = process.env.POS_GATE_TRUSTED_PUBLIC_KEYS_PATH
    try {
      delete process.env.POS_GATE_TRUSTED_PUBLIC_KEYS_PATH
      expect(evidenceContext(fixture.root).trustError).toBe("TRUST_ANCHORS_NOT_CONFIGURED")
      process.env.POS_GATE_TRUSTED_PUBLIC_KEYS_PATH = path.join(fixture.root, "keys.json")
      fs.writeFileSync(process.env.POS_GATE_TRUSTED_PUBLIC_KEYS_PATH, JSON.stringify(fixture.trustedKeys))
      expect(evidenceContext(fixture.root).trustError).toBe("TRUST_ANCHORS_INVALID")
    } finally {
      if (prior === undefined) delete process.env.POS_GATE_TRUSTED_PUBLIC_KEYS_PATH
      else process.env.POS_GATE_TRUSTED_PUBLIC_KEYS_PATH = prior
    }
  })
  it("rejects non-UTC and normalized invalid date values", () => {
    expect(Number.isNaN(timestamp("2026-02-30T10:00:00Z"))).toBe(true)
    expect(Number.isNaN(timestamp("2026-09-24"))).toBe(true)
  })
})
