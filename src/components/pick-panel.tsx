import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { tracker } from "@/lib/analytics";
import { pickIndex } from "@/lib/pick";
import type { Item } from "@/lib/storage";
import { cn } from "@/lib/utils";

/**
 * Gaps between the names shown before the result settles, growing like an
 * ease-out so the cycle slows into the result (about 600 ms in total). A
 * literal expo curve would need steps shorter than a frame and a long stall
 * at the end, so the curve is approximated in ten steps.
 */
const cycleGaps = [30, 35, 40, 45, 50, 60, 70, 80, 90, 100];

/**
 * The Pick action and its result: a sticky panel beside the list on desktop,
 * a bar fixed to the bottom of the screen on phones. The result is announced
 * through `announce` once it settles.
 */
// Desktop text sizes for the result, largest first.
const desktopResultSizes = [
  "md:text-result-lg",
  "md:text-result",
  "md:text-lg",
  "md:text-base",
] as const;

export function PickPanel({
  items,
  announce,
  onPick,
  earlierVisit,
}: {
  items: Item[];
  announce: (message: string) => void;
  onPick: () => void;
  /** The list was created before this visit; reported with each pick (H2). */
  earlierVisit: boolean;
}) {
  const { t } = useTranslation();
  const [resultId, setResultId] = useState<string | null>(null);
  const [cycling, setCycling] = useState<string | null>(null);
  // Index into desktopResultSizes for the settled result, kept per text.
  const [fit, setFit] = useState({ text: "", step: 0 });
  const resultBox = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  // Set synchronously, so a second press before the first name shows is ignored.
  const rolling = useRef(false);
  // The settle runs after the cycle; items may have changed meanwhile (an
  // edit, or another tab), so it reads the latest ones.
  const latestItems = useRef(items);
  latestItems.current = items;
  const reasonId = useId();
  const panel = useRef<HTMLElement>(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // The bar is fixed on phones, so the page reserves its height at the bottom
  // (see RootLayout); the height changes with long results and translations.
  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        root.style.setProperty(
          "--pick-bar-height",
          `${entry.borderBoxSize[0]?.blockSize ?? 0}px`,
        );
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--pick-bar-height");
    };
  }, []);

  // The result follows edits to the picked item and disappears if it is removed.
  const result = items.find((item) => item.id === resultId) ?? null;
  const empty = items.length === 0;
  const shown = cycling ?? result?.text ?? null;
  const step = result && fit.text === result.text ? fit.step : 0;

  // The desktop box has a fixed height so Pick below never moves; a long
  // settled result steps down in size until it fits, and scrolls only past
  // the smallest size. Measured before paint, so no size flashes.
  // It reads fit itself, not step, so a reset after a resize measures again
  // even when step was already 0.
  useLayoutEffect(() => {
    const box = resultBox.current;
    if (!box || cycling !== null || !result) return;
    const current = fit.text === result.text ? fit.step : 0;
    if (
      box.scrollHeight > box.clientHeight &&
      current < desktopResultSizes.length - 1
    )
      setFit({ text: result.text, step: current + 1 });
  }, [cycling, result, fit]);

  // A new box width (a resized window, or crossing into the desktop layout)
  // changes what fits, so the result is fitted again from the largest size.
  // Only the width counts: on phones the box height follows the text.
  const hasResult = shown !== null;
  useEffect(() => {
    const box = resultBox.current;
    if (!hasResult || !box) return;
    let width = box.clientWidth;
    const observer = new ResizeObserver(() => {
      if (box.clientWidth === width) return;
      width = box.clientWidth;
      setFit({ text: "", step: 0 });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [hasResult]);

  function pick() {
    if (empty || rolling.current) return;
    onPick();
    const pickedId = items[pickIndex(items.length)]?.id;
    if (pickedId === undefined) return;

    const settle = () => {
      rolling.current = false;
      setCycling(null);
      const picked = latestItems.current.find((item) => item.id === pickedId);
      // Removed during the cycle: there is no result to show or announce.
      if (!picked) return;
      setResultId(picked.id);
      announce(t("pick.announced", { text: picked.text }));
      tracker.pick(earlierVisit);
    };
    if (
      items.length === 1 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      settle();
      return;
    }

    rolling.current = true;
    let elapsed = 0;
    let previous: string | null = null;
    timers.current = cycleGaps.map((gap) => {
      elapsed += gap;
      return window.setTimeout(() => {
        // Display only; the fair pick above already decided the result. A
        // name differs from the one before, so every step visibly changes.
        const others = latestItems.current.filter(
          (item) => item.text !== previous,
        );
        const next = others[pickIndex(Math.max(others.length, 1))];
        previous = next?.text ?? previous;
        setCycling(previous);
      }, elapsed - gap);
    });
    timers.current.push(window.setTimeout(settle, elapsed));
  }

  return (
    <section
      ref={panel}
      data-bottom-bar
      aria-label={t("pick.region")}
      className="fixed inset-x-0 bottom-0 z-10 flex flex-col border-t bg-background px-4 pt-3 pb-4 short:max-md:py-2 md:sticky md:top-6 md:col-start-2 md:row-span-2 md:row-start-1 md:w-80 md:border-0 md:bg-transparent md:p-0"
    >
      {/* The result comes first, above Pick, on every width. */}
      {shown === null ? (
        // Desktop shows where the result will appear before the first pick, so
        // Pick sits in the same place before and after. The phone bar stays
        // small until there is a result.
        <div
          aria-hidden="true"
          className="mb-3 hidden h-40 flex-col justify-center rounded-xl bg-surface p-5 md:flex"
        >
          <p className="text-sm font-semibold text-muted-foreground">
            {t("pick.label")}
          </p>
          <p className="text-result-lg font-bold text-muted-foreground">
            {t("pick.placeholder")}
          </p>
        </div>
      ) : (
        <div
          // Hidden from screen readers while names cycle; the settled result is announced.
          aria-hidden={cycling !== null}
          // A long result scrolls inside the box (the phone bar caps its
          // height; on desktop the box has a fixed height, so Pick below never
          // moves), so the settled result takes focus for keyboard scrolling
          // and for reading it again; its text ("Picked" and the item) is what
          // a screen reader reads.
          ref={resultBox}
          tabIndex={cycling === null ? 0 : undefined}
          className="mb-2.5 max-h-pick-result overflow-y-auto rounded-xl bg-brand-soft px-3.5 py-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 short:max-md:flex short:max-md:items-baseline short:max-md:gap-2 short:max-md:py-1.5 md:mb-3 md:flex md:h-40 md:max-h-none md:flex-col md:justify-center-safe md:p-5"
        >
          <p
            // Stays visible while names cycle, so the box does not flicker
            // from the empty state's label to nothing and back.
            className="shrink-0 text-sm font-semibold text-brand-strong"
          >
            {t("pick.label")}
          </p>
          <p
            className={cn(
              "text-result font-bold wrap-anywhere transition-colors duration-150 ease-out-expo short:max-md:text-lg",
              cycling === null
                ? desktopResultSizes[step]
                : desktopResultSizes[0],
              // One line while cycling, so the panel and button do not jump;
              // the settled result is never truncated.
              cycling !== null && "line-clamp-1 text-muted-foreground",
            )}
          >
            {shown}
          </p>
        </div>
      )}
      <div>
        {/* aria-disabled rather than disabled: the button keeps focus when the
            list empties under it, and its reason is read when it is focused. */}
        <Button
          onClick={pick}
          aria-disabled={empty}
          aria-describedby={empty ? reasonId : undefined}
          className="h-13.5 w-full rounded-xl bg-clip-border text-lg short:max-md:h-11 aria-disabled:cursor-not-allowed aria-disabled:bg-surface-2 aria-disabled:text-subtle-foreground aria-disabled:hover:bg-surface-2"
        >
          {result ? t("pick.again") : t("pick.pick")}
        </Button>
        {empty && (
          <p
            id={reasonId}
            className="mt-2 text-center text-sm text-muted-foreground"
          >
            {t("pick.needItem")}
          </p>
        )}
      </div>
    </section>
  );
}
