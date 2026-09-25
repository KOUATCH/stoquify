import { createHash, randomUUID, randomBytes, createCipheriv, createDecipheriv } from "node:crypto"
import type { Prisma } from "@prisma/client"
import { UTApi, UTFile } from "uploadthing/server"
import { db } from "@/prisma/db"
import { MEDIA_URL_PREFIX, mediaIdFromUrl, PICTURE_MAX_BYTES, PICTURE_MIME_TYPES } from "@/lib/media/policy"
import { ApplicationError, BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"

const unavailable = () => new ApplicationError("INTERNAL_ERROR", "Online image storage is unavailable. Please try again or contact your administrator.", 503, true)

function provider() {
  if (!process.env.UPLOADTHING_TOKEN) throw unavailable()
  return new UTApi({
    logLevel: "None",
    fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(30_000) }),
  })
}

export function validatePictureBytes(bytes: Uint8Array, mimeType: string) {
  const b = Buffer.from(bytes)
  const matches = mimeType === "image/png" ? b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : mimeType === "image/jpeg" ? b[0] === 255 && b[1] === 216 && b[2] === 255
    : mimeType === "image/gif" ? ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString("ascii"))
    : mimeType === "image/webp" ? b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP"
    : false
  if (!matches || bytes.length < 12 || bytes.length > PICTURE_MAX_BYTES) {
    throw new BusinessRuleError("Choose a valid JPEG, PNG, GIF or WebP image no larger than 4 MB.")
  }
}

export async function uploadItemPicture(file: File, organizationId: string, userId: string) {
  if (!file || typeof file.arrayBuffer !== "function" || file.size < 12 || file.size > PICTURE_MAX_BYTES ||
      !(PICTURE_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new BusinessRuleError("Choose a JPEG, PNG, GIF or WebP image no larger than 4 MB.")
  }
  const client = provider()
  const bytes = new Uint8Array(await file.arrayBuffer())
  validatePictureBytes(bytes, file.type)
  const id = randomUUID()
  // The configured provider's free tier cannot store private objects. Only
  // authenticated ciphertext leaves the application; keys stay in its database.
  const key = randomBytes(32)
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  cipher.setAAD(Buffer.from(`${organizationId}:${id}`))
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()])
  // Persist identity before contacting the provider, including when the response is lost.
  await db.pictureAsset.create({ data: {
    id, organizationId, createdById: userId, mimeType: file.type,
    byteLength: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"),
    encryptionKey: key.toString("base64"), encryptionIv: iv.toString("base64"), encryptionTag: cipher.getAuthTag().toString("base64"),
  } })
  try {
    const result = await client.uploadFiles(new UTFile([encrypted], `${id}.bin`, { type: "application/octet-stream", customId: id }), {
      acl: "public-read", contentDisposition: "attachment",
    })
    if (result.error || !result.data?.key || result.data.size !== bytes.length || result.data.customId !== id) throw unavailable()
    const providerUrl = checkedProviderUrl(result.data.ufsUrl)
    await db.pictureAsset.update({ where: { id }, data: { providerKey: result.data.key, providerUrl, status: "ready" } })
    return `${MEDIA_URL_PREFIX}${id}`
  } catch {
    // The uploading row remains a retryable cleanup candidate, addressed by customId.
    throw unavailable()
  }
}

// Call inside the entity write transaction. The row lock from updateMany
// serializes attachment against cleanup, so a referenced object cannot be deleted.
export async function claimItemPictures(tx: Prisma.TransactionClient, organizationId: string, references: string[], retained: string[] = []) {
  for (const reference of new Set(references.filter(Boolean))) {
    const id = mediaIdFromUrl(reference)
    if (!id) {
      if (retained.includes(reference)) continue // unchanged legacy image only
      throw new BusinessRuleError("Upload an image before saving this item.")
    }
    const claimed = await tx.pictureAsset.updateMany({
      where: { id, organizationId, entityType: "item", status: "ready" },
      data: { attachedAt: new Date() },
    })
    if (claimed.count !== 1) throw new BusinessRuleError("This image is unavailable. Upload it again before saving.")
  }
}

export async function readItemPicture(id: string, organizationId: string) {
  const asset = await db.pictureAsset.findFirst({ where: { id, organizationId, entityType: "item", status: "ready" } })
  if (!asset?.providerKey || !asset.providerUrl) throw new NotFoundError("Image not found")
  const response = await fetch(checkedProviderUrl(asset.providerUrl), { cache: "no-store", signal: AbortSignal.timeout(15000), redirect: "error" })
  if (!response.ok) throw unavailable()
  if (!response.body || asset.byteLength > PICTURE_MAX_BYTES) throw unavailable()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > asset.byteLength) { await reader.cancel(); throw unavailable() }
    chunks.push(value)
  }
  let bytes: Uint8Array
  try {
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(asset.encryptionKey, "base64"), Buffer.from(asset.encryptionIv, "base64"))
    decipher.setAAD(Buffer.from(`${organizationId}:${id}`))
    decipher.setAuthTag(Buffer.from(asset.encryptionTag, "base64"))
    bytes = new Uint8Array(Buffer.concat([decipher.update(Buffer.concat(chunks)), decipher.final()]))
  } catch { throw unavailable() }
  if (bytes.length !== asset.byteLength || createHash("sha256").update(bytes).digest("hex") !== asset.sha256) throw unavailable()
  return { bytes, mimeType: asset.mimeType }
}

function checkedProviderUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== "https:" || !(url.hostname.endsWith(".ufs.sh") || url.hostname === "utfs.io") || !url.pathname.startsWith("/f/") || url.username || url.password) throw unavailable()
  return url.origin + url.pathname
}

export async function deleteUnattachedPicture(reference: string, organizationId: string, userId: string) {
  const id = mediaIdFromUrl(reference)
  if (!id) throw new BusinessRuleError("Saved and legacy images are retained until a verified cleanup.")
  const asset = await db.pictureAsset.findFirst({ where: { id, organizationId, createdById: userId, entityType: "item", attachedAt: null } })
  if (!asset) throw new NotFoundError("Unattached image not found")
  if (asset.status === "deleted") return
  const claim = await db.pictureAsset.updateMany({
    where: { id, organizationId, createdById: userId, attachedAt: null, status: { in: ["ready", "deleting"] } },
    data: { status: "deleting" },
  })
  if (claim.count !== 1) throw new BusinessRuleError("This image is in use or still uploading.")
  const result = await provider().deleteFiles(id, { keyType: "customId" })
  if (!result.success) throw unavailable()
  await db.pictureAsset.update({ where: { id }, data: { status: "deleted" } })
}
