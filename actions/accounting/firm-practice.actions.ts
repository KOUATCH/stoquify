"use server"
import { protect } from "@/services/_shared/protect"
import { closeEvidenceAcceptanceControl, closeEvidenceWorkControl } from "@/services/accounting/close-evidence-acceptance-context"
import { executeFirmPracticeCommand, exportFirmPracticeSnapshot, getFirmPracticeDesk } from "@/services/accounting/firm-practice.service"
const modulePolicy = { moduleSlug: "accounting" as const, surface: "accountant-firm-practice", mode: "enforce" as const }
const read = protect({ permission: "accounting.close.read", auditResource: "FirmPracticeRevision", auditAllowed: false,
  module: { ...modulePolicy, accessIntent: "read" } }, async (input: unknown, ctx) =>
  getFirmPracticeDesk({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, input))
// The service derives the extra management/economics/fresh-auth policy from the
// validated command and rechecks live authority before replay and publication.
const write = protect({ permission: "accounting.close.finding.comment", auditResource: "FirmPracticeRevision",
  module: { ...modulePolicy, accessIntent: "write" } }, async (input: unknown, ctx) =>
  executeFirmPracticeCommand({ homeOrganizationId: ctx.orgId, ...await closeEvidenceWorkControl(ctx) }, input))
export async function getFirmPracticeDeskAction(input: unknown) { return read(input) }
export async function executeFirmPracticeCommandAction(input: unknown) { return write(input) }
const exportSnapshot = protect({ permission: "accounting.exports.create", auditResource: "FirmPracticeRevision", freshAuth: { maxAgeSeconds: 300 },
  module: { ...modulePolicy, accessIntent: "export" } }, async (input: unknown, ctx) =>
  exportFirmPracticeSnapshot({ homeOrganizationId: ctx.orgId, ...closeEvidenceAcceptanceControl(ctx), lastAuthAt: ctx.freshAuth!.lastAuthAt }, input))
export async function exportFirmPracticeSnapshotAction(input: unknown) { return exportSnapshot(input) }
