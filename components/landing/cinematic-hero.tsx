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
  const videoRef = useRef<HTMLVideoElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)
  const noteRef = useRef<HTMLDivElement>(null)
  const cueRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const video = videoRef.current
    const copy = copyRef.current
    const zoom = zoomRef.current
    const note = noteRef.current
    const cue = cueRef.current
    if (!section || !video || !copy || !zoom || !note || !cue) return
    const mobile = window.matchMedia("(max-width: 760px)")
    let frame = 0
    let targetTime = 0
    let failed = false

    const seek = () => {
      if (
        motionOff ||
        mobile.matches ||
        failed ||
        video.readyState < 1 ||
        video.seeking
      )
        return
      if (Math.abs(video.currentTime - targetTime) > 0.045)
        video.currentTime = targetTime
    }
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
      zoom.style.opacity = String(
        Math.min(1, Math.max(0, (progress - 0.24) / 0.12)),
      )
      zoom.style.top = `${(0.62 - 0.17 * Math.min(1, progress / 0.75)) * 100}%`
      zoom.style.transform = `translateY(-50%) scale(${Math.min(1, 0.055 + progress ** 3 * 2.5)})`
      const duration = Number.isFinite(video.duration) ? video.duration : 6.4
      targetTime = Math.max(0, Math.min(duration - 0.05, progress * duration))
      seek()
    }
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const configure = () => {
      video.pause()
      if (motionOff || mobile.matches) {
        video.style.opacity = "0"
        if (video.hasAttribute("src")) {
          video.removeAttribute("src")
          video.load()
        }
      } else if (!video.hasAttribute("src") && !failed) {
        video.src = "/landing/cinematic/hero-scrub.mp4"
        video.load()
      }
      update()
    }
    const loaded = () => {
      section.classList.remove("media-fallback")
      video.style.opacity = motionOff || mobile.matches ? "0" : "1"
      update()
    }
    const error = () => {
      failed = true
      video.style.opacity = "0"
      section.classList.add("media-fallback")
      update()
    }
    video.addEventListener("loadeddata", loaded)
    video.addEventListener("seeked", seek)
    video.addEventListener("error", error)
    mobile.addEventListener("change", configure)
    window.addEventListener("scroll", queue, { passive: true })
    window.addEventListener("resize", queue)
    configure()
    return () => {
      cancelAnimationFrame(frame)
      video.pause()
      video.removeEventListener("loadeddata", loaded)
      video.removeEventListener("seeked", seek)
      video.removeEventListener("error", error)
      mobile.removeEventListener("change", configure)
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
        {/* Deliberately unoptimized: this pre-sized local poster must match the video exactly. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="hero-image"
          src="/landing/cinematic/hero-start.webp"
          alt=""
          width={1920}
          height={1080}
          fetchPriority="high"
        />
        <video
          id="hero-video"
          ref={videoRef}
          muted
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          poster="/landing/cinematic/hero-start.webp"
        />
        <div className="hero-shade" />
        <div className="hero-copy" ref={copyRef}>
          <h1>
            {t(
              "Your business. Beautifully connected.",
              "Votre activité. Enfin connectée.",
            )}
          </h1>
          <p className="hero-intro">
            {t(
              "Keep sales, stock and payments in one workspace, with a path to accounting review.",
              "Réunissez ventes, stocks et paiements dans un espace de travail, jusqu’à la révision comptable.",
            )}
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/register">
              {t("Create your account", "Créer votre compte")}
              <span aria-hidden="true">↗︎</span>
            </Link>
            <Link className="button glass" href="/#showcase">
              {t("See how it works", "Voir comment ça marche")}
              <span aria-hidden="true">↗︎</span>
            </Link>
          </div>
        </div>
        <div className="hero-note" ref={noteRef}>
          {t(
            "For owners and managers of retail and distribution businesses.",
            "Pour les dirigeants et responsables des commerces et entreprises de distribution.",
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
                t("Payments", "Paiements"),
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
              <svg viewBox="0 0 800 180">
                <path
                  d="M0 155L80 135L150 150L230 80L300 95L380 45L450 65L530 25L600 45L710 10L800 20"
                  fill="none"
                  stroke="#5796ff"
                  strokeWidth="4"
                />
              </svg>
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
