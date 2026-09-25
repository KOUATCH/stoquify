import { NextResponse } from "next/server"
import { jsonErrorResponse } from "@/lib/error-handling/route-response"
import { PICTURE_MAX_BYTES } from "@/lib/media/policy"
import { buildTrustedOrigins } from "@/lib/security/trusted-origins"
import { requireInventoryPhotoWrite } from "@/services/media/picture-authorization"
import { uploadItemPicture } from "@/services/media/picture.service"
import { ApplicationError, ForbiddenError } from "@/services/_shared/action-errors"

export const runtime = "nodejs"
const ENDPOINT = "POST /api/media/upload"
const MAX_REQUEST_BYTES = PICTURE_MAX_BYTES + 64 * 1024
const invalid = (message: string) => new ApplicationError("VALIDATION_ERROR", message, 400)

async function readUpload(request: Request) {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.startsWith("multipart/form-data;") || !request.body) throw invalid("Choose an image to upload.")
  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES) throw invalid("Images must be no larger than 4 MB.")
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel()
        throw invalid("Images must be no larger than 4 MB.")
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  let data: FormData
  try {
    data = await new Response(new Uint8Array(Buffer.concat(chunks)).buffer, { headers: { "content-type": contentType } }).formData()
  } catch { throw invalid("The image upload was incomplete. Please retry.") }
  const files = data.getAll("file")
  if (files.length !== 1 || typeof files[0] === "string") throw invalid("Choose one image to upload.")
  return files[0]
}

export async function POST(request: Request) {
  try {
    // Multipart forms can otherwise be submitted cross-site with session cookies.
    // Next.js may use an internal hostname in request.url. Trust configured app
    // origins, never a forwarded host supplied by the request.
    const trusted = buildTrustedOrigins([
      process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
      process.env.NEXT_PUBLIC_BASE_URL, "http://localhost:3000", "http://127.0.0.1:3000",
    ])
    if (!trusted.includes(request.headers.get("origin") ?? "") || request.headers.get("sec-fetch-site") === "cross-site") throw new ForbiddenError()
    const organizationId = request.headers.get("x-organization-id")?.trim()
    if (!organizationId) throw invalid("Organization ID is required")
    const ctx = await requireInventoryPhotoWrite(organizationId, ENDPOINT, "api")
    const file = await readUpload(request)
    const url = await uploadItemPicture(file, ctx.orgId, ctx.userId)
    // A plain JSON response is independent of page rendering and action queues.
    return NextResponse.json({ success: true, url }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return jsonErrorResponse(error, { endpoint: ENDPOINT, userMessage: "Unable to upload this image. Please retry." })
  }
}
