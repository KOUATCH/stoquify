import { db } from "@/prisma/db"

import { NotFoundError } from "./action-errors"

export async function assertActiveOrganization(organizationId: string) {
  const organization = await db.organization.findFirst({
    where: {
      id: organizationId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  })

  if (!organization) {
    throw new NotFoundError("Organization not found or inactive")
  }

  return organization.id
}
