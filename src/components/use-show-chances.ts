import { useState } from "react";
import {
  localStorageIfAllowed,
  readShowChances,
  storeShowChances,
} from "@/lib/preferences";

/**
 * Whether lists show each item's chance (FR14): off by default and
 * remembered in this browser like the language. When storage fails, the
 * switch still works for this visit.
 */
export function useShowChances(): [boolean, (show: boolean) => void] {
  const [show, setShow] = useState(() =>
    readShowChances(localStorageIfAllowed()),
  );
  function change(next: boolean) {
    setShow(next);
    if (!storeShowChances(localStorageIfAllowed(), next)) {
      console.warn(
        "The chance setting could not be saved; it applies to this visit only.",
      );
    }
  }
  return [show, change];
}
