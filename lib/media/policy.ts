// Permanent picture uploads use managed online storage; local files are legacy reads.
export const PICTURE_MAX_BYTES = 4 * 1024 * 1024
export const PICTURE_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const
export const MEDIA_URL_PREFIX = "/api/media/"

export function mediaIdFromUrl(url: string): string | null {
  return /^\/api\/media\/([0-9a-f-]{36})$/.exec(url)?.[1] ?? null
}
