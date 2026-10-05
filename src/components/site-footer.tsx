import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { newIssueUrl, repositoryUrl } from "@/lib/links";
import { cn } from "@/lib/utils";

const linkClass =
  "inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline";

export function SiteFooter({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <footer className={cn("border-t", className)}>
      {/* The narrower gap on phones keeps the four links on one row at 360 px
          in English (281 px of text in 328 px). */}
      <nav className="mx-auto flex max-w-240 flex-wrap gap-x-3 px-4 py-3 text-sm text-muted-foreground md:gap-x-5">
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
        <a href={newIssueUrl} className={linkClass}>
          {t("footer.feedback")}
        </a>
      </nav>
    </footer>
  );
}
