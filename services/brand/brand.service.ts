import { db } from "@/prisma/db"
import type { Prisma } from "@prisma/client"
import type { BrandDTO } from "@/types/brand"
import { buildPagination, buildPaginatedResult, MAX_PAGE_SIZES } from "../_shared/pagination"
import type { PaginatedParams, PaginatedResult } from "../_shared/types"
import type { BrandCreateInput, BrandUpdateInput } from "./brand.schemas"
import { randomUUID } from "node:crypto"

export type { BrandCreateInput, BrandUpdateInput }

type BrandWithCount = Prisma.BrandGetPayload<{
  include: { _count: { select: { items: true } } }
}>

function toDTO(b: BrandWithCount): BrandDTO {
  return {
    id: b.id,
    organizationId: b.organizationId,
    nameEn: b.nameEn,
    nameFr: b.nameFr,
    slug: b.slug,
    descriptionEn: b.descriptionEn,
    descriptionFr: b.descriptionFr,
    logoUrl: b.logoUrl,
    isActive: b.isActive,
    deletedAt: b.deletedAt,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    itemCount: b._count?.items ?? 0,
    brandName: b.nameEn,
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120)
}

export async function listBrands(
  orgId: string,
  params: PaginatedParams = {},
): Promise<PaginatedResult<BrandDTO>> {
  const { page = 1, pageSize = MAX_PAGE_SIZES.brands, search = "" } = params
  const { skip, take, page: p, pageSize: ps } = buildPagination(
    page,
    pageSize,
    MAX_PAGE_SIZES.brands,
  )

  const where: Prisma.BrandWhereInput = {
    organizationId: orgId,
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { nameEn: { contains: search, mode: "insensitive" as const } },
            { nameFr: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    db.brand.findMany({
      where,
      orderBy: { nameEn: "asc" },
      skip,
      take,
      include: { _count: { select: { items: true } } },
    }),
    db.brand.count({ where }),
  ])

  return buildPaginatedResult(rows.map(toDTO), total, p, ps)
}

export async function getBrandById(orgId: string, id: string): Promise<BrandDTO> {
  const b = await db.brand.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { _count: { select: { items: true } } },
  })
  if (!b) throw new Error("Brand not found")
  return toDTO(b)
}

export async function createBrand(orgId: string, input: BrandCreateInput): Promise<BrandDTO> {
  const slug = slugify(input.nameEn)

  const existing = await db.brand.findFirst({
    where: {
      organizationId: orgId,
      OR: [{ nameEn: input.nameEn }, { slug }],
    },
    select: { id: true, nameEn: true, slug: true },
  })
  if (existing) {
    const reason =
      existing.nameEn === input.nameEn
        ? `Brand "${input.nameEn}" already exists for this organisation`
        : `Brand slug "${slug}" collides with an existing brand`
    throw new Error(reason)
  }

  const b = await db.brand.create({
    data: {
      id: randomUUID(),
      organizationId: orgId,
      nameEn: input.nameEn,
      nameFr: input.nameFr ?? null,
      descriptionEn: input.descriptionEn ?? null,
      descriptionFr: input.descriptionFr ?? null,
      logoUrl: input.logoUrl ?? null,
      slug,
      updatedAt: new Date(),
    },
    include: { _count: { select: { items: true } } },
  })
  return toDTO(b)
}

export async function updateBrand(
  orgId: string,
  id: string,
  input: BrandUpdateInput,
): Promise<BrandDTO> {
  const existing = await db.brand.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  })
  if (!existing) throw new Error("Brand not found")

  const nextSlug = input.slug ?? (input.nameEn ? slugify(input.nameEn) : undefined)

  if (input.nameEn || nextSlug) {
    const conflict = await db.brand.findFirst({
      where: {
        organizationId: orgId,
        NOT: { id },
        OR: [
          ...(input.nameEn ? [{ nameEn: input.nameEn }] : []),
          ...(nextSlug ? [{ slug: nextSlug }] : []),
        ],
      },
      select: { id: true, nameEn: true, slug: true },
    })
    if (conflict) {
      throw new Error(`Brand "${input.nameEn ?? nextSlug}" already exists for this organisation`)
    }
  }

  const updated = await db.brand.update({
    where: { id },
    data: {
      ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
      ...(input.nameFr !== undefined ? { nameFr: input.nameFr ?? null } : {}),
      ...(input.descriptionEn !== undefined
        ? { descriptionEn: input.descriptionEn ?? null }
        : {}),
      ...(input.descriptionFr !== undefined
        ? { descriptionFr: input.descriptionFr ?? null }
        : {}),
      ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl ?? null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt: new Date(),
    },
    include: { _count: { select: { items: true } } },
  })
  return toDTO(updated)
}

export async function deleteBrand(orgId: string, id: string): Promise<BrandDTO> {
  const b = await db.brand.findFirst({ where: { id, organizationId: orgId } })
  if (!b) throw new Error("Brand not found")

  // Soft delete — Brand schema has deletedAt; preserves item.brand history.
  const deleted = await db.brand.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false, updatedAt: new Date() },
    include: { _count: { select: { items: true } } },
  })
  return toDTO(deleted)
}
