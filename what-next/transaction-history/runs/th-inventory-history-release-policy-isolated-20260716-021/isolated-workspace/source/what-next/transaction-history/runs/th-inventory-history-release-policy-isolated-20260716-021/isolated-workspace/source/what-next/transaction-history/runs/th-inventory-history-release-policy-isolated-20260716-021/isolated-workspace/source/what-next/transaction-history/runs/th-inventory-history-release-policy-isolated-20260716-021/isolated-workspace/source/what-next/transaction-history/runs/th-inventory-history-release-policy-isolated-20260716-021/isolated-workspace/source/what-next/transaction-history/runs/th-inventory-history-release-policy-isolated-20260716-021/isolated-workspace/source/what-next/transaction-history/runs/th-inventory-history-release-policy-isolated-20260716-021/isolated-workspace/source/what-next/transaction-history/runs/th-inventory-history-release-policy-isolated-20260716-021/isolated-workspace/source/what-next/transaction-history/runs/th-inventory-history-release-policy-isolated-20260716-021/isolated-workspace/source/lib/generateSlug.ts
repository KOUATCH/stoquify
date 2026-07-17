export const generateSlug = (title: string, description?: string): string => {
  const text = `${title} ${description || ""}`.toLowerCase()
  return text
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim()
}
