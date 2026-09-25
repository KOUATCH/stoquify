const fs=require('fs'),file='services/analytics/sales-analytics.service.ts';let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
s=s.replace('import { endOfDay, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns"','import { readBusinessPulseSnapshot, type BusinessPulseSnapshot } from "./business-pulse-snapshot"\nimport { BusinessRuleError } from "@/services/_shared/action-errors"');
s=s.replace('const BUSINESS_PULSE_CURRENCY = "XAF"\n','');
let a=s.indexOf('export async function getDashboardSummaryReadModel('),b=s.indexOf('export type DashboardSummaryReadModel',a);
s=s.slice(0,a)+`export async function getDashboardSummaryReadModel(input: AnalyticsLocationInput) {
  try {
    const snapshot = await readBusinessPulseSnapshot(input)
    if (!snapshot.summary) throw new BusinessRuleError("An active location is required.")
    return snapshot.summary
  } catch (error) {
    throwSafeAnalyticsError("getDashboardSummary", error, "Failed to get dashboard summary")
  }
}
`+s.slice(b);
s=s.replace('  now?: Date\n  currency?: string','  context: BusinessPulseSnapshot["context"]');
a=s.indexOf('  try {',s.indexOf('export async function getBusinessPulseCommandReadModel('));b=s.indexOf('  } catch (error)',a);
s=s.slice(0,a)+`  try {
    const snapshot = await readBusinessPulseSnapshot(input)
    if (!snapshot.summary) return composeBlockedBusinessPulseCommandData(snapshot.context)
    return composeBusinessPulseCommandData({ organizationId: input.organizationId, locationId: snapshot.context.locationId!, summary: snapshot.summary, context: snapshot.context })
`+s.slice(b);
s=s.replace('  const now = input.now ?? new Date()\n  const generatedAt = now.toISOString()\n  const periodStart = startOfDay(now).toISOString()\n  const periodEnd = endOfDay(now).toISOString()\n  const currency = input.currency ?? BUSINESS_PULSE_CURRENCY','  const { generatedAt, periodStart, periodEnd, currency, timezone } = input.context');
s=s.replace('    currency,\n    commandBrief:', '    currency,\n    timezone,\n    commandBrief:');
s=s.replace('function composeBlockedBusinessPulseCommandData(input: { organizationId: string; now: Date }): BusinessPulseCommandData {\n  const generatedAt = input.now.toISOString()\n  const periodStart = startOfDay(input.now).toISOString()\n  const periodEnd = endOfDay(input.now).toISOString()', 'function composeBlockedBusinessPulseCommandData(input: BusinessPulseSnapshot["context"]): BusinessPulseCommandData {\n  const { generatedAt, periodStart, periodEnd } = input');
s=s.replace('    currency: BUSINESS_PULSE_CURRENCY,','    currency: input.currency,\n    timezone: input.timezone,');
a=s.indexOf('async function resolveBusinessPulseLocationId(');b=s.indexOf('function toBusinessPulseSummary(',a);if(a>=0)s=s.slice(0,a)+s.slice(b);
fs.writeFileSync(file,s);
