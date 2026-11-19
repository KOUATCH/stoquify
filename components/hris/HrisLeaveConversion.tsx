export function HrisLeaveConversion({ value, locale }: { value: unknown; locale: string }) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const c = value as Record<string, unknown>
  if (typeof c.quantity !== "number" || typeof c.scheduledMinutes !== "number" || typeof c.minutes !== "number" || typeof c.workDate !== "string") return null
  const fr = locale.startsWith("fr"), unit = c.unit === "DAYS" ? (fr ? "jour(s)" : "day(s)") : c.unit === "HOURS" ? (fr ? "heure(s)" : "hour(s)") : "min"
  const factor = c.unit === "DAYS" ? c.scheduledMinutes : c.unit === "HOURS" ? 60 : 1
  return <p className="text-sm">{c.workDate}: {c.quantity} {unit} × {factor} = {c.minutes} min · {fr ? "Horaire validé" : "Reviewed schedule"}: {c.scheduledMinutes} min</p>
}
