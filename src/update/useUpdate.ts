import { useCallback, useEffect, useRef, useState } from "react";
import type { AvailableUpdate, UpdateSource } from "./ports";

export type UpdateState =
  | { status: "current" }
  | { status: "available"; version: string }
  | { status: "installing"; version: string; progress: number | null }
  | { status: "failed"; version: string };

/** Same cadence as the schedule: a window left open for days still hears about releases. */
export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Looks for a newer release on launch and every six hours, and installs it on request.
 *
 * A failed check says nothing: being offline, or no release existing yet, is not
 * something the player needs to hear about. A failed install does, since they asked.
 */
export function useUpdate(source: UpdateSource) {
  const [state, setState] = useState<UpdateState>({ status: "current" });
  const found = useRef<AvailableUpdate | null>(null);

  useEffect(() => {
    let cancelled = false;

    const look = async () => {
      const update = await source.check().catch(() => null);
      if (cancelled || !update) return;

      found.current = update;
      setState((previous) =>
        previous.status === "installing"
          ? previous
          : { status: "available", version: update.version },
      );
    };

    void look();
    const timer = setInterval(look, UPDATE_CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [source]);

  const install = useCallback(async () => {
    const update = found.current;
    if (!update) return;

    setState({ status: "installing", version: update.version, progress: null });
    try {
      await update.install((progress) =>
        setState({ status: "installing", version: update.version, progress }),
      );
    } catch {
      setState({ status: "failed", version: update.version });
    }
  }, []);

  return { update: state, install };
}
