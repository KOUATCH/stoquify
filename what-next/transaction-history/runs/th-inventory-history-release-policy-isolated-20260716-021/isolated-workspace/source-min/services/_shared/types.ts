export interface PaginatedParams {
  page?: number
  pageSize?: number
  search?: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ActionResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string }

export type PaginatedActionResponse<T> = ActionResponse<PaginatedResult<T>>
