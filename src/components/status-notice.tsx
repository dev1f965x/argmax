import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Confirmation for an action that removed the focused control, such as a
 * delete. It takes focus when it appears, so focus does not fall to the page.
 */
export function StatusNotice({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const notice = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    notice.current?.focus();
  }, []);
  return (
    <p
      ref={notice}
      tabIndex={-1}
      role="status"
      className={cn(
        "mb-5 rounded-xl bg-surface px-3.5 py-3 outline-none wrap-anywhere",
        className,
      )}
    >
      {children}
    </p>
  );
}
