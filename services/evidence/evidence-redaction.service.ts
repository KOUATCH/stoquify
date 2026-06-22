import type { ProofTrailRedaction, ProofTrailResult } from "./evidence-contracts"

export function createProofTrailRedaction(input: {
  id: string
  field: string
  reason: string
  policy?: string
}): ProofTrailRedaction {
  return {
    id: input.id,
    field: input.field,
    reason: input.reason,
    policy: input.policy ?? "kontava-redaction-sensitive-data-policy",
  }
}

export function applyProofTrailRedactions(result: ProofTrailResult): ProofTrailResult {
  if (result.redactions.length === 0) return result

  const redactedNodeIds = new Set(
    result.redactions
      .filter((redaction) => redaction.field.startsWith("nodes."))
      .map((redaction) => redaction.field.split(".")[1])
      .filter(Boolean),
  )

  return {
    ...result,
    nodes: result.nodes.map((node) =>
      redactedNodeIds.has(node.id)
        ? {
            ...node,
            nodeId: "redacted",
            label: "Redacted evidence",
            redacted: true,
            metadata: undefined,
          }
        : node,
    ),
  }
}

