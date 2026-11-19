"use client"

import { useCallback, useEffect, useRef, type ReactNode } from "react"
import { useCinematicMotionOff } from "./cinematic-shell"

export function WorkflowDetails({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const summaryRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<Animation | null>(null)
  const expandedRef = useRef(false)
  const motionOff = useCinematicMotionOff()

  const finish = useCallback(() => {
    const details = detailsRef.current
    if (!details) return
    details.open = expandedRef.current
    details.style.overflow = ""
    if (animationRef.current) {
      animationRef.current.onfinish = null
      animationRef.current.cancel()
      animationRef.current = null
    }
  }, [])

  useEffect(() => {
    if (motionOff) finish()
  }, [motionOff, finish])

  useEffect(() => () => {
    if (animationRef.current) {
      animationRef.current.onfinish = null
      animationRef.current.cancel()
    }
  }, [])

  function toggle() {
    const details = detailsRef.current
    const summaryElement = summaryRef.current
    const content = contentRef.current
    if (!details || !summaryElement || !content) return
    const expanded = animationRef.current ? !expandedRef.current : !details.open
    const startHeight = details.getBoundingClientRect().height
    if (animationRef.current) {
      animationRef.current.onfinish = null
      animationRef.current.cancel()
      animationRef.current = null
    }
    expandedRef.current = expanded
    summaryElement.setAttribute("aria-expanded", String(expanded))
    content.inert = !expanded
    content.setAttribute("aria-hidden", String(!expanded))
    // Keep native details open until a collapse finishes, so its content can shrink visibly.
    details.open = true
    if (motionOff || typeof details.animate !== "function") {
      finish()
      return
    }
    const border = parseFloat(getComputedStyle(details).borderTopWidth) || 0
    const endHeight = expanded ? details.getBoundingClientRect().height : summaryElement.getBoundingClientRect().height + border
    details.style.overflow = "hidden"
    animationRef.current = details.animate(
      [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
      { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" },
    )
    animationRef.current.onfinish = finish
  }

  return <details ref={detailsRef} className="workflow-details group mt-5 border-t border-[var(--rule-2)]">
    <summary ref={summaryRef} onClick={event => { event.preventDefault(); toggle() }} className="body-text flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold text-[var(--accent-hi)] [&::-webkit-details-marker]:hidden">
      {summary}
    </summary>
    <div ref={contentRef} className="workflow-details-content">{children}</div>
  </details>
}
