import { NextResponse } from "next/server"

import { requireSession } from "@/lib/security/auth-session"
import { RbacError } from "@/lib/security/rbac"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await requireSession()
    const { ctx } = session

    return NextResponse.json(
      {
        userId: ctx.userId,
        organizationId: ctx.orgId,
        organizationName: ctx.organizationName,
        roles: ctx.roles.map((role) => ({
          id: role.id,
          code: role.code,
          name: role.name,
          nameEn: role.nameEn ?? null,
          nameFr: role.nameFr ?? null,
        })),
        permissions: ctx.permissions,
        fetchedAt: ctx.fetchedAt,
      },
      {
        status: 200,
        headers: { "Cache-Control": "private, no-store" },
      },
    )
  } catch (error) {
    if (error instanceof RbacError) {
      return NextResponse.json(
        { error: error.code },
        {
          status: error.status,
          headers: { "Cache-Control": "private, no-store" },
        },
      )
    }

    return NextResponse.json(
      { error: "AUTHORIZATION_CHECK_FAILED" },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    )
  }
}
