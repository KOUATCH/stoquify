const path = require("node:path")

const {
  createUploadThingCanaryProvider,
  defaultProviderFactory,
  inspectToken,
  parseArgs,
  resolveOutput,
  runProviderPreflight,
} = require("../inventory-history-export-provider-preflight")

function validToken() {
  return Buffer.from(JSON.stringify({
    apiKey: "sk_provider-preflight-fixture",
    appId: "app-fixture",
    regions: ["fixture-region"],
    ingestHost: "ingest.example.test",
  })).toString("base64")
}

const NOW = new Date("2026-07-15T15:00:00.000Z")
const CANARY = Buffer.alloc(4096, 7)

function successfulProvider() {
  return {
    uploadPrivateCanary: jest.fn(async ({ bytes }) => ({ byteLength: bytes.length })),
    readSignedCanary: jest.fn(async () => Buffer.from(CANARY)),
    deleteCanary: jest.fn(async () => ({ deletedCount: 1 })),
  }
}

describe("inventory history export provider preflight", () => {
  it("parses only bounded static and live modes", () => {
    expect(parseArgs(["--mode", "live", "--json-out", "what-next/preflight.json"])).toEqual({
      mode: "live",
      jsonOut: "what-next/preflight.json",
      help: false,
    })
    expect(parseArgs(["--mode", "public-pilot"])).toMatchObject({ mode: "public-pilot" })
    expect(() => parseArgs(["--mode", "unsafe"])).toThrow("Unsupported mode")
    expect(() => parseArgs(["--json-out"])).toThrow("--json-out requires a path")
    expect(() => parseArgs(["--unknown"])).toThrow("Unknown argument")
  })

  it("fails closed on a missing or malformed runtime token", async () => {
    const missing = await runProviderPreflight({ mode: "static", environment: {}, now: () => NOW })
    const malformed = await runProviderPreflight({
      mode: "static",
      environment: { UPLOADTHING_TOKEN: "not-a-token" },
      now: () => NOW,
    })

    expect(missing.blockers).toEqual(["UPLOADTHING_TOKEN_MISSING"])
    expect(malformed.blockers).toEqual(["UPLOADTHING_TOKEN_INVALID"])
    expect(missing.summary.secretValuePrinted).toBe(false)
  })

  it("accepts the installed token shape without serializing credential fields", async () => {
    const token = validToken()
    const environment = {
      UPLOADTHING_TOKEN: token,
      UPLOADTHING_SECRET: "legacy-secret",
      UPLOADTHING_APP_ID: "legacy-app",
    }

    expect(inspectToken(environment)).toMatchObject({
      present: true,
      structurallyValid: true,
      regionCount: 1,
      ingestHostConfigured: true,
      legacyVariables: ["UPLOADTHING_SECRET", "UPLOADTHING_APP_ID"],
    })
    const report = await runProviderPreflight({ mode: "static", environment, now: () => NOW })
    const serialized = JSON.stringify(report)

    expect(report.summary).toMatchObject({ status: "ready", warningCount: 1 })
    expect(report.warnings).toEqual(["LEGACY_UPLOADTHING_VARIABLES_PRESENT"])
    expect(serialized).not.toContain(token)
    expect(serialized).not.toContain("sk_provider-preflight-fixture")
    expect(serialized).not.toContain("app-fixture")
  })

  it("requests private storage, signed reads, and custom-id cleanup", async () => {
    class FileFixture {
      constructor(parts, name, options) {
        this.parts = parts
        this.name = name
        this.customId = options.customId
      }
    }
    const client = {
      uploadFiles: jest.fn(async (file) => ({
        data: { size: CANARY.length, customId: file.customId, ufsUrl: "https://public.example.test" },
        error: null,
      })),
      generateSignedURL: jest.fn(async () => ({ ufsUrl: "https://signed.example.test" })),
      deleteFiles: jest.fn(async () => ({ success: true, deletedCount: 1 })),
    }
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      arrayBuffer: async () => CANARY.buffer.slice(CANARY.byteOffset, CANARY.byteOffset + CANARY.length),
    }))
    const provider = createUploadThingCanaryProvider({
      token: validToken(),
      client,
      FileCtor: FileFixture,
      fetchImpl,
    })

    const customId = "stoquify-history-preflight-opaque"
    await provider.uploadPrivateCanary({ bytes: CANARY, customId })
    await expect(provider.readSignedCanary({ customId })).resolves.toEqual(CANARY)
    await expect(provider.deleteCanary({ customId })).resolves.toEqual({ deletedCount: 1 })

    expect(client.uploadFiles.mock.calls[0][1]).toEqual({
      acl: "private",
      contentDisposition: "attachment",
    })
    expect(client.generateSignedURL).toHaveBeenCalledWith(customId, {
      expiresIn: "1 minute",
      keyType: "customId",
    })
    expect(client.deleteFiles).toHaveBeenCalledWith(customId, { keyType: "customId" })
  })

  it("can explicitly run a temporary public encrypted-artifact pilot canary", async () => {
    class FileFixture {
      constructor(parts, name, options) {
        this.parts = parts
        this.name = name
        this.customId = options.customId
      }
    }
    const client = {
      uploadFiles: jest.fn(async (file) => ({
        data: { size: CANARY.length, customId: file.customId, ufsUrl: "https://public.example.test/canary" },
        error: null,
      })),
      deleteFiles: jest.fn(async () => ({ success: true, deletedCount: 1 })),
    }
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      arrayBuffer: async () => CANARY.buffer.slice(CANARY.byteOffset, CANARY.byteOffset + CANARY.length),
    }))
    const provider = createUploadThingCanaryProvider({
      token: validToken(),
      client,
      FileCtor: FileFixture,
      fetchImpl,
    })

    const uploaded = await provider.uploadPublicPilotCanary({
      bytes: CANARY,
      customId: "stoquify-history-preflight-opaque",
    })
    await expect(provider.readPublicCanary({ publicUrl: uploaded.publicUrl })).resolves.toEqual(CANARY)

    expect(client.uploadFiles.mock.calls[0][1]).toEqual({
      acl: "public-read",
      contentDisposition: "attachment",
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://public.example.test/canary",
      expect.objectContaining({ cache: "no-store", redirect: "error" }),
    )
  })

  it("disables provider SDK logging for live probes", async () => {
    const constructor = jest.fn()
    class ApiFixture {
      constructor(options) {
        constructor(options)
      }
    }
    class FileFixture {}

    await defaultProviderFactory(validToken(), { UTApi: ApiFixture, UTFile: FileFixture })

    expect(constructor).toHaveBeenCalledWith({ token: validToken(), logLevel: "None" })
  })

  it("classifies an unsupported private ACL without retaining provider detail", async () => {
    class FileFixture {
      constructor(parts, name, options) {
        this.customId = options.customId
      }
    }
    const client = {
      uploadFiles: jest.fn(async () => ({
        data: null,
        error: { cause: { response: { body: { error: "Private files are not allowed for free apps." } } } },
      })),
    }
    const provider = createUploadThingCanaryProvider({
      token: validToken(),
      client,
      FileCtor: FileFixture,
      fetchImpl: jest.fn(),
    })

    await expect(provider.uploadPrivateCanary({
      bytes: CANARY,
      customId: "stoquify-history-preflight-opaque",
    })).rejects.toThrow("PROVIDER_PRIVATE_ACL_UNAVAILABLE")
  })

  it("executes a redacted live canary and verifies cleanup", async () => {
    const provider = successfulProvider()
    const token = validToken()
    const report = await runProviderPreflight({
      mode: "live",
      environment: { UPLOADTHING_TOKEN: token },
      now: () => NOW,
      randomBytes: () => Buffer.from(CANARY),
      providerFactory: async () => provider,
    })

    expect(report.summary.status).toBe("ready")
    expect(report.canary).toMatchObject({
      attempted: true,
      privateUploadRequested: true,
      signedReadVerified: true,
      integrityVerified: true,
      deleted: true,
      cleanupVerified: true,
      cleanupRequired: false,
      byteLength: 4096,
    })
    expect(provider.deleteCanary).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(report)).not.toContain(token)
  })

  it("executes a redacted public-pilot canary with an explicit warning", async () => {
    const token = validToken()
    const provider = {
      uploadPublicPilotCanary: jest.fn(async ({ bytes }) => ({
        byteLength: bytes.length,
        publicUrl: "https://public.example.test/canary",
      })),
      readPublicCanary: jest.fn(async () => Buffer.from(CANARY)),
      deleteCanary: jest.fn(async () => ({ deletedCount: 1 })),
    }

    const report = await runProviderPreflight({
      mode: "public-pilot",
      environment: { UPLOADTHING_TOKEN: token },
      now: () => NOW,
      randomBytes: () => Buffer.from(CANARY),
      providerFactory: async () => provider,
    })

    expect(report.summary.status).toBe("ready")
    expect(report.warnings).toContain("PUBLIC_UPLOADTHING_STORAGE_PILOT")
    expect(report.canary).toMatchObject({
      storageAcl: "public-read",
      privateUploadRequested: false,
      publicUploadRequested: true,
      signedReadVerified: false,
      publicReadVerified: true,
      integrityVerified: true,
      deleted: true,
      cleanupVerified: true,
    })
    expect(JSON.stringify(report)).not.toContain(token)
  })

  it("attempts idempotent cleanup after upload or read failures", async () => {
    const uploadFailure = successfulProvider()
    uploadFailure.uploadPrivateCanary.mockRejectedValue(new Error("provider detail must stay private"))
    uploadFailure.deleteCanary.mockResolvedValue({ deletedCount: 0 })
    const readFailure = successfulProvider()
    readFailure.readSignedCanary.mockRejectedValue(new Error("signed URL detail must stay private"))

    const first = await runProviderPreflight({
      mode: "live",
      environment: { UPLOADTHING_TOKEN: validToken() },
      randomBytes: () => Buffer.from(CANARY),
      providerFactory: async () => uploadFailure,
    })
    const second = await runProviderPreflight({
      mode: "live",
      environment: { UPLOADTHING_TOKEN: validToken() },
      randomBytes: () => Buffer.from(CANARY),
      providerFactory: async () => readFailure,
    })

    expect(first.blockers).toContain("PROVIDER_CANARY_UPLOAD_FAILED")
    expect(first.canary).toMatchObject({ cleanupVerified: true, cleanupRequired: false })
    expect(second.blockers).toContain("PROVIDER_CANARY_READ_FAILED")
    expect(second.canary).toMatchObject({ deleted: true, cleanupVerified: true })
    expect(JSON.stringify({ first, second })).not.toContain("provider detail")
    expect(uploadFailure.deleteCanary).toHaveBeenCalledTimes(1)
    expect(readFailure.deleteCanary).toHaveBeenCalledTimes(1)
  })

  it("blocks when provider deletion cannot be verified", async () => {
    const provider = successfulProvider()
    provider.deleteCanary.mockRejectedValue(new Error("provider deletion detail"))

    const report = await runProviderPreflight({
      mode: "live",
      environment: { UPLOADTHING_TOKEN: validToken() },
      randomBytes: () => Buffer.from(CANARY),
      providerFactory: async () => provider,
    })

    expect(report.blockers).toContain("PROVIDER_CANARY_DELETE_FAILED")
    expect(report.canary).toMatchObject({ deleted: false, cleanupVerified: false, cleanupRequired: true })
    expect(JSON.stringify(report)).not.toContain("provider deletion detail")
  })

  it("confines evidence output to the current workspace", () => {
    const root = path.resolve("workspace")
    expect(resolveOutput(root, "what-next/preflight.json")).toBe(
      path.join(root, "what-next", "preflight.json"),
    )
    expect(() => resolveOutput(root, "../outside.json")).toThrow("inside the current workspace")
    expect(() => resolveOutput(root, ".")).toThrow("inside the current workspace")
  })
})
