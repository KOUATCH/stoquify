"use client"

import { createContext, useContext, useId, type ReactNode } from "react"
import { STOQUIFY_MARK_FACES, STOQUIFY_MARK_PATH, STOQUIFY_WORDMARK_PATH } from "@/components/global/stoquify-logo-artwork"

const PreviewLogoContext = createContext<string | null>(null)

function PreviewLogoArtwork() {
  return <>
    <g transform="translate(0 5)">
      <path d={STOQUIFY_MARK_PATH} fill="var(--product-brand, #2f7df6)" />
      {STOQUIFY_MARK_FACES.map(face => <path key={face.token} d={face.path} fill={`var(${face.token}, ${face.fallback})`} />)}
    </g>
    <g transform="translate(88 7.75) scale(0.9923076923)"><path d={STOQUIFY_WORDMARK_PATH} fill="currentColor" /></g>
  </>
}

// Share the detailed paths across previews without changing their inherited
// theme colors. useId keeps references stable through SSR and client navigation.
export function PreviewLogoProvider({ children }: { children: ReactNode }) {
  const id = useId()
  return <PreviewLogoContext.Provider value={id}>
    <svg width={0} height={0} aria-hidden="true" focusable="false" style={{ position: "absolute", overflow: "hidden" }}>
      <defs><g id={id}><PreviewLogoArtwork /></g></defs>
    </svg>
    {children}
  </PreviewLogoContext.Provider>
}

// Standalone captures retain the same artwork when no page provider is mounted.
export function PreviewLogo() {
  const id = useContext(PreviewLogoContext)
  return <svg className="preview-logo" viewBox="0 0 350 80" role="img" aria-label="Stoquify">
    {id ? <use href={`#${id}`} /> : <PreviewLogoArtwork />}
  </svg>
}
