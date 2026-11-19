import {
  analyzeEmployeeCsv,
  parseEmployeeCsv,
  employeeImportErrorCsv,
  HRIS_IMPORT_FIELDS,
} from "../employee-import.csv";
const mapping = Object.fromEntries(HRIS_IMPORT_FIELDS.map((f) => [f, f])),
  header = HRIS_IMPORT_FIELDS.join(",");
const row = "A1,Employee One,2026-10-24,CM,Office,Analyst";
test("BOM CRLF escaped quotes commas and blank records are accounted explicitly", () => {
  const result = analyzeEmployeeCsv(
    "\uFEFF" +
      header +
      '\r\n\r\nA1,"Employee, ""One""",2026-10-24,CM,Office,Analyst\r\n',
    mapping,
  );
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].line).toBe(3);
  expect(result.rows[0].values.displayName).toBe('Employee, "One"');
  expect(result.rows[0].issues).toEqual([]);
});
test("every duplicate and invalid nonblank record remains in preview", () => {
  const result = analyzeEmployeeCsv(
    header + "\n" + row + "\n" + row + "\nB,Missing,2026-02-30,zz",
    mapping,
  );
  expect(result.rows).toHaveLength(3);
  expect(
    result.rows.filter((r) =>
      r.issues.some((i) => i.code === "DUPLICATE_IN_FILE"),
    ),
  ).toHaveLength(2);
  expect(result.rows[2].issues.map((i) => i.code)).toEqual(
    expect.arrayContaining([
      "ISO_DATE_REQUIRED",
      "COLUMN_COUNT",
      "COUNTRY_CODE_REQUIRED",
    ]),
  );
});
test.each(["=1+1", " +SUM(A1)", "\t@cmd", "-2"])(
  "reject formula cell %s even in an ignored column",
  (value) => {
    const result = analyzeEmployeeCsv(
      header + ",ignored\n" + row + "," + value,
      mapping,
    );
    expect(result.rows[0].issues).toContainEqual({
      line: 2,
      field: "ignored",
      code: "FORMULA_CELL",
    });
  },
);
test.each(['A,"unterminated', 'A,b"quote', 'A,"closed"trailing'])(
  "malformed CSV fails the whole preview: %s",
  (bad) => {
    expect(() => parseEmployeeCsv(header + "\n" + bad)).toThrow(/QUOTE/);
  },
);
test("duplicate headers, row and UTF8 byte limits fail closed", () => {
  expect(() => parseEmployeeCsv("name,name\na,b")).toThrow("INVALID_HEADERS");
  expect(() =>
    parseEmployeeCsv(header + "\n" + Array(201).fill(row).join("\n")),
  ).toThrow("ROW_LIMIT");
  expect(() => parseEmployeeCsv("é".repeat(131073))).toThrow("FILE_TOO_LARGE");
});
test("mapping cannot duplicate targets or introduce sensitive columns", () => {
  expect(() =>
    analyzeEmployeeCsv(header + "\n" + row, {
      ...mapping,
      jobTitle: "displayName",
    }),
  ).toThrow("MAPPING");
  expect(() =>
    analyzeEmployeeCsv(header + "\n" + row, { ...mapping, jobTitle: "status" }),
  ).toThrow("MAPPING");
});
test("prototype-shaped ignored headers cannot become mapped fields", () => {
  const result = analyzeEmployeeCsv(
    header + ",__proto__\n" + row + ",ignored",
    mapping,
  );
  expect(Object.keys(result.rows[0].values)).toEqual(HRIS_IMPORT_FIELDS);
});
test("error export neutralizes formula prefixes and contains no source values", () => {
  const csv = employeeImportErrorCsv([
    { line: 2, field: ' =HYPERLINK("bad")', code: "INVALID_TEXT" },
  ]);
  expect(csv).toContain("' =HYPERLINK");
  expect(csv).not.toContain("Employee One");
});
