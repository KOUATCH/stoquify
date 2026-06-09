import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getSession } from '@/lib/auth-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Verify user authentication
    const session = await getSession()
    if (!session?.user?.organizationId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { path: pathSegments } = await params
    if (pathSegments.length !== 2) {
      return new NextResponse('Invalid file path', { status: 400 })
    }

    const [organizationId, fileName] = pathSegments

    // Verify the user has access to this organization's files
    if (organizationId !== session.user.organizationId) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(fileName) || fileName.includes('..')) {
      return new NextResponse('Invalid file path', { status: 400 })
    }

    // Construct the full file path
    const orgDirectory = path.resolve(process.cwd(), 'public', 'uploads', organizationId)
    const fullPath = path.resolve(orgDirectory, fileName)

    if (!fullPath.startsWith(`${orgDirectory}${path.sep}`)) {
      return new NextResponse('Invalid file path', { status: 400 })
    }

    // Check if file exists
    try {
      await fs.access(fullPath)
    } catch {
      return new NextResponse('File not found', { status: 404 })
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
        return new NextResponse('Unsupported file type', { status: 415 })
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
    console.error('Error serving uploaded file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
