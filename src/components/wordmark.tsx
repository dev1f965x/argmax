import { cn } from "@/lib/utils";

/** Three candidates, one raised: the argument that maximizes. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      <circle cx="5" cy="16" r="2.6" className="fill-subtle-foreground" />
      <circle cx="12" cy="7" r="3.6" className="fill-primary" />
      <circle cx="19" cy="16" r="2.6" className="fill-subtle-foreground" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-lg font-bold tracking-tight",
        className,
      )}
    >
      <LogoMark />
      Argmax
    </span>
  );
}
