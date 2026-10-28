import { createHash } from "node:crypto"

import {
  createUploadThingInventoryHistoryExportArtifactStore,
  type InventoryHistoryExportArtifactReference,
} from "../inventory-history-export-artifact-store"

function hash(value: Buffer) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`
}

function reference(overrides: Partial<InventoryHistoryExportArtifactReference> = {}) {
  const content = Buffer.from("encrypted-content")
  return {
    provider: "uploadthing" as const,
    key: "artifact-key",
    customId: "stoquify-history-hashed",
    byteLength: content.length,
    ciphertextHash: hash(content),
    ...overrides,
  }
}

function client() {
  return {
    uploadFiles: jest.fn(),
    generateSignedURL: jest.fn(),
    deleteFiles: jest.fn(),
  }
}

function artifactResponse(content: Buffer) {
  return {
    ok: true,
    headers: { get: (name: string) => name === "content-length" ? String(content.length) : null },
    arrayBuffer: async () => content.buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength,
    ),
  }
}

describe("inventory history export artifact store", () => {
  it("uploads bounded ciphertext privately without exposing tenant identifiers", async () => {
    const api = client()
    const ciphertext = Buffer.from("encrypted-content")
    api.uploadFiles.mockImplementation(async (file) => ({
      data: {
        key: "artifact-key",
        customId: file.customId,
        size: file.size,
      },
      error: null,
    }))
    const store = createUploadThingInventoryHistoryExportArtifactStore({ client: api as never })

    const stored = await store.putEncryptedChunk({
      organizationId: "org-sensitive",
      exportId: "export-sensitive",
      sequence: 7,
      ciphertext,
    })

    expect(api.uploadFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "inventory-history-00000007.bin",
        size: ciphertext.length,
      }),
      { acl: "private", contentDisposition: "attachment" },
    )
    const uploadedFile = api.uploadFiles.mock.calls[0][0]
    expect(uploadedFile.customId).not.toContain("org-sensitive")
    expect(uploadedFile.customId).not.toContain("export-sensitive")
    expect(stored).toEqual({
      provider: "uploadthing",
      key: uploadedFile.customId,
      customId: uploadedFile.customId,
      byteLength: ciphertext.length,
      ciphertextHash: hash(ciphertext),
      storageAcl: "private",
    })
  })

  it("uploads encrypted chunks with an explicit public-pilot ACL when approved", async () => {
    const api = client()
    const ciphertext = Buffer.from("encrypted-content")
    api.uploadFiles.mockImplementation(async (file) => ({
      data: {
        key: "artifact-key",
        customId: file.customId,
        size: file.size,
        ufsUrl: "https://public.example.test/artifact",
      },
      error: null,
    }))
    const store = createUploadThingInventoryHistoryExportArtifactStore({
      client: api as never,
      storageAcl: "public-pilot",
    })

    const stored = await store.putEncryptedChunk({
      organizationId: "org-sensitive",
      exportId: "export-sensitive",
      sequence: 8,
      ciphertext,
    })

    expect(api.uploadFiles).toHaveBeenCalledWith(
      expect.objectContaining({ name: "inventory-history-00000008.bin" }),
      { acl: "public-read", contentDisposition: "attachment" },
    )
    expect(stored).toMatchObject({
      storageAcl: "public-pilot",
      publicReadUrl: "https://public.example.test/artifact",
      ciphertextHash: hash(ciphertext),
    })
  })

  it("reuses an identical deterministic object after an upload retry conflict", async () => {
    const api = client()
    const ciphertext = Buffer.from("encrypted-content")
    api.uploadFiles.mockResolvedValue({ data: null, error: { code: "UPLOAD_FAILED" } })
    api.generateSignedURL.mockResolvedValue({ ufsUrl: "https://private.invalid/existing" })
    const fetchArtifact = jest.fn().mockResolvedValue(artifactResponse(ciphertext))
    const store = createUploadThingInventoryHistoryExportArtifactStore({
      client: api as never,
      fetch: fetchArtifact,
    })

    const stored = await store.putEncryptedChunk({
      organizationId: "org-1",
      exportId: "export-1",
      sequence: 4,
      ciphertext,
    })

    expect(stored.key).toBe(stored.customId)
    expect(api.generateSignedURL).toHaveBeenCalledWith(stored.customId, {
      expiresIn: "5 minutes",
      keyType: "customId",
    })
    expect(fetchArtifact).toHaveBeenCalledTimes(1)
  })

  it("reads one signed private artifact and verifies length and hash", async () => {
    const api = client()
    const ciphertext = Buffer.from("encrypted-content")
    api.generateSignedURL.mockResolvedValue({ ufsUrl: "https://private.invalid/artifact" })
    const fetchArtifact = jest.fn().mockResolvedValue(artifactResponse(ciphertext))
    const store = createUploadThingInventoryHistoryExportArtifactStore({
      client: api as never,
      fetch: fetchArtifact,
    })

    await expect(store.readEncryptedChunk(reference())).resolves.toEqual(ciphertext)
    expect(api.generateSignedURL).toHaveBeenCalledWith("artifact-key", {
      expiresIn: "5 minutes",
      keyType: "customId",
    })
    expect(fetchArtifact).toHaveBeenCalledWith(
      "https://private.invalid/artifact",
      expect.objectContaining({ cache: "no-store", redirect: "error" }),
    )
  })

  it("reads one public-pilot artifact and verifies length and hash", async () => {
    const api = client()
    const ciphertext = Buffer.from("encrypted-content")
    const fetchArtifact = jest.fn().mockResolvedValue(artifactResponse(ciphertext))
    const store = createUploadThingInventoryHistoryExportArtifactStore({
      client: api as never,
      fetch: fetchArtifact,
    })

    await expect(store.readEncryptedChunk(reference({
      storageAcl: "public-pilot",
      publicReadUrl: "https://public.example.test/artifact",
    }))).resolves.toEqual(ciphertext)
    expect(api.generateSignedURL).not.toHaveBeenCalled()
    expect(fetchArtifact).toHaveBeenCalledWith(
      "https://public.example.test/artifact",
      expect.objectContaining({ cache: "no-store", redirect: "error" }),
    )
  })

  it("rejects tampered artifact content", async () => {
    const api = client()
    api.generateSignedURL.mockResolvedValue({ ufsUrl: "https://private.invalid/artifact" })
    const fetchArtifact = jest.fn().mockResolvedValue(
      artifactResponse(Buffer.from("tampered-content!")),
    )
    const store = createUploadThingInventoryHistoryExportArtifactStore({
      client: api as never,
      fetch: fetchArtifact,
    })

    await expect(store.readEncryptedChunk(reference())).rejects.toThrow(
      "artifact integrity check failed",
    )
  })

  it("deletes artifacts in bounded provider batches", async () => {
    const api = client()
    api.deleteFiles.mockImplementation(async (keys: string[]) => ({
      success: true,
      deletedCount: keys.length,
    }))
    const store = createUploadThingInventoryHistoryExportArtifactStore({ client: api as never })
    const references = Array.from({ length: 101 }, (_, index) => reference({
      key: `artifact-${index}`,
      customId: `custom-${index}`,
    }))

    await expect(store.deleteEncryptedChunks(references)).resolves.toEqual({ deletedCount: 101 })
    expect(api.deleteFiles).toHaveBeenCalledTimes(2)
    expect(api.deleteFiles.mock.calls[0][0]).toHaveLength(100)
    expect(api.deleteFiles.mock.calls[1][0]).toHaveLength(1)
    expect(api.deleteFiles.mock.calls[0][1]).toEqual({ keyType: "customId" })
  })
})
