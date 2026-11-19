"use client"

import { useEffect, useRef } from "react"
import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useCinematicMotionOff, useCinematicSignedIn } from "./cinematic-shell"

export function CinematicHero() {
  const locale = useLocale()
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en)
  const motionOff = useCinematicMotionOff()
  const signedIn = useCinematicSignedIn()
  const sectionRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)
  const noteRef = useRef<HTMLDivElement>(null)
  const cueRef = useRef<HTMLAnchorElement>(null)
  const mobileEntryComplete = useRef(false)
  const mobileHeadingComplete = useRef(false)

  useEffect(() => {
    const section = sectionRef.current
    const image = imageRef.current
    const copy = copyRef.current
    const zoom = zoomRef.current
    const note = noteRef.current
    const cue = cueRef.current
    if (!section || !image || !copy || !zoom || !note || !cue) return
    const sibling = section.nextElementSibling
    const showcase = sibling instanceof HTMLElement && sibling.matches(".workflow-showcase")
      ? sibling
      : null
    showcase?.setAttribute("data-hero-handoff", "")
    const workflowPreview = showcase?.querySelector<HTMLElement>(".demo-stage")
    const workflowHeading = showcase?.querySelector<HTMLElement>(".product-copy")
    const mobile = window.matchMedia(
      "(max-width: 760px), (max-height: 500px) and (pointer: coarse)",
    )
    let frame = 0
    let mobileEntryStart: number | null = null
    let mobileHeadingStart: number | null = null
    let failed = image.complete && image.naturalWidth === 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = 0
      const staticScene = motionOff || mobile.matches || failed
      const scrollDistance = Math.max(0, -section.getBoundingClientRect().top)
      // Keep the reveal pace; the remaining sticky scroll is a reading hold.
      const travel = Math.max(
        1,
        Math.min(section.offsetHeight - window.innerHeight, window.innerHeight * 0.9),
      )
      const progress = staticScene
        ? 0
        : Math.min(
            1,
            scrollDistance / travel,
          )
      // Preserve the full reading hold, then fade while the next section enters.
      const exit = staticScene
        ? 0
        : Math.min(1, Math.max(0,
            (scrollDistance - (section.offsetHeight - window.innerHeight)) /
              (window.innerHeight * 0.55),
          ))
      const exitOpacity = 1 - exit * exit * (3 - 2 * exit)
      showcase?.style.setProperty(
        "--hero-entry-opacity",
        String(staticScene ? 1 : 1 - exitOpacity),
      )
      if (mobile.matches && !motionOff && workflowPreview) {
        showcase?.setAttribute("data-mobile-preview", "")
        const bounds = workflowPreview.getBoundingClientRect()
        const now = performance.now()
        const headingBounds = (workflowHeading || workflowPreview).getBoundingClientRect()
        if (mobileHeadingStart === null && headingBounds.top < window.innerHeight * 0.9 && headingBounds.bottom > 0)
          mobileHeadingStart = now
        const heading = mobileHeadingComplete.current ? 1 : mobileHeadingStart === null
          ? 0 : Math.min(1, (now - mobileHeadingStart) / 600)
        showcase?.style.setProperty("--mobile-heading-opacity", String(heading * heading * (3 - 2 * heading)))
        if (heading === 1) mobileHeadingComplete.current = true
        if (mobileEntryStart === null && bounds.top < window.innerHeight * 0.9 && bounds.bottom > 0)
          // Keep the heading ahead on quick scrolls; each part still waits until in view.
          mobileEntryStart = Math.max(now, (mobileHeadingStart ?? now) + 150)
        const entry = mobileEntryComplete.current ? 1 : mobileEntryStart === null
          ? 0 : Math.min(1, Math.max(0, (now - mobileEntryStart) / 750))
        showcase?.style.setProperty("--mobile-preview-opacity", String(entry * entry * (3 - 2 * entry)))
        if (entry === 1) mobileEntryComplete.current = true
        if ((entry < 1 && mobileEntryStart !== null) || (heading < 1 && mobileHeadingStart !== null))
          frame = requestAnimationFrame(update)
      } else {
        showcase?.removeAttribute("data-mobile-preview")
        showcase?.style.removeProperty("--mobile-preview-opacity")
        showcase?.style.removeProperty("--mobile-heading-opacity")
      }
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
      if (!width || !height) return
      const imageStyle = getComputedStyle(image)
      const position = imageStyle.objectPosition.split(" ")
      const origin = imageStyle.transformOrigin.split(" ")
      const positionX =
        Number.parseFloat(position[0]) / 100 || (mobile.matches ? 0.7 : 0.5)
      const positionY = Number.parseFloat(position[1]) / 100 || 0.5
      const originX = Number.parseFloat(origin[0]) || width * 0.55
      const originY = Number.parseFloat(origin[1]) || height * 0.7
      const cover = Math.max(width / 1672, height / 941)
      const imageScale = 1 + progress * 0.24
      const screenX =
        (width - 1672 * cover) * positionX +
        928 * cover
      const screenY =
        (height - 941 * cover) * positionY +
        594 * cover
      const anchoredX =
        image.offsetLeft + originX + (screenX - originX) * imageScale
      const anchoredY =
        image.offsetTop +
        originY +
        (screenY - originY - progress * 0.02 * height) * imageScale
      const phase = Math.min(1, Math.max(0, (progress - 0.08) / 0.72))
      const ease = phase * phase * (3 - 2 * phase)
      // Recenter as the photograph fades so the larger screen stays in view.
      const recenterPhase = Math.min(1, Math.max(0, (phase - 0.3) / 0.6))
      const recenter = recenterPhase * recenterPhase * (3 - 2 * recenterPhase)
      const startScale = (426 * cover * imageScale) / 1000
      const endScale = Math.min(
        (width * 0.94) / 1000,
        Math.max(
          0.2,
          (Math.min(height, window.innerHeight) - 130) / 520,
        ),
        1.6,
      )
      zoom.style.opacity = failed ? "0" : String(exitOpacity)
      zoom.style.visibility = failed ? "hidden" : "visible"
      zoom.style.left = anchoredX + (width / 2 - anchoredX) * recenter + "px"
      zoom.style.top =
        anchoredY +
        ((Math.min(height, window.innerHeight) + 70) / 2 - anchoredY) *
          recenter +
        "px"
      zoom.style.transform =
        "translate(-50%, -50%) scale(" +
        (startScale + (endScale - startScale) * ease) +
        ")"
      zoom.setAttribute("data-positioned", "")
      zoom.style.borderRadius = 3 + ease * 9 + "px"
      const sceneFade = Math.min(1, phase / 0.65)
      image.style.opacity = String(
        1 - sceneFade * sceneFade * (3 - 2 * sceneFade),
      )
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
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(queue) : null
    observer?.observe(image)
    observer?.observe(section)
    section.classList.toggle("media-fallback", failed)
    update()
    return () => {
      cancelAnimationFrame(frame)
      showcase?.style.removeProperty("--hero-entry-opacity")
      showcase?.removeAttribute("data-hero-handoff")
      showcase?.style.removeProperty("--mobile-preview-opacity")
      showcase?.style.removeProperty("--mobile-heading-opacity")
      showcase?.removeAttribute("data-mobile-preview")
      observer?.disconnect()
      image.removeEventListener("load", loaded)
      image.removeEventListener("error", error)
      mobile.removeEventListener("change", queue)
      window.removeEventListener("scroll", queue)
      window.removeEventListener("resize", queue)
    }
  }, [motionOff])

  return (
    <section
      className="cinema hero-sme hero-aio"
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
          src="/landing/cinematic/sme-bakery-aio.webp"
          srcSet="/landing/cinematic/sme-bakery-aio-640.webp 640w, /landing/cinematic/sme-bakery-aio-960.webp 960w, /landing/cinematic/sme-bakery-aio.webp 1672w"
          sizes="100vw"
          alt=""
          width={1672}
          height={941}
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="public-contour-art" aria-hidden="true" />
        <div className="hero-copy" ref={copyRef}>
          <p className="hero-eyebrow">
            {t(
              "THE WORKSPACE FOR SMEs IN OHADA MARKETS",
              "L’ESPACE DE GESTION DES PME EN ZONE OHADA",
            )}
          </p>
          <h1>
            {t(
              "From your first sale to your month-end close.",
              "De la première vente à la clôture du mois.",
            )}
          </h1>
          <p className="hero-intro">
            {t(
              "Connect sales, stock, payments and people records to your finance team and accounting firm. One workspace, from daily activity to close.",
              "Reliez ventes, stocks, paiements et dossiers du personnel à votre équipe financière et à votre cabinet comptable. Un espace, de l’activité quotidienne à la clôture.",
            )}
          </p>
          <div className="hero-actions">
            <Link className="button primary" href={signedIn ? "/dashboard" : "/contact"}>
              {signedIn ? t("Open workspace", "Ouvrir l’espace") : t("Plan your workspace", "Préparer votre projet")}
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
            "For owners, operations, finance and HR teams. Illustrative workspace.",
            "Pour les dirigeants, les équipes terrain, la finance et les RH. Espace de travail illustratif.",
          )}
        </div>
        <div
          className="zoom-preview"
          ref={zoomRef}
          aria-hidden="true"
          data-visual-classification="sample"
        >
          {/* Captured from the production dashboard components with fictional records. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="hero-dashboard-capture"
            src={`/landing/cinematic/stoquify-dashboard-${locale === "fr" ? "fr" : "en"}.webp`}
            srcSet={[480, 1000, 1600, 2400].map(width => `/landing/cinematic/stoquify-dashboard-${locale === "fr" ? "fr" : "en"}${width === 2400 ? "" : `-${width}`}.webp ${width}w`).join(", ")}
            sizes="(max-width: 534px) 136px, (max-width: 760px) 25.5vw, (max-height: 500px) and (pointer: coarse) 25.5vw, (max-width: 1100px) 94vw, 1000px"
            alt=""
            width={2400}
            height={1248}
            fetchPriority="high"
            decoding="async"
            draggable={false}
          />
          <span className="hero-dashboard-disclosure">
            {t("Actual dashboard · Sample data", "Tableau de bord réel · Données d’exemple")}
          </span>
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
