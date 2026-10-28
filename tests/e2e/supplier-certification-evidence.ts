import { expect, type Page } from "@playwright/test";
import axe from "axe-core";
import { mkdir } from "node:fs/promises";
import { join, relative } from "node:path";

export type SupplierEvidenceState =
  | "success"
  | "loading"
  | "empty"
  | "error"
  | "degraded"
  | "denied"
  | "locked";

export type SupplierCertificationEvidence = {
  state: SupplierEvidenceState;
  surface: "list" | "create" | "profile" | "edit" | "history";
  locale: "en" | "fr";
  viewport: "desktop" | "tablet" | "mobile";
  path: string;
  finalUrl: string;
  evidenceMethod: string;
  screenshot: string;
  seriousViolationCount: number;
  seriousViolations: Array<{
    id: string;
    impact: string | null;
    help: string;
    nodeCount: number;
  }>;
  layout: {
    viewportWidth: number;
    documentWidth: number;
    bodyWidth: number;
    hasDocumentOverflow: boolean;
    clippedActions: string[];
    overlappingActions: string[];
  };
};

export async function captureSupplierEvidence(input: {
  page: Page;
  evidenceDir: string;
  screenshotName: string;
  state: SupplierEvidenceState;
  surface: SupplierCertificationEvidence["surface"];
  evidenceMethod: string;
  locale?: "en" | "fr";
  viewport?: "desktop" | "tablet" | "mobile";
}) {
  const locale = input.locale ?? "en";
  const viewport = input.viewport ?? "desktop";
  await mkdir(input.evidenceDir, { recursive: true });
  const screenshotPath = join(input.evidenceDir, input.screenshotName + ".png");

  await input.page.addScriptTag({ content: axe.source });
  const seriousViolations = await input.page.evaluate(async () => {
    const browserAxe = (
      window as unknown as {
        axe: {
          run: (
            context: Document,
            options: Record<string, unknown>,
          ) => Promise<{
            violations: Array<{
              id: string;
              impact?: string | null;
              help: string;
              nodes: unknown[];
            }>;
          }>;
        };
      }
    ).axe;
    const results = await browserAxe.run(document, {
      resultTypes: ["violations"],
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    });
    return results.violations
      .filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      )
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact ?? null,
        help: violation.help,
        nodeCount: violation.nodes.length,
      }));
  });

  const layout = await input.page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const documentWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body?.scrollWidth ?? documentWidth;
    const selector =
      "a, button, input, textarea, select, [role='button'], [role='tab'], [role='menuitem']";
    const labelFor = (element: HTMLElement) =>
      (
        element.innerText ||
        element.getAttribute("aria-label") ||
        element.getAttribute("name") ||
        element.id ||
        "unnamed"
      )
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 100);
    const isVisible = (element: HTMLElement) => {
      let current: HTMLElement | null = element;
      while (current) {
        const style = window.getComputedStyle(current);
        if (
          current.hidden ||
          current.getAttribute("aria-hidden") === "true" ||
          (current !== element &&
            current.getAttribute("data-state") === "closed") ||
          current.inert ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity || "1") === 0
        ) {
          return false;
        }
        current = current.parentElement;
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1;
    };
    const actions = Array.from(
      (
        document.querySelector("main") ?? document
      ).querySelectorAll<HTMLElement>(selector),
    ).filter(isVisible);
    const hasHorizontalScroller = (element: HTMLElement) => {
      let current = element.parentElement;
      while (current) {
        const style = window.getComputedStyle(current);
        if (
          current.scrollWidth > current.clientWidth + 2 &&
          (style.overflowX === "auto" || style.overflowX === "scroll")
        ) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    };
    const clippedActions = actions
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          (rect.left < -2 || rect.right > viewportWidth + 2) &&
          !hasHorizontalScroller(element)
        );
      })
      .map(
        (element) => element.tagName.toLowerCase() + ":" + labelFor(element),
      );

    const overlappingActions: string[] = [];
    for (let first = 0; first < actions.length; first += 1) {
      const firstRect = actions[first].getBoundingClientRect();
      for (let second = first + 1; second < actions.length; second += 1) {
        if (
          actions[first].contains(actions[second]) ||
          actions[second].contains(actions[first])
        ) {
          continue;
        }
        const firstTag = actions[first].tagName.toLowerCase();
        const secondTag = actions[second].tagName.toLowerCase();
        const isInputButtonComposite =
          actions[first].parentElement === actions[second].parentElement &&
          ((firstTag === "input" && secondTag === "button") ||
            (firstTag === "button" && secondTag === "input"));
        if (isInputButtonComposite) continue;
        const secondRect = actions[second].getBoundingClientRect();
        const overlapWidth =
          Math.min(firstRect.right, secondRect.right) -
          Math.max(firstRect.left, secondRect.left);
        const overlapHeight =
          Math.min(firstRect.bottom, secondRect.bottom) -
          Math.max(firstRect.top, secondRect.top);
        if (overlapWidth > 2 && overlapHeight > 2) {
          overlappingActions.push(
            labelFor(actions[first]) + " <> " + labelFor(actions[second]),
          );
        }
      }
    }

    return {
      viewportWidth,
      documentWidth,
      bodyWidth,
      hasDocumentOverflow:
        Math.max(documentWidth, bodyWidth) > viewportWidth + 8,
      clippedActions,
      overlappingActions,
    };
  });

  await input.page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: "disabled",
    caret: "initial",
  });

  const record: SupplierCertificationEvidence = {
    state: input.state,
    surface: input.surface,
    locale,
    viewport,
    path: new URL(input.page.url()).pathname,
    finalUrl: input.page.url(),
    evidenceMethod: input.evidenceMethod,
    screenshot: relative(process.cwd(), screenshotPath).replace(/\\/g, "/"),
    seriousViolationCount: seriousViolations.length,
    seriousViolations,
    layout,
  };

  expect(record.seriousViolations).toEqual([]);
  expect(record.layout.hasDocumentOverflow).toBe(false);
  expect(record.layout.clippedActions).toEqual([]);
  expect(record.layout.overlappingActions).toEqual([]);
  return record;
}
