"use server"

import { revalidatePath } from 'next/cache'
import { db } from '@/prisma/db'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { generateSlug } from '@/lib/generateSlug'
import { Locale as PrismaLocale, PaymentStatus } from '@prisma/client'
import { randomUUID } from 'crypto'

type OrganizationSettingsInput = {
  name?: string
  industry?: string
  country?: string
  state?: string
  address?: string
  currency?: string
  timezone?: string
  defaultLocale?: 'en' | 'fr'
  inventoryStartDate?: Date | null
  fiscalYearStart?: string
}

type CreateOrganizationSettingsInput = {
  name: string
  slug?: string
  industry?: string | null
  country?: string | null
  state?: string | null
  address?: string | null
  currency?: string
  timezone?: string
  defaultLocale?: 'en' | 'fr'
}

export type OrganizationManagementRow = {
  id: string
  name: string
  slug: string
  industry: string | null
  country: string | null
  state: string | null
  address: string | null
  currency: string
  timezone: string
  defaultLocale: PrismaLocale
  inventoryStartDate: Date | null
  fiscalYearStart: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  usersCount: number
  itemsCount: number
  locationsCount: number
  suppliersCount: number
  customersCount: number
  purchaseOrdersCount: number
  salesOrdersCount: number
  paymentsCount: number
  paidRevenue: number
}

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function toPrismaLocale(value?: string | null) {
  return value === 'fr' ? PrismaLocale.FR : PrismaLocale.EN
}

function normalizeSlug(value: string) {
  const slug = generateSlug(value).replace(/^-+|-+$/g, '')
  return slug || `organization-${randomUUID().slice(0, 8)}`
}

function canReadOrganizations(user: Awaited<ReturnType<typeof getAuthenticatedUser>>) {
  const permissions = user.permissions || []

  return (
    permissions.includes('*') ||
    permissions.includes('organizations.read') ||
    permissions.includes('organizations.create') ||
    permissions.includes('organizations.manage') ||
    permissions.includes('settings.organization.manage')
  )
}

function canCreateOrganizations(user: Awaited<ReturnType<typeof getAuthenticatedUser>>) {
  const permissions = user.permissions || []

  return (
    permissions.includes('*') ||
    permissions.includes('organizations.create') ||
    permissions.includes('organizations.manage') ||
    permissions.includes('settings.organization.manage')
  )
}

async function assertOrganizationAccess(organizationId: string) {
  const user = await getAuthenticatedUser()

  if (user.organizationId !== organizationId) {
    throw new Error('You do not have access to this organization')
  }

  return user
}

async function resolveUniqueOrganizationSlug(value: string) {
  const baseSlug = normalizeSlug(value)
  let slug = baseSlug
  let index = 1

  while (await db.organization.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${index}`
    index += 1
  }

  return slug
}

function revalidateOrganizationSettingsPaths() {
  revalidatePath('/[locale]/dashboard/settings/company', 'page')
  revalidatePath('/[locale]/dashboard/settings/organization', 'page')
}

export async function getOrganizationSettings(organizationId: string) {
  try {
    await assertOrganizationAccess(organizationId)

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        country: true,
        state: true,
        address: true,
        currency: true,
        timezone: true,
        defaultLocale: true,
        inventoryStartDate: true,
        fiscalYearStart: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!organization) {
      return { success: false, error: 'Organization not found' }
    }

    return { success: true, data: organization }
  } catch (error) {
    console.error('Error fetching organization settings:', error)
    return { success: false, error: 'Failed to fetch organization settings' }
  }
}

export async function getOrganizationManagementRows(
  organizationId: string
): Promise<{ success: true; data: OrganizationManagementRow[] } | { success: false; error: string }> {
  try {
    const user = await assertOrganizationAccess(organizationId)
    const canListAll = canReadOrganizations(user)

    const organizations = await db.organization.findMany({
      where: canListAll ? { deletedAt: null } : { id: organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        country: true,
        state: true,
        address: true,
        currency: true,
        timezone: true,
        defaultLocale: true,
        inventoryStartDate: true,
        fiscalYearStart: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            items: true,
            locations: true,
            suppliers: true,
            customers: true,
            purchaseOrders: true,
            salesOrders: true,
            payments: true,
          },
        },
      },
    })

    const organizationIds = organizations.map((organization) => organization.id)
    const paymentSummaries = organizationIds.length
      ? await db.payment.groupBy({
        by: ['organizationId'],
        where: {
          organizationId: { in: organizationIds },
          deletedAt: null,
          status: PaymentStatus.PAID,
        },
        _sum: {
          amount: true,
        },
      })
      : []
    const paidRevenueByOrganizationId = new Map(
      paymentSummaries.map((summary) => [summary.organizationId, Number(summary._sum.amount ?? 0)])
    )

    return {
      success: true,
      data: organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        industry: organization.industry,
        country: organization.country,
        state: organization.state,
        address: organization.address,
        currency: organization.currency,
        timezone: organization.timezone,
        defaultLocale: organization.defaultLocale,
        inventoryStartDate: organization.inventoryStartDate,
        fiscalYearStart: organization.fiscalYearStart,
        isActive: organization.isActive,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
        usersCount: organization._count.users,
        itemsCount: organization._count.items,
        locationsCount: organization._count.locations,
        suppliersCount: organization._count.suppliers,
        customersCount: organization._count.customers,
        purchaseOrdersCount: organization._count.purchaseOrders,
        salesOrdersCount: organization._count.salesOrders,
        paymentsCount: organization._count.payments,
        paidRevenue: paidRevenueByOrganizationId.get(organization.id) ?? 0,
      })),
    }
  } catch (error) {
    console.error('Error fetching organization management rows:', error)
    return { success: false, error: 'Failed to fetch organization management rows' }
  }
}

export async function createOrganizationSettings(
  data: CreateOrganizationSettingsInput
): Promise<{ success: true; data: OrganizationManagementRow } | { success: false; error: string }> {
  try {
    const user = await getAuthenticatedUser()

    if (!canCreateOrganizations(user)) {
      return { success: false, error: 'You do not have permission to create organizations' }
    }

    const name = data.name.trim()

    if (!name) {
      return { success: false, error: 'Organization name is required' }
    }

    const now = new Date()
    const slug = await resolveUniqueOrganizationSlug(data.slug || name)

    const organization = await db.$transaction(async (tx) => {
      const createdOrganization = await tx.organization.create({
        data: {
          id: randomUUID(),
          name,
          slug,
          industry: cleanText(data.industry),
          country: cleanText(data.country),
          state: cleanText(data.state),
          address: cleanText(data.address),
          currency: data.currency || 'XAF',
          timezone: data.timezone || 'Africa/Douala',
          defaultLocale: toPrismaLocale(data.defaultLocale),
          isActive: true,
          updatedAt: now,
        },
      })

      await tx.role.create({
        data: {
          id: randomUUID(),
          nameEn: 'Administrator',
          nameFr: 'Administrateur',
          code: 'administrator',
          description: 'Organization administrator with full access',
          permissions: ['*'],
          organizationId: createdOrganization.id,
          updatedAt: now,
        },
      })

      return createdOrganization
    })

    revalidateOrganizationSettingsPaths()

    return {
      success: true,
      data: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        industry: organization.industry,
        country: organization.country,
        state: organization.state,
        address: organization.address,
        currency: organization.currency,
        timezone: organization.timezone,
        defaultLocale: organization.defaultLocale,
        inventoryStartDate: organization.inventoryStartDate,
        fiscalYearStart: organization.fiscalYearStart,
        isActive: organization.isActive,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
        usersCount: 0,
        itemsCount: 0,
        locationsCount: 0,
        suppliersCount: 0,
        customersCount: 0,
        purchaseOrdersCount: 0,
        salesOrdersCount: 0,
        paymentsCount: 0,
        paidRevenue: 0,
      },
    }
  } catch (error) {
    console.error('Error creating organization:', error)
    return { success: false, error: 'Failed to create organization' }
  }
}

export async function updateOrganizationSettings(
  organizationId: string,
  data: OrganizationSettingsInput
) {
  try {
    await assertOrganizationAccess(organizationId)

    const cleanData = {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.industry !== undefined ? { industry: cleanText(data.industry) } : {}),
      ...(data.country !== undefined ? { country: cleanText(data.country) } : {}),
      ...(data.state !== undefined ? { state: cleanText(data.state) } : {}),
      ...(data.address !== undefined ? { address: cleanText(data.address) } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      ...(data.defaultLocale !== undefined ? { defaultLocale: toPrismaLocale(data.defaultLocale) } : {}),
      ...(data.inventoryStartDate !== undefined ? { inventoryStartDate: data.inventoryStartDate } : {}),
      ...(data.fiscalYearStart !== undefined ? { fiscalYearStart: cleanText(data.fiscalYearStart) } : {}),
    }

    if (!cleanData.name && data.name !== undefined) {
      return { success: false, error: 'Organization name is required' }
    }

    const organization = await db.organization.update({
      where: { id: organizationId },
      data: {
        ...cleanData,
        updatedAt: new Date(),
      }
    })

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    console.error('Error updating organization settings:', error)
    return { success: false, error: 'Failed to update organization settings' }
  }
}

export async function updateOrganizationCurrency(
  organizationId: string,
  currency: string
) {
  try {
    await assertOrganizationAccess(organizationId)

    const organization = await db.organization.update({
      where: { id: organizationId },
      data: {
        currency,
        updatedAt: new Date(),
      }
    })

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    console.error('Error updating organization currency:', error)
    return { success: false, error: 'Failed to update organization currency' }
  }
}

export async function updateOrganizationTimezone(
  organizationId: string,
  timezone: string
) {
  try {
    await assertOrganizationAccess(organizationId)

    const organization = await db.organization.update({
      where: { id: organizationId },
      data: {
        timezone,
        updatedAt: new Date(),
      }
    })

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    console.error('Error updating organization timezone:', error)
    return { success: false, error: 'Failed to update organization timezone' }
  }
}

export async function updateInventoryStartDate(
  organizationId: string,
  inventoryStartDate: Date
) {
  try {
    await assertOrganizationAccess(organizationId)

    const organization = await db.organization.update({
      where: { id: organizationId },
      data: {
        inventoryStartDate,
        updatedAt: new Date(),
      }
    })

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    console.error('Error updating inventory start date:', error)
    return { success: false, error: 'Failed to update inventory start date' }
  }
}

export async function updateFiscalYearStart(
  organizationId: string,
  fiscalYearStart: string
) {
  try {
    await assertOrganizationAccess(organizationId)

    const organization = await db.organization.update({
      where: { id: organizationId },
      data: {
        fiscalYearStart,
        updatedAt: new Date(),
      }
    })

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    console.error('Error updating fiscal year start:', error)
    return { success: false, error: 'Failed to update fiscal year start' }
  }
}
