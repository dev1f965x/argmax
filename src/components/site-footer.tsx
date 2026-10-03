import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { repositoryUrl } from "@/lib/links";

const linkClass =
  "inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline";

export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t">
      <nav className="mx-auto flex max-w-240 flex-wrap gap-x-5 px-4 py-3 text-sm text-muted-foreground">
        <Link to="/privacy" className={linkClass}>
          {t("footer.privacy")}
        </Link>
        {/* Generated at build time by scripts/licenses.mjs, so it is not a client route. */}
        <a href="/third-party-notices.txt" className={linkClass}>
          {t("footer.licenses")}
        </a>
        <a href={repositoryUrl} className={linkClass}>
          {t("footer.source")}
        </a>
      </nav>
    </footer>
  );
}
