import { db } from "@/prisma/db"
import type { Prisma } from "@prisma/client"
import type { CategoryDTO } from "@/types/category"
import { buildPagination, buildPaginatedResult, MAX_PAGE_SIZES } from "../_shared/pagination"
import type { PaginatedParams, PaginatedResult } from "../_shared/types"
import type { CategoryCreateInput, CategoryUpdateInput } from "./category.schemas"

export type { CategoryCreateInput, CategoryUpdateInput }

type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: { _count: { select: { items: true } } }
}>

function toDTO(cat: CategoryWithCount): CategoryDTO {
  return {
    id: cat.id,
    organizationId: cat.organizationId,
    titleEn: cat.titleEn,
    titleFr: cat.titleFr,
    title: cat.titleEn,
    slug: cat.slug,
    description: cat.descriptionEn,
    descriptionEn: cat.descriptionEn,
    descriptionFr: cat.descriptionFr,
    imageUrl: cat.imageUrl,
    parentId: cat.parentId,
    isActive: cat.isActive,
    deletedAt: cat.deletedAt,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
    itemCount: cat._count?.items ?? 0,
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120)
}

async function assertParentBelongsToOrg(orgId: string, parentId: string | null | undefined, id?: string) {
  if (!parentId) return

  if (id && parentId === id) {
    throw new Error("A category cannot be its own parent")
  }

  const parent = await db.category.findFirst({
    where: { id: parentId, organizationId: orgId, deletedAt: null },
    select: { id: true },
  })

  if (!parent) {
    throw new Error("Parent category not found")
  }
}

export async function listCategories(
  orgId: string,
  params: PaginatedParams = {},
): Promise<PaginatedResult<CategoryDTO>> {
  const { page = 1, pageSize = MAX_PAGE_SIZES.categories, search = "" } = params
  const { skip, take, page: p, pageSize: ps } = buildPagination(
    page,
    pageSize,
    MAX_PAGE_SIZES.categories,
  )

  const where: Prisma.CategoryWhereInput = {
    organizationId: orgId,
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { titleEn: { contains: search, mode: "insensitive" as const } },
            { titleFr: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    db.category.findMany({
      where,
      orderBy: { titleEn: "asc" },
      skip,
      take,
      include: { _count: { select: { items: true } } },
    }),
    db.category.count({ where }),
  ])

  return buildPaginatedResult(rows.map(toDTO), total, p, ps)
}

export async function getCategory(orgId: string, id: string): Promise<CategoryDTO | null> {
  const cat = await db.category.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { _count: { select: { items: true } } },
  })
  return cat ? toDTO(cat) : null
}

export async function getCategoryById(orgId: string, id: string): Promise<CategoryDTO> {
  const cat = await getCategory(orgId, id)
  if (!cat) throw new Error("Category not found")
  return cat
}

export async function createCategory(
  orgId: string,
  input: CategoryCreateInput,
): Promise<CategoryDTO> {
  await assertParentBelongsToOrg(orgId, input.parentId)

  const slug = slugify(input.titleEn)
  const existing = await db.category.findFirst({
    where: {
      organizationId: orgId,
      deletedAt: null,
      OR: [{ titleEn: input.titleEn }, { slug }],
    },
    select: { id: true, titleEn: true, slug: true },
  })
  if (existing) {
    throw new Error(`Category "${input.titleEn}" already exists for this organisation`)
  }

  const cat = await db.category.create({
    data: {
      organizationId: orgId,
      titleEn: input.titleEn,
      titleFr: input.titleFr ?? null,
      descriptionEn: input.descriptionEn ?? null,
      descriptionFr: input.descriptionFr ?? null,
      imageUrl: input.imageUrl ?? null,
      parentId: input.parentId ?? null,
      isActive: input.isActive ?? true,
      slug,
    },
    include: { _count: { select: { items: true } } },
  })
  return toDTO(cat)
}

export async function updateCategory(
  orgId: string,
  id: string,
  input: CategoryUpdateInput,
): Promise<CategoryDTO> {
  const existing = await db.category.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    select: { id: true },
  })
  if (!existing) throw new Error("Category not found")

  await assertParentBelongsToOrg(orgId, input.parentId, id)

  const nextSlug = input.slug ?? (input.titleEn ? slugify(input.titleEn) : undefined)

  if (input.titleEn || nextSlug) {
    const conflict = await db.category.findFirst({
      where: {
        organizationId: orgId,
        deletedAt: null,
        NOT: { id },
        OR: [
          ...(input.titleEn ? [{ titleEn: input.titleEn }] : []),
          ...(nextSlug ? [{ slug: nextSlug }] : []),
        ],
      },
      select: { id: true },
    })

    if (conflict) {
      throw new Error(`Category "${input.titleEn ?? nextSlug}" already exists for this organisation`)
    }
  }

  const updated = await db.category.update({
    where: { id },
    data: {
      ...(input.titleEn !== undefined ? { titleEn: input.titleEn } : {}),
      ...(input.titleFr !== undefined ? { titleFr: input.titleFr ?? null } : {}),
      ...(input.descriptionEn !== undefined
        ? { descriptionEn: input.descriptionEn ?? null }
        : {}),
      ...(input.descriptionFr !== undefined
        ? { descriptionFr: input.descriptionFr ?? null }
        : {}),
      ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl ?? null } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId ?? null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt: new Date(),
    },
    include: { _count: { select: { items: true } } },
  })
  return toDTO(updated)
}

export async function deleteCategory(orgId: string, id: string): Promise<CategoryDTO> {
  const existing = await db.category.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    select: { id: true },
  })
  if (!existing) throw new Error("Category not found")

  const deleted = await db.category.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false, updatedAt: new Date() },
    include: { _count: { select: { items: true } } },
  })
  return toDTO(deleted)
}
