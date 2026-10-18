"use client"

import { useEffect, useRef } from "react"
import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import StoquifyLogo from "@/components/global/kit-logo"
import { useCinematicMotionOff } from "./cinematic-shell"

export function CinematicHero() {
  const locale = useLocale()
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en)
  const motionOff = useCinematicMotionOff()
  const sectionRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)
  const noteRef = useRef<HTMLDivElement>(null)
  const cueRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const image = imageRef.current
    const copy = copyRef.current
    const zoom = zoomRef.current
    const note = noteRef.current
    const cue = cueRef.current
    if (!section || !image || !copy || !zoom || !note || !cue) return
    const mobile = window.matchMedia("(max-width: 760px)")
    let frame = 0
    let failed = image.complete && image.naturalWidth === 0
    const update = () => {
      frame = 0
      const staticScene = motionOff || mobile.matches || failed
      const travel = Math.max(1, section.offsetHeight - window.innerHeight)
      const progress = staticScene
        ? 0
        : Math.min(
            1,
            Math.max(0, -section.getBoundingClientRect().top / travel),
          )
      const fade = Math.max(0, 1 - progress * 3.6)
      // Invisible CTAs must also leave keyboard navigation.
      copy.inert = fade < 0.05
      cue.inert = fade < 0.05
      copy.style.opacity = String(fade)
      copy.style.transform = `translateY(${-progress * 70}px)`
      note.style.opacity = String(fade)
      cue.style.opacity = String(fade)
      // Screen bounds measured on our 1672 × 941 artwork, corrected for object-fit cover.
      const width = image.clientWidth
      const height = image.clientHeight
      const cover = Math.max(width / 1672, height / 941)
      const imageScale = 1 + progress * 0.24
      const screenX = (width - 1672 * cover) / 2 + 859 * cover
      const screenY = (height - 941 * cover) / 2 + 678 * cover
      const anchoredX = width * 0.55 + (screenX - width * 0.55) * imageScale
      const anchoredY =
        height * 0.7 +
        (screenY - height * 0.7 - progress * 0.02 * height) * imageScale
      const phase = Math.min(1, Math.max(0, (progress - 0.08) / 0.72))
      const ease = phase * phase * (3 - 2 * phase)
      const startScale = (274 * cover * imageScale) / 1000
      const endScale = Math.min(
        (width * 0.88) / 1000,
        Math.max(0.2, (Math.min(height, window.innerHeight) - 150) / 600),
        1.12,
      )
      zoom.style.opacity = failed ? "0" : "1"
      zoom.style.left = anchoredX + (width / 2 - anchoredX) * ease + "px"
      zoom.style.top =
        anchoredY +
        ((Math.min(height, window.innerHeight) + 70) / 2 - anchoredY) * ease +
        "px"
      zoom.style.transform =
        "translate(-50%, -50%) scale(" +
        (startScale + (endScale - startScale) * ease) +
        ")"
      zoom.style.borderRadius = 3 + ease * 9 + "px"
      image.style.opacity = String(1 - ease * 0.94)
      image.style.transform = `scale(${imageScale}) translateY(${-progress * 2}%)`
    }
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const loaded = () => {
      failed = false
      section.classList.remove("media-fallback")
      update()
    }
    const error = () => {
      failed = true
      section.classList.add("media-fallback")
      update()
    }
    image.addEventListener("load", loaded)
    image.addEventListener("error", error)
    mobile.addEventListener("change", queue)
    window.addEventListener("scroll", queue, { passive: true })
    window.addEventListener("resize", queue)
    section.classList.toggle("media-fallback", failed)
    update()
    return () => {
      cancelAnimationFrame(frame)
      image.removeEventListener("load", loaded)
      image.removeEventListener("error", error)
      mobile.removeEventListener("change", queue)
      window.removeEventListener("scroll", queue)
      window.removeEventListener("resize", queue)
    }
  }, [motionOff])

  return (
    <section
      className="cinema"
      id="overview"
      ref={sectionRef}
      aria-label={t("Introduction", "Présentation")}
    >
      <span id="top" className="anchor" />
      <div className="hero-sticky">
        {/* Pre-sized original artwork keeps the full-bleed scene stable while loading. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="hero-image"
          ref={imageRef}
          src="/landing/cinematic/stoquify-courtyard-front.webp"
          alt=""
          width={1672}
          height={941}
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="hero-copy" ref={copyRef}>
          <h1>
            {t(
              "Run your business with a clearer view.",
              "Pilotez votre activité avec une vision claire.",
            )}
          </h1>
          <p className="hero-intro">
            {t(
              "Bring sales, stock, people and financial review into one workspace. Keep your teams connected to the work behind the numbers.",
              "Réunissez ventes, stocks, personnel et révision financière. Donnez à vos équipes une vue claire des opérations derrière les chiffres.",
            )}
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/register">
              {t("Create your account", "Créer votre compte")}
              <span aria-hidden="true">↗︎</span>
            </Link>
            <Link className="button glass" href="/#showcase">
              {t("Explore the workspace", "Découvrir l’espace de travail")}
              <span aria-hidden="true">↗︎</span>
            </Link>
          </div>
        </div>
        <div className="hero-note" ref={noteRef}>
          {t(
            "For retail and distribution teams, from the shop floor to HR and finance.",
            "Pour les commerces et la distribution, des équipes terrain aux RH et à la finance.",
          )}
        </div>
        <div
          className="zoom-preview"
          ref={zoomRef}
          aria-hidden="true"
          data-visual-classification="sample"
        >
          <div className="zoom-head">
            <StoquifyLogo theme="dark" width={180} height={42} tagline="" />
            <small>{t("ILLUSTRATIVE WORKSPACE", "ESPACE ILLUSTRATIF")}</small>
          </div>
          <div className="zoom-body">
            <aside>
              {[
                t("Overview", "Vue d’ensemble"),
                t("Sales", "Ventes"),
                t("Inventory", "Stocks"),
                t("HRIS", "SIRH"),
                t("Payroll", "Paie"),
                t("Finance", "Finance"),
                t("Accounting", "Comptabilité"),
              ].map((label) => (
                <div key={label}>{label}</div>
              ))}
            </aside>
            <div>
              <h2>
                {t("Your business, connected.", "Votre activité, connectée.")}
              </h2>
              <div className="zoom-kpis">
                <span>
                  {t("Sales records", "Ventes enregistrées")}
                  <b>24</b>
                </span>
                <span>
                  {t("Stock movements", "Mouvements de stock")}
                  <b>18</b>
                </span>
                <span>
                  {t("To review", "À vérifier")}
                  <b>3</b>
                </span>
              </div>
              <div className="hero-table">
                <div>
                  <span>{t("Source", "Origine")}</span>
                  <span>{t("Workflow", "Parcours")}</span>
                  <span>{t("Status", "Statut")}</span>
                </div>
                <div>
                  <b>SALE-104</b>
                  <span>{t("POS → Inventory", "Caisse → Stocks")}</span>
                  <em>{t("Recorded", "Enregistré")}</em>
                </div>
                <div>
                  <b>EMP-024</b>
                  <span>{t("HRIS → Payroll", "SIRH → Paie")}</span>
                  <em>{t("Inputs to review", "Données à vérifier")}</em>
                </div>
                <div>
                  <b>REF-104</b>
                  <span>
                    {t("Finance → Accounting", "Finance → Comptabilité")}
                  </span>
                  <em>{t("Review pending", "À vérifier")}</em>
                </div>
              </div>
              <p>
                {t(
                  "Sample records · Main shop · Not live data",
                  "Données d’exemple · Boutique principale · Données non réelles",
                )}
              </p>
            </div>
          </div>
        </div>
        <Link
          className="scroll-cue"
          href="/#showcase"
          ref={cueRef}
          aria-label={t("Explore the product", "Découvrir le produit")}
        >
          ↓
        </Link>
      </div>
    </section>
  )
}
