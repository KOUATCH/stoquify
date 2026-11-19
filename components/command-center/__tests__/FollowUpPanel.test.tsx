import "@testing-library/jest-dom";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { FollowUpPanel } from "../FollowUpPanel";
import * as actions from "@/actions/command-center/follow-up.actions";
import type { FollowUpData } from "@/services/command-center/contracts";
const load = actions.getCommandCenterFollowUps as jest.Mock,
  change = actions.changeCommandCenterFollowUp as jest.Mock,
  review = actions.reviewCommandCenterFollowUps as jest.Mock;
const props = {
  center: "manager" as const,
  periodStart: "2026-10-24T00:00:00.000Z",
  periodEnd: "2026-10-24T23:59:59.999Z",
  locale: "en" as const,
};
function data(): FollowUpData {
  return {
    availableLocations: [],
    scope: {
      locationId: null,
      periodStart: props.periodStart,
      periodEnd: props.periodEnd,
    },
    actorId: "actor",
    revision: 1,
    evidenceKey: "a".repeat(64),
    review: { current: false, reviewedAt: null },
    unavailable: [],
    notices: [],
    preference: { enabled: true, quietStart: null, quietEnd: null },
    items: [
      {
        id: "work",
        source: "stockout",
        revision: 1,
        episode: 1,
        condition: "ACTIVE",
        coordination: "OPEN",
        ownerId: null,
        ownerName: null,
        dueAt: null,
        actionPath: "/dashboard/inventory/items",
        canAssign: true,
        canDelegate: true,
        sourceRevision: "s",
        updatedAt: props.periodStart,
        history: [{ type: "OBSERVED", at: props.periodStart }],
      },
    ],
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  load.mockResolvedValue({ success: true, data: data() });
  Object.defineProperty(crypto, "randomUUID", {
    configurable: true,
    value: () => "12345678-1234-4234-8234-123456789abc",
  });
});
afterEach(cleanup);
it.each(["digest", "manager", "owner"] as const)(
  "loads the authorized shared projection for %s",
  async (center) => {
    render(<FollowUpPanel {...props} center={center} />);
    await waitFor(() =>
      expect(load).toHaveBeenCalledWith(expect.objectContaining({ center })),
    );
    if (center === "digest")
      fireEvent.click(screen.getByRole("checkbox", { name: "Assigned to me" }));
    expect(await screen.findByText("Stock availability")).toBeInTheDocument();
  },
);
it("keeps the exact request and freezes edits after a lost response", async () => {
  change
    .mockRejectedValueOnce(new Error("lost response"))
    .mockResolvedValueOnce({
      success: true,
      data: {
        ...data(),
        items: [
          {
            ...data().items[0],
            ownerId: "actor",
            coordination: "ASSIGNED",
            revision: 2,
          },
        ],
      },
    });
  render(<FollowUpPanel {...props} />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Save follow-up" }),
  );
  await screen.findByText(/result is uncertain/);
  expect(screen.getByRole("button", { name: "Save follow-up" })).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Retry the same request" }),
  );
  await screen.findByText(/Follow-up saved/);
  expect(change.mock.calls[1][0]).toEqual(change.mock.calls[0][0]);
  expect(change.mock.calls[0][0]).not.toHaveProperty("organizationId");
});
it("removes private detail after denied mutation and offers refresh", async () => {
  change.mockResolvedValue({
    success: false,
    retryable: false,
    code: "FORBIDDEN",
  });
  render(<FollowUpPanel {...props} />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Save follow-up" }),
  );
  await screen.findByText(/Follow-ups are unavailable/);
  expect(screen.queryByText("Stock availability")).not.toBeInTheDocument();
});
it("clears old content during refresh and ignores an obsolete response after scope replacement", async () => {
  let complete!: (value: unknown) => void;
  load
    .mockImplementationOnce(
      () => new Promise((resolve) => (complete = resolve)),
    )
    .mockResolvedValueOnce({ success: true, data: { ...data(), items: [] } });
  const view = render(<FollowUpPanel {...props} />);
  view.rerender(<FollowUpPanel {...props} locationId="another-scope" />);
  await screen.findByText(/No saved work/);
  await act(async () => complete({ success: true, data: data() }));
  expect(screen.queryByText("Stock availability")).not.toBeInTheDocument();
});
it("stores review against current evidence without any completion command", async () => {
  review.mockResolvedValue({
    success: true,
    data: {
      ...data(),
      review: { current: true, reviewedAt: props.periodStart },
    },
  });
  render(<FollowUpPanel {...props} />);
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Record review of these follow-ups",
    }),
  );
  await waitFor(() =>
    expect(review).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 1,
        evidenceKey: "a".repeat(64),
      }),
    ),
  );
  expect(change).not.toHaveBeenCalled();
});
it("renders French labels and native localized source links", async () => {
  render(<FollowUpPanel {...props} locale="fr" />);
  await screen.findByText("Disponibilité du stock");
  expect(
    screen.getByRole("link", { name: "Ouvrir la source" }),
  ).toHaveAttribute("href", "/fr/dashboard/inventory/items");
  expect(screen.getByLabelText("Date de suivi (UTC)")).toBeInTheDocument();
});
it("keeps unavailable and cleared source states separate from coordination", async () => {
  load.mockResolvedValue({
    success: true,
    data: {
      ...data(),
      unavailable: ["close"],
      items: [{ ...data().items[0], condition: "UNKNOWN", canAssign: false }],
    },
  });
  render(<FollowUpPanel {...props} />);
  await screen.findByText(/Source evidence unavailable/);
  expect(
    screen.queryByRole("button", { name: "Save follow-up" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Record review of these follow-ups" }),
  ).toBeDisabled();
});

it("saves notification preferences through the protected action", async () => {
  const save = actions.saveCommandCenterPreference as jest.Mock;
  save.mockResolvedValue({
    success: true,
    data: {
      ...data(),
      preference: { enabled: false, quietStart: null, quietEnd: null },
    },
  });
  render(<FollowUpPanel {...props} />);
  fireEvent.click(
    await screen.findByText("Follow-up notification preferences"),
  );
  fireEvent.click(
    screen.getByRole("checkbox", { name: "In-app notifications" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({
      center: props.center,
      periodStart: props.periodStart,
      periodEnd: props.periodEnd,
      locationId: null,
      enabled: false,
      quietStart: null,
      quietEnd: null,
    }),
  );
});
it("acknowledges only the selected notice", async () => {
  load.mockResolvedValue({
    success: true,
    data: { ...data(), notices: [{ id: "notice-1", source: "stockout" }] },
  });
  const ack = actions.acknowledgeCommandCenterNotice as jest.Mock;
  ack.mockResolvedValue({ success: true, data: data() });
  render(<FollowUpPanel {...props} />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Mark notice read" }),
  );
  await waitFor(() =>
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({ noticeId: "notice-1", center: "manager" }),
    ),
  );
  expect(change).not.toHaveBeenCalled();
});

it("requires the full visible scope before recording review", async () => {
  render(<FollowUpPanel {...props} center="digest" />);
  const review = await screen.findByRole("button", {
    name: "Record review of these follow-ups",
  });
  expect(review).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: "Assigned to me" }));
  expect(review).not.toBeDisabled();
});
it("reloads authorized location selection without retaining old rows", async () => {
  load.mockResolvedValue({
    success: true,
    data: {
      ...data(),
      availableLocations: [
        { id: "branch", name: "Authorized branch", assignedToActor: true },
      ],
    },
  });
  render(<FollowUpPanel {...props} center="owner" />);
  fireEvent.change(await screen.findByLabelText("Follow-up scope"), {
    target: { value: "branch" },
  });
  await waitFor(() =>
    expect(load).toHaveBeenLastCalledWith(
      expect.objectContaining({ center: "owner", locationId: "branch" }),
    ),
  );
});

it("recovers from a revoked saved location without retaining private detail", async () => {
  window.history.replaceState(
    {},
    "",
    "/en/dashboard/daily-digest?followUpLocation=revoked",
  );
  load.mockImplementation(async (query) =>
    query.locationId
      ? { success: false, code: "FORBIDDEN" }
      : { success: true, data: data() },
  );
  render(<FollowUpPanel {...props} center="digest" />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Reset follow-up scope" }),
  );
  await waitFor(() =>
    expect(load).toHaveBeenLastCalledWith(
      expect.objectContaining({ locationId: null }),
    ),
  );
  expect(
    new URL(window.location.href).searchParams.has("followUpLocation"),
  ).toBe(false);
});
