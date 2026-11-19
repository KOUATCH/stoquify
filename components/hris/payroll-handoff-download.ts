/** Decode retained bytes without stripping or synthesizing a UTF-8 marker. */
export function decodeHandoffCsvUtf8(base64: string) {
  const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0))
  return new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes)
}
