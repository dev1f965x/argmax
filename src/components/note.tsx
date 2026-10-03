import { Info } from "lucide-react";
import type { Ref } from "react";

/**
 * An informational line with an icon; `strong` marks a limit the user has
 * reached. With a ref it can take focus, for when it replaces the focused field.
 */
export function Note({
  children,
  strong = false,
  ref,
}: {
  children: string;
  strong?: boolean;
  ref?: Ref<HTMLParagraphElement>;
}) {
  return (
    <p
      ref={ref}
      tabIndex={ref ? -1 : undefined}
      className={
        strong
          ? "mt-2 flex gap-1.5 text-sm font-semibold outline-none"
          : "mt-2 flex gap-1.5 text-sm text-muted-foreground"
      }
    >
      <Info aria-hidden="true" className="mt-1 size-4 shrink-0" />
      {children}
    </p>
  );
}
