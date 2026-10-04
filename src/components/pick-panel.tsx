import { useEffect, useId, useRef, useState } from "react";
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
export function PickPanel({
  items,
  announce,
  earlierVisit,
}: {
  items: Item[];
  announce: (message: string) => void;
  /** The list was created before this visit; reported with each pick (H2). */
  earlierVisit: boolean;
}) {
  const { t } = useTranslation();
  const [resultId, setResultId] = useState<string | null>(null);
  const [cycling, setCycling] = useState<string | null>(null);
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

  // Firefox does not apply scroll-padding when Tab moves focus, so a control
  // could stay behind the fixed bar; scroll it out from under the bar.
  useEffect(() => {
    function reveal(event: FocusEvent) {
      const bar = panel.current;
      const target = event.target;
      if (!bar || !(target instanceof Element) || bar.contains(target)) return;
      if (getComputedStyle(bar).position !== "fixed") return;
      const overlap =
        target.getBoundingClientRect().bottom - bar.getBoundingClientRect().top;
      if (overlap > 0) window.scrollBy({ top: overlap });
    }
    document.addEventListener("focusin", reveal);
    return () => document.removeEventListener("focusin", reveal);
  }, []);

  // The result follows edits to the picked item and disappears if it is removed.
  const result = items.find((item) => item.id === resultId) ?? null;
  const empty = items.length === 0;
  const shown = cycling ?? result?.text ?? null;

  function pick() {
    if (empty || rolling.current) return;
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
      aria-label={t("pick.region")}
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-background px-4 pt-3 pb-4 md:sticky md:top-6 md:col-start-2 md:row-span-2 md:row-start-1 md:w-80 md:border-0 md:bg-transparent md:p-0"
    >
      {/* With no items, the reason under the button is the only hint. */}
      {shown === null ? (
        !empty && (
          <div className="mb-3 hidden min-h-32 flex-col justify-center rounded-xl bg-surface p-5 text-center text-sm text-muted-foreground md:flex">
            {t("pick.hint")}
          </div>
        )
      ) : (
        <div
          // Hidden from screen readers while names cycle; the settled result is announced.
          aria-hidden={cycling !== null}
          // A long result can scroll in the phone bar, so the settled result
          // takes focus for keyboard scrolling and for reading it again; its
          // text ("Picked" and the item) is what a screen reader reads.
          tabIndex={cycling === null ? 0 : undefined}
          className="mb-2.5 max-h-pick-result overflow-y-auto rounded-xl bg-brand-soft px-3.5 py-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:mb-3 md:flex md:max-h-none md:min-h-32 md:flex-col md:justify-center md:overflow-visible md:p-5"
        >
          <p
            className={cn(
              "text-sm font-semibold text-brand-strong",
              cycling !== null && "invisible",
            )}
          >
            {t("pick.label")}
          </p>
          <p
            className={cn(
              "text-result font-bold wrap-anywhere transition-colors duration-150 ease-out-expo md:text-result-lg",
              // One line while cycling, so the panel and button do not jump;
              // the settled result is never truncated.
              cycling !== null && "line-clamp-1 text-muted-foreground",
            )}
          >
            {shown}
          </p>
        </div>
      )}
      {/* aria-disabled rather than disabled: the button keeps focus when the
          list empties under it, and its reason is read when it is focused. */}
      <Button
        onClick={pick}
        aria-disabled={empty}
        aria-describedby={empty ? reasonId : undefined}
        className="h-13.5 w-full rounded-xl bg-clip-border text-lg aria-disabled:cursor-not-allowed aria-disabled:bg-surface-2 aria-disabled:text-subtle-foreground aria-disabled:hover:bg-surface-2"
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
    </section>
  );
}
