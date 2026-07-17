import "server-only"

import { db } from "@/prisma/db"

const apiOrganizationSelect = {
  id: true,
  name: true,
  slug: true,
  industry: true,
  country: true,
  state: true,
  currency: true,
  timezone: true,
  defaultLocale: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function getApiOrganizationById(organizationId: string) {
  return db.organization.findFirst({
    where: { id: organizationId },
    select: apiOrganizationSelect,
  })
}
