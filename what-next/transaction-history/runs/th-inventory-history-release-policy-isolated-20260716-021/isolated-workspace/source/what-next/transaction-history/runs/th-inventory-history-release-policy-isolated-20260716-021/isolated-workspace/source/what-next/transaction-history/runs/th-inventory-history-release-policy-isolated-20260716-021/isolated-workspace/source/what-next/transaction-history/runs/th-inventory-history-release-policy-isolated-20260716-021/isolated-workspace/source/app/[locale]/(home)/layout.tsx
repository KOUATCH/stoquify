import { getSession } from "@/lib/auth-server";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import type { ReactNode } from "react";
import { landingFontVars } from "./landing-fonts";
import "./landing.css"

/**
 * Marketing-page shell.
 *
 * Wraps every public-marketing route in `.landing-root` so:
 *   - the three font CSS variables (--font-display / --font-body /
 *     --font-mono) loaded by ./landing-fonts.ts are in scope, and
 *   - the design tokens declared in ./landing.css under .landing-root
 *     (ink/rule/accent/signal palette, .display, .body-text, .data-text,
 *     .eyebrow, .landing-grid-bg, .landing-grain, etc.) apply.
 *
 * Without this wrapper, the new landing components render but every
 * variable falls back to undefined — fonts default to Rethink_Sans,
 * colours collapse, the page looks unstyled. Don't remove .landing-root.
 */
export default async function HomeLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getSession()
  return (
    <div className={`landing-root ${landingFontVars} bg-[var(--color-canvas)] text-[var(--color-text-secondary)]`}>
      <LandingHeader session={session} />
      {children}
      <LandingFooter />
    </div>
  )
}
