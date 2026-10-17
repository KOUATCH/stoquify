import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter } from "next/navigation"
import { postJournalEntryAction, reverseJournalEntryAction } from "@/actions/accounting/journals.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { JournalEntryActions, JournalWorkflowFeedback } from "@/components/accounting/JournalEntryActions"
import { AccountingDataTable } from "@/components/accounting/AccountingDataTable"
import { getJournalWorkflowCopy } from "@/components/accounting/journal-workflow-copy"

jest.mock("next/navigation", () => ({ useRouter: jest.fn() }))
jest.mock("@/actions/accounting/journals.actions", () => ({ postJournalEntryAction: jest.fn(), reverseJournalEntryAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("lucide-react", () => {
  const React = require("react")
  const Icon = (props: React.SVGProps<SVGSVGElement>) => React.createElement("svg", { "aria-hidden": true, ...props })
  return { X: Icon, Search: Icon, Check: Icon, ChevronDown: Icon, ChevronUp: Icon }
})

const post = postJournalEntryAction as jest.Mock
const reverse = reverseJournalEntryAction as jest.Mock
const stepUp = stepUpWithPasswordAction as jest.Mock
const refresh = jest.fn()
const failure = (code: string) => ({ success: false, code, error: "Untranslated internal response", data: null })
const success = () => ({ success: true, code: null, error: null, data: { id: "entry-1" } })

function deferred() {
  let resolve!: (value: unknown) => void
  const promise = new Promise<unknown>(complete => { resolve = complete })
  return { promise, resolve }
}

async function openReview(operation: "post" | "reverse" = "reverse", locale = "en") {
  const user = userEvent
  const copy = getJournalWorkflowCopy(locale).actions
  render(<JournalEntryActions locale={locale} entryId="entry-1" entryNumber="MAN-042" operation={operation} />)
  const trigger = screen.getByRole("button", { name: `${operation === "post" ? copy.post : copy.reverse} — MAN-042` })
  await user.click(trigger)
  return { user, copy, trigger, dialog: screen.getByRole("dialog") }
}

function fillReversal(copy = getJournalWorkflowCopy("en").actions) {
  fireEvent.change(screen.getByLabelText(copy.reason), { target: { value: "  Correct duplicate allocation  " } })
  fireEvent.change(screen.getByLabelText(copy.date), { target: { value: "2026-10-01" } })
}

function tableView(locale: "en" | "fr" = "en", operation: "post" | "reverse" = "reverse", includeRow = true) {
  // Fresh column functions in the real table reproduce an RSC cell remount.
  return <JournalWorkflowFeedback><AccountingDataTable locale={locale} caption="Journal fixture"
    columns={[{ label: "Entry" }, { label: "Action" }]}
    rows={includeRow ? [{ id: "entry-1", searchText: "MAN-042", cells: [
      <span key="entry">MAN-042</span>,
      <JournalEntryActions key="action" locale={locale} entryId="entry-1" entryNumber="MAN-042" operation={operation} />,
    ] }] : []} /></JournalWorkflowFeedback>
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({ refresh })
  post.mockResolvedValue(success())
  reverse.mockResolvedValue(success())
  stepUp.mockResolvedValue(success())
})

it("reviews an existing draft before posting and refreshes only after server success", async () => {
  const { user, copy, dialog } = await openReview("post")
  expect(post).not.toHaveBeenCalled()
  expect(dialog).toHaveClass("dashboard-landing-theme", "dark")
  expect(screen.getByRole("heading", { name: `${copy.reviewPost} — MAN-042` })).toHaveFocus()
  expect(screen.queryByLabelText(copy.reason)).not.toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: copy.confirmPost }))
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  expect(post).toHaveBeenCalledWith({ journalEntryId: "entry-1" })
  expect(reverse).not.toHaveBeenCalled()
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  expect(screen.getByRole("status")).toHaveTextContent(copy.posted)
  await waitFor(() => expect(screen.getByRole("status")).toHaveFocus())
})

it("keeps a focused, entry-specific success receipt when refreshed tables remove the completed action", async () => {
  const copy = getJournalWorkflowCopy("fr").actions
  const view = render(<JournalWorkflowFeedback><JournalEntryActions locale="fr" entryId="entry-1" entryNumber="MAN-042" operation="reverse" /></JournalWorkflowFeedback>)
  await userEvent.click(screen.getByRole("button", { name: `${copy.reverse} — MAN-042` }))
  fillReversal(copy)
  await userEvent.click(screen.getByRole("button", { name: copy.confirmReverse }))
  await waitFor(() => expect(screen.getByRole("status")).toHaveFocus())
  expect(screen.getByRole("status")).toHaveTextContent(`MAN-042: ${copy.reversed}`)
  expect(refresh).toHaveBeenCalledTimes(1)
  const receipt = screen.getByRole("status")
  view.rerender(<JournalWorkflowFeedback><p>Refreshed table: MAN-042 / {getJournalWorkflowCopy("fr").statuses.REVERSED}</p></JournalWorkflowFeedback>)
  expect(screen.getByRole("status")).toBe(receipt)
  expect(receipt).toHaveFocus()
  expect(reverse).toHaveBeenCalledTimes(1)
})

it("requires a visible reason and chosen date and sends the exact correction details", async () => {
  const { user, copy } = await openReview()
  expect(screen.getByLabelText(copy.reason)).toHaveValue("")
  expect(screen.getByLabelText(copy.date)).toHaveValue("")
  fireEvent.submit(screen.getByRole("form", { name: copy.reviewReverse }))
  expect(screen.getByRole("alert")).toHaveTextContent(copy.invalid)
  expect(reverse).not.toHaveBeenCalled()
  fillReversal(copy)
  await user.click(screen.getByRole("button", { name: copy.confirmReverse }))
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  expect(reverse).toHaveBeenCalledWith({ journalEntryId: "entry-1", reason: "Correct duplicate allocation", reversalDate: "2026-10-01T00:00:00.000Z" })
  expect(post).not.toHaveBeenCalled()
})

it.each(["en", "fr"])("preserves the correction through failed and successful password confirmation in %s, requiring a deliberate retry", async locale => {
  reverse.mockResolvedValueOnce(failure("FRESH_AUTH_REQUIRED")).mockResolvedValueOnce(success())
  stepUp.mockResolvedValueOnce(failure("INVALID_CREDENTIALS")).mockResolvedValueOnce(success())
  const { user, copy } = await openReview("reverse", locale)
  fillReversal(copy)
  await user.click(screen.getByRole("button", { name: copy.confirmReverse }))
  const password = await screen.findByLabelText(copy.password)
  await waitFor(() => expect(password).toHaveFocus())
  expect(screen.getByLabelText(copy.reason)).toHaveValue("  Correct duplicate allocation  ")
  expect(screen.getByLabelText(copy.date)).toHaveValue("2026-10-01")
  expect(screen.getByRole("button", { name: copy.confirmReverse })).toBeDisabled()
  expect(screen.queryByText("Untranslated internal response")).not.toBeInTheDocument()

  await user.type(password, "wrong-password")
  await user.click(screen.getByRole("button", { name: copy.identity }))
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(copy.identityFailed))
  expect(password).toHaveValue("")
  expect(password).toHaveFocus()
  expect(reverse).toHaveBeenCalledTimes(1)
  expect(refresh).not.toHaveBeenCalled()

  await user.type(password, "valid-password")
  await user.click(screen.getByRole("button", { name: copy.identity }))
  await waitFor(() => expect(screen.getByRole("button", { name: copy.confirmReverse })).toHaveFocus())
  expect(screen.queryByLabelText(copy.password)).not.toBeInTheDocument()
  expect(screen.getByRole("status")).toHaveTextContent(copy.verified)
  expect(screen.getByLabelText(copy.reason)).toHaveValue("  Correct duplicate allocation  ")
  expect(screen.getByLabelText(copy.date)).toHaveValue("2026-10-01")
  expect(reverse).toHaveBeenCalledTimes(1)
  expect(refresh).not.toHaveBeenCalled()
  expect(stepUp).toHaveBeenNthCalledWith(1, { password: "wrong-password" })
  expect(stepUp).toHaveBeenNthCalledWith(2, { password: "valid-password" })

  await user.click(screen.getByRole("button", { name: copy.confirmReverse }))
  await waitFor(() => expect(reverse).toHaveBeenCalledTimes(2))
  expect(reverse.mock.calls[1]).toEqual(reverse.mock.calls[0])
  expect(refresh).toHaveBeenCalledTimes(1)
})

it("handles another freshness denial after identity confirmation without automatic posting", async () => {
  post.mockResolvedValue(failure("FRESH_AUTH_REQUIRED"))
  const { user, copy } = await openReview("post")
  await user.click(screen.getByRole("button", { name: copy.confirmPost }))
  await user.type(await screen.findByLabelText(copy.password), "valid-password")
  await user.click(screen.getByRole("button", { name: copy.identity }))
  await waitFor(() => expect(screen.getByRole("button", { name: copy.confirmPost })).toBeEnabled())
  expect(post).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole("button", { name: copy.confirmPost }))
  expect(await screen.findByLabelText(copy.password)).toHaveValue("")
  expect(post).toHaveBeenCalledTimes(2)
  expect(refresh).not.toHaveBeenCalled()
})

it("prevents duplicate requests and dismissal while a financial request is pending", async () => {
  const request = deferred()
  post.mockReturnValue(request.promise)
  const { user, copy, dialog } = await openReview("post")
  const form = screen.getByRole("form", { name: copy.reviewPost })
  fireEvent.submit(form)
  fireEvent.submit(form)
  expect(post).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("button", { name: copy.cancel })).toBeDisabled()
  expect(screen.getByRole("button", { name: copy.close })).toBeDisabled()
  await user.keyboard("{Escape}")
  expect(dialog).toBeInTheDocument()
  expect(refresh).not.toHaveBeenCalled()
  await act(async () => { request.resolve(success()) })
  expect(refresh).toHaveBeenCalledTimes(1)
})

it("uses the shared dialog focus boundary and returns focus on Escape without losing a draft", async () => {
  const { user, copy, trigger, dialog } = await openReview()
  fillReversal(copy)
  const close = within(dialog).getByRole("button", { name: copy.close })
  close.focus()
  await user.tab()
  expect(screen.getByLabelText(copy.reason)).toHaveFocus()
  await user.tab({ shift: true })
  expect(close).toHaveFocus()
  await user.keyboard("{Escape}")
  await waitFor(() => expect(trigger).toHaveFocus())
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  expect(reverse).not.toHaveBeenCalled()
  await user.click(trigger)
  expect(screen.getByLabelText(copy.reason)).toHaveValue("  Correct duplicate allocation  ")
  expect(screen.getByLabelText(copy.date)).toHaveValue("2026-10-01")
})

it.each([
  ["FORBIDDEN", "denied"], ["CONFLICT", "changed"], ["CONCURRENCY_CONFLICT", "changed"], ["SOD_VIOLATION", "independent"],
] as const)("shows localized recovery for %s without requesting a password or repeating the action", async (code, key) => {
  reverse.mockResolvedValue(failure(code))
  const { user, copy } = await openReview("reverse", "fr")
  fillReversal(copy)
  await user.click(screen.getByRole("button", { name: copy.confirmReverse }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy[key])
  expect(screen.queryByLabelText(copy.password)).not.toBeInTheDocument()
  expect(screen.queryByText("Untranslated internal response")).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: copy.confirmReverse })).toBeDisabled()
  expect(reverse).toHaveBeenCalledTimes(1)
  expect(refresh).not.toHaveBeenCalled()
  await user.click(screen.getByRole("button", { name: copy.refresh }))
  expect(refresh).toHaveBeenCalledTimes(1)
  expect(reverse).toHaveBeenCalledTimes(1)
})

it("keeps an uncertain outcome blocked across reopening until an explicit refresh", async () => {
  reverse.mockRejectedValueOnce(new Error("lost transport response"))
  const { user, copy, trigger } = await openReview()
  fillReversal(copy)
  await user.click(screen.getByRole("button", { name: copy.confirmReverse }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.uncertain)
  await user.click(screen.getByRole("button", { name: copy.cancel }))
  await user.click(trigger)
  expect(screen.getByRole("button", { name: copy.confirmReverse })).toBeDisabled()
  expect(screen.getByLabelText(copy.reason)).toHaveValue("  Correct duplicate allocation  ")
  expect(reverse).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole("button", { name: copy.refresh }))
  expect(refresh).toHaveBeenCalledTimes(1)
  await user.click(trigger)
  expect(screen.getByRole("button", { name: copy.confirmReverse })).toBeEnabled()
  expect(reverse).toHaveBeenCalledTimes(1)
})

it.each(["INTERNAL_ERROR", "TIMEOUT", "DATABASE_ERROR", "UNKNOWN_ERROR"])("requires a refresh after structured %s because a post-commit failure can hide success", async code => {
  post.mockResolvedValue(failure(code))
  const { user, copy } = await openReview("post")
  await user.click(screen.getByRole("button", { name: copy.confirmPost }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.uncertain)
  expect(screen.getByRole("button", { name: copy.confirmPost })).toBeDisabled()
  fireEvent.submit(screen.getByRole("form", { name: copy.reviewPost }))
  expect(post).toHaveBeenCalledTimes(1)
  expect(refresh).not.toHaveBeenCalled()
})

it("offers a locale-correct sign-in path for a lost session while preserving visible correction details", async () => {
  reverse.mockResolvedValue(failure("AUTH_REQUIRED"))
  const { user, copy } = await openReview("reverse", "fr")
  fillReversal(copy)
  await user.click(screen.getByRole("button", { name: copy.confirmReverse }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.authRequired)
  expect(screen.getByRole("link", { name: copy.signIn })).toHaveAttribute("href", "/fr/login")
  expect(screen.getByLabelText(copy.reason)).toHaveValue("  Correct duplicate allocation  ")
  expect(screen.getByLabelText(copy.date)).toHaveValue("2026-10-01")
  expect(screen.getByRole("button", { name: copy.confirmReverse })).toBeDisabled()
  expect(stepUp).not.toHaveBeenCalled()
  expect(refresh).not.toHaveBeenCalled()
})

it("retains editable details after a business-rule rejection without exposing server wording", async () => {
  reverse.mockResolvedValue(failure("BUSINESS_RULE_VIOLATION"))
  const { user, copy } = await openReview("reverse", "fr")
  fillReversal(copy)
  await user.click(screen.getByRole("button", { name: copy.confirmReverse }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.rule)
  expect(screen.getByLabelText(copy.date)).toBeEnabled()
  expect(screen.getByLabelText(copy.reason)).toHaveValue("  Correct duplicate allocation  ")
  expect(screen.queryByText("Untranslated internal response")).not.toBeInTheDocument()
  expect(refresh).not.toHaveBeenCalled()
})

it("clears the password immediately and prevents duplicate identity requests", async () => {
  post.mockResolvedValue(failure("FRESH_AUTH_REQUIRED"))
  const request = deferred()
  stepUp.mockReturnValue(request.promise)
  const { user, copy } = await openReview("post")
  await user.click(screen.getByRole("button", { name: copy.confirmPost }))
  const password = await screen.findByLabelText(copy.password)
  await user.type(password, "secret-password")
  const form = screen.getByRole("form", { name: copy.identity })
  fireEvent.submit(form)
  fireEvent.submit(form)
  expect(password).toHaveValue("")
  expect(password).toBeDisabled()
  expect(stepUp).toHaveBeenCalledTimes(1)
  await act(async () => { request.resolve(failure("RATE_LIMITED")) })
  expect(screen.getByRole("alert")).toHaveTextContent(copy.identityRateLimited)
  expect(password).toHaveValue("")
  expect(post).toHaveBeenCalledTimes(1)
})

it.each(["en", "fr"] as const)("keeps %s reversal and identity state outside real table cells replaced by refreshed RSC props", async locale => {
  const copy = getJournalWorkflowCopy(locale).actions
  reverse.mockResolvedValueOnce(failure("FRESH_AUTH_REQUIRED")).mockResolvedValueOnce(success())
  const identityRequest = deferred()
  stepUp.mockReturnValue(identityRequest.promise)
  const view = render(tableView(locale))
  const trigger = screen.getByRole("button", { name: `${copy.reverse} — MAN-042` })
  await userEvent.click(trigger)
  fillReversal(copy)
  await userEvent.click(screen.getByRole("button", { name: copy.confirmReverse }))
  const password = await screen.findByLabelText(copy.password)
  await userEvent.type(password, "preserved-until-submitted")

  view.rerender(tableView(locale))
  expect(trigger.isConnected).toBe(false)
  expect(screen.getByLabelText(copy.password)).toBe(password)
  expect(password).toHaveValue("preserved-until-submitted")
  expect(password).toHaveFocus()
  expect(screen.getByLabelText(copy.reason)).toHaveValue("  Correct duplicate allocation  ")
  expect(screen.getByLabelText(copy.date)).toHaveValue("2026-10-01")
  expect(reverse).toHaveBeenCalledTimes(1)

  fireEvent.submit(screen.getByRole("form", { name: copy.identity }))
  view.rerender(tableView(locale))
  expect(password).toHaveValue("")
  expect(password).toBeDisabled()
  fireEvent.submit(screen.getByRole("form", { name: copy.identity }))
  expect(stepUp).toHaveBeenCalledTimes(1)
  await act(async () => { identityRequest.resolve(success()) })
  await waitFor(() => expect(screen.getByRole("button", { name: copy.confirmReverse })).toHaveFocus())
  expect(reverse).toHaveBeenCalledTimes(1)
  expect(refresh).not.toHaveBeenCalled()

  view.rerender(tableView(locale))
  expect(screen.getByLabelText(copy.reason)).toHaveValue("  Correct duplicate allocation  ")
  expect(screen.getByLabelText(copy.date)).toHaveValue("2026-10-01")
  await userEvent.click(screen.getByRole("button", { name: copy.confirmReverse }))
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  expect(reverse).toHaveBeenCalledTimes(2)
  expect(reverse.mock.calls[1]).toEqual(reverse.mock.calls[0])
  expect(screen.getByRole("status")).toHaveTextContent(`MAN-042: ${copy.reversed}`)
})

it("retains the financial in-flight guard when real table cells remount", async () => {
  const copy = getJournalWorkflowCopy("en").actions
  const request = deferred()
  post.mockReturnValue(request.promise)
  const view = render(tableView("en", "post"))
  const trigger = screen.getByRole("button", { name: `${copy.post} — MAN-042` })
  await userEvent.click(trigger)
  fireEvent.submit(screen.getByRole("form", { name: copy.reviewPost }))
  view.rerender(tableView("en", "post"))
  expect(trigger.isConnected).toBe(false)
  expect(screen.getByRole("dialog")).toBeVisible()
  expect(screen.getByRole("button", { name: copy.cancel })).toBeDisabled()
  fireEvent.submit(screen.getByRole("form", { name: copy.reviewPost }))
  await userEvent.keyboard("{Escape}")
  expect(post).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("dialog")).toBeVisible()
  await act(async () => { request.resolve(success()) })
  expect(refresh).toHaveBeenCalledTimes(1)
})

it("returns focus to the replacement trigger after table remount, or to the stable region if the row disappears", async () => {
  const copy = getJournalWorkflowCopy("en").actions
  const view = render(tableView("en", "post"))
  const trigger = screen.getByRole("button", { name: `${copy.post} — MAN-042` })
  await userEvent.click(trigger)
  view.rerender(tableView("en", "post"))
  expect(trigger.isConnected).toBe(false)
  await userEvent.keyboard("{Escape}")
  const replacement = screen.getByRole("button", { name: `${copy.post} — MAN-042` })
  await waitFor(() => expect(replacement).toHaveFocus())
  await userEvent.click(replacement)
  view.rerender(tableView("en", "post", false))
  await userEvent.keyboard("{Escape}")
  await waitFor(() => expect(view.container.querySelector("[data-journal-workflow-region]")).toHaveFocus())
  expect(post).not.toHaveBeenCalled()
})

it("retains an uncertain command's refresh barrier while the user reviews a different entry", async () => {
  const copy = getJournalWorkflowCopy("en").actions
  post.mockResolvedValue(failure("INTERNAL_ERROR"))
  render(<JournalWorkflowFeedback>
    <JournalEntryActions locale="en" entryId="entry-1" entryNumber="MAN-042" operation="post" />
    <JournalEntryActions locale="en" entryId="entry-2" entryNumber="MAN-043" operation="post" />
  </JournalWorkflowFeedback>)
  await userEvent.click(screen.getByRole("button", { name: `${copy.post} — MAN-042` }))
  await userEvent.click(screen.getByRole("button", { name: copy.confirmPost }))
  await userEvent.click(screen.getByRole("button", { name: copy.cancel }))
  await userEvent.click(screen.getByRole("button", { name: `${copy.post} — MAN-043` }))
  await userEvent.click(screen.getByRole("button", { name: copy.cancel }))
  await userEvent.click(screen.getByRole("button", { name: `${copy.post} — MAN-042` }))
  expect(screen.getByRole("alert")).toHaveTextContent(copy.uncertain)
  expect(screen.getByRole("button", { name: copy.confirmPost })).toBeDisabled()
  expect(post).toHaveBeenCalledTimes(1)
})

it("discards an old review and unsent password when the trusted tenant or actor provider key changes", async () => {
  const copy = getJournalWorkflowCopy("en").actions
  reverse.mockResolvedValue(failure("FRESH_AUTH_REQUIRED"))
  const view = render(<JournalWorkflowFeedback key="org-1:actor-1">
    <JournalEntryActions locale="en" entryId="entry-1" entryNumber="MAN-042" operation="reverse" />
  </JournalWorkflowFeedback>)
  await userEvent.click(screen.getByRole("button", { name: `${copy.reverse} — MAN-042` }))
  fillReversal(copy)
  await userEvent.click(screen.getByRole("button", { name: copy.confirmReverse }))
  await userEvent.type(await screen.findByLabelText(copy.password), "unsent-old-scope-password")

  view.rerender(<JournalWorkflowFeedback key="org-2:actor-2">
    <JournalEntryActions locale="en" entryId="entry-2" entryNumber="MAN-043" operation="reverse" />
  </JournalWorkflowFeedback>)
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  expect(screen.queryByLabelText(copy.password)).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: `${copy.reverse} — MAN-042` })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole("button", { name: `${copy.reverse} — MAN-043` }))
  expect(screen.getByLabelText(copy.reason)).toHaveValue("")
  expect(screen.getByLabelText(copy.date)).toHaveValue("")
  expect(screen.queryByLabelText(copy.password)).not.toBeInTheDocument()
  expect(stepUp).not.toHaveBeenCalled()
  expect(reverse).toHaveBeenCalledTimes(1)
})
