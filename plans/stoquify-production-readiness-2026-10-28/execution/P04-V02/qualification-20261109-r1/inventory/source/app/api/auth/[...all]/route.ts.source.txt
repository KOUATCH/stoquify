import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { updateSelfProfileHttp } from "@/services/users/self-profile-http.service"

export const runtime = "nodejs"

const handlers = toNextJsHandler(auth)
export const GET = handlers.GET

export async function POST(request: Request) {
  let pathname = new URL(request.url).pathname
  try { pathname = decodeURIComponent(pathname) } catch { /* The auth handler rejects malformed paths. */ }
  pathname = pathname.replace(/\/+/g, "/").replace(/\/+$/, "")
  // Keep profile changes on the same reviewed, audited service as the app form.
  // Other authentication operations retain their existing provider behavior.
  if (pathname === "/api/auth/update-user") return updateSelfProfileHttp(request)
  return handlers.POST(request)
}
