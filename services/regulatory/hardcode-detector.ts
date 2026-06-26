import { readdir, readFile } from "fs/promises"
import { join, relative, sep } from "path"

export type RegulatoryHardcodeSeverity = "critical" | "high" | "medium"

export type RegulatoryHardcodeFinding = {
  ruleId: string
  severity: RegulatoryHardcodeSeverity
  filePath: string
  line: number
  excerpt: string
  message: string
  suggestedPackPath: string
}

type DetectorRule = {
  id: string
  severity: RegulatoryHardcodeSeverity
  regex: RegExp
  context?: RegExp
  message: string
  suggestedPackPath: string
}

const DEFAULT_EXCLUDED_PARTS = [
  ".git",
  ".next",
  "node_modules",
  "graphify-out",
  "services/regulatory",
  "prisma/migrations",
  "prisma/comprehensive-seed.ts",
  "__fixtures__",
  "fixtures",
  "__tests__",
]

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"])

const DETECTOR_RULES: DetectorRule[] = [
  {
    id: "country-vat-rate-literal",
    severity: "critical",
    regex: /\b(?:19\.25|17\.5|0\.1925)\b/g,
    context: /vat|tva|tax|taxe|fiscal|rate|taux/i,
    message: "Country VAT rates must resolve from versioned country packs, not production literals.",
    suggestedPackPath: "services/regulatory/country-packs/cameroon.ts#taxes.vat",
  },
  {
    id: "social-contribution-literal",
    severity: "critical",
    regex: /\b(?:4\.2|8\.4|5\.65|3\.7|1\.75|2\.5|750000|750_000|9000000|9_000_000)\b/g,
    context: /cnps|social|cotisation|payroll|salary|salaire|pension|smig/i,
    message: "Payroll and social contribution values must resolve from versioned country packs.",
    suggestedPackPath: "services/regulatory/country-packs/cameroon.ts#payroll.cnps",
  },
  {
    id: "mobile-money-provider-literal",
    severity: "high",
    regex: /\b(?:MTN_MOMO|ORANGE_MONEY|EU_MOBILE|YUP)\b/g,
    message: "Payment-provider legality must come from the country pack capability data.",
    suggestedPackPath: "services/regulatory/country-packs/cameroon.ts#payments.providerLegality",
  },
  {
    id: "statutory-filing-literal",
    severity: "high",
    regex: /\b(?:DSF|DIPE|NIU|RCCM)\b/g,
    context: /deadline|due|format|regex|filing|declaration|fiscal|tax|taxpayer|identifier|immatriculation/i,
    message: "Regulatory filing names and identifier formats must be country-pack data.",
    suggestedPackPath: "services/regulatory/country-packs/cameroon.ts#filings",
  },
]

function normalizePath(filePath: string) {
  return filePath.replaceAll("\\", "/")
}

function isExcluded(filePath: string, extraExclusions: readonly string[]) {
  const normalized = normalizePath(filePath)
  if (/\.(test|spec)\.[jt]sx?$/.test(normalized)) return true
  return [...DEFAULT_EXCLUDED_PARTS, ...extraExclusions].some((part) => normalized.includes(normalizePath(part)))
}

function fileExtension(filePath: string) {
  const normalized = normalizePath(filePath)
  const index = normalized.lastIndexOf(".")
  return index === -1 ? "" : normalized.slice(index)
}

export function detectRegulatoryHardcodesInText(
  filePath: string,
  text: string,
  options: { extraExclusions?: readonly string[] } = {},
): RegulatoryHardcodeFinding[] {
  if (isExcluded(filePath, options.extraExclusions ?? [])) return []

  const findings: RegulatoryHardcodeFinding[] = []
  const lines = text.split(/\r?\n/)

  lines.forEach((lineText, index) => {
    DETECTOR_RULES.forEach((rule) => {
      rule.regex.lastIndex = 0
      const matched = rule.regex.test(lineText)
      rule.regex.lastIndex = 0

      if (!matched) return
      if (rule.context && !rule.context.test(lineText)) return

      findings.push({
        ruleId: rule.id,
        severity: rule.severity,
        filePath,
        line: index + 1,
        excerpt: lineText.trim(),
        message: rule.message,
        suggestedPackPath: rule.suggestedPackPath,
      })
    })
  })

  return findings
}

async function walkFiles(root: string, extraExclusions: readonly string[]) {
  const files: string[] = []
  const entries = await readdir(root, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(root, entry.name)
    if (isExcluded(fullPath, extraExclusions)) continue

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath, extraExclusions)))
      continue
    }

    if (entry.isFile() && SOURCE_EXTENSIONS.has(fileExtension(fullPath))) {
      files.push(fullPath)
    }
  }

  return files
}

export async function scanRegulatoryHardcodes(
  root: string,
  options: { extraExclusions?: readonly string[] } = {},
) {
  const extraExclusions = options.extraExclusions ?? []
  const files = await walkFiles(root, extraExclusions)
  const findings: RegulatoryHardcodeFinding[] = []

  for (const file of files) {
    const text = await readFile(file, "utf8")
    const displayPath = relative(root, file).split(sep).join("/")
    findings.push(...detectRegulatoryHardcodesInText(displayPath, text, { extraExclusions }))
  }

  return findings
}
