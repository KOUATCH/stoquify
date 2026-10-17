"use client"

import { useEffect, useRef } from "react"
import { CinematicHero } from "./cinematic-hero"
import { CinematicProduct, CinematicStory } from "./cinematic-product"
import { CinematicChapters } from "./cinematic-chapters"
import { CapabilityOverview } from "./capability-overview"

export function CinematicLanding() {
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const main = mainRef.current
    if (!main || !("IntersectionObserver" in window)) return
    const reveal = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
            reveal.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08 },
    )
    const artwork = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          entry.target.classList.toggle("art-in-view", entry.isIntersecting),
        )
      },
      { threshold: 0.05 },
    )
    main
      .querySelectorAll(".reveal")
      .forEach((element) => reveal.observe(element))
    main
      .querySelectorAll(".art,.convergence,.story-art")
      .forEach((element) => artwork.observe(element))
    return () => {
      reveal.disconnect()
      artwork.disconnect()
    }
  }, [])

  return (
    <main id="main" ref={mainRef} tabIndex={-1}>
      <CinematicHero />
      <CinematicProduct />
      <CinematicStory />
      <div className="capability-catalog">
        <CapabilityOverview />
      </div>
      <CinematicChapters />
    </main>
  )
}
