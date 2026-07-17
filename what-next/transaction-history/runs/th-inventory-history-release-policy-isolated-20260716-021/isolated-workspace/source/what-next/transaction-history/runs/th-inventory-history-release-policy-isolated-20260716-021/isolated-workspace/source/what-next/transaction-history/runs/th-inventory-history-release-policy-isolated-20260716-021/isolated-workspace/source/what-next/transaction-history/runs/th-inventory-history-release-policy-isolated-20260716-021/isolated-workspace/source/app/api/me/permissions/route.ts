import { getOptionalRbacContext } from "@/lib/security/rbac"
import { NextResponse } from "next/server"

export async function GET() {
  const ctx = await getOptionalRbacContext()

  if (!ctx) {
    return NextResponse.json({ permissions: [] }, { status: 401 })
  }

  return NextResponse.json({
    permissions: ctx.permissions,
    organizationId: ctx.orgId,
    roles: ctx.roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
    })),
  })
}
