/** Shared AR/workpaper spreadsheet escaping, including whitespace/control-prefixed formulas. */
export function safeCsvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value)
  const formulaSafe = /^[\s\u0000-\u001f]*[=+@-]/u.test(text) ? `'${text}` : text
  return `"${formulaSafe.replace(/"/g, '""')}"`
}
