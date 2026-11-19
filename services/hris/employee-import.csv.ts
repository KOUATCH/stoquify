import { safeCsvValue } from "@/services/security/export-csv";

export const HRIS_IMPORT_VERSION = "hris-employee-draft-v1";
export const HRIS_IMPORT_FIELDS = [
  "employeeNumber",
  "displayName",
  "hireDate",
  "countryCode",
  "department",
  "jobTitle",
] as const;
export type ImportField = (typeof HRIS_IMPORT_FIELDS)[number];
export type ImportMapping = Record<string, string>;
export type ImportIssue = { line: number; field: string; code: string };
export type ImportRow = {
  line: number;
  values: Partial<Record<ImportField, string>>;
  issues: ImportIssue[];
};
const required = HRIS_IMPORT_FIELDS.slice(0, 4);
export class EmployeeImportFormatError extends Error {}
const fail = (code: string): never => {
  throw new EmployeeImportFormatError("HRIS_IMPORT_" + code);
};

// Bounded strict comma CSV. Blank physical records are explicitly ignored.
export function parseEmployeeCsv(content: string) {
  let bytes = 0;
  for (const char of content) {
    const n = char.codePointAt(0)!;
    bytes += n < 128 ? 1 : n < 2048 ? 2 : n < 65536 ? 3 : 4;
  }
  if (bytes > 262144) fail("FILE_TOO_LARGE");
  const source = content.replace(/^\uFEFF/, ""),
    records: Array<{ line: number; cells: string[] }> = [];
  let cells: string[] = [],
    value = "",
    state: "start" | "plain" | "quoted" | "closed" = "start",
    line = 1,
    start = 1;
  const field = () => {
    cells.push(value);
    value = "";
    state = "start";
  };
  const record = () => {
    field();
    if (cells.some((c) => c.trim())) records.push({ line: start, cells });
    cells = [];
    start = line + 1;
  };
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (state === "quoted") {
      if (c === '"') {
        if (source[i + 1] === '"') {
          value += '"';
          i++;
        } else state = "closed";
      } else {
        value += c;
        if (c === "\n") line++;
      }
      continue;
    }
    if (c === ",") {
      field();
      continue;
    }
    if (c === "\n" || c === "\r") {
      record();
      if (c === "\r" && source[i + 1] === "\n") i++;
      line++;
      continue;
    }
    if (state === "closed") fail("CHARACTER_AFTER_QUOTE");
    if (c === '"') {
      if (state !== "start") fail("QUOTE_IN_UNQUOTED_FIELD");
      state = "quoted";
    } else {
      state = "plain";
      value += c;
    }
  }
  if (state === "quoted") fail("UNTERMINATED_QUOTE");
  record();
  const header = records.shift(),
    headers = header?.cells.map((c) => c.trim()) ?? [];
  if (
    !headers.length ||
    headers.some((c) => !c) ||
    new Set(headers).size !== headers.length
  )
    fail("INVALID_HEADERS");
  if (headers.length > 20) fail("TOO_MANY_COLUMNS");
  if (!records.length || records.length > 200) fail("ROW_LIMIT_1_200");
  return { headers, records };
}

export function analyzeEmployeeCsv(content: string, mapping: ImportMapping) {
  const { headers, records } = parseEmployeeCsv(content),
    targets = Object.values(mapping);
  if (
    Object.keys(mapping).some((h) => !headers.includes(h)) ||
    targets.some((f) => !HRIS_IMPORT_FIELDS.includes(f as ImportField)) ||
    new Set(targets).size !== targets.length ||
    required.some((f) => !targets.includes(f))
  )
    fail("INVALID_MAPPING");
  const rows: ImportRow[] = records.map((record) => {
    const issues: ImportIssue[] = [],
      values: ImportRow["values"] = {};
    const issue = (field: string, code: string) =>
      issues.push({ line: record.line, field, code });
    if (record.cells.length !== headers.length) issue("row", "COLUMN_COUNT");
    for (let i = 0; i < headers.length; i++) {
      const raw = record.cells[i] ?? "",
        target = (
          Object.prototype.hasOwnProperty.call(mapping, headers[i])
            ? mapping[headers[i]]
            : undefined
        ) as ImportField | undefined;
      // Check ignored fields too: an ignored malicious cell must not disappear from the report.
      if (/^[\s\u0000-\u001f]*[=+@-]/u.test(raw))
        issue(target ?? "ignored", "FORMULA_CELL");
      if (!target) continue;
      const value = raw.trim();
      values[target] = value;
      if (required.includes(target) && !value) issue(target, "REQUIRED");
      const max =
        target === "employeeNumber" ? 64 : target === "displayName" ? 160 : 120;
      if (value.length > max || /[\u0000-\u001f]/.test(value))
        issue(target, "INVALID_TEXT");
    }
    const date = values.hireDate ?? "";
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      issue("hireDate", "ISO_DATE_REQUIRED");
    if (!/^[A-Z]{2}$/.test(values.countryCode ?? ""))
      issue("countryCode", "COUNTRY_CODE_REQUIRED");
    return { line: record.line, values, issues };
  });
  const numbers = new Map<string, ImportRow[]>();
  for (const row of rows) {
    const key = row.values.employeeNumber;
    if (key) numbers.set(key, [...(numbers.get(key) ?? []), row]);
  }
  for (const matches of numbers.values())
    if (matches.length > 1)
      for (const row of matches)
        row.issues.push({
          line: row.line,
          field: "employeeNumber",
          code: "DUPLICATE_IN_FILE",
        });
  return { headers, rows };
}

export function employeeImportErrorCsv(issues: ImportIssue[]) {
  return (
    [["row", "field", "error"], ...issues.map((i) => [i.line, i.field, i.code])]
      .map((row) => row.map(safeCsvValue).join(","))
      .join("\r\n") + "\r\n"
  );
}
