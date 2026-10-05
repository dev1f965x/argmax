import type { Ref } from "react";

/**
 * A limit the user has reached, shown in place of the field it replaces. With a
 * ref it can take focus, for when it replaces the focused field.
 */
export function Note({
  children,
  ref,
}: {
  children: string;
  ref?: Ref<HTMLParagraphElement>;
}) {
  return (
    <p
      ref={ref}
      tabIndex={ref ? -1 : undefined}
      className="mt-2 text-sm font-semibold outline-none"
    >
      {children}
    </p>
  );
}
