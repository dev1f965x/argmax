import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { type Screen, tracker } from "@/lib/analytics";

/**
 * Reports a view of the screen once per address it is shown at; null reports
 * nothing. Keyed by path, so a replace navigation that only clears history
 * state (after deleting a list) and StrictMode's second effect run are not
 * counted again.
 */
export function useScreenView(screen: Screen | null) {
  const { pathname } = useLocation();
  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (!screen || reported.current === pathname) return;
    reported.current = pathname;
    tracker.screenView(screen);
  }, [screen, pathname]);
}
