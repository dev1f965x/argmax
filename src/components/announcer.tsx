import { useCallback, useState } from "react";

/**
 * A polite live region for results of actions that do not move focus. Each
 * message gets a new element, so the same text announced twice (adding a
 * duplicate item) is read again.
 */
export function useAnnouncer() {
  const [message, setMessage] = useState<{ text: string; id: number } | null>(
    null,
  );
  const announce = useCallback((text: string) => {
    setMessage((current) => ({ text, id: (current?.id ?? 0) + 1 }));
  }, []);
  const region = (
    <p role="status" className="sr-only">
      {message && <span key={message.id}>{message.text}</span>}
    </p>
  );
  return { announce, region };
}
