import type { ActionResponse, PaginatedActionResponse, PaginatedResult } from "./types"
import { toSafeActionError } from "./action-errors"

export function ok<T>(data: T): ActionResponse<T> {
  return { success: true, data, error: null }
}

export function err<T = never>(message: unknown): ActionResponse<T> {
  const msg = toSafeActionError(message).error
  return { success: false, data: null, error: msg }
}

export function okPaginated<T>(result: PaginatedResult<T>): PaginatedActionResponse<T> {
  return { success: true, data: result, error: null }
}

export function errPaginated<T = never>(message: unknown): PaginatedActionResponse<T> {
  const msg = toSafeActionError(message).error
  return { success: false, data: null, error: msg }
}
