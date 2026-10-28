import { createHash } from "node:crypto"

import { CustomerCreateSchema } from "@/services/customer/customer.schemas"
import { ItemCreateSchema } from "@/services/item/item.schemas"
import { SupplierCreateSchema } from "@/services/supplier/supplier.schemas"
import { BusinessRuleError } from "@/services/_shared/action-errors"

export const MASTER_DATA_IMPORT_SCHEMA_VERSION = "1"
export const MASTER_DATA_IMPORT_MAX_BYTES = 5 * 1024 * 1024
export const MASTER_DATA_IMPORT_MAX_ROWS = 1_000

export const MASTER_DATA_IMPORT_TARGETS = ["CUSTOMER", "SUPPLIER", "ITEM"] as const
export type MasterDataImportTarget = (typeof MASTER_DATA_IMPORT_TARGETS)[number]

type TargetConfiguration = {
  label: string
  filename: string
  fields: readonly string[]
  requiredFields: readonly string[]
  businessKey: string
}

export const MASTER_DATA_TARGET_CONFIG: Record<MasterDataImportTarget, TargetConfiguration> = {
  CUSTOMER: {
    label: "customers",
    filename: "customers",
    fields: [
      "code",
      "name",
      "email",
      "phone",
      "address",
      "taxId",
      "paymentTerms",
      "creditLimit",
      "preferredLocale",
      "isActive",
    ],
    requiredFields: ["code", "name"],
    businessKey: "code",
  },
  SUPPLIER: {
    label: "suppliers",
    filename: "suppliers",
    fields: [
      "code",
      "name",
      "contactPerson",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "zipCode",
      "country",
      "taxId",
      "paymentTerms",
      "creditLimit",
      "preferredLocale",
      "isActive",
    ],
    requiredFields: ["code", "name"],
    businessKey: "code",
  },
  ITEM: {
    label: "items",
    filename: "items",
    fields: [
      "sku",
      "nameEn",
      "nameFr",
      "descriptionEn",
      "descriptionFr",
      "costPrice",
      "sellingPrice",
    ],
    requiredFields: ["sku", "nameEn"],
    businessKey: "sku",
  },
}

export type MasterDataFieldMap = Record<string, string>

export type MasterDataSafeIssue = {
  rowNumber: number
  field: string | null
  severity: "ERROR" | "WARNING"
  code: string
  safeMessage: string
}

export type MasterDataAnalyzedRow = {
  rowNumber: number
  sourceRowHash: string
  businessKey: string | null
  normalizedData: Record<string, unknown>
  valid: boolean
  issues: MasterDataSafeIssue[]
}

export type MasterDataCsvAnalysis = {
  rows: MasterDataAnalyzedRow[]
  issues: MasterDataSafeIssue[]
  sourceRecordCount: number
  validRecordCount: number
  errorRecordCount: number
  duplicateRecordCount: number
  sourceRequiredFieldTotals: Record<string, number>
}

type ParsedCsvRow = { rowNumber: number; values: string[] }

function sha256(value: string | Buffer) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`
}

export function hashCsvContent(content: string) {
  return sha256(Buffer.from(content, "utf8"))
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}

export function hashStablePayload(value: unknown) {
  return sha256(stableStringify(value))
}

export function normalizeBusinessKey(value: string) {
  return value.trim().toLocaleLowerCase("en-US")
}

export function defaultFieldMap(target: MasterDataImportTarget): MasterDataFieldMap {
  return Object.fromEntries(MASTER_DATA_TARGET_CONFIG[target].fields.map((field) => [field, field]))
}

export function validateFieldMap(target: MasterDataImportTarget, fieldMap: MasterDataFieldMap) {
  const config = MASTER_DATA_TARGET_CONFIG[target]
  const allowedTargets = new Set(config.fields)
  const seenTargets = new Set<string>()

  for (const [sourceColumn, targetField] of Object.entries(fieldMap)) {
    if (!sourceColumn.trim()) throw new BusinessRuleError("Mapping source columns must not be empty")
    if (!allowedTargets.has(targetField)) {
      throw new BusinessRuleError(`Unsupported ${config.label} target field: ${targetField}`)
    }
    if (seenTargets.has(targetField)) {
      throw new BusinessRuleError(`Target field ${targetField} may only be mapped once`)
    }
    seenTargets.add(targetField)
  }

  for (const requiredField of config.requiredFields) {
    if (!seenTargets.has(requiredField)) {
      throw new BusinessRuleError(`Required target field ${requiredField} must be mapped`)
    }
  }
}

export function buildTenantCsvTemplate(organizationId: string, target: MasterDataImportTarget) {
  const config = MASTER_DATA_TARGET_CONFIG[target]
  const content = `${config.fields.join(",")}\r\n`
  return {
    organizationId,
    target,
    schemaVersion: MASTER_DATA_IMPORT_SCHEMA_VERSION,
    filename: `${organizationId}-${config.filename}-v${MASTER_DATA_IMPORT_SCHEMA_VERSION}.csv`,
    mimeType: "text/csv",
    content,
    contentHash: hashCsvContent(content),
    requiredFields: [...config.requiredFields],
  }
}

function parseCsv(content: string): { headers: string[]; rows: ParsedCsvRow[]; issues: MasterDataSafeIssue[] } {
  const source = content.replace(/^\uFEFF/, "")
  const records: string[][] = []
  const rowNumbers: number[] = []
  let record: string[] = []
  let field = ""
  let quoted = false
  let line = 1
  let recordStartLine = 1

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
        if (char === "\n") line += 1
      }
      continue
    }

    if (char === '"' && field.length === 0) {
      quoted = true
    } else if (char === ",") {
      record.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1
      record.push(field)
      if (record.some((value) => value.trim() !== "")) {
        records.push(record)
        rowNumbers.push(recordStartLine)
      }
      record = []
      field = ""
      line += 1
      recordStartLine = line
    } else {
      field += char
    }
  }

  if (quoted) {
    return {
      headers: [],
      rows: [],
      issues: [{
        rowNumber: recordStartLine,
        field: null,
        severity: "ERROR",
        code: "CSV_UNTERMINATED_QUOTE",
        safeMessage: "The CSV contains an unterminated quoted field.",
      }],
    }
  }

  record.push(field)
  if (record.some((value) => value.trim() !== "")) {
    records.push(record)
    rowNumbers.push(recordStartLine)
  }

  const headers = (records.shift() ?? []).map((header) => header.trim())
  rowNumbers.shift()
  const duplicateHeaders = headers.filter((header, index) => headers.indexOf(header) !== index)
  const issues: MasterDataSafeIssue[] = duplicateHeaders.map((header) => ({
    rowNumber: 1,
    field: null,
    severity: "ERROR",
    code: "CSV_DUPLICATE_HEADER",
    safeMessage: "Each CSV header must be unique.",
  }))

  const rows = records.map((values, index) => ({ rowNumber: rowNumbers[index] ?? index + 2, values }))
  return { headers, rows, issues }
}

function safeSchemaIssue(rowNumber: number, field: string | null): MasterDataSafeIssue {
  return {
    rowNumber,
    field,
    severity: "ERROR",
    code: "FIELD_INVALID",
    safeMessage: field ? `The ${field} field is invalid.` : "The row does not match the target schema.",
  }
}

function parseOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined
  if (typeof value !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value.trim())) return value
  return Number(value)
}

function parseOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined
  if (typeof value !== "string") return value
  const normalized = value.trim().toLowerCase()
  if (["true", "1", "yes"].includes(normalized)) return true
  if (["false", "0", "no"].includes(normalized)) return false
  return value
}

function prepareDomainData(target: MasterDataImportTarget, mapped: Record<string, string>) {
  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(mapped)) {
    data[key] = value.trim() === "" ? undefined : value.trim()
  }

  if ("paymentTerms" in data) data.paymentTerms = parseOptionalNumber(data.paymentTerms)
  if ("creditLimit" in data) data.creditLimit = parseOptionalNumber(data.creditLimit)
  if ("costPrice" in data) data.costPrice = parseOptionalNumber(data.costPrice)
  if ("sellingPrice" in data) data.sellingPrice = parseOptionalNumber(data.sellingPrice)
  if ("isActive" in data) data.isActive = parseOptionalBoolean(data.isActive)
  if (typeof data.preferredLocale === "string") data.preferredLocale = data.preferredLocale.toUpperCase()

  const schema =
    target === "CUSTOMER"
      ? CustomerCreateSchema
      : target === "SUPPLIER"
        ? SupplierCreateSchema
        : ItemCreateSchema
  return schema.safeParse(data)
}

export function parseMasterDataDomainRow(
  target: MasterDataImportTarget,
  data: Record<string, unknown>,
) {
  const schema =
    target === "CUSTOMER"
      ? CustomerCreateSchema
      : target === "SUPPLIER"
        ? SupplierCreateSchema
        : ItemCreateSchema
  return schema.safeParse(data)
}

function isSpreadsheetFormula(value: string) {
  const trimmed = value.trimStart()
  return /^[=@]/.test(trimmed) || /^[+-](?!\d+(?:\.\d+)?$)/.test(trimmed)
}

export function analyzeMasterDataCsv(input: {
  target: MasterDataImportTarget
  content: string
  fieldMap: MasterDataFieldMap
  existingBusinessKeys?: ReadonlySet<string>
}): MasterDataCsvAnalysis {
  validateFieldMap(input.target, input.fieldMap)
  const config = MASTER_DATA_TARGET_CONFIG[input.target]
  const parsed = parseCsv(input.content)
  const issues = [...parsed.issues]
  const normalizedHeaderMap = new Map(parsed.headers.map((header, index) => [header.toLowerCase(), index]))
  const normalizedMappings = Object.entries(input.fieldMap).map(([source, target]) => ({
    source,
    target,
    index: normalizedHeaderMap.get(source.trim().toLowerCase()),
  }))

  for (const mapping of normalizedMappings) {
    if (mapping.index === undefined) {
      issues.push({
        rowNumber: 1,
        field: mapping.source,
        severity: "ERROR",
        code: "CSV_MISSING_MAPPED_COLUMN",
        safeMessage: "A mapped CSV column is missing from the header.",
      })
    }
  }

  const mappedHeaders = new Set(Object.keys(input.fieldMap).map((header) => header.trim().toLowerCase()))
  for (const header of parsed.headers) {
    if (!mappedHeaders.has(header.toLowerCase())) {
      issues.push({
        rowNumber: 1,
        field: null,
        severity: "ERROR",
        code: "CSV_UNMAPPED_COLUMN",
        safeMessage: "Every source column must be included in the selected mapping version.",
      })
    }
  }

  if (parsed.rows.length > MASTER_DATA_IMPORT_MAX_ROWS) {
    issues.push({
      rowNumber: 1,
      field: null,
      severity: "ERROR",
      code: "CSV_ROW_LIMIT_EXCEEDED",
      safeMessage: `This first slice accepts at most ${MASTER_DATA_IMPORT_MAX_ROWS} rows per batch.`,
    })
  }

  const rows: MasterDataAnalyzedRow[] = []
  const sourceRequiredFieldTotals = Object.fromEntries(config.requiredFields.map((field) => [field, 0]))
  const fileKeyCounts = new Map<string, number>()

  for (const csvRow of parsed.rows.slice(0, MASTER_DATA_IMPORT_MAX_ROWS)) {
    const rowIssues: MasterDataSafeIssue[] = []
    const mapped: Record<string, string> = {}
    if (csvRow.values.length !== parsed.headers.length) {
      rowIssues.push({
        rowNumber: csvRow.rowNumber,
        field: null,
        severity: "ERROR",
        code: "CSV_COLUMN_COUNT_MISMATCH",
        safeMessage: "The row column count does not match the CSV header.",
      })
    }

    for (const mapping of normalizedMappings) {
      const value = mapping.index === undefined ? "" : (csvRow.values[mapping.index] ?? "")
      mapped[mapping.target] = value
      if (isSpreadsheetFormula(value)) {
        rowIssues.push({
          rowNumber: csvRow.rowNumber,
          field: mapping.target,
          severity: "ERROR",
          code: "CSV_FORMULA_REJECTED",
          safeMessage: "Spreadsheet formulas are not accepted in onboarding imports.",
        })
      }
    }

    for (const requiredField of config.requiredFields) {
      if ((mapped[requiredField] ?? "").trim()) sourceRequiredFieldTotals[requiredField] += 1
      else {
        rowIssues.push({
          rowNumber: csvRow.rowNumber,
          field: requiredField,
          severity: "ERROR",
          code: "REQUIRED_FIELD_MISSING",
          safeMessage: `The ${requiredField} field is required.`,
        })
      }
    }

    const validation = prepareDomainData(input.target, mapped)
    const normalizedData = validation.success ? validation.data : mapped
    if (!validation.success) {
      for (const schemaIssue of validation.error.issues) {
        const field = typeof schemaIssue.path[0] === "string" ? schemaIssue.path[0] : null
        if (!rowIssues.some((issue) => issue.field === field && issue.code === "REQUIRED_FIELD_MISSING")) {
          rowIssues.push(safeSchemaIssue(csvRow.rowNumber, field))
        }
      }
    }

    const rawKey = mapped[config.businessKey]?.trim() ?? ""
    const businessKey = rawKey ? normalizeBusinessKey(rawKey) : null
    if (businessKey) fileKeyCounts.set(businessKey, (fileKeyCounts.get(businessKey) ?? 0) + 1)
    rows.push({
      rowNumber: csvRow.rowNumber,
      sourceRowHash: hashStablePayload(csvRow.values),
      businessKey,
      normalizedData: normalizedData as Record<string, unknown>,
      valid: rowIssues.length === 0,
      issues: rowIssues,
    })
  }

  const existingKeys = input.existingBusinessKeys ?? new Set<string>()
  for (const row of rows) {
    if (row.businessKey && (fileKeyCounts.get(row.businessKey) ?? 0) > 1) {
      row.issues.push({
        rowNumber: row.rowNumber,
        field: config.businessKey,
        severity: "ERROR",
        code: "DUPLICATE_IN_FILE",
        safeMessage: `The ${config.businessKey} is duplicated within this file.`,
      })
    }
    if (row.businessKey && existingKeys.has(row.businessKey)) {
      row.issues.push({
        rowNumber: row.rowNumber,
        field: config.businessKey,
        severity: "ERROR",
        code: "DUPLICATE_IN_TENANT",
        safeMessage: `The ${config.businessKey} already exists in this tenant.`,
      })
    }
    row.valid = row.issues.length === 0
    issues.push(...row.issues)
  }

  const duplicateRows = new Set(
    issues
      .filter((issue) => issue.code === "DUPLICATE_IN_FILE" || issue.code === "DUPLICATE_IN_TENANT")
      .map((issue) => issue.rowNumber),
  )
  const errorRows = new Set(issues.filter((issue) => issue.severity === "ERROR").map((issue) => issue.rowNumber))
  return {
    rows,
    issues,
    sourceRecordCount: rows.length,
    validRecordCount: rows.filter((row) => row.valid).length,
    errorRecordCount: errorRows.size,
    duplicateRecordCount: duplicateRows.size,
    sourceRequiredFieldTotals,
  }
}
