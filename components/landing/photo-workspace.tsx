"use client"

import { PreviewLogo } from "./preview-logo"

import { useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { Maximize2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CinematicModuleScene, type CinematicModuleId } from "./cinematic-modules"

export type PhotoScene = "retail" | "bakery" | "pharmacy" | "materials" | "accountingFirm"

// Screen rectangles measured on the source artwork; resized/cropped frames use the same coordinates.
export const photoWorkspaces: Record<PhotoScene, {
  image: string; width: number; height: number; bounds: readonly [number, number, number, number];
  title: readonly [string, string]; module: CinematicModuleId;
  rows: readonly (readonly [string, string, string])[];
}> = {
  retail: { image: "retail-screen-v2", width: 1536, height: 1024, bounds: [.2676,.327,.4772,.455], title: ["Daily overview", "Vue du jour"], module: "pos", rows: [["Sales recorded", "Ventes enregistrées", "24"], ["Items to review", "Points à revoir", "3"]] },
  bakery: { image: "bakery-screen-v2", width: 1536, height: 1024, bounds: [.276,.4326,.448,.3867], title: ["Sales register", "Caisse et ventes"], module: "pos", rows: [["Sale receipt", "Reçu de vente", "SALE-104"], ["Total", "Total", "4 000 XAF"]] },
  pharmacy: { image: "pharmacy-screen-v2", width: 1536, height: 1024, bounds: [.2168,.3818,.4375,.3975], title: ["Stock and sales", "Stocks et ventes"], module: "inventory", rows: [["Source stock", "Stock de départ", "120"], ["Transfer received", "Transfert reçu", "24"]] },
  materials: { image: "materials-screen-v2", width: 1536, height: 1024, bounds: [.254,.419,.48,.398], title: ["Payment review", "Revue des paiements"], module: "finance", rows: [["Payment reference", "Référence paiement", "PAY-104"], ["Evidence", "Justificatifs", "À revoir / Review"]] },
  accountingFirm: { image: "accounting-firm-screen-v2", width: 1536, height: 1024, bounds: [.283,.429,.432,.392], title: ["Client accounting review", "Revue comptable client"], module: "accounting", rows: [["Source-linked journal", "Écriture liée à la source", "SALE-104"], ["Period review", "Revue de période", "À revoir / Review"]] },
}

function ScreenPage({ scene }: { scene: PhotoScene }) {
  const fr = useLocale() === "fr"
  const workspace = photoWorkspaces[scene]
  return <div className="photo-screen-page" data-screen-page={workspace.module}>
    <div className="photo-screen-brand"><PreviewLogo /><small>{fr ? "EXEMPLE" : "SAMPLE"}</small></div>
    <div className="photo-screen-title">{workspace.title[fr ? 1 : 0]}</div>
    <div className="photo-screen-records">{workspace.rows.map(([en, french, value]) => <div key={en}><span>{fr ? french : en}</span><b>{value === "À revoir / Review" ? (fr ? "À revoir" : "Review") : value}</b></div>)}</div>
    <div className="photo-screen-trail">{fr ? "Opérations → Comptabilité" : "Operations → Accounting"}</div>
  </div>
}

export function BusinessComputerPhoto({ scene, alt, priority = false }: { scene: PhotoScene; alt: string; priority?: boolean }) {
  const frame = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const screen = useRef<HTMLDivElement>(null)
  const workspace = photoWorkspaces[scene]
  useEffect(() => {
    const img = image.current, display = screen.current, box = frame.current
    if (!img || !display || !box) return
    const update = () => {
      if (!img.naturalWidth) { display.style.visibility = "hidden"; return }
      const scale = Math.max(img.clientWidth / img.naturalWidth, img.clientHeight / img.naturalHeight)
      const width = img.naturalWidth * scale, height = img.naturalHeight * scale
      const [x, y, w, h] = workspace.bounds
      Object.assign(display.style, { left: `${(img.clientWidth - width) / 2 + width * x}px`, top: `${(img.clientHeight - height) / 2 + height * y}px`, width: `${width * w}px`, height: `${height * h}px`, visibility: "visible" })
    }
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update)
    observer?.observe(box); img.addEventListener("load", update); img.addEventListener("error", update); update()
    return () => { observer?.disconnect(); img.removeEventListener("load", update); img.removeEventListener("error", update) }
  }, [workspace])
  return <div ref={frame} className="sme-photo-scene business-computer-photo" data-photo-scene={scene}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img ref={image} src={`/landing/cinematic/${workspace.image}.webp`} srcSet={`/landing/cinematic/${workspace.image}-768.webp 768w, /landing/cinematic/${workspace.image}.webp 1536w`} sizes="(max-width: 760px) 100vw, 55vw" width={workspace.width} height={workspace.height} loading={priority ? "eager" : "lazy"} decoding="async" alt={alt} />
    <div ref={screen} className="sme-computer-screen photo-screen-overlay" aria-hidden="true" data-visual-classification="sample"><ScreenPage scene={scene} /></div>
  </div>
}

export function PhotoScreenButton({ scene }: { scene: PhotoScene }) {
  const fr = useLocale() === "fr"
  const [theme, setTheme] = useState("dark")
  const workspace = photoWorkspaces[scene]
  return <Dialog>
    <DialogTrigger asChild><button type="button" className="photo-screen-enlarge" onClick={event => setTheme(event.currentTarget.closest(".cinematic-home")?.getAttribute("data-theme") || "dark")}><Maximize2 size={16} aria-hidden="true" />{fr ? "Voir l’écran Stoquify" : "View the Stoquify screen"}<span className="sr-only"> · {workspace.title[fr ? 1 : 0]}</span></button></DialogTrigger>
    <DialogContent className="cinematic-home photo-screen-dialog" data-theme={theme} closeLabel={fr ? "Fermer" : "Close"}>
      <DialogTitle>Stoquify · {workspace.title[fr ? 1 : 0]}</DialogTitle>
      <DialogDescription>{fr ? "Aperçu du parcours avec des données fictives. Aucune opération réelle." : "Workflow preview with sample records. No live transactions."}</DialogDescription>
      <CinematicModuleScene module={workspace.module} />
    </DialogContent>
  </Dialog>
}
