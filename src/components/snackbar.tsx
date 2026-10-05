import { type ReactNode, useEffect, useRef } from "react";

/**
 * A short message with one action, fixed to the bottom of the viewport: above
 * the pick bar on phones, at the bottom on desktop. It publishes its height as
 * --snackbar-height, so the layout and focus scrolling keep content above it.
 */
export function Snackbar({ children }: { children: ReactNode }) {
  const snackbar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = snackbar.current;
    if (!element) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        root.style.setProperty(
          "--snackbar-height",
          `${entry.borderBoxSize[0]?.blockSize ?? 0}px`,
        );
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--snackbar-height");
    };
  }, []);

  return (
    // The full-width wrapper only positions; it lets clicks through beside the bar.
    <div
      ref={snackbar}
      data-bottom-bar
      className="pointer-events-none fixed inset-x-0 bottom-(--pick-bar-height) z-20 px-4 pb-2 md:bottom-0 md:pb-6"
    >
      <div className="pointer-events-auto mx-auto flex max-w-160 items-center justify-between gap-3 rounded-xl bg-popover py-1 pr-1 pl-3.5 shadow-overlay">
        {children}
      </div>
    </div>
  );
}
