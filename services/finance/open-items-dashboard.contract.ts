import { z } from "zod"

export const openItemsScopeSchema = z.object({
  view: z.enum(["receivables", "payables"]),
  locationId: z.string().trim().min(1).max(200).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  search: z.string().trim().max(100).default(""),
  bucket: z.enum(["all", "current", "1-30", "31-60", "61-90", "90+", "unknown"]).default("all"),
  queue: z.enum(["all", "overdue", "due7", "due30", "unknown", "unverified"]).default("all"),
  counterpartyId: z.string().trim().min(1).max(200).optional(),
  page: z.number().int().min(1).max(1000).default(1),
  pageSize: z.union([z.literal(10), z.literal(25), z.literal(50)]).default(25),
  revision: z.string().regex(/^[a-f0-9]{64}$/).optional(),
}).strict()

export type OpenItemsScope = z.input<typeof openItemsScopeSchema>
export type OpenItemsRow = {
  id: string
  counterpartyId: string
  counterparty: string
  reference: string
  currency: string
  original: string
  allocated: string | null
  credits: string | null
  outstanding: string | null
  dueDate: string | null
  daysPastDue: number | null
  daysUntilDue: number | null
  bucket: "current" | "1-30" | "31-60" | "61-90" | "90+" | "unknown"
  state: string
  evidence: "posted" | "operational" | "unverified"
}
export type OpenItemsCurrency = {
  currency: string
  count: number
  outstanding: string | null
  overdue: string | null
  aging: Record<OpenItemsRow["bucket"], string> | null
  due: { today: string; next7: string; next30: string } | null
  unverifiedCount: number
  performance: { overdueShare: string | null; largestCounterpartyShare: string | null; topFiveShare: string | null } | null
  topCounterparties: Array<{ id: string; name: string; outstanding: string; count: number }> | null
}
export type OpenItemsDashboard = {
  kind: "open-items-v1"
  view: OpenItemsScope["view"]
  organization: { id: string; name: string; currency: string; timezone: string }
  locations: Array<{ id: string; name: string }>
  scope: { locationId: string | null; currency: string | null }
  checkedAt: string
  revision: string
  evidence: "posted-ar" | "operational-ap"
  coverage: "complete-population" | "no-documents" | "unverified"
  locationBasis: "source-sale" | "purchase-order"
  unassignedDocumentCount: number
  sourceDocumentCount: number
  availableCurrencies: string[]
  queueCounts: Record<"all" | "overdue" | "due7" | "due30" | "unknown" | "unverified", number>
  currencies: OpenItemsCurrency[]
  records: { rows: OpenItemsRow[]; total: number; page: number; pageSize: number }
}
