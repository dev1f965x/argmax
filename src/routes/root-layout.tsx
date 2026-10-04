import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteFooter } from "@/components/site-footer";
import { StorageBanner } from "@/components/storage-banner";
import { Wordmark } from "@/components/wordmark";

export function RootLayout() {
  const { t } = useTranslation();

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
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
