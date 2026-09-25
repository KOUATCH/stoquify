import { z } from "zod"

export type TableLocale = "en" | "fr"
export type TableDensity = "comfortable" | "compact"
export type TableArchetype =
  | "master-reference"
  | "work-queue"
  | "ledger"
  | "evidence"
  | "analytical"

export type TableDataOwnership =
  | "client-bounded"
  | "hybrid-server-seed"
  | "server-offset"
  | "server-cursor"
  | "immutable-evidence"

export type TableResultCount =
  | { kind: "known"; total: number }
  | { kind: "estimated"; total: number }
  | { kind: "unknown" }

export type CanonicalTableStateKind =
  | "loading"
  | "refreshing"
  | "empty"
  | "no-results"
  | "error"
  | "forbidden"
  | "not-entitled"
  | "ready"

export interface CanonicalTableColumn {
  id: string
  label: Record<TableLocale, string>
  defaultVisible: boolean
  hideable?: boolean
  sortable?: boolean
  filterable?: boolean
  exportable?: boolean
  sensitive?: boolean
  requiredPermission?: string
  alignment?: "left" | "center" | "right"
  frozen?: "start" | "end"
}

export interface CanonicalTableFilter {
  id: string
  values?: readonly string[]
  requiredPermission?: string
}

export interface CanonicalTableAction {
  id: string
  requiredPermission: string
  requiredModule: string
  protectedAction: boolean
  mutatesBusinessTruth: boolean
  requiresFreshAuth?: boolean
}

export interface CanonicalTableContract {
  id: string
  version: number
  route: string
  module: string
  archetype: TableArchetype
  dataOwnership: TableDataOwnership
  rowId: string
  labels: Record<TableLocale, string>
  access: {
    readPermission: string
    requiredModule: string
    tenantScoped: true
    redactionPolicy: string
    readPermissionsAnyOf?: readonly string[]
  }
  query: {
    searchParam: string
    defaultPageSize: number
    maxPageSize: number
    allowedPageSizes: readonly number[]
    allowedSorts: readonly string[]
    allowedFilters: readonly CanonicalTableFilter[]
  }
  columns: {
    allowed: readonly CanonicalTableColumn[]
  }
  selection: {
    enabled: boolean
    allowedScopes: readonly TableSelectionScopeKind[]
    clearOnQueryChange: boolean
  }
  actions: readonly CanonicalTableAction[]
  export: {
    enabled: boolean
    requiredPermission: string
    requiredModule: string
    sourceReadModel: string
    serverFinalized: boolean
    formats: readonly ("csv" | "xlsx" | "pdf" | "json")[]
  }
  builtInViews: readonly {
    id: string
    labels: Record<TableLocale, string>
    filters: Readonly<Record<string, readonly string[]>>
  }[]
}

const unique = (values: readonly string[]) => new Set(values).size === values.length

export function defineCanonicalTableContract(
  contract: CanonicalTableContract,
): CanonicalTableContract {
  if (!contract.id.includes(".")) {
    throw new Error(`Canonical table id must be namespaced: ${contract.id}`)
  }
  if (contract.version < 1 || !Number.isInteger(contract.version)) {
    throw new Error(`Canonical table version must be a positive integer: ${contract.id}`)
  }
  if (contract.query.defaultPageSize > contract.query.maxPageSize) {
    throw new Error(`Default page size exceeds maximum for ${contract.id}`)
  }
  if (!contract.query.allowedPageSizes.includes(contract.query.defaultPageSize)) {
    throw new Error(`Default page size is not allowed for ${contract.id}`)
  }
  if (!unique(contract.columns.allowed.map((column) => column.id))) {
    throw new Error(`Duplicate column id in ${contract.id}`)
  }
  if (!unique(contract.actions.map((action) => action.id))) {
    throw new Error(`Duplicate action id in ${contract.id}`)
  }
  if (contract.access.requiredModule !== contract.module) {
    throw new Error(`Module access boundary differs from table module for ${contract.id}`)
  }
  if (contract.export.enabled && !contract.export.serverFinalized) {
    throw new Error(`Exports must be server-finalized for ${contract.id}`)
  }
  return Object.freeze(contract)
}

export interface CanonicalTableSort {
  id: string
  desc: boolean
}

export interface CanonicalTableQuery {
  search: string
  filters: Record<string, string[]>
  sort: CanonicalTableSort[]
  pageIndex: number
  pageSize: number
  cursor?: string
  viewId?: string
}

export function createCanonicalTableQuery(
  contract: CanonicalTableContract,
  input: Partial<CanonicalTableQuery> = {},
): CanonicalTableQuery {
  const allowedFilterIds = new Set(contract.query.allowedFilters.map((filter) => filter.id))
  const allowedSortIds = new Set(contract.query.allowedSorts)
  const allowedPageSizes = contract.query.allowedPageSizes
  const requestedPageSize = Number(input.pageSize)
  const pageSize = allowedPageSizes.includes(requestedPageSize)
    ? requestedPageSize
    : contract.query.defaultPageSize

  const filters = Object.fromEntries(
    Object.entries(input.filters ?? {})
      .filter(([id]) => allowedFilterIds.has(id))
      .map(([id, values]) => {
        const definition = contract.query.allowedFilters.find((filter) => filter.id === id)
        const permittedValues = definition?.values ? new Set(definition.values) : null
        const sanitized = [...new Set(values.map(String).filter(Boolean))].filter(
          (value) => !permittedValues || permittedValues.has(value),
        )
        return [id, sanitized]
      })
      .filter(([, values]) => values.length > 0),
  )

  return {
    search: String(input.search ?? "").trim().slice(0, 200),
    filters,
    sort: (input.sort ?? [])
      .filter((sort) => allowedSortIds.has(sort.id))
      .slice(0, 3)
      .map((sort) => ({ id: sort.id, desc: Boolean(sort.desc) })),
    pageIndex: Math.max(0, Number.isFinite(input.pageIndex) ? Math.floor(input.pageIndex!) : 0),
    pageSize,
    ...(input.cursor ? { cursor: String(input.cursor).slice(0, 500) } : {}),
    ...(input.viewId ? { viewId: String(input.viewId).slice(0, 100) } : {}),
  }
}

export function parseCanonicalTableQuery(
  contract: CanonicalTableContract,
  source: URLSearchParams | string,
): CanonicalTableQuery {
  const params = typeof source === "string" ? new URLSearchParams(source) : source
  const sort = params
    .getAll("sort")
    .map((entry) => entry.split(":"))
    .filter((entry) => entry.length === 2)
    .map(([id, direction]) => ({ id, desc: direction === "desc" }))
  const filters = Object.fromEntries(
    contract.query.allowedFilters.map((filter) => [filter.id, params.getAll(`f.${filter.id}`)]),
  )

  return createCanonicalTableQuery(contract, {
    search: params.get(contract.query.searchParam) ?? "",
    filters,
    sort,
    pageIndex: Number(params.get("page") ?? 1) - 1,
    pageSize: Number(params.get("pageSize") ?? contract.query.defaultPageSize),
    cursor: params.get("cursor") ?? undefined,
    viewId: params.get("view") ?? undefined,
  })
}

export function serializeCanonicalTableQuery(
  contract: CanonicalTableContract,
  queryInput: Partial<CanonicalTableQuery>,
  current?: URLSearchParams | string,
): URLSearchParams {
  const query = createCanonicalTableQuery(contract, queryInput)
  const params = new URLSearchParams(typeof current === "string" ? current : current?.toString())
  const managed = [
    contract.query.searchParam,
    "sort",
    "page",
    "pageSize",
    "cursor",
    "view",
    ...contract.query.allowedFilters.map((filter) => `f.${filter.id}`),
  ]
  managed.forEach((key) => params.delete(key))

  if (query.search) params.set(contract.query.searchParam, query.search)
  query.sort.forEach((sort) => params.append("sort", `${sort.id}:${sort.desc ? "desc" : "asc"}`))
  Object.entries(query.filters).forEach(([id, values]) => {
    values.forEach((value) => params.append(`f.${id}`, value))
  })
  if (query.pageIndex > 0) params.set("page", String(query.pageIndex + 1))
  if (query.pageSize !== contract.query.defaultPageSize) params.set("pageSize", String(query.pageSize))
  if (query.cursor) params.set("cursor", query.cursor)
  if (query.viewId) params.set("view", query.viewId)
  params.sort()
  return params
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    )
  }
  return value
}

export function canonicalTableQueryFingerprint(query: CanonicalTableQuery): string {
  return JSON.stringify(stableValue(query))
}

export type CanonicalTableServerPagination =
  | { kind: "client"; limit: number }
  | { kind: "offset"; offset: number; limit: number }
  | { kind: "cursor"; cursor?: string; limit: number }

export interface CanonicalTableServerQuery {
  tableId: string
  contractVersion: number
  dataOwnership: TableDataOwnership
  search: string
  filters: Record<string, string[]>
  orderBy: CanonicalTableSort[]
  pagination: CanonicalTableServerPagination
  queryFingerprint: string
}

export function toCanonicalTableServerQuery(
  contract: CanonicalTableContract,
  input: Partial<CanonicalTableQuery>,
): CanonicalTableServerQuery {
  const query = createCanonicalTableQuery(contract, input)
  const pagination: CanonicalTableServerPagination = contract.dataOwnership === "client-bounded"
    ? { kind: "client", limit: query.pageSize }
    : contract.dataOwnership === "server-cursor"
      ? { kind: "cursor", ...(query.cursor ? { cursor: query.cursor } : {}), limit: query.pageSize }
      : { kind: "offset", offset: query.pageIndex * query.pageSize, limit: query.pageSize }

  return {
    tableId: contract.id,
    contractVersion: contract.version,
    dataOwnership: contract.dataOwnership,
    search: query.search,
    filters: query.filters,
    orderBy: query.sort,
    pagination,
    queryFingerprint: canonicalTableQueryFingerprint(query),
  }
}

export const canonicalTablePreferencesSchema = z.object({
  schemaVersion: z.literal(1),
  contractVersion: z.number().int().positive(),
  density: z.enum(["comfortable", "compact"]),
  columnVisibility: z.record(z.boolean()),
  columnOrder: z.array(z.string()),
  updatedAt: z.string(),
})

export type CanonicalTablePreferences = z.infer<typeof canonicalTablePreferencesSchema>

export function canonicalTablePreferenceKey(contract: CanonicalTableContract): string {
  return `stoquify:table:${contract.id}:preferences:v1`
}

export function defaultCanonicalTablePreferences(
  contract: CanonicalTableContract,
): CanonicalTablePreferences {
  return {
    schemaVersion: 1,
    contractVersion: contract.version,
    density: "comfortable",
    columnVisibility: Object.fromEntries(
      contract.columns.allowed.map((column) => [column.id, column.defaultVisible]),
    ),
    columnOrder: contract.columns.allowed.map((column) => column.id),
    updatedAt: new Date(0).toISOString(),
  }
}

export function sanitizeCanonicalTablePreferences(
  contract: CanonicalTableContract,
  candidate: unknown,
): CanonicalTablePreferences {
  const defaults = defaultCanonicalTablePreferences(contract)
  const parsed = canonicalTablePreferencesSchema.safeParse(candidate)
  if (!parsed.success || parsed.data.contractVersion !== contract.version) return defaults

  const allowedColumns = new Set(contract.columns.allowed.map((column) => column.id))
  const columnVisibility = Object.fromEntries(
    contract.columns.allowed.map((column) => [
      column.id,
      column.hideable === false
        ? true
        : parsed.data.columnVisibility[column.id] ?? column.defaultVisible,
    ]),
  )
  const requestedOrder = parsed.data.columnOrder.filter((id) => allowedColumns.has(id))
  const columnOrder = [
    ...new Set(requestedOrder),
    ...contract.columns.allowed.map((column) => column.id).filter((id) => !requestedOrder.includes(id)),
  ]

  return { ...parsed.data, columnVisibility, columnOrder }
}

export function loadCanonicalTablePreferences(
  contract: CanonicalTableContract,
  storage?: Pick<Storage, "getItem">,
): CanonicalTablePreferences {
  if (!storage) return defaultCanonicalTablePreferences(contract)
  try {
    const value = storage.getItem(canonicalTablePreferenceKey(contract))
    return value ? sanitizeCanonicalTablePreferences(contract, JSON.parse(value)) : defaultCanonicalTablePreferences(contract)
  } catch {
    return defaultCanonicalTablePreferences(contract)
  }
}

export function saveCanonicalTablePreferences(
  contract: CanonicalTableContract,
  preferences: CanonicalTablePreferences,
  storage?: Pick<Storage, "setItem">,
): CanonicalTablePreferences {
  const sanitized = sanitizeCanonicalTablePreferences(contract, preferences)
  if (storage) storage.setItem(canonicalTablePreferenceKey(contract), JSON.stringify(sanitized))
  return sanitized
}

export const canonicalSavedViewSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1).max(100),
  tableId: z.string().min(3).max(150),
  ownerUserId: z.string().min(1).max(150),
  organizationId: z.string().min(1).max(150),
  name: z.string().min(1).max(80),
  visibility: z.enum(["private", "organization"]),
  requiredPermissions: z.array(z.string()).max(50),
  query: z.object({
    search: z.string().max(200),
    filters: z.record(z.array(z.string().max(200)).max(50)),
    sort: z.array(z.object({ id: z.string(), desc: z.boolean() })).max(3),
    pageSize: z.number().int().positive(),
  }),
  columns: z.object({
    visible: z.array(z.string()).max(100),
    order: z.array(z.string()).max(100),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type CanonicalSavedView = z.infer<typeof canonicalSavedViewSchema>

export interface SavedViewAccessContext {
  organizationId: string
  userId: string
  permissions: ReadonlySet<string>
}

export function hydratePermissionSafeSavedView(
  contract: CanonicalTableContract,
  candidate: unknown,
  access: SavedViewAccessContext,
): CanonicalSavedView | null {
  const parsed = canonicalSavedViewSchema.safeParse(candidate)
  if (!parsed.success) return null
  const view = parsed.data
  if (view.tableId !== contract.id || view.organizationId !== access.organizationId) return null
  if (view.visibility === "private" && view.ownerUserId !== access.userId) return null
  if (view.requiredPermissions.some((permission) => !access.permissions.has(permission))) return null

  const allowedFilters = new Set(
    contract.query.allowedFilters
      .filter((filter) => !filter.requiredPermission || access.permissions.has(filter.requiredPermission))
      .map((filter) => filter.id),
  )
  const allowedColumns = new Set(
    contract.columns.allowed
      .filter((column) => !column.requiredPermission || access.permissions.has(column.requiredPermission))
      .map((column) => column.id),
  )
  const query = createCanonicalTableQuery(contract, {
    ...view.query,
    filters: Object.fromEntries(
      Object.entries(view.query.filters).filter(([id]) => allowedFilters.has(id)),
    ),
  })

  return {
    ...view,
    query: {
      search: query.search,
      filters: query.filters,
      sort: query.sort,
      pageSize: query.pageSize,
    },
    columns: {
      visible: view.columns.visible.filter((id) => allowedColumns.has(id)),
      order: view.columns.order.filter((id) => allowedColumns.has(id)),
    },
  }
}

export type TableSelectionScopeKind = "page" | "explicit" | "all-matching"

export type CanonicalTableSelection =
  | { kind: "page"; rowIds: string[]; queryFingerprint: string }
  | { kind: "explicit"; rowIds: string[]; queryFingerprint: string }
  | { kind: "all-matching"; excludedRowIds: string[]; queryFingerprint: string; resultCount: TableResultCount }

export function createCanonicalTableSelection(
  kind: TableSelectionScopeKind,
  query: CanonicalTableQuery,
  rowIds: readonly string[],
  resultCount: TableResultCount = { kind: "unknown" },
): CanonicalTableSelection {
  const queryFingerprint = canonicalTableQueryFingerprint(query)
  const ids = [...new Set(rowIds.map(String).filter(Boolean))]
  if (kind === "all-matching") {
    return { kind, excludedRowIds: ids, queryFingerprint, resultCount }
  }
  return { kind, rowIds: ids, queryFingerprint }
}

export function reconcileCanonicalTableSelection(
  selection: CanonicalTableSelection,
  query: CanonicalTableQuery,
  clearOnQueryChange = true,
): CanonicalTableSelection | null {
  if (!clearOnQueryChange || selection.queryFingerprint === canonicalTableQueryFingerprint(query)) {
    return selection
  }
  return null
}

const COMMON_COPY = {
  en: {
    rows: "rows",
    selected: "selected",
    estimated: "estimated",
    matching: "matching rows",
    loading: "Loading rows",
    refreshing: "Refreshing rows",
    empty: "No records yet",
    noResults: "No rows match the current filters",
    error: "The table could not be loaded",
    forbidden: "You do not have permission to view this table",
    notEntitled: "This module is not enabled for your organization",
    ready: "Table ready",
  },
  fr: {
    rows: "lignes",
    selected: "selectionnees",
    estimated: "estimees",
    matching: "lignes correspondantes",
    loading: "Chargement des lignes",
    refreshing: "Actualisation des lignes",
    empty: "Aucun enregistrement",
    noResults: "Aucune ligne ne correspond aux filtres actuels",
    error: "Le tableau n'a pas pu etre charge",
    forbidden: "Vous n'avez pas l'autorisation de consulter ce tableau",
    notEntitled: "Ce module n'est pas active pour votre organisation",
    ready: "Tableau pret",
  },
} as const

export function formatCanonicalSelection(
  selection: CanonicalTableSelection | null,
  locale: TableLocale,
): string {
  if (!selection) return ""
  const copy = COMMON_COPY[locale]
  if (selection.kind === "all-matching") {
    const total = selection.resultCount.kind === "unknown" ? "" : ` ${selection.resultCount.total}`
    const estimate = selection.resultCount.kind === "estimated" ? ` ${copy.estimated}` : ""
    return `${total}${estimate} ${copy.matching} ${copy.selected}`.trim()
  }
  return `${selection.rowIds.length} ${copy.rows} ${copy.selected}`
}

export function formatCanonicalResultRange(
  start: number,
  end: number,
  count: TableResultCount,
  locale: TableLocale,
): string {
  const copy = COMMON_COPY[locale]
  if (count.kind === "unknown") return `${start}-${end} ${copy.rows}`
  const estimate = count.kind === "estimated" ? `${copy.estimated} ` : ""
  return `${start}-${end} / ${estimate}${count.total} ${copy.rows}`
}

export function canonicalTableStateAnnouncement(
  state: CanonicalTableStateKind,
  locale: TableLocale,
): string {
  const copy = COMMON_COPY[locale]
  const key = state === "no-results" ? "noResults" : state === "not-entitled" ? "notEntitled" : state
  return copy[key as keyof typeof copy]
}

export function resolveCanonicalTableState(input: {
  loading?: boolean
  refreshing?: boolean
  error?: boolean
  forbidden?: boolean
  entitled?: boolean
  rowCount: number
  hasActiveQuery: boolean
}): CanonicalTableStateKind {
  if (input.forbidden) return "forbidden"
  if (input.entitled === false) return "not-entitled"
  if (input.error) return "error"
  if (input.loading) return "loading"
  if (input.refreshing) return "refreshing"
  if (input.rowCount === 0) return input.hasActiveQuery ? "no-results" : "empty"
  return "ready"
}

const tableResultCountSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("known"), total: z.number().int().nonnegative() }),
  z.object({ kind: z.literal("estimated"), total: z.number().int().nonnegative() }),
  z.object({ kind: z.literal("unknown") }),
])

const exportSelectionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("page"), rowIds: z.array(z.string()).max(10_000), queryFingerprint: z.string() }),
  z.object({ kind: z.literal("explicit"), rowIds: z.array(z.string()).max(10_000), queryFingerprint: z.string() }),
  z.object({
    kind: z.literal("all-matching"),
    excludedRowIds: z.array(z.string()).max(10_000),
    queryFingerprint: z.string(),
    resultCount: tableResultCountSchema,
  }),
])

export const canonicalTableExportIntentSchema = z.object({
  schemaVersion: z.literal(1),
  clientRequestId: z.string().min(1).max(150),
  tableId: z.string().min(3).max(150),
  contractVersion: z.number().int().positive(),
  organizationId: z.string().min(1).max(150),
  requiredPermission: z.string().min(1),
  requiredModule: z.string().min(1),
  sourceReadModel: z.string().min(1),
  redactionPolicy: z.string().min(1),
  locale: z.enum(["en", "fr"]),
  timeZone: z.string().min(1).max(100),
  format: z.enum(["csv", "xlsx", "pdf", "json"]),
  query: z.object({
    search: z.string(),
    filters: z.record(z.array(z.string())),
    sort: z.array(z.object({ id: z.string(), desc: z.boolean() })),
    pageIndex: z.number().int().nonnegative(),
    pageSize: z.number().int().positive(),
    cursor: z.string().optional(),
    viewId: z.string().optional(),
  }),
  queryFingerprint: z.string().min(1),
  selection: exportSelectionSchema,
  columns: z.array(z.string()).min(1).max(100),
  requestedAt: z.string(),
})

export type CanonicalTableExportIntent = z.infer<typeof canonicalTableExportIntentSchema>

export const canonicalTableExportRequestSchema = canonicalTableExportIntentSchema.extend({
  requesterUserId: z.string().min(1).max(150),
  authorizationDecisionId: z.string().min(1).max(200),
  idempotencyKey: z.string().min(1).max(200),
  serverAcceptedAt: z.string(),
})

export type CanonicalTableExportRequest = z.infer<typeof canonicalTableExportRequestSchema>

function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `table-export-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function buildCanonicalTableExportIntent(input: {
  contract: CanonicalTableContract
  organizationId: string
  query: CanonicalTableQuery
  selection: CanonicalTableSelection
  columns: readonly string[]
  locale: TableLocale
  timeZone: string
  format: "csv" | "xlsx" | "pdf" | "json"
  clientRequestId?: string
  requestedAt?: string
}): CanonicalTableExportIntent {
  const exportable = new Set(
    input.contract.columns.allowed.filter((column) => column.exportable !== false).map((column) => column.id),
  )
  const intent = {
    schemaVersion: 1 as const,
    clientRequestId: input.clientRequestId ?? newClientRequestId(),
    tableId: input.contract.id,
    contractVersion: input.contract.version,
    organizationId: input.organizationId,
    requiredPermission: input.contract.export.requiredPermission,
    requiredModule: input.contract.export.requiredModule,
    sourceReadModel: input.contract.export.sourceReadModel,
    redactionPolicy: input.contract.access.redactionPolicy,
    locale: input.locale,
    timeZone: input.timeZone,
    format: input.format,
    query: createCanonicalTableQuery(input.contract, input.query),
    queryFingerprint: canonicalTableQueryFingerprint(input.query),
    selection: input.selection,
    columns: [...new Set(input.columns)].filter((column) => exportable.has(column)),
    requestedAt: input.requestedAt ?? new Date().toISOString(),
  }
  return canonicalTableExportIntentSchema.parse(intent)
}

export function finalizeCanonicalTableExportRequest(
  intent: CanonicalTableExportIntent,
  serverContext: {
    requesterUserId: string
    authorizationDecisionId: string
    idempotencyKey: string
    serverAcceptedAt?: string
  },
): CanonicalTableExportRequest {
  return canonicalTableExportRequestSchema.parse({
    ...canonicalTableExportIntentSchema.parse(intent),
    ...serverContext,
    serverAcceptedAt: serverContext.serverAcceptedAt ?? new Date().toISOString(),
  })
}

export function canonicalTableExportEvidenceRows(intent: CanonicalTableExportIntent) {
  return [
    { field: "schemaVersion", value: intent.schemaVersion },
    { field: "clientRequestId", value: intent.clientRequestId },
    { field: "tableId", value: intent.tableId },
    { field: "contractVersion", value: intent.contractVersion },
    { field: "organizationId", value: intent.organizationId },
    { field: "requiredPermission", value: intent.requiredPermission },
    { field: "requiredModule", value: intent.requiredModule },
    { field: "sourceReadModel", value: intent.sourceReadModel },
    { field: "redactionPolicy", value: intent.redactionPolicy },
    { field: "locale", value: intent.locale },
    { field: "timeZone", value: intent.timeZone },
    { field: "format", value: intent.format },
    { field: "queryFingerprint", value: intent.queryFingerprint },
    { field: "selectionScope", value: intent.selection.kind },
    { field: "columns", value: intent.columns.join(",") },
    { field: "requestedAt", value: intent.requestedAt },
    { field: "serverFinalization", value: "required" },
  ]
}
