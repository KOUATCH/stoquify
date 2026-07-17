export type LogLevel = "debug" | "info" | "warn" | "error"

export type LogContext = Record<string, unknown>

export type LogEntry = {
  level: LogLevel
  message: string
  context?: LogContext
  timestamp: string
}

type LoggerSink = (entry: LogEntry) => void

let sink: LoggerSink = () => {}

export function setLoggerSink(nextSink?: LoggerSink) {
  sink = nextSink ?? (() => {})
}

function write(level: LogLevel, message: string, context?: LogContext) {
  sink({
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  })
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
}
