import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter } from "next/navigation"
import { postJournalEntryAction, reverseJournalEntryAction } from "@/actions/accounting/journals.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { JournalEntryActions, JournalWorkflowFeedback } from "@/components/accounting/JournalEntryActions"
import { getJournalWorkflowCopy } from "@/components/accounting/journal-workflow-copy"

jest.mock("next/navigation", () => ({ useRouter: jest.fn() }))
jest.mock("@/actions/accounting/journals.actions", () => ({ postJournalEntryAction: jest.fn(), reverseJournalEntryAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("lucide-react", () => {
  const React = require("react")
  return { X: (props: React.SVGProps<SVGSVGElement>) => React.createElement("svg", { "aria-hidden": true, ...props }) }
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
