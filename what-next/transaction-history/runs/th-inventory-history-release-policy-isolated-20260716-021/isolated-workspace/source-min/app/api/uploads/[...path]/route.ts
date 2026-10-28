import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { jsonAuthzError, jsonErrorResponse } from "@/lib/error-handling/route-response"
import { requireApiModuleAccess, requireApiSessionForCurrentOrg, requireAppPermission } from "@/lib/security/server-authz"

const ENDPOINT = "GET /api/uploads/[...path]"
const supportedUploadContentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
}

function invalidFilePathResponse() {
  return jsonErrorResponse("Invalid file path", {
    code: "VALIDATION_ERROR",
    status: 400,
    userMessage: "Invalid file path",
    endpoint: ENDPOINT,
  })
}

function unsupportedFileTypeResponse() {
  return jsonErrorResponse("Unsupported file type", {
    code: "VALIDATION_ERROR",
    status: 400,
    userMessage: "Unsupported file type",
    endpoint: ENDPOINT,
  })
}

function getSupportedUploadContentType(fileName: string) {
  return supportedUploadContentTypes[path.extname(fileName).toLowerCase()] ?? null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const authz = await requireApiSessionForCurrentOrg()
    if (authz.error) {
      return jsonAuthzError(authz.error, authz.status, ENDPOINT)
    }

    const user = authz.session?.user
    const sessionOrganizationId = authz.organizationId
    if (!user || !sessionOrganizationId) {
      return jsonAuthzError("Unauthorized", 401, ENDPOINT)
    }

    const { path: pathSegments } = await params
    if (pathSegments.length !== 2) {
      return invalidFilePathResponse()
    }

    const [organizationId, fileName] = pathSegments
    if (organizationId !== sessionOrganizationId) {
      return jsonAuthzError("Forbidden", 403, ENDPOINT)
    }

    const moduleAccess = await requireApiModuleAccess({
      organizationId,
      user,
      moduleSlug: "dashboard",
      surface: ENDPOINT,
      surfaceType: "api",
      accessIntent: "read",
      audit: true,
    })
    if (!moduleAccess.allowed) {
      return jsonAuthzError(moduleAccess.error, moduleAccess.status, ENDPOINT)
    }

    try {
      requireAppPermission(user, "dashboard.read")
    } catch {
      return jsonAuthzError("Forbidden", 403, ENDPOINT)
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(fileName) || fileName.includes("..")) {
      return invalidFilePathResponse()
    }

    const contentType = getSupportedUploadContentType(fileName)
    if (!contentType) {
      return unsupportedFileTypeResponse()
    }

    const orgDirectory = path.resolve(process.cwd(), "public", "uploads", organizationId)
    const fullPath = path.resolve(orgDirectory, fileName)

    if (!fullPath.startsWith(`${orgDirectory}${path.sep}`)) {
      return invalidFilePathResponse()
    }

    try {
      await fs.access(fullPath)
    } catch {
      return jsonErrorResponse("File not found", {
        code: "NOT_FOUND",
        status: 404,
        userMessage: "File not found",
        endpoint: ENDPOINT,
      })
    }

    const fileBuffer = await fs.readFile(fullPath)

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=86400",
        "Content-Length": fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    return jsonErrorResponse(error, {
      endpoint: ENDPOINT,
      userMessage: "Unable to serve uploaded file.",
    })
  }
}
