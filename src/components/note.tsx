import { Info } from "lucide-react";

/** An informational line with an icon; `strong` marks a limit the user has reached. */
export function Note({
  children,
  strong = false,
}: {
  children: string;
  strong?: boolean;
}) {
  return (
    <p
      className={
        strong
          ? "mt-2 flex gap-1.5 font-semibold"
          : "mt-2 flex gap-1.5 text-sm text-muted-foreground"
      }
    >
      <Info aria-hidden="true" className="mt-1 size-4 shrink-0" />
      {children}
    </p>
  );
}
