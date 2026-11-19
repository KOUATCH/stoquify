import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import type { SnapshotBlocker } from "@/services/snapshots/snapshot-contracts"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { commandSourceText, commandSourceDrill } from "@/lib/dashboard/command-center-source-copy"
import { presentSnapshotBlocker } from "@/lib/dashboard/snapshot-blocker-presentation"
import { presentManagerData } from "@/services/manager-action-center/manager-action-center-presentation"
import { ManagerActionCenterDashboard } from "@/components/manager-action-center/ManagerActionCenterDashboard"
import { OwnerWarRoomDashboard } from "@/components/owner-war-room/OwnerWarRoomDashboard"
import { getProofTrailAction } from "@/actions/evidence/proof-trail.actions"
import { owner, manager, proof } from "@/docs/command-center/phase-4-2026-10-24/fixtures"

it.each(["en", "fr"] as const)("keeps all 25 supplied Owner actions reachable in Command (%s)", locale => {
  window.history.replaceState({}, "", "?mode=command")
  render(<OwnerWarRoomDashboard data={owner(locale)} locale={locale} title="Owner" subtitle="Fixture" />)
  const links = screen.getAllByRole("link", {name: new RegExp(locale === "en" ? "^Open: Evidence to review" : "^Ouvrir : Preuve à examiner")})
  expect(links).toHaveLength(25)
  expect(new Set(links.map(link => link.getAttribute("href"))).size).toBe(25)
})

it.each(["en", "fr"] as const)("returns Owner proof focus to its actual trigger, including when closing a pending read (%s)", async locale => {
  let resolve!: (value: unknown) => void
  jest.mocked(getProofTrailAction).mockImplementationOnce(() => new Promise(done => {resolve = done}) as never)
  render(<OwnerWarRoomDashboard data={owner(locale)} locale={locale} title="Owner" subtitle="Fixture" />)
  const trigger = screen.getByRole("button", {name: locale === "en" ? "Reconciliation proof" : "Preuves du rapprochement"})
  trigger.focus(); fireEvent.click(trigger)
  expect(await screen.findByRole("dialog")).toBeVisible()
  expect(screen.getByText(locale === "en" ? "Loading proof trail." : "Chargement de la piste de preuve.")).toBeVisible()
  fireEvent.click(screen.getByRole("button", {name: locale === "en" ? "Close proof" : "Fermer la preuve"}))
  await waitFor(() => expect(trigger).toHaveFocus())
  await act(async () => resolve({success: true, data: proof}))
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})

it("localizes canonical unavailability and source age without altering custom evidence or destinations", () => {
  expect(commandSourceText("Source data is 281 minutes old.", "fr")).toBe("Les données sources datent de 281 minutes.")
  expect(commandSourceText("Source data is NaN minutes old.", "fr")).toBe("Source data is NaN minutes old.")
  expect(commandSourceText("Reviewed by a named customer", "fr")).toBe("Reviewed by a named customer")
  const drill = {available: false as const, type: "route" as const, label: "Custom evidence", requiredPermission: "dashboard.read", unavailableReason: "Signal is suppressed."}
  expect(commandSourceDrill(drill, "fr")).toEqual({...drill, unavailableReason: "Le signal est masqué."})
})

it("localizes branch blockers only with matching identity, gate and canonical text", () => {
  const source = {id: "branch-location-inactive", gate: "branch_operating_snapshot", severity: "medium" as const, title: "Location is inactive", detail: "The location exists but is inactive, so operating metrics may be partial.", nextAction: "Reactivate the location or choose another branch.", sourceTables: ["locations"]}
  expect(presentSnapshotBlocker(source, "fr")).toMatchObject({title: "Le site est inactif", detail: expect.stringContaining("partiels"), sourceTables: ["locations"]})
  expect(presentSnapshotBlocker({...source, gate: "custom"}, "fr")).toEqual({...source, gate: "custom"})
  expect(presentSnapshotBlocker({...source, detail: "Custom account evidence"}, "fr").detail).toBe("Custom account evidence")
  expect(presentSnapshotBlocker(source, "en")).toBe(source)
})

it("keeps Manager blocked drill-through unavailable and translates its explanation", () => {
  const data = manager("en")
  data.kpis = [owner("en").morningBrief.zones[0].cards[0]]
  const card = data.kpis[0]
  card.drillThrough = {available: false, type: "route", label: "Open manager actions", requiredPermission: "dashboard.read", unavailableReason: "The source snapshot is blocked; clear blockers before drill-through can be trusted."}
  const before = JSON.stringify(data)
  const result = presentManagerData(data, "fr")
  expect(result.kpis[0].drillThrough).toMatchObject({available: false, unavailableReason: expect.stringContaining("instantané source est bloqué")})
  expect(JSON.stringify(data)).toBe(before)
})

it.each(["en", "fr"] as const)("discloses capped and unavailable assurance coverage (%s)", locale => {
  const data = manager(locale, 0)
  data.assuranceCoverage = {state: "AVAILABLE", loaded: 1, limit: 25, possiblyTruncated: true}
  const view = render(<ManagerActionCenterDashboard data={data} locale={locale} title="Manager" subtitle="Fixture" />)
  expect(screen.getByText(locale === "en" ? /Coverage may be partial/ : /Couverture partielle possible/)).toBeVisible()
  view.rerender(<ManagerActionCenterDashboard data={{...data, assuranceCoverage: {state: "UNAVAILABLE"}}} locale={locale} title="Manager" subtitle="Fixture" />)
  expect(screen.getByText(locale === "en" ? /Assurance incidents could not be loaded/ : /Les incidents d’assurance n’ont pas pu être chargés/)).toBeVisible()
})

it("covers all six canonical branch blocker objects from the current source without changing evidence", () => {
  const source = ts.createSourceFile("branch.ts", fs.readFileSync(path.join(process.cwd(), "services/snapshots/branch-operating-snapshot.service.ts"), "utf8"), ts.ScriptTarget.Latest, true)
  const blockers: SnapshotBlocker[] = []
  function visit(node: ts.Node) {
    if (ts.isObjectLiteralExpression(node)) {
      const text: Record<string, string> = {}
      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && ts.isStringLiteral(property.initializer)) text[property.name.text] = property.initializer.text
      }
      if (text.id?.startsWith("branch-") && text.title && text.gate) blockers.push({...text, severity: "high", sourceTables: ["preserved-source"]} as SnapshotBlocker)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  expect(blockers).toHaveLength(6)
  for (const source of blockers) {
    const original = JSON.stringify(source)
    const french = presentSnapshotBlocker(source, "fr")
    for (const field of ["title", "detail", "nextAction"] as const) if (source[field]) expect(french[field]).not.toBe(source[field])
    expect(french).toMatchObject({id: source.id, gate: source.gate, sourceTables: source.sourceTables, severity: source.severity})
    expect(JSON.stringify(source)).toBe(original)
  }
})

it.each(["tenant-operating", "payment-truth", "inventory-cash", "close-readiness", "inventory-loss"])("reviews canonical static blocker copy from the current %s source", name => {
  const source = ts.createSourceFile("source.ts", fs.readFileSync(path.join(process.cwd(), `services/snapshots/${name}-snapshot.service.ts`), "utf8"), ts.ScriptTarget.Latest, true)
  const missing: string[] = []
  let reviewed = 0
  function visit(node: ts.Node) {
    if (ts.isObjectLiteralExpression(node)) {
      const text: Record<string, string> = {}
      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && ts.isStringLiteral(property.initializer)) text[property.name.text] = property.initializer.text
      }
      if (text.id && text.title && text.gate) {
        reviewed++
        const blocker = {...text, detail: text.detail ?? "Custom evidence", severity: "high", sourceTables: []} as SnapshotBlocker
        const french = presentSnapshotBlocker(blocker, "fr")
        for (const field of ["title", "detail", "nextAction"] as const) if (text[field] && french[field] === text[field]) missing.push(`${text.id}.${field}: ${text[field]}`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  expect(reviewed).toBeGreaterThan(0)
  expect(missing).toEqual([])
})

it.each([true, false])("restores focus safely after a protected snapshot replacement (control permitted: %s)", permitted => {
  const { CommandCenterRecovery } = require("@/components/dashboard/CommandCenterRecovery")
  const page = (snapshot: object, show: boolean) => <main id="dashboard-main-content" tabIndex={-1}><CommandCenterRecovery snapshot={snapshot} locale="en">{show ? <button id="proof-focus-fixture">Proof trigger</button> : <p>Access no longer available</p>}</CommandCenterRecovery></main>
  const result = render(page({}, true))
  const original = screen.getByRole("button", {name: "Proof trigger"})
  original.focus()
  result.rerender(page({}, permitted))
  expect(original).not.toBeInTheDocument()
  expect(permitted ? screen.getByRole("button", {name: "Proof trigger"}) : screen.getByRole("main")).toHaveFocus()
})

it.each(["en", "fr"] as const)("restores mode focus after a fresh protected snapshot is ready (%s)", async locale => {
  const { CommandCenterRecovery } = require("@/components/dashboard/CommandCenterRecovery")
  const { BICommandModeTabs } = require("@/components/bi/BICommandModeTabs")
  const page = (snapshot: object) => <CommandCenterRecovery snapshot={snapshot} locale={locale}><BICommandModeTabs value="brief" locale={locale} /><input aria-label="Private draft" defaultValue="" /></CommandCenterRecovery>
  const result = render(page({}))
  const original = screen.getByRole("button", {name: locale === "en" ? "Command" : "Pilotage"})
  fireEvent.change(screen.getByRole("textbox"), {target: {value: "old private draft"}})
  original.focus()
  result.rerender(page({}))
  expect(original).not.toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole("button", {name: locale === "en" ? "Command" : "Pilotage"})).toHaveFocus())
  expect(screen.getByRole("textbox")).toHaveValue("")
})

it.each([false, true])("waits for a replacement mode without stealing focus (user moved: %s)", async moved => {
  const { CommandCenterRecovery } = require("@/components/dashboard/CommandCenterRecovery")
  const page = (snapshot: object, disabled: boolean) => <><button>Other control</button><CommandCenterRecovery snapshot={snapshot} locale="en"><button data-command-mode="command" disabled={disabled}>Mode control</button></CommandCenterRecovery></>
  const result = render(page({}, false))
  screen.getByRole("button", {name: "Mode control"}).focus()
  const snapshot = {}
  result.rerender(page(snapshot, true))
  if (moved) screen.getByRole("button", {name: "Other control"}).focus()
  result.rerender(page(snapshot, false))
  await waitFor(() => expect(screen.getByRole("button", {name: moved ? "Other control" : "Mode control"})).toHaveFocus())
})

it.each(["missing", "ambiguous"])("falls back safely when a mode is %s in the new snapshot", condition => {
  const { CommandCenterRecovery } = require("@/components/dashboard/CommandCenterRecovery")
  const page = (snapshot: object, count: number) => <main id="dashboard-main-content" tabIndex={-1}><CommandCenterRecovery snapshot={snapshot} locale="en">{Array.from({length: count}, (_, index) => <button key={index} data-command-mode="command">Mode control</button>)}</CommandCenterRecovery></main>
  const result = render(page({}, 1))
  screen.getByRole("button", {name: "Mode control"}).focus()
  result.rerender(page({}, condition === "missing" ? 0 : 2))
  expect(screen.getByRole("main")).toHaveFocus()
})
