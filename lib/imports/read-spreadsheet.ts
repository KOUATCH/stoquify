import * as XLSX from "xlsx"

export const MAX_SPREADSHEET_BYTES = 5 * 1024 * 1024
// Matches the category action's existing maximum batch size.
export const MAX_SPREADSHEET_ROWS = 100
export const MAX_SPREADSHEET_COLUMNS = 50

export class SpreadsheetImportError extends Error {}

export async function readSpreadsheet(file: File): Promise<Record<string, unknown>[]> {
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    throw new SpreadsheetImportError("Choose an Excel .xls or .xlsx file.")
  }
  if (file.size === 0 || file.size > MAX_SPREADSHEET_BYTES) {
    throw new SpreadsheetImportError("Choose a non-empty spreadsheet no larger than 5 MB.")
  }

  try {
    const data = await file.arrayBuffer()
    if (data.byteLength === 0 || data.byteLength > MAX_SPREADSHEET_BYTES) {
      throw new SpreadsheetImportError("Choose a non-empty spreadsheet no larger than 5 MB.")
    }
    const bytes = new Uint8Array(data)
    const zip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
    const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((b, i) => bytes[i] === b)
    if (!zip && !ole) throw new SpreadsheetImportError("The file is not a supported Excel workbook.")

    const workbook = XLSX.read(data, {
      type: "array",
      sheets: 0,
      // One header, the allowed rows, and one sentinel row to detect overflow.
      sheetRows: MAX_SPREADSHEET_ROWS + 2,
      cellHTML: false,
      cellFormula: false,
    })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet?.["!ref"]) throw new SpreadsheetImportError("The first sheet is empty.")
    const range = XLSX.utils.decode_range(sheet["!fullref"] || sheet["!ref"])
    if (range.e.r >= MAX_SPREADSHEET_ROWS + 1 || range.e.c >= MAX_SPREADSHEET_COLUMNS) {
      throw new SpreadsheetImportError("Use at most 100 data rows and 50 columns on the first sheet.")
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
    if (rows.length === 0) throw new SpreadsheetImportError("The first sheet has no data rows.")
    return rows
  } catch (error) {
    if (error instanceof SpreadsheetImportError) throw error
    throw new SpreadsheetImportError("The spreadsheet could not be read. Check the file and try again.")
  }
}
