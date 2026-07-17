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

export type CategoryDTO = {
  id: string
  organizationId: string
  titleEn: string
  titleFr?: string | null
  title: string
  slug: string
  description?: string | null
  descriptionEn?: string | null
  descriptionFr?: string | null
  imageUrl?: string | null
  parentId?: string | null
  isActive: boolean
  deletedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  itemCount?: number
}

export type Category = CategoryDTO

export type CategoryCreateDTO = {
  id?: string
  organizationId?: string | null
  titleEn: string
  titleFr?: string | null
  title?: string
  descriptionEn?: string | null
  descriptionFr?: string | null
  description?: string | null
  imageUrl?: string | string[] | null
  parentId?: string | null
  parentCategoryId?: string | null
  isActive?: boolean
}

export type UpdateCategoryPayload = Partial<CategoryCreateDTO> & {
  id?: string
  slug?: string
  createdAt?: Date
}

export type CategoryPayload = CategoryDTO

export type BriefCategoryDTO = Pick<CategoryDTO, "id" | "title" | "titleEn" | "titleFr" | "slug">

export type BriefCategoryPayload = BriefCategoryDTO & {
  organizationId: string
  createdAt: Date
  updatedAt?: Date
  description?: string | null
  descriptionEn?: string | null
  descriptionFr?: string | null
  imageUrl?: string | null
  parentId?: string | null
  isActive?: boolean
  itemCount?: number
}

export type BriefCategoryData = {
  data: BriefCategoryDTO[]
  pagination: Pagination
}

export type BriefCategoryResponse = ApiResponse<BriefCategoryPayload[]>
export type CategoryResponse = ApiResponse<CategoryDTO[]>
