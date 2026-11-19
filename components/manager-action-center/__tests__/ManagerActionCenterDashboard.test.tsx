import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { ManagerActionCenterDashboard } from "../ManagerActionCenterDashboard";
import { buildData, reconciliationAction } from "./manager-fixtures";
import type { ManagerActionCenterData } from "@/services/manager-action-center/manager-action-center-contracts";

const renderData = (data = many(25), locale: "en" | "fr" = "en") => render(<ManagerActionCenterDashboard data={data} locale={locale} title="Manager Action Center" subtitle="Operating work" />);
function many(count: number) {
  const data = buildData();
  data.actionItems = Array.from({ length: count }, (_, i) => ({ ...data.actionItems[0], id: `action-${i}`, title: `Action ${i}`, assignedRole: i % 2 ? "manager" as const : "finance" as const, origin: i % 2 ? "ASSURANCE" as const : "SIGNAL" as const }));
  data.runSheetGroups[0].actions = data.actionItems;
  data.runSheetGroups[0].count = count;
  return data;
}
function command() { fireEvent.click(screen.getByRole("button", { name: "Command", exact: true })); }

describe("Manager functional modes and complete queue", () => {
  it("shows a three-item Brief, a complete Command queue, and separate Investigate evidence", () => {
    renderData();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Manager Action Center: Brief" })).toBeInTheDocument();
    expect(screen.getByText("3 priorities shown / 25 authorized actions loaded")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Complete action queue" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View complete queue" }));
    expect(screen.getByRole("button", { name: "Command", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Manager Action Center: Command" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Do first today" })).not.toBeInTheDocument();
    const ids: string[] = [];
    for (let page = 1; page <= 3; page++) {
      const summaries = document.querySelectorAll('#manager-queue-title ~ div details > summary');
      ids.push(...Array.from(summaries).map(node => node.textContent!.split(" — ")[0]));
      if (page < 3) fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    }
    expect(ids).toEqual(Array.from({length: 25}, (_, i) => `Action ${i}`));
    expect(new Set(ids).size).toBe(25);
    expect(screen.getByText("25 authorized actions loaded · 25 matching filters · 5 shown")).toBeVisible();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Investigate", exact: true }));
    expect(screen.getByRole("region", { name: "Manager Action Center: Investigate" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Business signals" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Complete action queue" })).not.toBeInTheDocument();
  });

  it.each([0, 1, 10])("reconciles loaded, filtered and displayed counts for %i actions", count => {
    renderData(many(count)); command();
    expect(screen.getByText(`${count} authorized actions loaded · ${count} matching filters · ${count} shown`)).toBeVisible();
    if (!count) expect(screen.getByText("No permitted actions are available in this scope.")).toBeVisible();
  });

  it("filters by source and role, resets pagination, distinguishes no matches, and clears filters", () => {
    renderData(); command();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.change(screen.getByLabelText("Source", { selector: "select" }), {target: {value: "SIGNAL"}});
    expect(screen.getByText("Page 1 / 2")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Responsible role"), {target: {value: "manager"}});
    expect(screen.getByText("No actions match these filters.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", {name: "Clear filters"}));
    expect(screen.getByText("25 authorized actions loaded · 25 matching filters · 10 shown")).toBeVisible();
    fireEvent.click(screen.getByRole("button", {name: "Overdue (0)"}));
    expect(screen.getByLabelText("Urgency lanes", {selector: "select"})).toHaveValue("overdue");
    expect(screen.getByText("No actions match these filters.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", {name: "Critical / high (25)"}));
    expect(screen.getByText("25 authorized actions loaded · 25 matching filters · 10 shown")).toBeVisible();
  });

  it("restores safe deep links and popstate, sanitizes unauthorized values and clamps pages", () => {
    window.history.replaceState({}, "", "?mode=command&source=SIGNAL&role=finance&page=2&location=secret");
    renderData();
    expect(screen.getByText("Page 2 / 2")).toBeVisible();
    expect(window.location.search).not.toContain("secret");
    act(() => { window.history.replaceState({}, "", "?mode=investigate"); window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(screen.getByRole("region", {name: "Manager Action Center: Investigate"})).toBeInTheDocument();
    act(() => { window.history.replaceState({}, "", "?mode=evil&source=secret&role=admin&urgency=evil&page=-2"); window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(screen.getByRole("region", {name: "Manager Action Center: Brief"})).toBeInTheDocument();
    command();
    expect(screen.getByText("25 authorized actions loaded · 25 matching filters · 10 shown")).toBeVisible();
    act(() => { window.history.replaceState({}, "", "?mode=command&page=999999"); window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(screen.getByText("Page 3 / 3")).toBeVisible();
  });

  it("removes revoked action details when a refreshed authorized payload shrinks", () => {
    const result = renderData(); command();
    const detail = document.querySelector('#manager-queue-title ~ div details')!;
    detail.setAttribute("open", "");
    expect(within(detail as HTMLElement).getByRole("heading", {name: "Action 0"})).toBeVisible();
    result.rerender(<ManagerActionCenterDashboard data={many(0)} locale="en" title="Manager Action Center" subtitle="Operating work" />);
    expect(screen.queryByText("Action 0")).not.toBeInTheDocument();
    expect(screen.getByText("No permitted actions are available in this scope.")).toBeVisible();
  });

  it.each(["en", "fr"] as const)("retains %s reconciliation source handoff in expanded details", locale => {
    const data = buildData(reconciliationAction(true));
    window.history.replaceState({}, "", "?mode=command");
    renderData(data, locale);
    document.querySelector('#manager-queue-title ~ div details')!.setAttribute("open", "");
    expect(screen.getByRole("link", {name: "open"})).toHaveAttribute("href", `/${locale}/dashboard/finance/reconciliation?reviewRun=run-ready-1`);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps disabled actions unavailable and normal source links localized", () => {
    const data = buildData(reconciliationAction(false));
    data.actionItems[0].actionLink = {...data.actionItems[0].actionLink, disabled: true, disabledReason: "Access changed"};
    window.history.replaceState({}, "", "?mode=command"); renderData(data, "fr");
    const detail = document.querySelector('#manager-queue-title ~ div details')!; detail.setAttribute("open", "");
    expect(within(detail as HTMLElement).getByRole("button")).toBeDisabled();
    expect(within(detail as HTMLElement).queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Access changed")).toBeVisible();
  });

  it("discloses capped accountant coverage and links to the source", () => {
    const data = many(0);
    data.clientMissingProofSource = { state: "AVAILABLE", reason: null, queue: {
      requests: Array.from({length: 100}, () => ({})), controls: {maxItems: 100}, summary: {truncated: true}, blockers: [], nextCursor: "private-cursor"
    }} as unknown as ManagerActionCenterData["clientMissingProofSource"];
    renderData(data);
    expect(screen.getByText(/Partial coverage: more requests/)).toBeVisible();
    expect(screen.getByRole("link", {name: "Open Accounting Close"})).toHaveAttribute("href", "/en/dashboard/accounting/close");
    expect(window.location.search).not.toContain("private-cursor");
  });

  it.each(["HIDDEN", "UNAVAILABLE"] as const)("distinguishes %s source coverage from empty work", state => {
    const data = many(0);
    data.clientMissingProofSource = state === "HIDDEN" ? {state, reason: "RBAC_REQUIRED", queue: null} : {state, reason: "SOURCE_READ_FAILED", queue: null};
    renderData(data); command();
    expect(screen.getByText(state === "HIDDEN" ? /Accountant requests are restricted/ : /Accountant requests could not be loaded/)).toBeVisible();
    expect(screen.getByText("No permitted actions are available in this scope.")).toBeVisible();
    if (state === "UNAVAILABLE") expect(screen.getByRole("button", {name: "Retry loading"})).toBeVisible();
  });
});
