import { createHash } from "node:crypto"

import { UTApi, UTFile } from "uploadthing/server"

import { ApplicationError, BusinessRuleError } from "@/services/_shared/action-errors"

const PROVIDER = "uploadthing"
const MAX_ENCRYPTED_CHUNK_BYTES = 16 * 1024 * 1024
const DELETE_BATCH_SIZE = 100
const STORAGE_ACL_ENV = "STOQUIFY_INVENTORY_HISTORY_EXPORT_STORAGE_ACL"

export type InventoryHistoryExportStorageAcl = "private" | "public-pilot"

export type InventoryHistoryExportArtifactReference = {
  provider: typeof PROVIDER
  key: string
  customId: string
  byteLength: number
  ciphertextHash: string
  storageAcl?: InventoryHistoryExportStorageAcl
  publicReadUrl?: string
}

export type PutInventoryHistoryExportArtifactInput = {
  organizationId: string
  exportId: string
  sequence: number
  ciphertext: Buffer
}

export type InventoryHistoryExportArtifactStore = {
  putEncryptedChunk: (
    input: PutInventoryHistoryExportArtifactInput,
  ) => Promise<InventoryHistoryExportArtifactReference>
  readEncryptedChunk: (
    reference: InventoryHistoryExportArtifactReference,
  ) => Promise<Buffer>
  deleteEncryptedChunks: (
    references: readonly InventoryHistoryExportArtifactReference[],
  ) => Promise<{ deletedCount: number }>
}

type UploadThingClient = Pick<
  UTApi,
  "uploadFiles" | "generateSignedURL" | "deleteFiles"
>

type ArtifactStoreOptions = {
  client?: UploadThingClient
  fetch?: typeof fetch
  storageAcl?: InventoryHistoryExportStorageAcl
}

function sha256(value: Buffer | string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`
}

function resolveStorageAcl(explicit?: InventoryHistoryExportStorageAcl) {
  const value = explicit ?? process.env[STORAGE_ACL_ENV] ?? "private"
  if (value !== "private" && value !== "public-pilot") {
    throw new BusinessRuleError("Inventory history export storage ACL is invalid.")
  }
  return value
}

function publicReadUrlFromResult(data: unknown) {
  if (!data || typeof data !== "object") return null
  const record = data as Record<string, unknown>
  for (const key of ["ufsUrl", "url", "fileUrl"]) {
    const value = record[key]
    if (typeof value === "string" && /^https:\/\//.test(value)) return value
  }
  return null
}

function artifactCustomId(input: Omit<PutInventoryHistoryExportArtifactInput, "ciphertext">) {
  return `stoquify-history-${createHash("sha256")
    .update(`${input.organizationId}:${input.exportId}:${input.sequence}`)
    .digest("hex")}`
}

function assertReference(reference: InventoryHistoryExportArtifactReference) {
  const storageAcl = reference.storageAcl ?? "private"
  if (
    reference.provider !== PROVIDER ||
    !reference.key ||
    !reference.customId ||
    !Number.isSafeInteger(reference.byteLength) ||
    reference.byteLength < 1 ||
    !/^sha256:[a-f0-9]{64}$/.test(reference.ciphertextHash) ||
    (storageAcl !== "private" && storageAcl !== "public-pilot") ||
    (storageAcl === "public-pilot" &&
      (!reference.publicReadUrl || !/^https:\/\//.test(reference.publicReadUrl)))
  ) {
    throw new BusinessRuleError("Inventory history export artifact reference is invalid.")
  }
}

function unavailable(operation: "upload" | "read" | "delete", cause?: unknown) {
  return new ApplicationError(
    "INTERNAL_ERROR",
    "Inventory history export artifact storage is unavailable.",
    503,
    false,
    {
      provider: PROVIDER,
      operation,
      cause: cause instanceof Error ? cause.name : typeof cause,
    },
  )
}

export function createUploadThingInventoryHistoryExportArtifactStore(
  options: ArtifactStoreOptions = {},
): InventoryHistoryExportArtifactStore {
  const client = options.client ?? new UTApi()
  const storageAcl = resolveStorageAcl(options.storageAcl)

  async function readEncryptedChunk(reference: InventoryHistoryExportArtifactReference) {
    assertReference(reference)
    try {
      const fetchArtifact = options.fetch ?? globalThis.fetch
      if (!fetchArtifact) throw unavailable("read")
      const ufsUrl = reference.storageAcl === "public-pilot"
        ? reference.publicReadUrl
        : (await client.generateSignedURL(reference.key, {
          expiresIn: "5 minutes",
          keyType: "customId",
        })).ufsUrl
      if (!ufsUrl) throw new BusinessRuleError("Inventory history export artifact URL is invalid.")
      const response = await fetchArtifact(ufsUrl, {
        method: "GET",
        redirect: "error",
        cache: "no-store",
      })
      if (!response.ok) throw unavailable("read")

      const declaredLength = response.headers.get("content-length")
      if (declaredLength && Number(declaredLength) !== reference.byteLength) {
        throw new BusinessRuleError("Inventory history export artifact length is invalid.")
      }
      const ciphertext = Buffer.from(await response.arrayBuffer())
      if (
        ciphertext.length !== reference.byteLength ||
        sha256(ciphertext) !== reference.ciphertextHash
      ) {
        throw new BusinessRuleError("Inventory history export artifact integrity check failed.")
      }
      return ciphertext
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw unavailable("read", error)
    }
  }

  return {
    async putEncryptedChunk(input) {
      if (
        !input.organizationId ||
        !input.exportId ||
        !Number.isSafeInteger(input.sequence) ||
        input.sequence < 0 ||
        input.ciphertext.length < 1 ||
        input.ciphertext.length > MAX_ENCRYPTED_CHUNK_BYTES
      ) {
        throw new BusinessRuleError("Inventory history export chunk is outside the approved storage bounds.")
      }

      const customId = artifactCustomId(input)
      const file = new UTFile(
        [input.ciphertext],
        `inventory-history-${String(input.sequence).padStart(8, "0")}.bin`,
        { customId, type: "application/octet-stream" },
      )
      const reference: InventoryHistoryExportArtifactReference = {
        provider: PROVIDER,
        key: customId,
        customId,
        byteLength: input.ciphertext.length,
        ciphertextHash: sha256(input.ciphertext),
        storageAcl,
      }

      try {
        const result = await client.uploadFiles(file, {
          acl: storageAcl === "public-pilot" ? "public-read" : "private",
          contentDisposition: "attachment",
        })
        if (result.error) {
          await readEncryptedChunk(reference)
          return reference
        }
        if (
          !result.data ||
          !result.data.key ||
          result.data.size !== input.ciphertext.length ||
          result.data.customId !== customId
        ) {
          throw unavailable("upload", result.error)
        }
        if (storageAcl === "public-pilot") {
          const publicReadUrl = publicReadUrlFromResult(result.data)
          if (!publicReadUrl) throw unavailable("upload")
          return { ...reference, publicReadUrl }
        }
        return reference
      } catch (error) {
        if (error instanceof ApplicationError) throw error
        throw unavailable("upload", error)
      }
    },

    readEncryptedChunk,

    async deleteEncryptedChunks(references) {
      for (const reference of references) assertReference(reference)
      let deletedCount = 0
      try {
        for (let offset = 0; offset < references.length; offset += DELETE_BATCH_SIZE) {
          const batch = references.slice(offset, offset + DELETE_BATCH_SIZE)
          const result = await client.deleteFiles(
            batch.map((reference) => reference.key),
            { keyType: "customId" },
          )
          if (!result.success) {
            throw unavailable("delete")
          }
          deletedCount += batch.length
        }
        return { deletedCount }
      } catch (error) {
        if (error instanceof ApplicationError) throw error
        throw unavailable("delete", error)
      }
    },
  }
}
