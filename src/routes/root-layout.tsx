import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Link,
  Outlet,
  ScrollRestoration,
  useLocation,
  useMatch,
} from "react-router";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLists } from "@/components/lists-provider";
import { SiteFooter } from "@/components/site-footer";
import { StorageBanner } from "@/components/storage-banner";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

export function RootLayout() {
  const { t } = useTranslation();
  const { key } = useLocation();
  const screenRef = useRef<HTMLDivElement>(null);
  // The key of the location focus was last handled for. Comparing with the
  // previous key, not the first, also handles Back to the first entry, which
  // keeps that entry's key.
  const handledKey = useRef(key);
  const listMatch = useMatch("/lists/:id");
  const { state } = useLists();
  // A list's screen on a phone is an app screen with a fixed pick bar; site
  // links between the items and the bar read as part of the list, so they are
  // left to the Lists screen there.
  const pickBarScreen =
    listMatch !== null &&
    state.lists.some((list) => list.id === listMatch.params.id);

  // After client-side navigation focus moves to the new screen's heading:
  // otherwise it falls to the page body (the clicked link is gone) or stays on
  // a header, footer, or storage banner control. A screen that moved focus
  // inside itself on purpose keeps it (child effects run first), and the first
  // page load leaves focus where the browser put it.
  // Firefox does not apply scroll-padding when Tab moves focus, so a control
  // could stay behind a fixed bottom bar; scroll it out from under. The line
  // is the page's scroll-padding, which already covers every bar.
  useEffect(() => {
    function reveal(event: FocusEvent) {
      const target = event.target;
      if (!(target instanceof Element) || target.closest("[data-bottom-bar]"))
        return;
      // Only keyboard focus; a tap or click must not scroll the page.
      if (!target.matches(":focus-visible")) return;
      const covered =
        Number.parseFloat(
          getComputedStyle(document.documentElement).scrollPaddingBottom,
        ) || 0;
      const overlap =
        target.getBoundingClientRect().bottom - (window.innerHeight - covered);
      if (overlap > 0) window.scrollBy({ top: overlap });
    }
    document.addEventListener("focusin", reveal);
    return () => document.removeEventListener("focusin", reveal);
  }, []);

  useEffect(() => {
    if (key === handledKey.current) return;
    handledKey.current = key;
    const screen = screenRef.current;
    if (!screen || screen.contains(document.activeElement)) return;
    // ScrollRestoration owns the scroll position (top, or restored on Back).
    screen.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }, [key]);

  return (
    // On phones the List screen's pick bar is fixed to the bottom; the layout
    // reserves its height so the last items stay reachable. On desktop a list
    // screen keeps room below the footer for the Undo snackbar.
    <div
      className={cn(
        "flex min-h-svh flex-col pb-(--pick-bar-height)",
        pickBarScreen ? "md:pb-24" : "md:pb-0",
      )}
    >
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-240 items-center justify-between px-4">
          <Link
            to="/"
            aria-label={t("app.home")}
            // A flex link drops the inline baseline gap, so the mark centers, and gives a 44 px target.
            className="flex min-h-11 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Wordmark />
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto w-full max-w-240 flex-1 px-4 py-6 md:py-8">
        <StorageBanner />
        <div ref={screenRef}>
          <Outlet />
        </div>
      </main>
      <SiteFooter className={pickBarScreen ? "hidden md:block" : undefined} />
      {/* New screens start at the top; Back and Forward restore the position. */}
      <ScrollRestoration />
    </div>
  );
}
