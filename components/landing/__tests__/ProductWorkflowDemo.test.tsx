import { act, fireEvent, render, screen } from "@testing-library/react";
import { ProductWorkflowDemo } from "../product-workflow-demo";

let mockMotionOff = false;
let mockLocale = "en";
let intersect: (
  entries: { isIntersecting: boolean; intersectionRatio?: number }[],
) => void;
const disconnect = jest.fn();
jest.mock("next-intl", () => ({ useLocale: () => mockLocale }));
jest.mock("../cinematic-shell", () => ({
  useCinematicMotionOff: () => mockMotionOff,
}));
const nativeAnimations: {
  currentTime: number;
  play: jest.Mock;
  pause: jest.Mock;
  cancel: jest.Mock;
}[] = [];

beforeEach(() => {
  jest.useFakeTimers();
  mockMotionOff = false;
  mockLocale = "en";
  nativeAnimations.length = 0;
  Element.prototype.animate = jest.fn().mockImplementation(function (this: Element) {
    const animation = {
      currentTime: 0,
      play: jest.fn(),
      pause: jest.fn(),
      cancel: jest.fn(),
    };
    // Playback assertions track the workflow timeline, independently of hint fades.
    if (!this.closest(".workflow-indicator-hints")) nativeAnimations.push(animation);
    return animation;
  });
  global.IntersectionObserver = jest.fn().mockImplementation((callback) => {
    intersect = (entries) =>
      callback(
        entries.map((entry) => ({
          intersectionRatio: entry.isIntersecting ? 1 : 0,
          ...entry,
        })),
      );
    return { observe: jest.fn(), disconnect };
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
const enter = () => act(() => intersect([{ isIntersecting: true }]));

test.each([ ["en", false], ["fr", false], ["en", true], ["fr", true] ] as const)("waits for the complete preview entrance in %s (mobile: %s)", async (locale, mobile) => {
  mockLocale = locale;
  const property = mobile ? "--mobile-preview-opacity" : "--hero-entry-opacity";
  const { container, unmount } = render(
    <section className="workflow-showcase" data-hero-handoff="" data-mobile-preview={mobile ? "" : undefined} style={{ "--hero-entry-opacity": "1", [property]: "0" } as React.CSSProperties}>
      <ProductWorkflowDemo module="pos" />
    </section>,
  );
  const showcase = container.querySelector(".workflow-showcase") as HTMLElement;
  const preview = container.querySelector(".product-workflow")!;
  const reveal = async (opacity: string) => {
    await act(async () => {
      showcase.style.setProperty(property, opacity);
      await Promise.resolve();
    });
  };
  // Chrome may batch the initial offscreen reading with the scroll into view.
  act(() => intersect([
    { isIntersecting: false },
    { isIntersecting: true, intersectionRatio: 0.37 },
  ]));
  for (const opacity of ["0", "0.5", "0.999"]) {
    await reveal(opacity);
    act(() => jest.advanceTimersByTime(6000));
    expect(preview).toHaveAttribute("data-playing", "false");
    expect(preview).toHaveAttribute("data-time", "0");
    expect(nativeAnimations.every((animation) => animation.currentTime === 0)).toBe(true);
  }
  await reveal("1");
  act(() => jest.advanceTimersByTime(399));
  expect(preview).toHaveAttribute("data-playing", "false");
  expect(preview).toHaveAttribute("data-time", "0");
  expect(nativeAnimations.every((animation) => animation.currentTime === 0)).toBe(true);
  act(() => jest.advanceTimersByTime(1));
  expect(preview).toHaveAttribute("data-playing", "true");
  expect(preview).toHaveAttribute("data-time", "0");
  act(() => jest.advanceTimersByTime(600));
  expect(preview).toHaveAttribute("data-time", "600");
  nativeAnimations.forEach((animation) => { animation.currentTime = 650; });
  await reveal("0.5");
  act(() => jest.advanceTimersByTime(6000));
  expect(preview).toHaveAttribute("data-playing", "false");
  expect(preview).toHaveAttribute("data-time", "650");
  await reveal("1");
  act(() => jest.advanceTimersByTime(100));
  expect(preview).toHaveAttribute("data-time", "750");
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  await reveal("0.5");
  await reveal("1");
  expect(preview).toHaveAttribute("data-playing", "false");
  unmount();
  // Flush React's async-act microtasks before checking for leaked playback timers.
  act(() => jest.runAllTicks());
  expect(jest.getTimerCount()).toBe(0);
});

test("uses the latest visibility reading when a scroll leaves the preview", () => {
  const { container } = render(<ProductWorkflowDemo module="pos" />);
  const preview = container.querySelector(".product-workflow")!;
  enter();
  act(() => jest.advanceTimersByTime(600));
  act(() => intersect([
    { isIntersecting: true },
    { isIntersecting: false },
  ]));
  expect(preview).toHaveAttribute("data-playing", "false");
  act(() => jest.advanceTimersByTime(6000));
  expect(preview).toHaveAttribute("data-time", "600");
});

test.each(["en", "fr"])("keeps accounting context aligned when the product changes in %s", (locale) => {
  mockLocale = locale;
  const { container, rerender } = render(<ProductWorkflowDemo module="pos" />);
  for (const moduleId of ["pos", "inventory", "receivables", "payables", "finance", "hris", "payroll", "accounting"] as const) {
    rerender(<ProductWorkflowDemo key={moduleId} module={moduleId} />);
    const context = container.querySelector("[data-accounting-context]");
    expect(context).toHaveAttribute("data-accounting-context", moduleId);
    expect(context).toHaveTextContent(locale === "fr" ? "Déjà dans Stoquify" : "Already in Stoquify");
    expect(context).toHaveTextContent(locale === "fr" ? "Pour la revue du cabinet" : "For your firm’s review");
  }
});
// jsdom lacks PointerEvent; retain the pointer type and related target React reads.
const pointer = (
  element: Element,
  type: "pointerover" | "pointerout",
  pointerType = "mouse",
  relatedTarget: EventTarget | null = null,
) => {
  const event = new MouseEvent(type, { bubbles: true, relatedTarget });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  fireEvent(element, event);
};
const advance = () =>
  act(() => {
    jest.advanceTimersByTime(6000);
  });

const touch = (element: Element, type: string, overrides = {}) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: 40,
    clientY: 60,
    ...overrides,
  });
  Object.entries({
    pointerType: "touch",
    pointerId: 1,
    isPrimary: true,
    ...overrides,
  }).forEach(([key, value]) => Object.defineProperty(event, key, { value }));
  fireEvent(element, event);
};

test.each(["offscreen", "hidden"])("mobile reading hold waits for a visible preview after going %s", (reason) => {
  const { container, unmount } = render(
    <section className="workflow-showcase" data-mobile-preview="" style={{ "--mobile-preview-opacity": "1" } as React.CSSProperties}>
      <ProductWorkflowDemo module="pos" />
    </section>,
  );
  const preview = container.querySelector(".product-workflow")!;
  const visibility = jest.spyOn(document, "visibilityState", "get");
  enter();
  act(() => jest.advanceTimersByTime(200));
  if (reason === "offscreen") act(() => intersect([{ isIntersecting: false }]));
  else {
    visibility.mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
  }
  act(() => jest.advanceTimersByTime(1000));
  expect(preview).toHaveAttribute("data-time", "0");
  if (reason === "offscreen") enter();
  else {
    visibility.mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
  }
  act(() => jest.advanceTimersByTime(399));
  expect(preview).toHaveAttribute("data-playing", "false");
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});

test("hovering during the desktop reading hold delays playback until leaving and resumes without another hold", () => {
  const { container } = render(
    <section className="workflow-showcase" data-hero-handoff="" style={{ "--hero-entry-opacity": "1" } as React.CSSProperties}>
      <ProductWorkflowDemo module="pos" />
    </section>,
  );
  const preview = container.querySelector(".product-workflow")!;
  enter();
  act(() => jest.advanceTimersByTime(200));
  pointer(preview, "pointerover");
  act(() => jest.advanceTimersByTime(1000));
  expect(preview).toHaveAttribute("data-playing", "false");
  expect(preview).toHaveAttribute("data-time", "0");
  expect(nativeAnimations.every((animation) => animation.currentTime === 0)).toBe(true);
  pointer(preview, "pointerout");
  expect(preview).toHaveAttribute("data-playing", "true");
  act(() => jest.advanceTimersByTime(600));
  nativeAnimations.forEach((animation) => { animation.currentTime = 650; });
  pointer(preview, "pointerover");
  act(() => jest.advanceTimersByTime(1000));
  expect(preview).toHaveAttribute("data-time", "650");
  pointer(preview, "pointerout");
  expect(preview).toHaveAttribute("data-playing", "true");
  act(() => jest.advanceTimersByTime(100));
  expect(preview).toHaveAttribute("data-time", "750");
});

test("tapping during the mobile reading hold keeps playback paused until another tap", () => {
  const { container } = render(
    <section className="workflow-showcase" data-mobile-preview="" style={{ "--mobile-preview-opacity": "1" } as React.CSSProperties}>
      <ProductWorkflowDemo module="pos" />
    </section>,
  );
  const preview = container.querySelector(".product-workflow")!;
  const viewport = container.querySelector(".workflow-viewport")!;
  enter();
  act(() => jest.advanceTimersByTime(200));
  touch(viewport, "pointerdown");
  touch(viewport, "pointerup");
  act(() => jest.advanceTimersByTime(1000));
  expect(preview).toHaveAttribute("data-playing", "false");
  expect(preview).toHaveAttribute("data-time", "0");
  touch(viewport, "pointerdown");
  touch(viewport, "pointerup");
  expect(preview).toHaveAttribute("data-playing", "true");
  act(() => jest.advanceTimersByTime(100));
  expect(preview).toHaveAttribute("data-time", "100");
});

test.each([1225, 19025])(
  "tapping pauses at %i ms and tapping again resumes from that frame",
  (position) => {
    const { container } = render(<ProductWorkflowDemo module="pos" />);
    const preview = container.querySelector(".product-workflow")!;
    const item = container.querySelector(".workflow-item")!;
    enter();
    act(() => jest.advanceTimersByTime(position));
    nativeAnimations.forEach((animation) => {
      animation.currentTime = position;
    });
    touch(item, "pointerdown");
    touch(item, "pointerup");
    // The compatibility click following a touch must not toggle a second time.
    fireEvent.click(item);
    expect(preview).toHaveAttribute("data-playing", "false");
    expect(screen.getByText("Tap the preview to resume")).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(60000));
    expect(preview).toHaveAttribute("data-time", String(position));
    expect(jest.getTimerCount()).toBe(0);
    expect(
      nativeAnimations.every((animation) => animation.currentTime === position),
    ).toBe(true);
    act(() => intersect([{ isIntersecting: false }]));
    enter();
    expect(preview).toHaveAttribute("data-playing", "false");
    touch(item, "pointerdown");
    touch(item, "pointerup");
    expect(screen.getByText("Tap the preview to pause")).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(100));
    expect(preview).toHaveAttribute("data-time", String(position + 100));
    expect(jest.getTimerCount()).toBe(1);
  },
);

test.each(["swipe", "cancel", "pinch", "long press", "mouse"])(
  "%s does not toggle touch playback",
  (gesture) => {
    const { container } = render(<ProductWorkflowDemo module="inventory" />);
    const viewport = container.querySelector(".workflow-viewport")!;
    enter();
    touch(
      viewport,
      "pointerdown",
      gesture === "mouse" ? { pointerType: "mouse" } : {},
    );
    if (gesture === "swipe") touch(viewport, "pointermove", { clientY: 100 });
    if (gesture === "cancel") touch(viewport, "pointercancel");
    if (gesture === "pinch")
      touch(viewport, "pointerdown", { pointerId: 2, isPrimary: false });
    if (gesture === "long press") act(() => jest.advanceTimersByTime(600));
    touch(viewport, "pointerup");
    expect(container.querySelector(".product-workflow")).toHaveAttribute(
      "data-playing",
      "true",
    );
  },
);

test("touch controls toggle once, French hints follow playback, and reduced motion ignores taps", () => {
  mockLocale = "fr";
  const { container, rerender } = render(<ProductWorkflowDemo module="pos" />);
  const viewport = container.querySelector(".workflow-viewport")!;
  const preview = container.querySelector(".product-workflow")!;
  enter();
  const pause = screen.getByRole("button", { name: "Pause" });
  touch(pause, "pointerdown");
  touch(pause, "pointerup");
  fireEvent.click(pause);
  expect(preview).toHaveAttribute("data-playing", "false");
  expect(
    screen.getByText("Touchez l’aperçu pour reprendre"),
  ).toBeInTheDocument();
  touch(viewport, "pointerdown");
  touch(viewport, "pointerup");
  expect(preview).toHaveAttribute("data-playing", "true");
  mockMotionOff = true;
  rerender(<ProductWorkflowDemo module="pos" />);
  const position = preview.getAttribute("data-time");
  touch(viewport, "pointerdown");
  touch(viewport, "pointerup");
  advance();
  expect(preview).toHaveAttribute("data-time", position);
  expect(preview).toHaveAttribute("data-playing", "false");
  expect(
    container.querySelector(".workflow-indicator-hints"),
  ).not.toBeInTheDocument();
});

test("plays only in view, holds the final state for three seconds, then loops without remounting", () => {
  const { container, unmount } = render(<ProductWorkflowDemo module="pos" />);
  const stage = () => container.querySelector("[data-step]");
  const viewport = container.querySelector(".workflow-viewport");
  advance();
  expect(stage()).toHaveAttribute("data-step", "0");
  act(() => intersect([{ isIntersecting: true, intersectionRatio: 0.2 }]));
  advance();
  expect(stage()).toHaveAttribute("data-time", "0");
  enter();
  advance();
  expect(stage()).toHaveAttribute("data-step", "1");
  act(() => intersect([{ isIntersecting: false }]));
  advance();
  expect(stage()).toHaveAttribute("data-step", "1");
  enter();
  advance();
  advance();
  expect(screen.getByText("Sale recorded")).toBeInTheDocument();
  expect(stage()).toHaveAttribute("data-step", "2");
  expect(stage()).toHaveAttribute("data-playing", "true");
  expect(
    screen.getByText("Final state · replaying shortly"),
  ).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(3000));
  expect(stage()).toHaveAttribute("data-time", "21000");
  expect(screen.getByText("Sale recorded")).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(400));
  expect(stage()).toHaveAttribute("data-time", "0");
  expect(container.querySelector(".workflow-viewport")).toBe(viewport);
  expect(screen.getByText("Building basket")).toBeInTheDocument();
  expect(
    nativeAnimations.every((animation) => animation.currentTime === 0),
  ).toBe(true);
  act(() => jest.advanceTimersByTime(21400));
  expect(stage()).toHaveAttribute("data-time", "0");
  expect(jest.getTimerCount()).toBe(1);
  advance();
  fireEvent.click(screen.getByRole("button", { name: "Replay" }));
  expect(stage()).toHaveAttribute("data-step", "0");
  unmount();
  expect(disconnect).toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

test("pause remains paused through focus and click; manual navigation pauses playback", () => {
  const { container } = render(<ProductWorkflowDemo module="inventory" />);
  enter();
  const pause = screen.getByRole("button", { name: "Pause" });
  fireEvent.focus(pause);
  fireEvent.click(pause);
  advance();
  expect(container.querySelector("[data-step]")).toHaveAttribute(
    "data-step",
    "0",
  );
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  advance();
  expect(container.querySelector("[data-step]")).toHaveAttribute(
    "data-step",
    "1",
  );
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByText("96")).toBeInTheDocument();
  expect(screen.getByText("48")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Confirm receipt" }));
  expect(screen.getByText("72")).toBeInTheDocument();
  expect(
    screen.getByText("168 units total · source + transit + destination"),
  ).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(60000));
  expect(container.querySelector("[data-time]")).toHaveAttribute(
    "data-time",
    "18000",
  );
});

test("keyboard focus on steps and hidden documents stop the timer", () => {
  const { container } = render(<ProductWorkflowDemo module="finance" />);
  enter();
  const visibility = jest
    .spyOn(document, "visibilityState", "get")
    .mockReturnValue("hidden");
  fireEvent(document, new Event("visibilitychange"));
  advance();
  expect(container.querySelector("[data-step]")).toHaveAttribute(
    "data-step",
    "0",
  );
  visibility.mockReturnValue("visible");
  fireEvent(document, new Event("visibilitychange"));
  fireEvent.focus(screen.getByRole("button", { name: "Compare the evidence" }));
  advance();
  expect(container.querySelector("[data-step]")).toHaveAttribute(
    "data-step",
    "0",
  );
});

test.each(["en", "fr"])(
  "reduced motion keeps manual access to every step in %s",
  (locale) => {
    mockMotionOff = true;
    mockLocale = locale;
    const { container } = render(<ProductWorkflowDemo module="finance" />);
    enter();
    advance();
    expect(container.querySelector("[data-step]")).toHaveAttribute(
      "data-step",
      "0",
    );
    expect(
      screen.queryByRole("button", { name: "Pause" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name:
          locale === "fr" ? "Vérifier le rapprochement" : "Review the match",
      }),
    );
    expect(
      screen.getByText(
        locale === "fr"
          ? "Justificatifs à vérifier"
          : "Evidence review pending",
      ),
    ).toBeInTheDocument();
    expect(container.querySelector("[data-playing]")).toHaveAttribute(
      "data-playing",
      "false",
    );
    act(() => jest.advanceTimersByTime(60000));
    expect(container.querySelector("[data-time]")).toHaveAttribute(
      "data-time",
      "18000",
    );
  },
);

test("changing modules unmounts the previous playback and leaves one timer", () => {
  const { rerender, container } = render(
    <ProductWorkflowDemo key="pos" module="pos" />,
  );
  enter();
  advance();
  rerender(<ProductWorkflowDemo key="accounting" module="accounting" />);
  expect(container.querySelector("[data-step]")).toHaveAttribute(
    "data-step",
    "0",
  );
  enter();
  advance();
  advance();
  advance();
  expect(
    screen.getByText("Close pending · reconciliation evidence needed"),
  ).toBeInTheDocument();
  expect(container.querySelector("[data-playing]")).toHaveAttribute(
    "data-playing",
    "true",
  );
  expect(jest.getTimerCount()).toBe(1);
});

test.each(["offscreen", "hidden", "paused"])(
  "preserves the remaining final-state hold when %s",
  (reason) => {
    const { container } = render(<ProductWorkflowDemo module="inventory" />);
    enter();
    act(() => jest.advanceTimersByTime(19000));
    const visibility = jest.spyOn(document, "visibilityState", "get");
    if (reason === "offscreen")
      act(() => intersect([{ isIntersecting: false }]));
    if (reason === "hidden") {
      visibility.mockReturnValue("hidden");
      fireEvent(document, new Event("visibilitychange"));
    }
    if (reason === "paused")
      fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    act(() => jest.advanceTimersByTime(60000));
    expect(container.querySelector("[data-time]")).toHaveAttribute(
      "data-time",
      "19000",
    );
    expect(jest.getTimerCount()).toBe(0);
    if (reason === "offscreen") enter();
    if (reason === "hidden") {
      visibility.mockReturnValue("visible");
      fireEvent(document, new Event("visibilitychange"));
    }
    if (reason === "paused") {
      act(() => intersect([{ isIntersecting: false }]));
      enter();
      expect(container.querySelector("[data-playing]")).toHaveAttribute(
        "data-playing",
        "false",
      );
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
    }
    act(() => jest.advanceTimersByTime(2000));
    expect(screen.getByText("72")).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(400));
    expect(container.querySelector("[data-time]")).toHaveAttribute(
      "data-time",
      "0",
    );
    expect(screen.getByText("120")).toBeInTheDocument();
  },
);

test("items arrive separately inside the same mounted interface and pause preserves progress", () => {
  const { container } = render(<ProductWorkflowDemo module="pos" />);
  const viewport = container.querySelector(".workflow-viewport");
  const receipt = container.querySelector(".workflow-receipt");
  enter();
  act(() => jest.advanceTimersByTime(2500));
  expect(screen.getByText("1 item selected")).toBeInTheDocument();
  expect(container.querySelector(".workflow-total")).toHaveTextContent(
    "2,500 XAF",
  );
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  const pausedTime = container
    .querySelector("[data-time]")
    ?.getAttribute("data-time");
  advance();
  expect(container.querySelector("[data-time]")).toHaveAttribute(
    "data-time",
    pausedTime,
  );
  expect(
    nativeAnimations.every(
      (animation) => animation.pause.mock.calls.length >= 2,
    ),
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  act(() => jest.advanceTimersByTime(2300));
  expect(screen.getByText("2 items selected")).toBeInTheDocument();
  expect(container.querySelector(".workflow-total")).toHaveTextContent(
    "4,000 XAF",
  );
  advance();
  expect(container.querySelector(".workflow-viewport")).toBe(viewport);
  expect(container.querySelector(".workflow-receipt")).toBe(receipt);
  fireEvent.click(screen.getByRole("button", { name: "Keep the trail" }));
  expect(
    nativeAnimations.every((animation) => animation.currentTime === 18000),
  ).toBe(true);
});

test("stock remains conserved during dispatch and arrival, and approval precedes dispatch", () => {
  const { container } = render(<ProductWorkflowDemo module="inventory" />);
  enter();
  const quantities = () =>
    [
      ...container.querySelectorAll(
        ".workflow-transfer .workflow-card > strong, .workflow-route > span",
      ),
    ].map((element) => Number(element.textContent));
  act(() => jest.advanceTimersByTime(5000));
  expect(screen.getByText("Recorded")).toBeInTheDocument();
  expect(quantities()).toEqual([120, 0, 48]);
  act(() => jest.advanceTimersByTime(1500));
  expect(quantities()).toEqual([96, 24, 48]);
  act(() => jest.advanceTimersByTime(6500));
  expect(quantities()).toEqual([96, 0, 72]);
  expect(quantities().reduce((sum, quantity) => sum + quantity, 0)).toBe(168);
});

test("client motion detection starts at the beginning, and switching motion off cancels animations", () => {
  mockMotionOff = true;
  const { rerender, container } = render(<ProductWorkflowDemo module="pos" />);
  expect(nativeAnimations).toHaveLength(0);
  mockMotionOff = false;
  rerender(<ProductWorkflowDemo module="pos" />);
  enter();
  expect(container.querySelector("[data-time]")).toHaveAttribute(
    "data-time",
    "0",
  );
  act(() => jest.advanceTimersByTime(2000));
  mockMotionOff = true;
  rerender(<ProductWorkflowDemo module="pos" />);
  expect(
    nativeAnimations.every(
      (animation) => animation.cancel.mock.calls.length > 0,
    ),
  ).toBe(true);
  expect(jest.getTimerCount()).toBe(0);
  expect(screen.getByText("Basket ready")).toBeInTheDocument();
});

test.each([1225, 19025])(
  "hover preserves the exact animation frame at %i ms and resumes from it",
  (position) => {
    const { container } = render(<ProductWorkflowDemo module="pos" />);
    const preview = container.querySelector(".product-workflow")!;
    enter();
    act(() => jest.advanceTimersByTime(position));
    // Native animation frames advance between the lower-frequency text updates.
    nativeAnimations.forEach((animation) => {
      animation.currentTime = position;
    });
    pointer(preview, "pointerover");
    expect(preview).toHaveAttribute("data-playing", "false");
    expect(preview).toHaveAttribute("data-time", String(position));
    expect(screen.getByText("Paused while you inspect")).toBeInTheDocument();
    const firstItem = container.querySelector(".workflow-item")!;
    const receipt = container.querySelector(".workflow-receipt")!;
    pointer(firstItem, "pointerout", "mouse", receipt);
    pointer(receipt, "pointerover", "mouse", firstItem);
    act(() => jest.advanceTimersByTime(60000));
    expect(preview).toHaveAttribute("data-time", String(position));
    expect(preview).toHaveAttribute("data-hovered", "true");
    expect(jest.getTimerCount()).toBe(0);
    expect(
      nativeAnimations.every((animation) => animation.currentTime === position),
    ).toBe(true);
    pointer(preview, "pointerout", "mouse", document.body);
    expect(preview).toHaveAttribute("data-playing", "true");
    act(() => jest.advanceTimersByTime(100));
    expect(preview).toHaveAttribute("data-time", String(position + 100));
    expect(jest.getTimerCount()).toBe(1);
  },
);

test.each(["Enter", " "])("%s pauses at the exact native frame and resumes immediately without key repeat", (key) => {
  const { container } = render(<ProductWorkflowDemo module="pos" />);
  const preview = container.querySelector(".product-workflow")!;
  enter();
  act(() => jest.advanceTimersByTime(1225));
  nativeAnimations.forEach((animation) => { animation.currentTime = 1225; });
  const control = screen.getByRole("button", { name: "Pause" });
  act(() => control.focus());
  fireEvent.keyDown(control, { key });
  expect(control).toHaveFocus();
  expect(preview).toHaveAttribute("data-playing", "false");
  expect(preview).toHaveAttribute("data-time", "1225");
  expect(container.querySelector('.workflow-indicator-icon .lucide-play')).toHaveAttribute("data-active", "true");
  fireEvent.keyDown(control, { key, repeat: true });
  act(() => jest.advanceTimersByTime(1000));
  expect(preview).toHaveAttribute("data-time", "1225");
  expect(nativeAnimations.every((animation) => animation.currentTime === 1225)).toBe(true);
  fireEvent.keyUp(control, { key });
  pointer(preview, "pointerover");
  fireEvent.keyDown(control, { key });
  expect(preview).toHaveAttribute("data-playing", "true");
  expect(control).toHaveFocus();
  expect(container.querySelector('.workflow-indicator-icon .lucide-pause')).toHaveAttribute("data-active", "true");
  act(() => jest.advanceTimersByTime(100));
  expect(preview).toHaveAttribute("data-time", "1325");
});

test.each(["en", "fr"])("keyboard hints follow focus and playback in %s", (locale) => {
  mockLocale = locale;
  const { container } = render(<ProductWorkflowDemo module="pos" />);
  enter();
  const control = screen.getByRole("button", { name: "Pause" });
  const hint = () => container.querySelector('.workflow-indicator-hints [data-active="true"]');
  act(() => control.focus());
  expect(hint()).toHaveTextContent(locale === "fr" ? "Entrée ou Espace pour mettre en pause" : "Enter or Space to pause");
  expect(control).toHaveAttribute("aria-describedby", "workflow-playback-hint-pos");
  fireEvent.keyDown(control, { key: "Enter" });
  expect(hint()).toHaveTextContent(locale === "fr" ? "Entrée ou Espace pour reprendre" : "Enter or Space to resume");
  expect(hint()).toHaveAttribute("aria-hidden", "false");
  fireEvent.pointerDown(control);
  expect(hint()).not.toHaveTextContent(locale === "fr" ? "Entrée ou Espace" : "Enter or Space");
  fireEvent.keyDown(control, { key: " " });
  expect(hint()).toHaveTextContent(locale === "fr" ? "Entrée ou Espace" : "Enter or Space");
  act(() => control.blur());
  expect(hint()).toHaveTextContent(locale === "fr" ? "Survolez pour mettre en pause" : "Hover to pause");
});

test("hints follow keyboard, mouse and touch without waiting for the crossfade", () => {
  const { container } = render(<ProductWorkflowDemo module="pos" />);
  const preview = container.querySelector(".product-workflow")!;
  const viewport = container.querySelector(".workflow-viewport")!;
  const hint = () => container.querySelector('.workflow-indicator-hints [data-active="true"]');
  enter();
  const control = screen.getByRole("button", { name: "Pause" });
  act(() => control.focus());
  expect(hint()).toHaveTextContent("Enter or Space to pause");
  pointer(preview, "pointerover");
  expect(hint()).toHaveTextContent("Paused · move away to resume");
  expect(preview).toHaveAttribute("data-playing", "false");
  touch(viewport, "pointerdown");
  touch(viewport, "pointerup");
  expect(hint()).toHaveTextContent("Tap the preview to resume");
  touch(viewport, "pointerdown");
  touch(viewport, "pointerup");
  expect(hint()).toHaveTextContent("Tap the preview to pause");
  expect(preview).toHaveAttribute("data-playing", "true");
  fireEvent.keyDown(control, { key: " " });
  expect(hint()).toHaveTextContent("Enter or Space to resume");
  expect(preview).toHaveAttribute("data-playing", "false");
  fireEvent.keyDown(control, { key: "Enter" });
  expect(preview).toHaveAttribute("data-playing", "true");
  const move = new MouseEvent("pointermove", { bubbles: true });
  Object.defineProperties(move, { pointerType: { value: "mouse" }, movementX: { value: 2 } });
  fireEvent(preview, move);
  expect(hint()).toHaveTextContent("Paused · move away to resume");
  expect(preview).toHaveAttribute("data-playing", "false");
});

test("a manual pause survives hover entry and exit", () => {
  const { container } = render(<ProductWorkflowDemo module="inventory" />);
  const preview = container.querySelector(".product-workflow")!;
  enter();
  advance();
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  pointer(preview, "pointerover");
  pointer(preview, "pointerout", "mouse", document.body);
  advance();
  expect(preview).toHaveAttribute("data-playing", "false");
  expect(preview).toHaveAttribute("data-time", "6000");
});

test("the Pause control can lock a hover pause and Play waits until the pointer leaves", () => {
  const { container } = render(<ProductWorkflowDemo module="finance" />);
  const preview = container.querySelector(".product-workflow")!;
  enter();
  pointer(preview, "pointerover");
  fireEvent.focus(screen.getByRole("button", { name: "Pause" }));
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  pointer(preview, "pointerout", "mouse", document.body);
  expect(preview).toHaveAttribute("data-playing", "false");
  pointer(preview, "pointerover");
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  advance();
  expect(preview).toHaveAttribute("data-time", "0");
  expect(preview).toHaveAttribute("data-playing", "false");
  pointer(preview, "pointerout", "mouse", document.body);
  advance();
  expect(preview).toHaveAttribute("data-time", "6000");
});

test("touch entry does not pause playback and hover cannot override reduced motion", () => {
  const { container, rerender } = render(<ProductWorkflowDemo module="pos" />);
  const preview = container.querySelector(".product-workflow")!;
  enter();
  pointer(preview, "pointerover", "touch");
  advance();
  expect(preview).toHaveAttribute("data-time", "6000");
  expect(preview).toHaveAttribute("data-hovered", "false");
  mockMotionOff = true;
  rerender(<ProductWorkflowDemo module="pos" />);
  const position = preview.getAttribute("data-time");
  pointer(preview, "pointerover");
  pointer(preview, "pointerout", "mouse", document.body);
  advance();
  expect(preview).toHaveAttribute("data-time", position);
  expect(preview).toHaveAttribute("data-playing", "false");
  expect(jest.getTimerCount()).toBe(0);
});
