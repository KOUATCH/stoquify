// Synthetic transport only. Never imports server actions or application configuration.
const fixtureWindow = window as typeof window & {
  followUpMode: string
  followUpRequests: unknown[]
}
fixtureWindow.followUpMode = "success"
fixtureWindow.followUpRequests = []
const states = new Map<string, any>()
function state(query: any) {
  const key = query.locationId ?? "tenant"
  if (!states.has(key)) states.set(key, {
    availableLocations: [{id:"fixture-location",name:"Synthetic branch",assignedToActor:true}],
    scope: {locationId: query.locationId ?? null, periodStart: query.periodStart, periodEnd: query.periodEnd},
    actorId: "fixture-actor", revision: 1, evidenceKey: "a".repeat(64),
    review: {current: false, reviewedAt: null}, unavailable: ["close"], notices: [],
    preference: {enabled: true, quietStart: null, quietEnd: null},
    items: [{id: "fixture-work-" + key, source: "stockout", revision: 1, episode: 1,
      condition: "ACTIVE", coordination: "ASSIGNED", ownerId: "fixture-actor", ownerName: "Synthetic manager",
      dueAt: null, actionPath: "/dashboard/inventory/items", canAssign: true, canDelegate: true,
      sourceRevision: "synthetic", updatedAt: "2026-10-24T12:00:00Z",
      history: [{type: "OBSERVED", at: "2026-10-24T12:00:00Z"}]}],
  })
  return states.get(key)
}
const ok = (query: any) => ({success: true, data: structuredClone(state(query))})
export async function getCommandCenterFollowUps(query: any) {
  return fixtureWindow.followUpMode === "denied" ? {success: false, code: "FORBIDDEN"} : ok(query)
}
export async function changeCommandCenterFollowUp(query: any) {
  fixtureWindow.followUpRequests.push(structuredClone(query))
  if (fixtureWindow.followUpMode === "lost") {fixtureWindow.followUpMode = "success"; throw Error("Synthetic lost response")}
  const data = state(query)
  Object.assign(data.items[0], {ownerId: query.ownerId, dueAt: query.dueAt, coordination: query.state, revision: data.items[0].revision + 1})
  return ok(query)
}
export async function reviewCommandCenterFollowUps(query: any) {state(query).review = {current: true, reviewedAt: "2026-10-24T12:00:00Z"}; return ok(query)}
export async function getCommandCenterCandidates() {return {success: true, data: {candidates: [{id: "fixture-other", name: "Synthetic colleague"}], limited: false}}}
export async function saveCommandCenterPreference(query: any) {state(query).preference = {enabled: query.enabled, quietStart: query.quietStart, quietEnd: query.quietEnd}; return ok(query)}
export async function acknowledgeCommandCenterNotice(query: any) {state(query).notices = []; return ok(query)}
