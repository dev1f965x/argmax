import { type ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * The screen's main heading. It also names the browser tab after the screen
 * (WCAG 2.4.2), and it can take focus so the layout can move focus to it
 * after client-side navigation (see RootLayout).
 */
export function PageHeading({
  title,
  className,
  children,
}: {
  /** The screen name used in the document title. */
  title: string;
  className?: string;
  children?: ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} – Argmax`;
  }, [title]);

  return (
    <h1 tabIndex={-1} className={cn("outline-none", className)}>
      {children ?? title}
    </h1>
  );
}
