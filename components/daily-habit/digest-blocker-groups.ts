import type { BIActionLink, BIBlocker, BIDailyDigest, BIDrillThrough, BIProvenance } from "@/services/bi/bi-contracts"

type Reference = { id: string; label: string; scope: string; action: BIActionLink | null; unavailableReason: string | null }
export type DigestBlockerGroup = { key: string; variants: BIBlocker[]; references: Reference[] }

// IDs/gates/tables identify the source restriction. Text is deliberately not identity.
function blockerKey(blocker: BIBlocker) {
  return JSON.stringify([blocker.id, blocker.gate, [...blocker.sourceTables].sort()])
}

export function groupDigestBlockers(digest: BIDailyDigest): DigestBlockerGroup[] {
  const groups = new Map<string, DigestBlockerGroup>()
  const known = new Map<string, Set<string>>()
  function add(blocker: BIBlocker, key: string, reference?: Reference) {
    const group = groups.get(key) ?? { key, variants: [], references: [] }
    // Retain differing restrictions/next steps even when the stable occurrence matches.
    if (!group.variants.some(item => JSON.stringify(item) === JSON.stringify(blocker))) group.variants.push(blocker)
    if (reference && !group.references.some(item => JSON.stringify(item) === JSON.stringify(reference))) group.references.push(reference)
    groups.set(key, group)
  }
  function collect(input: { id: string; title: string; moduleSlug: BIActionLink["moduleSlug"]; blockers: BIBlocker[]; provenance?: BIProvenance | null; actionLink?: BIActionLink | null; drillThrough?: BIDrillThrough | null }) {
    const proof = input.drillThrough?.available ? input.drillThrough : null
    const provenance = input.provenance
    // A source record or proof subject is distinct from a similarly titled source.
    // Missing provenance remains container-specific: do not guess that two records match.
    const identity = [provenance?.organizationId ?? digest.organizationId, provenance?.locationId ?? null,
      proof?.subjectType ?? provenance?.sourceKind ?? "unscoped", proof?.subjectId ?? provenance?.sourceId ?? provenance?.sourceHash ?? input.id,
      provenance?.periodStart ?? digest.periodStart, provenance?.periodEnd ?? digest.periodEnd]
    const scope = [provenance?.locationId, proof?.subjectId ?? provenance?.sourceId].filter(Boolean).join(" / ")
    const action = input.drillThrough?.available === false ? null : input.actionLink ?? (proof?.href ? {
      id: input.id, label: proof.label, href: proof.href, requiredPermission: proof.requiredPermission,
      ...(proof.additionalRequiredPermissions ? { additionalRequiredPermissions: proof.additionalRequiredPermissions } : {}),
      moduleSlug: input.moduleSlug, disabled: false, disabledReason: null,
    } : null)
    for (const blocker of input.blockers) {
      const base = blockerKey(blocker)
      const key = JSON.stringify([base, identity])
      add(blocker, key, { id: input.id, label: input.title, scope, action,
        unavailableReason: input.drillThrough?.available === false ? input.drillThrough.unavailableReason : null })
      const keys = known.get(base) ?? new Set<string>()
      keys.add(key); known.set(base, keys)
    }
  }
  digest.changes.forEach(collect)
  digest.zones.flatMap(zone => zone.cards).forEach(collect)
  // Risks may carry the only permitted source handoff. Preserve it, including denial.
  digest.risks.forEach(collect)
  const summary = [...digest.blockers, ...digest.commandBrief.blockers, ...digest.zones.flatMap(zone => zone.blockers)]
  for (const blocker of summary) {
    const base = blockerKey(blocker)
    const matches = known.get(base)
    if (matches?.size) for (const key of matches) add(blocker, key)
    else add(blocker, JSON.stringify([base, digest.organizationId, digest.id, digest.periodStart, digest.periodEnd]))
  }
  return [...groups.values()]
}
