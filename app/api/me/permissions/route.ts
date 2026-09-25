import { requireSession } from "@/lib/security/auth-session"
import { RbacError } from "@/lib/security/rbac"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
const headers = { "Cache-Control": "private, no-store" }

export async function GET() {
  try {
    const { ctx } = await requireSession()
    return NextResponse.json({
      userId: ctx.userId,
      permissions: ctx.permissions,
      organizationId: ctx.orgId,
      roles: ctx.roles.map(role => ({ id: role.id, code: role.code, name: role.name })),
      fetchedAt: ctx.fetchedAt,
    }, { headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof RbacError ? error.code : "AUTHORIZATION_CHECK_FAILED" }, {
      status: error instanceof RbacError ? error.status : 500, headers,
    })
  }
}
