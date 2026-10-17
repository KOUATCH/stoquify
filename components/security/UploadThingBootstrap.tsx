"use client"

import type { EndpointMetadata } from "@uploadthing/shared"
import { useId } from "react"
import { useServerInsertedHTML } from "next/navigation"

// The installed NextSSRPlugin has no nonce prop. Preserve its bootstrap contract
// while allowing a nonce and preventing serialized metadata from closing a tag.
export function UploadThingBootstrap({ routerConfig, nonce }: { routerConfig: EndpointMetadata; nonce?: string }) {
  const id = useId()
  ;(globalThis as typeof globalThis & { __UPLOADTHING?: EndpointMetadata }).__UPLOADTHING = routerConfig
  useServerInsertedHTML(() => (
    <script key={id} nonce={nonce} dangerouslySetInnerHTML={{ __html: `globalThis.__UPLOADTHING = ${JSON.stringify(routerConfig).replace(/</g, "\\u003c")};` }} />
  ))
  return null
}
