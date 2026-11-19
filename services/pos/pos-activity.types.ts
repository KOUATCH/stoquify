export const posActivityKinds = ["sale", "return", "void", "shift_open", "shift_close", "drawer"] as const

export type POSActivityKind = typeof posActivityKinds[number]
export type POSActivityView = "all" | "receipts"
export type POSActivityAccessMode = "manager" | "own"
export type POSActivityWhatsAppStatus = "QUEUED" | "RETRYING" | "ACCEPTED" | "UNCERTAIN" | "FAILED" | "UNAVAILABLE"

export type POSActivityOption = { id: string; label: string }
export type POSActivityTerminalOption = POSActivityOption & { locationId: string }
export type POSActivitySessionOption = POSActivityTerminalOption & { terminalId: string }

export type POSActivityFilters = {
  date?: string
  locationId?: string | null
  terminalId?: string | null
  sessionId?: string | null
}

export type POSActivityListInput = POSActivityFilters & {
  view?: POSActivityView
  search?: string
  cursor?: string
  total?: string
  fromTime?: string
  toTime?: string
}
export type POSActivityDetailInput = POSActivityFilters & { kind: POSActivityKind; id: string }

export type POSActivityRow = {
  id: string
  kind: POSActivityKind
  occurredAt: string
  reference: string
  status: string
  amount: string | null
  location: POSActivityOption
  terminal: POSActivityOption | null
  session: POSActivityOption | null
  cashier: string | null
  customer: { name: string; phoneLastFour: string | null } | null
  saleId: string | null
  whatsAppStatus: POSActivityWhatsAppStatus | null
  printMode: "print" | "reprint" | null
  canReprint: boolean
  canSendWhatsApp: boolean
}

export type POSActivityDetail = POSActivityRow & {
  lines: { id: string; name: string; sku: string; quantity: string; unitPrice: string; total: string }[]
  tenders: { id: string; reference: string; method: string; status: string; amount: string; cashTendered: string | null; changeGiven: string | null }[]
  corrections: { id: string; kind: "sale" | "return" | "void"; occurredAt: string; amount: string | null }[]
  totals: { subtotal: string; discount: string; tax: string; total: string } | null
  drawerBalances: { opening: string | null; closing: string | null; expected: string | null; variance: string | null; before: string | null; after: string | null } | null
}

export type POSActivityPage = {
  today: string
  date: string
  timezone: string
  currency: string
  accessMode: POSActivityAccessMode
  filters: {
    locationId: string | null
    terminalId: string | null
    sessionId: string | null
    view: POSActivityView
    search: string
    total: string | null
    fromTime: string | null
    toTime: string | null
  }
  options: { locations: POSActivityOption[]; terminals: POSActivityTerminalOption[]; sessions: POSActivitySessionOption[] }
  rows: POSActivityRow[]
  nextCursor: string | null
}
