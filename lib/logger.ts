import { sanitizeErrorMetadata } from "@/lib/error-handling/error-handler"

export type LogLevel = "debug" | "info" | "warn" | "error"

export type LogContext = Record<string, unknown>

export type LogEntry = {
  level: LogLevel
  message: string
  context?: LogContext
  timestamp: string
}

type LoggerSink = (entry: LogEntry) => void | Promise<void>

// The application host collects stdout/stderr; optional integrations can replace
// the sink without making business operations depend on their availability.
const consoleSink: LoggerSink = entry => { console[entry.level](JSON.stringify(entry)) }
let sink: LoggerSink = consoleSink

function bounded(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]"
  // Raw database errors may contain SQL, parameters and personal data.
  if (value instanceof Error) return { name: value.name, code: (value as Error & { code?: unknown }).code }
  if (typeof value === "bigint") return value.toString()
  if (typeof value === "string") return value.slice(0, 2000).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
  if (Array.isArray(value)) return value.slice(0, 25).map(item => bounded(item, depth + 1))
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).slice(0, 25).map(([key, item]) => [key,
    /email|phone|address|salary|bankAccount|iban|rawPayload|requestBody|responseBody/i.test(key) ? "[REDACTED]" : bounded(item, depth + 1)]))
  return value
}

function fallback(entry: LogEntry) {
  try { consoleSink({ ...entry, context: { ...entry.context, logSinkFailed: true } }) } catch { /* Logging cannot change the business result. */ }
}

export function setLoggerSink(nextSink?: LoggerSink) {
  sink = nextSink ?? consoleSink
}

function write(level: LogLevel, message: string, context?: LogContext) {
  let entry: LogEntry
  try {
    entry = { level, message: String(sanitizeErrorMetadata(bounded(message))),
      context: sanitizeErrorMetadata(bounded(context)) as LogContext | undefined, timestamp: new Date().toISOString() }
  } catch {
    entry = { level, message: "log context unavailable", timestamp: new Date().toISOString() }
  }
  try {
    const pending = sink(entry)
    if (pending) void Promise.resolve(pending).catch(() => fallback(entry))
  } catch { fallback(entry) }
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
}
