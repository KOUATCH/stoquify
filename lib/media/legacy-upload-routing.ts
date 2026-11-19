import privateUploadAliases from "@/config/private-upload-aliases.json"

// Edge-safe normalization shared by the legacy rewrite and image-cache boundary.
export function decodeLegacyPath(pathname: string): string | null {
  let decoded = pathname
  for (let depth = 0; depth < 8; depth++) {
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) {
        const segments: string[] = []
        for (const segment of decoded.replace(/\\/g, "/").split("/")) {
          if (!segment || segment === ".") continue
          if (segment === "..") segments.pop()
          else segments.push(segment)
        }
        return "/" + segments.join("/")
      }
      decoded = next
    } catch {
      return null
    }
  }
  return null
}

function privateAliasDestination(decoded: string): string | null {
  // Windows can resolve a default-stream suffix to the same file. Keep those
  // aliases behind authorization even when the original public files remain.
  const key = decoded.replace(/:[^/]*$/, "").replace(/[. ]+$/, "").toLowerCase()
  const alias = privateUploadAliases.find(entry => entry.source.slice("public".length).toLowerCase() === key)
  return alias ? "/api" + alias.uploadSource.slice("public".length) : null
}

export function legacyUploadDestination(pathname: string): string | null {
  const decoded = decodeLegacyPath(pathname)
  if (!decoded) return null
  const alias = privateAliasDestination(decoded)
  if (alias) return alias
  if (!/^\/uploads(?:\/|$)/i.test(decoded)) return null
  return "/api/uploads" + decoded.slice("/uploads".length).split("/").map(encodeURIComponent).join("/")
}

export function isPrivateUploadOptimizerTarget(value: string | null, origin: string): boolean {
  if (!value) return true
  try {
    const url = new URL(value, origin)
    if (url.origin !== origin) return false
    const decoded = decodeLegacyPath(url.pathname)
    return decoded === null || privateAliasDestination(decoded) !== null || /^\/(?:uploads|api\/uploads)(?:\/|$)/i.test(decoded)
  } catch {
    return true
  }
}
