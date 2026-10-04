import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { buttonVariants } from "@/components/ui/button";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-160">
      <h1 className="text-title font-bold">{t("notFound.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("notFound.body")}</p>
      {/* A link styled as a button; the Button component would add role="button". */}
      <Link to="/" className={buttonVariants({ className: "mt-5" })}>
        {t("notFound.backToLists")}
      </Link>
    </div>
  );
}
