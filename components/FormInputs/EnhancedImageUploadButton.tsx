"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { deletePhoto } from "@/actions/storage/photo-upload-actions"
import { PICTURE_MAX_BYTES, PICTURE_MIME_TYPES } from "@/lib/media/policy"
import { cn } from "@/lib/utils"

export interface EnhancedImageUploadButtonProps {
  title: string
  imageUrl: string
  setImageUrl: (url: string) => void
  organizationId: string
  endpoint?: "itemImageUpload"
  locale?: string
  className?: string
  onUploadStart?: () => void
  onUploadComplete?: () => void
  onUploadError?: () => void
}

export default function EnhancedImageUploadButton({
  title, imageUrl, setImageUrl, organizationId, locale = "en", className = "",
  onUploadStart, onUploadComplete, onUploadError,
}: EnhancedImageUploadButtonProps) {
  const id = useId()
  const attempt = useRef(0)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const uploadRequest = useRef<AbortController | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const staged = useRef(new Set<string>())
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const fr = locale.startsWith("fr")
  const t = (en: string, french: string) => fr ? french : en

  useEffect(() => () => {
    attempt.current += 1
    if (timeout.current) clearTimeout(timeout.current)
    uploadRequest.current?.abort()
  }, [])

  async function upload(selected: File) {
    if (busy) return
    setFile(selected)
    setError("")
    if (selected.size > PICTURE_MAX_BYTES || selected.size === 0 || !(PICTURE_MIME_TYPES as readonly string[]).includes(selected.type)) {
      setError(t("Choose a JPEG, PNG, GIF or WebP image no larger than 4 MB.", "Choisissez une image JPEG, PNG, GIF ou WebP de 4 Mo maximum."))
      onUploadError?.()
      return
    }
    const current = ++attempt.current
    const controller = new AbortController()
    uploadRequest.current = controller
    setBusy(true)
    onUploadStart?.()
    timeout.current = setTimeout(() => {
      if (current !== attempt.current) return
      attempt.current += 1
      controller.abort()
      setBusy(false)
      setError(t("The upload timed out. Please retry.", "L’envoi a expiré. Veuillez réessayer."))
      onUploadError?.()
    }, 90_000)
    try {
      const body = new FormData()
      body.set("file", selected)
      const response = await fetch("/api/media/upload", {
        method: "POST", body, signal: controller.signal, credentials: "same-origin",
        headers: { "x-organization-id": organizationId },
      })
      const result = await response.json() as { success?: boolean; url?: string; error?: string }
      if (current !== attempt.current) {
        if (result.success && result.url) await deletePhoto(result.url, organizationId)
        return
      }
      if (!response.ok || !result.success || !result.url) throw new Error(result.error || "Upload failed")
      const previous = imageUrl
      staged.current.add(result.url)
      setImageUrl(result.url)
      setFile(null)
      onUploadComplete?.()
      // Only discard uploads made in this form. Saved images survive replacement/cancel.
      if (staged.current.has(previous)) void deletePhoto(previous, organizationId).catch(() => {})
    } catch {
      if (current !== attempt.current) return
      setError(t("The image could not be uploaded. Retry, or contact your administrator if online storage is unavailable.", "L’image n’a pas pu être envoyée. Réessayez ou contactez votre administrateur si le stockage en ligne est indisponible."))
      onUploadError?.()
    } finally {
      if (current === attempt.current) {
        if (timeout.current) clearTimeout(timeout.current)
        uploadRequest.current = null
        setBusy(false)
      }
    }
  }

  function cancel() {
    if (timeout.current) clearTimeout(timeout.current)
    attempt.current += 1
    uploadRequest.current?.abort()
    setBusy(false)
    setError(t("Upload cancelled. You can retry or choose another image.", "Envoi annulé. Vous pouvez réessayer ou choisir une autre image."))
    onUploadError?.()
  }

  function remove() {
    if (staged.current.has(imageUrl)) void deletePhoto(imageUrl, organizationId).catch(() => {})
    setImageUrl("")
    setFile(null)
    setError("")
    if (fileInput.current) fileInput.current.value = ""
  }

  return (
    <Card className={cn("min-w-0 rounded-lg border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] text-[var(--dash-text)] shadow-none", className)}>
      <CardHeader><CardTitle className="break-words text-base font-semibold leading-6">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p id={id + "-help"} className="text-sm leading-6 text-[var(--dash-text-soft)]">
          {t("Images are saved securely online. JPEG, PNG, GIF or WebP, up to 4 MB.", "Les images sont enregistrées en ligne de façon sécurisée. JPEG, PNG, GIF ou WebP, 4 Mo maximum.")}
        </p>
        {imageUrl && <>
          {/* Authenticated media is fetched by the browser with its session cookie. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={title} className="h-48 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-canvas)] object-contain p-2" />
          <Button type="button" variant="outline" className="dashboard-button-secondary" disabled={busy} onClick={remove}>{t("Remove image", "Retirer l’image")}</Button>
        </>}
        <label htmlFor={id} className="block text-sm font-medium">{t("Choose image", "Choisir une image")}</label>
        <input ref={fileInput} id={id} type="file" accept={PICTURE_MIME_TYPES.join(",")} disabled={busy}
          aria-describedby={id + "-help " + id + "-status"} className="block w-full min-w-0 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-canvas)] p-2 text-sm text-[var(--dash-text-soft)] file:me-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[var(--dash-brand-soft)] file:px-3 file:py-2 file:font-medium file:text-[var(--dash-brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-focus)] disabled:opacity-50"
          onChange={(event) => {
            const selected = event.target.files?.[0]
            if (selected) void upload(selected)
            event.target.value = ""
          }} />
        <div id={id + "-status"} role="status" aria-live="polite" className={`text-sm leading-6 ${busy ? "text-[var(--dash-info)]" : "text-[var(--dash-success)]"}`}>
          {busy ? t("Uploading image…", "Envoi de l’image…") : imageUrl && !error ? t("Image ready. Save the form to attach it.", "Image prête. Enregistrez le formulaire pour la joindre.") : null}
        </div>
        {error && <p role="alert" className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-3 text-sm leading-6 text-[var(--dash-danger)]">{error}</p>}
        {busy && <Button type="button" variant="outline" className="dashboard-button-secondary" onClick={cancel}>{t("Cancel upload", "Annuler l’envoi")}</Button>}
        {!busy && error && file && <Button type="button" variant="outline" className="dashboard-button-primary" onClick={() => void upload(file)}>{t("Retry upload", "Réessayer l’envoi")}</Button>}
      </CardContent>
    </Card>
  )
}
