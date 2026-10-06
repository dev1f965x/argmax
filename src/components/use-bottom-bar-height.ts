import { type RefObject, useEffect } from "react";

/**
 * Publishes the height of a screen's bottom bar (the pick bar, or Add this
 * list on a shared list) as --pick-bar-height. The bar is fixed on phones, so
 * the layout reserves that height at the bottom (see RootLayout); it changes
 * with long results, messages, and translations.
 */
export function useBottomBarHeight(bar: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = bar.current;
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
  }, [bar]);
}
