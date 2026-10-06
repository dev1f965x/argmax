import { useEffect, useRef } from "react";

/**
 * A link shown after copying it failed, read-only and selected so it can be
 * copied by hand. It takes focus when it appears, which also tells screen
 * reader users where the link is.
 */
export function LinkField({ url, label }: { url: string; label: string }) {
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);
  return (
    <textarea
      ref={field}
      readOnly
      value={url}
      aria-label={label}
      rows={4}
      onFocus={(event) => event.currentTarget.select()}
      // A link has no spaces, so it breaks anywhere rather than overflowing.
      className="block w-full resize-none rounded-lg border border-input bg-popover px-3 py-2.5 text-sm break-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}
