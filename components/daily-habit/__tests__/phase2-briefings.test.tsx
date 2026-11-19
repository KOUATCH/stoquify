import { fireEvent, render, screen, within } from "@testing-library/react"
import { digestData, observation } from "./phase2-fixtures"
import { DailyHabitDigestDashboard } from "../DailyHabitDigestDashboard"
import { DigestSourceLimitations } from "../DigestSourceLimitations"
import { groupDigestBlockers } from "../digest-blocker-groups"
import { BIWhatChangedStrip } from "@/components/bi/BIWhatChangedStrip"
import { AgentCommandPanel } from "@/components/agents/AgentCommandPanel"


it("groups repeated stable blockers without mutating evidence or dropping different next steps", () => {
  const digest = digestData().digests[0]
  const first = digest.blockers[0]
  digest.blockers = [first, {...first}, {...first, nextAction: "Ask an independent reviewer"}]
  const before = JSON.stringify(digest)
  const groups = groupDigestBlockers(digest)
  expect(groups).toHaveLength(1)
  expect(groups[0].variants).toHaveLength(2)
  expect(groups[0].variants.map(b => b.nextAction)).toEqual(["Inspect source", "Ask an independent reviewer"])
  expect(JSON.stringify(digest)).toBe(before)
})

it("keeps identical text for different blocker records distinct", () => {
  const digest = digestData().digests[0]
  digest.blockers.push({...digest.blockers[0], id: "another-record"})
  expect(groupDigestBlockers(digest)).toHaveLength(2)
})

it.each(["location", "record"])("keeps a repeated blocker in a different %s distinct", dimension => {
  const digest = digestData().digests[0]
  digest.changes = [observation(), observation("two", dimension === "location" ? "branch-b" : "branch-a", dimension === "record" ? "record-two" : "record-one")]
  const groups = groupDigestBlockers(digest)
  expect(groups).toHaveLength(2)
  expect(groups.map(g=>g.references[0].scope)).toEqual(dimension === "location" ? ["branch-a / record-one", "branch-b / record-one"] : ["branch-a / record-one", "branch-a / record-two"])
})

it("groups copies of the same source record, retaining every authorized reference and restriction", () => {
  const digest = digestData().digests[0]
  digest.changes = [observation(), observation("two")]
  digest.changes[1].blockers = [{...digest.blockers[0], nextAction: "Do not finalize before review"}]
  const groups = groupDigestBlockers(digest)
  expect(groups).toHaveLength(1)
  expect(groups[0].references).toHaveLength(2)
  render(<DigestSourceLimitations digest={digest} locale="fr" />)
  expect(screen.getByText("Do not finalize before review", {selector: "p"})).toBeVisible()
  const details = document.querySelector('details')!; details.setAttribute("open", "")
  expect(within(details).getAllByRole("link").map(a=>a.getAttribute("href"))).toEqual(["/fr/dashboard/inventory?source=one", "/fr/dashboard/inventory?source=two"])
})

it("retains disabled references and never revives an explicitly unavailable source", () => {
  const digest = digestData().digests[0]
  const a = observation(), b = observation("two")
  a.actionLink = {...a.actionLink!, disabled: true, disabledReason: "Access required"}
  b.drillThrough = {available: false, type: "route", label: "Inspect", requiredPermission: "inventory.read", unavailableReason: "Source access changed"}
  digest.changes = [a,b]
  render(<DigestSourceLimitations digest={digest} locale="en" />)
  document.querySelector('details')!.setAttribute('open','')
  expect(screen.queryByRole("link")).not.toBeInTheDocument()
  expect(screen.getByRole("button")).toBeDisabled()
  expect(screen.getByText("Access required")).toBeVisible()
  expect(screen.getByText("Source access changed")).toBeVisible()
})

it("groups an observation and its risk by shared provenance while retaining both handoffs", () => {
  const digest = digestData().digests[0]
  const source = observation()
  digest.changes = [source]
  digest.risks = [{...source, id: "risk-one", rank: 1, severityScore: 50, moneyImpact: null, urgency: null,
    drillThrough: source.drillThrough!, actionLink: {...source.actionLink!, id: "risk-action"}}]
  const groups = groupDigestBlockers(digest)
  expect(groups).toHaveLength(1)
  expect(groups[0].references.map(ref => ref.id)).toEqual([source.id, "risk-one"])
  digest.risks[0].provenance = undefined
  expect(groupDigestBlockers(digest)).toHaveLength(2)
})

it("preserves all permission requirements when a source has only a drill-through link", () => {
  const digest = digestData().digests[0]
  const source = observation()
  source.actionLink = null
  source.drillThrough = {...source.drillThrough!, available: true, type: "route", label: "Inspect", requiredPermission: "inventory.read", additionalRequiredPermissions: ["inventory.items.read"], href: "/dashboard/inventory"}
  digest.changes = [source]
  expect(groupDigestBlockers(digest)[0].references[0].action).toMatchObject({moduleSlug: "inventory", requiredPermission: "inventory.read", additionalRequiredPermissions: ["inventory.items.read"]})
})

it.each(["en", "fr"] as const)("renders one %s page heading, one reporting period and a leading source action", locale => {
  const input = digestData()
  render(<DailyHabitDigestDashboard data={input} locale={locale} />)
  expect(screen.getAllByRole("heading", {level:1})).toHaveLength(1)
  expect(screen.getAllByText(locale === "en" ? "Jul 11 - Jul 11" : "11 juil. - 11 juil.")).toHaveLength(1)
  expect(screen.getByRole("heading", {name:locale === "en" ? "Priority to review" : "Priorité à examiner"})).toBeVisible()
  expect(screen.getByRole("link", {name:locale === "en" ? "Open: Review source" : "Ouvrir: Review source"})).toHaveAttribute("href",`/${locale}/dashboard/inventory`)
  expect(screen.getByTestId("command-agent-unavailable")).toBeVisible()
  expect(screen.queryByTestId("command-agent-panel")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", {name:locale === "en" ? /View digest actions/ : /Voir les actions de la synthèse/}))
  expect(screen.getByRole("button", {name:locale === "en" ? "Hidden" : "Masqué"})).toBeDisabled()
})

it("limits only the Brief preview and keeps every supplied action reachable in Command", () => {
  const input = digestData()
  input.digests[0].actions = Array.from({length: 8}, (_, index) => ({...input.digests[0].actions[0], id: `action-${index}`, label: `Review source ${index}`}))
  render(<DailyHabitDigestDashboard data={input} locale="en" />)
  expect(screen.getAllByRole("link", {name: /Open: Review source/})).toHaveLength(1)
  fireEvent.click(screen.getByRole("button", {name: /View digest actions/}))
  expect(screen.getAllByRole("link", {name: /Open: Review source/})).toHaveLength(8)
  expect(screen.getByText("8 / 8")).toBeVisible()
})

it.each(["disabled", "kill_switch", "shadow", "permission_denied"])("compact unavailable agent preserves %s gate and never runs a command", reason => {
  render(<AgentCommandPanel compactUnavailable access={{mode:"off",canRender:false,canRun:false,reason} as never} digestId="owner" periodStart="2026-07-11" periodEnd="2026-07-12" locale="en" />)
  expect(screen.getByTestId("command-agent-unavailable")).toBeVisible()
  expect(screen.queryByRole("button")).not.toBeInTheDocument()
  expect(jest.requireMock("@/actions/agents/command-agent.actions").runCommandAgentAction).not.toHaveBeenCalled()
})

it.each(["en", "fr"] as const)("requires comparable history instead of displaying a numerical delta (%s)", locale => {
  const current = observation()
  const before = JSON.stringify(current)
  render(<BIWhatChangedStrip contentKind="observations" changes={[current]} locale={locale} />)
  expect(screen.getByText(locale === "en" ? "Historical comparison unavailable" : "Comparaison historique indisponible")).toBeVisible()
  expect(screen.queryByText(/40 -> 50/)).not.toBeInTheDocument()
  expect(screen.getByText(locale === "en" ? "Current value: 50 items" : "Valeur actuelle: 50 éléments")).toBeVisible()
  expect(JSON.stringify(current)).toBe(before)
})

it("keeps legacy comparison consumers unchanged without the observation opt-in", () => {
  render(<BIWhatChangedStrip changes={[observation()]} locale="en" />)
  expect(screen.getByText("40 -> 50 items")).toBeVisible()
})

it.each([null, 0])("does not fabricate a previous value or erase current %s", value => {
  render(<BIWhatChangedStrip contentKind="observations" changes={[{...observation(),previousValue:null,currentValue:value}]} locale="en" />)
  expect(screen.getByText("Historical comparison unavailable")).toBeVisible()
  expect(screen.queryByText(/->/)).not.toBeInTheDocument()
  if(value === 0) expect(screen.getByText("Current value: 0 items")).toBeVisible()
})
