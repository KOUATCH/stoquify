import { downloadVerifiedEvidence } from "./verified-evidence-download"
export async function downloadCorrectionEvidence(file: { content: string; sha256: string; fileName: string; mimeType: string }, isCurrent: () => boolean) {
  if (file.mimeType !== "application/json" || !/^stoquify-suspense-correction-[a-f0-9-]+\.json$/.test(file.fileName)) throw new Error("Unexpected correction export format")
  return downloadVerifiedEvidence(file, isCurrent)
}
