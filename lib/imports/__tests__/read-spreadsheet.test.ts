import * as XLSX from "xlsx"
import { MAX_SPREADSHEET_BYTES, readSpreadsheet } from "../read-spreadsheet"

function workbookFile(rows: unknown[][], bookType: "xlsx" | "xls" = "xlsx", range?: string): File {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  if (range) sheet["!ref"] = range
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, "Import")
  const data = XLSX.write(book, { type: "array", bookType }) as ArrayBuffer
  return { name: `import.${bookType}`, size: data.byteLength, arrayBuffer: jest.fn(async () => data) } as unknown as File
}

describe("bounded spreadsheet parsing with the real SheetJS release", () => {
  it.each(["xlsx", "xls"] as const)("preserves %s import values and export/read compatibility", async (kind) => {
    expect(await readSpreadsheet(workbookFile([["Title", "Description"], ["Food", "Pantry"]], kind))).toEqual([{ Title: "Food", Description: "Pantry" }])
  })
  it("allows exactly 100 data rows", async () => {
    const file = workbookFile([["Title"], ...Array.from({ length: 100 }, (_, i) => [`Category ${i}`])])
    expect(await readSpreadsheet(file)).toHaveLength(100)
  })
  it("rejects the 101st row instead of silently truncating an import", async () => {
    const file = workbookFile([["Title"], ...Array.from({ length: 101 }, (_, i) => [`Category ${i}`])])
    await expect(readSpreadsheet(file)).rejects.toThrow("100 data rows")
  })
  it("rejects sparse distant rows and excessive columns", async () => {
    await expect(readSpreadsheet(workbookFile([["Title"], ["Food"]], "xlsx", "A1:A1000"))).rejects.toThrow("100 data rows")
    await expect(readSpreadsheet(workbookFile([Array.from({ length: 51 }, (_, i) => `Column${i}`), Array(51).fill("value")]))).rejects.toThrow("50 columns")
  })
  it.each([0, MAX_SPREADSHEET_BYTES + 1])("rejects byte size %s before reading the file", async (size) => {
    const arrayBuffer = jest.fn()
    await expect(readSpreadsheet({ name: "import.xlsx", size, arrayBuffer } as unknown as File)).rejects.toThrow("5 MB")
    expect(arrayBuffer).not.toHaveBeenCalled()
  })
  it("rejects unsupported extensions before reading", async () => {
    const file = workbookFile([["Title"], ["Food"]]); Object.defineProperty(file, "name", { value: "import.csv" })
    await expect(readSpreadsheet(file)).rejects.toThrow(".xls or .xlsx")
    expect(file.arrayBuffer).not.toHaveBeenCalled()
  })
  it("rejects renamed text and corrupt ZIP workbooks with safe messages", async () => {
    for (const data of [new Uint8Array([65, 66, 67, 68]).buffer, new Uint8Array([80, 75, 3, 4, 0, 0, 0, 0]).buffer]) {
      await expect(readSpreadsheet({ name: "import.xlsx", size: data.byteLength, arrayBuffer: async () => data } as File)).rejects.toThrow(/supported Excel|could not be read/)
    }
  })
  it("rejects a header-only sheet and read failures", async () => {
    await expect(readSpreadsheet(workbookFile([["Title"]]))).rejects.toThrow("no data rows")
    await expect(readSpreadsheet({ name: "import.xlsx", size: 8, arrayBuffer: async () => { throw new Error("private filesystem detail") } } as File)).rejects.toThrow("The spreadsheet could not be read")
  })
})
