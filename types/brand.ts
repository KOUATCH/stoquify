import { ApiResponse } from "./itemTypes"

export interface Pagination {
  totalCount: number
  page: number
  limit: number
  pages: number
}

export interface PaginatedResponse<T> {
  pagination: Pagination
  data: T[]
}

export type BrandDTO = {
  id: string
  organizationId: string
  nameEn: string
  nameFr?: string | null
  slug: string
  descriptionEn?: string | null
  descriptionFr?: string | null
  logoUrl?: string | null
  isActive: boolean
  deletedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  itemCount?: number
  brandName: string
}

export type Brand = BrandDTO

export type BrandCreateDTO = {
  organizationId?: string | null
  nameEn: string
  nameFr?: string | null
  descriptionEn?: string | null
  descriptionFr?: string | null
  logoUrl?: string | null
  brandName?: string
}

export type UpdateBrandPayload = Partial<BrandCreateDTO> & {
  id?: string
  slug?: string
  isActive?: boolean
}

export type BrandPayload = BrandDTO

export type BriefBrandDTO = Pick<BrandDTO, "id" | "nameEn" | "nameFr" | "slug" | "brandName">

export type BriefBrandPayload = BriefBrandDTO & {
  organizationId: string
  createdAt: Date
  updatedAt: Date
}

export type BriefBrandData = {
  data: BriefBrandDTO[]
  pagination: Pagination
}

export type BriefBrandResponse = ApiResponse<BriefBrandPayload[]>
export type BrandResponse = ApiResponse<BrandDTO[]>
