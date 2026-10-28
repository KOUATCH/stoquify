export interface Organization {
  id: string
  name: string
  slug: string
  industry?: string | null
  country?: string | null
  state?: string | null
  address?: string | null
  currency: string
  timezone: string
  defaultLocale?: 'EN' | 'FR'
  inventoryStartDate?: Date | null
  fiscalYearStart?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationDTO {
  id: string
  name: string
  slug: string
  industry?: string | null
  country?: string | null
  state?: string | null
  address?: string | null
  currency: string
  timezone: string
  defaultLocale?: 'EN' | 'FR'
  inventoryStartDate?: Date | null
  fiscalYearStart?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationWithStats extends Organization {
  userCount: number
  itemCount: number
  totalRevenue: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string | null | undefined
}

export type OrganizationResponse = ApiResponse<OrganizationDTO[]>
export type CompleteOrganizationResponse = ApiResponse<OrganizationDTO[]>

export type OrganizationCreateDTO = {
  id: string
  name: string
  slug: string
  industry?: string | null
  country?: string | null
  state?: string | null
  address?: string | null
  currency?: string
  timezone?: string
  defaultLocale?: 'en' | 'fr'
  inventoryStartDate?: Date | null
  fiscalYearStart?: string | null
  isActive?: boolean
}

export type UpdateOrganizationPayload = {
  id: string
  name: string
  slug: string
  industry?: string | null
  country?: string | null
  state?: string | null
  address?: string | null
  currency: string
  timezone: string
  defaultLocale?: 'en' | 'fr'
  inventoryStartDate?: Date | null
  fiscalYearStart?: string | null
  isActive: boolean
}

export interface MutationContext<T> {
  previousOrganizationDetail?: T | undefined
  previousOrganizationsList?: T[] | undefined
}

export interface UpdateModelData<T> {
  id: string
  data: T
}
