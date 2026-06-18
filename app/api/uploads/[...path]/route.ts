import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getSession } from '@/lib/auth-server'
import { jsonAuthzError, jsonErrorResponse } from '@/lib/error-handling/route-response'

const ENDPOINT = 'GET /api/uploads/[...path]'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Verify user authentication
    const session = await getSession()
    if (!session?.user?.organizationId) {
      return jsonAuthzError('Unauthorized', 401, ENDPOINT)
    }

    const { path: pathSegments } = await params
    if (pathSegments.length !== 2) {
      return jsonErrorResponse('Invalid file path', {
        code: 'VALIDATION_ERROR',
        status: 400,
        userMessage: 'Invalid file path',
        endpoint: ENDPOINT,
      })
    }

    const [organizationId, fileName] = pathSegments

    // Verify the user has access to this organization's files
    if (organizationId !== session.user.organizationId) {
      return jsonAuthzError('Forbidden', 403, ENDPOINT)
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(fileName) || fileName.includes('..')) {
      return jsonErrorResponse('Invalid file path', {
        code: 'VALIDATION_ERROR',
        status: 400,
        userMessage: 'Invalid file path',
        endpoint: ENDPOINT,
      })
    }

    // Construct the full file path
    const orgDirectory = path.resolve(process.cwd(), 'public', 'uploads', organizationId)
    const fullPath = path.resolve(orgDirectory, fileName)

    if (!fullPath.startsWith(`${orgDirectory}${path.sep}`)) {
      return jsonErrorResponse('Invalid file path', {
        code: 'VALIDATION_ERROR',
        status: 400,
        userMessage: 'Invalid file path',
        endpoint: ENDPOINT,
      })
    }

    // Check if file exists
    try {
      await fs.access(fullPath)
    } catch {
      return jsonErrorResponse('File not found', {
        code: 'NOT_FOUND',
        status: 404,
        userMessage: 'File not found',
        endpoint: ENDPOINT,
      })
    }

    // Read the file
    const fileBuffer = await fs.readFile(fullPath)

    // Determine content type based on file extension
    const ext = path.extname(fileName).toLowerCase()
    let contentType = 'application/octet-stream'

    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.png':
        contentType = 'image/png'
        break
      case '.gif':
        contentType = 'image/gif'
        break
      case '.webp':
        contentType = 'image/webp'
        break
      case '.svg':
        return jsonErrorResponse('Unsupported file type', {
          code: 'VALIDATION_ERROR',
          status: 400,
          userMessage: 'Unsupported file type',
          endpoint: ENDPOINT,
        })
    }

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    return jsonErrorResponse(error, {
      endpoint: ENDPOINT,
      userMessage: 'Unable to serve uploaded file.',
    })
  }
}
