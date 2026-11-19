"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { Pause, Play, RotateCcw, ChevronRight } from "lucide-react"
import { useCinematicMotionOff } from "./cinematic-shell"
import type { LandingWorkflow } from "./landing-workflow-library"

/** The additional journeys use the same playback rules as the module previews. */
export function JourneyPreview({ workflow, active }: { workflow: LandingWorkflow; active: boolean }) {
  const fr = useLocale() === "fr"
  const motionOff = useCinematicMotionOff()
  const root = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  const [replay, setReplay] = useState(0)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const playing = active && visible && pageVisible && !paused && !motionOff

  useEffect(() => {
    if (!active) {
      setStep(0)
      setPaused(false)
      setVisible(false)
      return
    }
    const update = () => setPageVisible(!document.hidden)
    update()
    document.addEventListener("visibilitychange", update)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 })
    if (root.current) observer.observe(root.current)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", update)
    }
  }, [active])

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => setStep(current => (current + 1) % workflow.steps.length), 6000)
    return () => window.clearTimeout(timer)
  }, [playing, step, replay, workflow.steps.length])

  const selectStep = (index: number) => {
    setStep(index)
    setPaused(true)
  }

  return <div ref={root} className="journey-preview" data-workflow={workflow.id} data-step={step} data-playing={playing}
    onFocusCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(true) }}
    onMouseEnter={() => setPaused(true)}>
    <p className="journey-preview-label">{fr ? "LE PARCOURS, ÉTAPE PAR ÉTAPE" : "THE WORKFLOW, STEP BY STEP"}</p>
    <ol className="journey-stages">{workflow.steps.map((label, index) => <li key={label} data-current={index === step}>
      <button type="button" aria-pressed={index === step} onClick={() => selectStep(index)}>
        <span className="journey-step-number">{String(index + 1).padStart(2, "0")}</span>
        <span className="journey-step-label">{label}</span>
        {index === step && <span key={`${step}-${playing}-${replay}`} className="journey-step-progress" data-playing={playing} aria-hidden="true" />}
      </button>
    </li>)}</ol>
    <div className="journey-playback">
      <span className="journey-position" role="status" aria-live={playing ? "off" : "polite"}>{fr ? "Étape" : "Step"} {step + 1} / {workflow.steps.length}</span>
      <div className="journey-playback-actions">
        <button type="button" disabled={motionOff} onClick={() => setPaused(current => !current)} aria-label={paused || motionOff ? (fr ? "Lire le parcours" : "Play workflow") : (fr ? "Mettre le parcours en pause" : "Pause workflow")}>
          {paused || motionOff ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          <span>{paused || motionOff ? (fr ? "Lire" : "Play") : "Pause"}</span>
        </button>
        <button type="button" onClick={() => { setStep(0); setPaused(false); setReplay(current => current + 1) }} aria-label={fr ? "Rejouer le parcours" : "Replay workflow"}><RotateCcw size={14} aria-hidden="true" /><span>{fr ? "Rejouer" : "Replay"}</span></button>
        <button type="button" onClick={() => selectStep((step + 1) % workflow.steps.length)} aria-label={fr ? "Étape suivante" : "Next step"}><ChevronRight size={14} aria-hidden="true" /><span>{fr ? "Suivant" : "Next"}</span></button>
      </div>
    </div>
    <div className="journey-checks"><h4>{fr ? "Les contrôles à conserver" : "Checks that stay with the work"}</h4><ul>{workflow.controls.map(control => <li key={control}>{control}</li>)}</ul></div>
  </div>
}
