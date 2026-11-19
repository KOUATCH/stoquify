import { z } from "zod"

export const OPENING_MAX_BYTES = 100_000
export const OPENING_MAX_ROWS = 100
export const OPENING_DOMAINS = ["AR", "AP", "STOCK", "CASH", "EQUITY"] as const
const text = z.string().trim().min(1).max(120)
const value = z.string().max(40)
const id = z.string().trim().min(1).max(150)
const hash = z.string().regex(/^sha256:[a-f0-9]{64}$/)
export const openingSourceSchema = z.object({
  version: z.literal("opening-position-v1"), country: z.literal("CM"), currency: z.literal("XAF"),
  cutoverDate: z.literal("2026-10-01"), timezone: z.literal("Africa/Douala"),
  evidenceReference: text,
  stock: z.array(z.object({
    sourceId: text, item: text, location: text, unit: text, account: text,
    quantity: value, unitCost: value, value: value,
  }).strict()).max(OPENING_MAX_ROWS),
  openItems: z.array(z.object({
    sourceId: text, kind: z.enum(["AR", "AP"]), counterparty: text, document: text, account: text,
    sourceDate: value, dueDate: value, currency: value,
    original: value, settled: value, outstanding: value,
  }).strict()).max(OPENING_MAX_ROWS),
  ledger: z.array(z.object({
    sourceId: text, account: text, domain: z.enum(OPENING_DOMAINS), side: z.enum(["DEBIT", "CREDIT"]),
    amount: value, currency: value, covers: z.array(text).max(OPENING_MAX_ROWS),
  }).strict()).min(1).max(OPENING_MAX_ROWS),
}).strict().refine(s => s.stock.length + s.openItems.length + s.ledger.length <= OPENING_MAX_ROWS, "At most 100 total rows.")
export const openingControlsSchema = z.object({
  version: z.literal("opening-controls-v1"), evidenceReference: text,
  country: z.literal("CM"), currency: z.literal("XAF"), cutoverDate: z.literal("2026-10-01"),
  stock: value, ar: value, ap: value, debit: value, credit: value,
  quantities: z.array(z.object({ unit: text, quantity: value }).strict()).max(OPENING_MAX_ROWS),
}).strict()
const mapping = z.array(z.object({ source: text, targetId: id }).strict()).max(OPENING_MAX_ROWS)
export const openingMappingsSchema = z.object({
  accounts: mapping, customers: mapping, suppliers: mapping, items: mapping, locations: mapping,
}).strict()
export const openingScopeSchema = z.object({ clientOrganizationId: id.optional() }).strict()
export const openingStageSchema = openingScopeSchema.extend({
  sourceFilename: text, sourceContent: z.string().min(1).max(OPENING_MAX_BYTES),
  controlsFilename: text, controlsContent: z.string().min(1).max(OPENING_MAX_BYTES),
  mappings: openingMappingsSchema, expectedRevision: z.number().int().min(0),
  idempotencyKey: z.string().min(8).max(100),
}).strict()
export const openingReviewSchema = openingScopeSchema.extend({
  revisionId: id, expectedDigest: hash, decision: z.enum(["REVIEWED", "CHANGES_REQUESTED"]),
  conclusion: z.string().trim().min(10).max(2000), idempotencyKey: z.string().min(8).max(100),
}).strict()
export type OpeningSource = z.infer<typeof openingSourceSchema>
export type OpeningControls = z.infer<typeof openingControlsSchema>
export type OpeningMappings = z.infer<typeof openingMappingsSchema>
export type OpeningCatalog = {
  accounts: Array<{ id: string; code: string; name: string; type: string; normalBalance: string; currency: string | null; active: boolean }>;
  customers: Array<{ id: string; name: string; active: boolean }>;
  suppliers: Array<{ id: string; name: string; active: boolean }>;
  items: Array<{ id: string; name: string; unit: string | null; active: boolean }>;
  locations: Array<{ id: string; name: string; active: boolean }>;
}
export type OpeningIssue = { code: string; row: string; field: string }
export type OpeningPreview = {
  version: "opening-preview-v1"; sourceHash: string; controlsHash: string; mappingHash: string; masterHash: string; digest: string;
  currency: "XAF"; country: "CM"; cutoverAt: string; canReview: boolean; canApply: false;
  issues: OpeningIssue[]; comparisons: Array<{ key: string; proposed: string | null; control: string | null; difference: string | null }>;
  details: Array<{ sourceId: string; kind: string; accountId: string | null; amount: string | null }>;
  writerBlockers: string[];
}
export type OpeningWorkspace = {
  organizationId: string; catalog: OpeningCatalog; latestRevision: number;
  current: null | {
    id: string; revision: number; sourceFilename: string; controlsFilename: string; createdById: string; createdAt: string;
    source: OpeningSource; controls: OpeningControls; mappings: OpeningMappings; preview: OpeningPreview;
    reviewState: "STAGED" | "REVIEWED" | "CHANGES_REQUESTED" | "STALE";
    reviewedById: string | null; reviewedAt: string | null; conclusion: string | null;
  };
  history: Array<{ id: string; revision: number; sourceHash: string; mappingHash: string; status: string }>;
}
