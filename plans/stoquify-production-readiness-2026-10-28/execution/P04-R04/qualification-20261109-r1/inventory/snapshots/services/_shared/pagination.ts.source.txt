import type { PaginatedResult } from "./types"

export const MAX_PAGE_SIZES = {
  brands: 500,
  categories: 500,
  items: 100,
  units: 200,
  taxRates: 100,
  inventoryLevels: 500,
  locations: 200,
  customers: 200,
} as const

export function buildPagination(page = 1, pageSize: number, maxPageSize: number) {
  const clampedPageSize = Math.min(Math.max(1, pageSize), maxPageSize)
  const clampedPage = Math.max(1, page)
  const skip = (clampedPage - 1) * clampedPageSize
  return { skip, take: clampedPageSize, page: clampedPage, pageSize: clampedPageSize }
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}
