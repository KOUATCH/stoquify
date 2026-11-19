import type { CinematicModuleId } from "./cinematic-modules";

export const WORKFLOW_DURATION = 18000;
export const WORKFLOW_END_HOLD = 3000;
const WORKFLOW_RESET_FADE = 400;
export const WORKFLOW_CYCLE_DURATION =
  WORKFLOW_DURATION + WORKFLOW_END_HOLD + WORKFLOW_RESET_FADE;
type Flight = {
  label: readonly [string, string];
  from: string;
  to: string;
  start: number;
  end: number;
};

// Each object travels between actual interface elements, including after reflow.
export const workflowFlights: Record<CinematicModuleId, readonly Flight[]> = {
  pos: [
    {
      label: ["Coffee × 1", "Café × 1"],
      from: ".workflow-item:nth-child(1)",
      to: ".workflow-receipt .workflow-record:nth-of-type(1)",
      start: 900,
      end: 2300,
    },
    {
      label: ["Tea × 1", "Thé × 1"],
      from: ".workflow-item:nth-child(2)",
      to: ".workflow-receipt .workflow-record:nth-of-type(2)",
      start: 3200,
      end: 4700,
    },
    {
      label: ["4 000 XAF · Cash", "4 000 XAF · Espèces"],
      from: ".workflow-payment",
      to: ".workflow-receipt .workflow-status",
      start: 11200,
      end: 13500,
    },
  ],
  inventory: [
    {
      label: ["24 units", "24 unités"],
      from: ".workflow-transfer .workflow-card:first-child",
      to: ".workflow-route",
      start: 6500,
      end: 8500,
    },
    {
      label: ["24 units", "24 unités"],
      from: ".workflow-route",
      to: ".workflow-transfer .workflow-card:last-child",
      start: 10800,
      end: 13000,
    },
  ],
  finance: [
    {
      label: ["REF-104 · 4 000 XAF", "REF-104 · 4 000 XAF"],
      from: ".workflow-evidence",
      to: ".workflow-card:last-child",
      start: 2900,
      end: 5000,
    },
    {
      label: ["XAF ↔ XAF", "XAF ↔ XAF"],
      from: ".workflow-card:last-child",
      to: ".workflow-record:first-child",
      start: 6200,
      end: 7900,
    },
  ],
  accounting: [
    {
      label: ["Cash · Debit", "Caisse · Débit"],
      from: ".workflow-source",
      to: ".workflow-journal tbody tr:first-child",
      start: 6300,
      end: 8300,
    },
    {
      label: ["Sales · Credit", "Ventes · Crédit"],
      from: ".workflow-source",
      to: ".workflow-journal tbody tr:last-child",
      start: 8400,
      end: 10000,
    },
  ],
  receivables: [
    {
      label: ["Collection · 40 000 XAF", "Encaissement · 40 000 XAF"],
      from: ".workflow-evidence",
      to: ".workflow-record:nth-child(2)",
      start: 6500,
      end: 9000,
    },
    {
      label: ["−40 000 XAF", "−40 000 XAF"],
      from: ".workflow-record:nth-child(2)",
      to: ".workflow-card:last-child",
      start: 9300,
      end: 11200,
    },
  ],
  payables: [
    {
      label: ["GR-028 · Goods receipt", "GR-028 · Réception"],
      from: ".workflow-evidence",
      to: ".workflow-record:nth-child(2)",
      start: 6200,
      end: 8200,
    },
    {
      label: ["BILL-028 · Invoice", "BILL-028 · Facture"],
      from: ".workflow-evidence",
      to: ".workflow-record:nth-child(3)",
      start: 9300,
      end: 11300,
    },
  ],
  hris: [
    {
      label: ["DOC-024 · Contract", "DOC-024 · Contrat"],
      from: ".workflow-evidence",
      to: ".workflow-record:nth-child(2)",
      start: 6100,
      end: 8000,
    },
    {
      label: ["October · Time inputs", "Octobre · Temps de travail"],
      from: ".workflow-person",
      to: ".workflow-record:nth-child(3)",
      start: 12300,
      end: 14300,
    },
  ],
  payroll: [
    {
      label: ["EMP-024 · Time inputs", "EMP-024 · Temps de travail"],
      from: ".workflow-evidence",
      to: ".workflow-record:nth-child(2)",
      start: 6100,
      end: 8000,
    },
    {
      label: ["Draft payslip", "Bulletin provisoire"],
      from: ".workflow-person",
      to: ".workflow-result",
      start: 12800,
      end: 15000,
    },
  ],
};

/** Native animations share one seekable clock. Only transforms/opacity animate. */
export function createWorkflowAnimations(
  root: HTMLElement,
  module: CinematicModuleId,
) {
  const animations: Animation[] = [];
  const add = (element: Element | null, frames: Keyframe[]) => {
    if (!element?.animate) return;
    // Keep every track on the same clock, including the final reading pause.
    const last = frames[frames.length - 1];
    const heldFrames =
      last.offset === 1 ? frames : [...frames, { ...last, offset: 1 }];
    const animation = element.animate(heldFrames, {
      duration: WORKFLOW_CYCLE_DURATION,
      fill: "both",
    });
    animation.pause();
    animations.push(animation);
  };
  const frame = (time: number, values: Keyframe): Keyframe => ({
    offset: time / WORKFLOW_CYCLE_DURATION,
    ...values,
  });
  const reveal = (selector: string, at: number) => {
    const hidden = { opacity: 0, transform: "translateY(12px)" };
    const shown = { opacity: 1, transform: "translateY(0)" };
    add(root.querySelector(selector), [
      frame(0, hidden),
      frame(at, { ...hidden, easing: "cubic-bezier(.22,1,.36,1)" }),
      frame(at + 650, shown),
      frame(WORKFLOW_DURATION, shown),
    ]);
  };
  const pulses = new Map<string, Keyframe[]>();
  const pulse = (selector: string, at: number) => {
    const frames = pulses.get(selector) || [
      frame(0, { transform: "scale(1)" }),
    ];
    frames.push(
      frame(at, { transform: "scale(1)", easing: "ease-out" }),
      frame(at + 250, { transform: "scale(.96)" }),
      frame(at + 750, { transform: "scale(1)" }),
    );
    pulses.set(selector, frames);
  };
  const bounds = root.getBoundingClientRect();
  // Ratios keep flight coordinates in CSS pixels under a transformed ancestor.
  const scaleX = bounds.width / (root.offsetWidth || bounds.width) || 1;
  const scaleY = bounds.height / (root.offsetHeight || bounds.height) || 1;
  for (const [index, flight] of workflowFlights[module].entries()) {
    const from = root.querySelector(flight.from)?.getBoundingClientRect();
    const to = root.querySelector(flight.to)?.getBoundingClientRect();
    const token = root.querySelector<HTMLElement>(`[data-flight="${index}"]`);
    if (!from || !to || !token) continue;
    const fitX = (x: number) =>
      Math.max(0, Math.min(root.offsetWidth - token.offsetWidth, x));
    const x1 = fitX(
      (from.left + from.width / 2 - bounds.left) / scaleX -
        token.offsetWidth / 2,
    );
    const y1 =
      (from.top + from.height / 2 - bounds.top) / scaleY -
      token.offsetHeight / 2;
    const x2 = fitX(
      (to.left + to.width / 2 - bounds.left) / scaleX - token.offsetWidth / 2,
    );
    const y2 =
      (to.top + to.height / 2 - bounds.top) / scaleY - token.offsetHeight / 2;
    const position = (x: number, y: number, scale = 1) =>
      `translate(${x}px, ${y}px) scale(${scale})`;
    const hidden = { opacity: 0, transform: position(x1, y1, 0.8) };
    const landed = { opacity: 0, transform: position(x2, y2, 0.85) };
    add(token, [
      frame(0, hidden),
      frame(flight.start, hidden),
      // Sample a continuous arc with zero velocity at lift-off and landing.
      // The browser interpolates between these points without a midpoint stop.
      ...Array.from({ length: 25 }, (_, index) => {
        const fraction = index / 24;
        const progress = fraction * fraction * (3 - 2 * fraction);
        return frame(
          flight.start + 200 + (flight.end - flight.start - 360) * fraction,
          {
            opacity: 1,
            transform: position(
              x1 + (x2 - x1) * progress,
              y1 + (y2 - y1) * progress - 128 * progress * (1 - progress),
            ),
          },
        );
      }),
      frame(flight.end, landed),
      frame(WORKFLOW_DURATION, landed),
    ]);
    pulse(flight.from, flight.start - 200);
    // Highlight the exact destination as the record arrives, without moving its layout.
    const destination = root.querySelector<HTMLElement>(flight.to);
    const highlight = destination?.querySelector(".workflow-arrival");
    add(highlight || null, [
      frame(0, { opacity: 0 }),
      frame(flight.end - 200, { opacity: 0 }),
      frame(flight.end + 150, { opacity: 0.25 }),
      frame(flight.end + 1100, { opacity: 0 }),
      frame(WORKFLOW_DURATION, { opacity: 0 }),
    ]);
  }
  for (const [selector, frames] of pulses) {
    add(root.querySelector(selector), [
      ...frames,
      frame(WORKFLOW_DURATION, { transform: "scale(1)" }),
    ]);
  }
  if (module === "pos") {
    reveal(".workflow-receipt .workflow-record:nth-of-type(1)", 2100);
    reveal(".workflow-receipt .workflow-record:nth-of-type(2)", 4500);
    reveal(".workflow-payment", 6100);
    reveal(".workflow-payment-confirm", 9200);
  } else if (module === "accounting") {
    reveal(".workflow-journal tbody tr:first-child", 8000);
    reveal(".workflow-journal tbody tr:last-child", 9700);
  }
  if (module !== "inventory") reveal(".workflow-result", 14800);
  add(root.querySelector(".workflow-playhead"), [
    frame(0, { transform: "scaleX(0)" }),
    frame(WORKFLOW_DURATION, { transform: "scaleX(1)" }),
  ]);
  // Hide the reset itself while retaining the mounted interface and its layout.
  add(root, [
    frame(0, { opacity: 0, easing: "ease-out" }),
    frame(WORKFLOW_RESET_FADE, { opacity: 1 }),
    frame(WORKFLOW_DURATION + WORKFLOW_END_HOLD, {
      opacity: 1,
      easing: "ease-in",
    }),
    frame(WORKFLOW_CYCLE_DURATION, { opacity: 0 }),
  ]);
  return animations;
}
