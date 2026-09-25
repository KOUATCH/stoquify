export type ModuleNavigationSnapshot = {
  visibleModules: string[]
  routes: Array<{ prefix: string; moduleSlug: string }>
}

/** Presentation only. Every destination retains its own server authorization. */
export function moduleVisibleInNavigation(snapshot: ModuleNavigationSnapshot | undefined, item: { href?: string; moduleSlug?: string }): boolean {
  if (!snapshot) return true
  const path = (item.href ?? "").replace(/^\/(en|fr)(?=\/)/, "")
  const explicit = item.moduleSlug && snapshot.routes.some((route) => route.moduleSlug === item.moduleSlug) ? item.moduleSlug : null
  const matched = snapshot.routes.filter(({ prefix }) => path === prefix || path.startsWith(`${prefix}/`)).sort((a, b) => b.prefix.length - a.prefix.length)[0]
  const moduleSlug = explicit ?? matched?.moduleSlug
  return !moduleSlug || snapshot.visibleModules.includes(moduleSlug)
}
