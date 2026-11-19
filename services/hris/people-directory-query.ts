import { z } from "zod"

export const peopleDirectoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).catch(1),
  search: z.string().trim().max(120).catch(""),
  status: z.enum(["DRAFT", "ACTIVE", "SUSPENDED", "TERMINATED", "ARCHIVED"]).optional().catch(undefined),
  department: z.string().trim().max(120).catch(""),
})
export type PeopleDirectoryQuery = z.output<typeof peopleDirectoryQuerySchema>
export function peopleDirectoryHref(path: string, query: PeopleDirectoryQuery, page: number) {
  const params = new URLSearchParams()
  if (query.search) params.set("search", query.search)
  if (query.status) params.set("status", query.status)
  if (query.department) params.set("department", query.department)
  if (page > 1) params.set("page", String(page))
  return `${path}${params.size ? `?${params}` : ""}`
}
