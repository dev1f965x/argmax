import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, ScrollRestoration, useLocation } from "react-router";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteFooter } from "@/components/site-footer";
import { StorageBanner } from "@/components/storage-banner";
import { Wordmark } from "@/components/wordmark";

export function RootLayout() {
  const { t } = useTranslation();
  const { key } = useLocation();
  const screenRef = useRef<HTMLDivElement>(null);
  // The key of the location focus was last handled for. Comparing with the
  // previous key, not the first, also handles Back to the first entry, which
  // keeps that entry's key.
  const handledKey = useRef(key);

  // After client-side navigation focus moves to the new screen's heading:
  // otherwise it falls to the page body (the clicked link is gone) or stays on
  // a header, footer, or storage banner control. A screen that moved focus
  // inside itself on purpose keeps it (child effects run first), and the first
  // page load leaves focus where the browser put it.
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
    // reserves its height so the footer and the last items stay reachable.
    <div className="flex min-h-svh flex-col pb-(--pick-bar-height) md:pb-0">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-240 items-center justify-between px-4">
          <Link to="/" aria-label={t("app.home")}>
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
      <SiteFooter />
      {/* New screens start at the top; Back and Forward restore the position. */}
      <ScrollRestoration />
    </div>
  );
}
