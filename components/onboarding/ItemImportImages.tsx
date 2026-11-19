"use client"

import { useEffect, useRef, useState } from "react"
import EnhancedImageUploadButton from "@/components/FormInputs/EnhancedImageUploadButton"

export function ItemImportImages({ organizationId, locale }: { organizationId: string; locale: "en" | "fr" }) {
  const [references, setReferences] = useState<string[]>([])
  const latest = useRef<HTMLInputElement>(null)
  const fr = locale === "fr"
  useEffect(() => { if (references.length) latest.current?.focus() }, [references.length])
  return <section aria-label={fr ? "Images pour l’import" : "Import images"} className="space-y-3">
    <p className="text-sm text-[var(--dash-text-soft)]">
      {fr
        ? "Chaque article doit avoir une image de votre organisation. Envoyez les images ici, puis copiez une référence dans la colonne imageUrls de chaque ligne CSV. Une référence existante peut aussi être utilisée. Conservez-les avant de quitter cette page. Un fichier corrigé exige une nouvelle validation et approbation ; les anciens lots restent conservés."
        : "Each item needs an image owned by your organization. Upload images here, then copy one reference into each CSV row’s imageUrls column. You can also reuse an existing reference. Save these references before leaving this page. A corrected file requires new validation and approval; previous batches are retained."}
    </p>
    {/* A fresh uploader per completed image prevents replacement cleanup from
        deleting a reference already copied into a staged CSV. */}
    <EnhancedImageUploadButton key={references.length} title={fr ? "Ajouter une image d’article" : "Add an item image"}
      organizationId={organizationId} locale={locale} imageUrl=""
      setImageUrl={(url) => { if (url) setReferences((values) => [...values, url]) }} />
    {references.map((value, index) => <label key={`${index}:${value}`} className="block text-sm">
      {fr ? "Référence d’image" : "Image reference"} {index + 1}
      <input ref={index === references.length - 1 ? latest : undefined} readOnly value={value}
        onFocus={(event) => event.currentTarget.select()} className="dashboard-control mt-1 w-full min-w-0 rounded-lg p-2" />
    </label>)}
    <p role="status" className="text-sm text-[var(--dash-text-soft)]">{references.length > 0
      ? (fr ? `${references.length} référence(s) prête(s) à copier. L’import reste à valider et approuver.` : `${references.length} reference(s) ready to copy. Import still requires validation and approval.`)
      : null}</p>
  </section>
}
