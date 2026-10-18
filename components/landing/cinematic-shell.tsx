"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useLocale } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { cinematicModules } from "./cinematic-modules"
import StoquifyLogo from "@/components/global/kit-logo"

const MotionContext = createContext(true)
export const useCinematicMotionOff = () => useContext(MotionContext)

/** Only the locale homepage gets the cinematic chrome; other public routes keep their shell. */
export function LandingRouteShell({
  children,
  header,
  footer,
  signedIn,
}: {
  children: ReactNode
  header: ReactNode
  footer: ReactNode
  signedIn: boolean
}) {
  const pathname = usePathname()
  return pathname === "/" ? (
    <CinematicShell signedIn={signedIn}>{children}</CinematicShell>
  ) : (
    <>
      {header}
      {children}
      {footer}
    </>
  )
}

function CinematicShell({
  children,
  signedIn,
}: {
  children: ReactNode
  signedIn: boolean
}) {
  const locale = useLocale()
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en)
  // Start static on the server. Media is attached only after client preference checks.
  const [reduced, setReduced] = useState(true)
  const [ready, setReady] = useState(false)
  const [paused, setPaused] = useState(false)
  const [menu, setMenu] = useState<"products" | "mobile" | null>(null)
  const [light, setLight] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const productsRef = useRef<HTMLButtonElement>(null)
  const mobileRef = useRef<HTMLButtonElement>(null)
  const motionOff = reduced || paused

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(preference.matches)
    update()
    setReady(true)
    preference.addEventListener("change", update)
    return () => preference.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24)
        const chapter =
          headerRef.current?.parentElement?.querySelector("#light-chapter")
        setLight(Boolean(chapter && chapter.getBoundingClientRect().top <= 72))
      })
    }
    const resize = () => {
      setMenu(null)
      update()
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", resize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", resize)
    }
  }, [])

  useEffect(() => {
    if (!menu) return
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      setMenu(null)
      ;(menu === "mobile" ? mobileRef : productsRef).current?.focus()
    }
    const outside = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !headerRef.current?.contains(event.target)
      )
        setMenu(null)
    }
    document.addEventListener("keydown", escape)
    document.addEventListener("click", outside)
    return () => {
      document.removeEventListener("keydown", escape)
      document.removeEventListener("click", outside)
    }
  }, [menu])

  const products = cinematicModules.map((module) => module.label)

  return (
    <MotionContext.Provider value={motionOff}>
      <div
        className={`cinematic-home${ready ? " motion-ready" : ""}${motionOff ? " motion-off" : ""}`}
      >
        <a className="skip" href="#main">
          {t("Skip to content", "Aller au contenu")}
        </a>
        <header
          id="header"
          ref={headerRef}
          data-landing-header
          className={`${scrolled ? "scrolled" : ""} ${light ? "light" : ""} ${menu ? "menu-open" : ""}`}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setMenu(null)
          }}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setMenu(null)
          }}
        >
          <nav
            className="nav"
            aria-label={t("Main navigation", "Navigation principale")}
          >
            <Link
              className="logo"
              href="/"
              aria-label={t("Stoquify home", "Accueil Stoquify")}
            >
              <StoquifyLogo
                theme={light ? "light" : "dark"}
                width={212}
                height={48}
                tagline={t("OHADA operating OS", "Système opérationnel OHADA")}
              />
            </Link>
            <div className="desktop-links">
              <button
                ref={productsRef}
                id="products-toggle"
                aria-expanded={menu === "products"}
                aria-controls="mega"
                onClick={() => setMenu(menu === "products" ? null : "products")}
              >
                {t("Products", "Produits")}
                <span aria-hidden="true">⌄</span>
              </button>
              <Link href="/#workflow">{t("Workflows", "Parcours")}</Link>
              <Link href="/#pricing">
                {t("Getting started", "Bien démarrer")}
              </Link>
            </div>
            <div className="nav-actions">
              <Link
                id="language"
                href="/"
                locale={locale === "fr" ? "en" : "fr"}
                aria-label={
                  locale === "fr" ? "Switch to English" : "Passer en français"
                }
              >
                {locale === "fr" ? "EN" : "FR"}
              </Link>
              <Link className="login" href={signedIn ? "/dashboard" : "/login"}>
                {signedIn
                  ? t("Dashboard", "Tableau de bord")
                  : t("Log in", "Connexion")}
              </Link>
              <Link
                className="button primary"
                href={signedIn ? "/dashboard" : "/register"}
              >
                {signedIn
                  ? t("Open workspace", "Ouvrir l’espace")
                  : t("Create account", "Créer un compte")}
                <span aria-hidden="true">↗︎</span>
              </Link>
              <button
                ref={mobileRef}
                id="mobile-toggle"
                aria-expanded={menu === "mobile"}
                aria-controls="mobile-menu"
                aria-label={
                  menu === "mobile"
                    ? t("Close menu", "Fermer le menu")
                    : t("Open menu", "Ouvrir le menu")
                }
                onClick={() => setMenu(menu === "mobile" ? null : "mobile")}
              >
                <span />
                <span />
              </button>
            </div>
          </nav>
          <div id="mega" className="mega" hidden={menu !== "products"}>
            <div>
              <p className="eyebrow">STOQUIFY</p>
              <h2>
                {t(
                  "Your daily operations, together.",
                  "Vos opérations quotidiennes, réunies.",
                )}
              </h2>
              <p>
                {t(
                  "Explore sales, stock, people, payroll and financial review.",
                  "Explorez les ventes, les stocks, le personnel, la paie et la révision financière.",
                )}
              </p>
              <Link className="text-link" href="/#modules">
                {t("Explore all capabilities", "Explorer les fonctionnalités")}{" "}
                ↗︎
              </Link>
            </div>
            {products.map(([en, fr], index) => (
              <Link className="mega-link" key={en} href={`/#flow-tab-${index}`}>
                <h3>{t(en, fr)}</h3>
                <p>
                  {t(
                    "Explore the connected workspace",
                    "Découvrir l’espace connecté",
                  )}{" "}
                  ↗︎
                </p>
              </Link>
            ))}
          </div>
          <div
            id="mobile-menu"
            data-landing-mobile-menu
            hidden={menu !== "mobile"}
          >
            <Link href="/#product">{t("Products", "Produits")}</Link>
            <Link href="/#modules">{t("Capabilities", "Fonctionnalités")}</Link>
            <Link href="/#workflow">{t("Workflows", "Parcours")}</Link>
            <Link href="/#pricing">
              {t("Getting started", "Bien démarrer")}
            </Link>
            <Link href="/workflows">
              {t("Workflow atlas", "Catalogue des parcours")}
            </Link>
            <Link href={signedIn ? "/dashboard" : "/login"}>
              {signedIn
                ? t("Dashboard", "Tableau de bord")
                : t("Log in", "Connexion")}
            </Link>
            {!signedIn && (
              <Link className="button primary" href="/register">
                {t("Create your account", "Créer votre compte")} ↗︎
              </Link>
            )}
          </div>
        </header>
        {children}
        <footer>
          <div className="footer-top">
            <Link
              className="logo"
              href="/"
              aria-label={t("Stoquify home", "Accueil Stoquify")}
            >
              <StoquifyLogo
                theme="light"
                width={212}
                height={48}
                tagline={t("OHADA operating OS", "Système opérationnel OHADA")}
              />
            </Link>
            <div>
              <h3>{t("Product", "Produit")}</h3>
              <Link href="/#product">{t("Overview", "Vue d’ensemble")}</Link>
              <Link href="/#modules">
                {t("Capabilities", "Fonctionnalités")}
              </Link>
              <Link href="/#workflow">{t("Workflow", "Parcours")}</Link>
            </div>
            <div>
              <h3>{t("Get started", "Démarrer")}</h3>
              <Link href="/register">
                {t("Create account", "Créer un compte")}
              </Link>
              <Link href="/login">{t("Log in", "Connexion")}</Link>
              <Link href="/#pricing">
                {t("Adoption options", "Options d’adoption")}
              </Link>
            </div>
            <div>
              <h3>{t("Explore", "Explorer")}</h3>
              <Link href="/workflows">
                {t("Workflow atlas", "Catalogue des parcours")}
              </Link>
              <Link href="/#problem">
                {t("For your business", "Pour votre entreprise")}
              </Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Stoquify</span>
            <span>
              {t(
                "Illustrative records. No live business data.",
                "Données d’exemple. Aucune donnée réelle.",
              )}
            </span>
          </div>
        </footer>
        <button
          className="motion-toggle"
          aria-pressed={motionOff}
          disabled={reduced}
          onClick={() => setPaused(!paused)}
        >
          {reduced
            ? t("Reduced motion enabled", "Animations réduites activées")
            : motionOff
              ? t("Enable motion", "Activer les animations")
              : t("Pause motion", "Suspendre les animations")}
        </button>
      </div>
    </MotionContext.Provider>
  )
}
