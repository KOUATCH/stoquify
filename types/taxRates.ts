import type { TaxType } from "@prisma/client"

export interface BriefTaxRateData {
  data: BriefTaxRateDTO[]
  pagination: Pagination
}

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

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string | null | undefined
}

export type BriefTaxRateResponse = ApiResponse<BriefTaxRatePayload[]>
export type TaxRateResponse = ApiResponse<TaxRatePayload[]>
export type CompleteTaxRateResponse = ApiResponse<TaxRateDTO[]>

export type TaxRateCreateDTO = {
  id?: string
  createdAt?: Date | string
  organizationId: string
  taxRateName?: string
  name?: string
  nameEn?: string
  nameFr?: string | null
  rate: number | string
  type?: TaxType | string
  isActive?: boolean
}

export interface TaxRate {
  id: string
  createdAt: Date | string
  updatedAt?: Date | string
  taxRateName: string
  name?: string
  nameEn?: string
  nameFr?: string | null
  rate: number | string
  type?: TaxType | string
  isActive?: boolean
  organizationId: string
}

export type TaxRatePayload = TaxRate

export type UpdateTaxRatePayload = {
  id?: string
  createdAt?: Date | string
  updatedAt?: Date | string
  organizationId?: string | null
  taxRateName?: string
  name?: string
  nameEn?: string
  nameFr?: string | null
  rate?: number | string
  type?: TaxType | string
  isActive?: boolean
}

export type TaxRateDTO = {
  id: string
  organizationId: string | null
  createdAt: Date
  updatedAt: Date
  taxRateName: string
  name: string
  nameEn: string
  nameFr?: string | null
  rate: string
  type: TaxType | string
  isActive: boolean
}

export type BriefTaxRateDTO = {
  id: string
  taxRateName: string
  name?: string
  nameEn?: string
  nameFr?: string | null
  rate: number | string
  type?: TaxType | string
  isActive?: boolean
  createdAt: Date
  updatedAt?: Date
  organizationId: string
}

export type BriefTaxRatePayload = BriefTaxRateDTO

export interface MutationContext<T> {
  previousTaxRateDetail?: T | undefined
  previousTaxRatesList?: T[] | undefined
}

export interface UpdateModelData<T> {
  id: string
  data: T
}
