import type { ActionResponse, PaginatedActionResponse, PaginatedResult } from "./types"

export function ok<T>(data: T): ActionResponse<T> {
  return { success: true, data, error: null }
}

export function err<T = never>(message: unknown): ActionResponse<T> {
  const msg = message instanceof Error ? message.message : String(message ?? "Unknown error")
  return { success: false, data: null, error: msg }
}

export function okPaginated<T>(result: PaginatedResult<T>): PaginatedActionResponse<T> {
  return { success: true, data: result, error: null }
}

export function errPaginated<T = never>(message: unknown): PaginatedActionResponse<T> {
  const msg = message instanceof Error ? message.message : String(message ?? "Unknown error")
  return { success: false, data: null, error: msg }
}
