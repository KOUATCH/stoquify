// A browser download request is not proof that the user saved the file.
export async function downloadVerifiedEvidence(file: { content: string; sha256: string; fileName: string; mimeType: string }, isCurrent: () => boolean) {
  if (file.mimeType !== "application/json" || !/^[a-zA-Z0-9-]+\.json$/.test(file.fileName)) throw new Error("Unexpected evidence export format")
  const bytes = new TextEncoder().encode(file.content)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")
  if (actual !== file.sha256) throw new Error("Export bytes do not match their recorded hash")
  if (!isCurrent()) throw new Error("Workspace changed before download")
  const url = URL.createObjectURL(new Blob([bytes], { type: file.mimeType })), link = document.createElement("a")
  try { link.href = url; link.download = file.fileName; document.body.appendChild(link); link.click() }
  finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0) }
}
