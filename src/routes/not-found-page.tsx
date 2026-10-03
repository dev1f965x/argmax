import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { buttonVariants } from "@/components/ui/button";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-title font-bold">{t("notFound.title")}</h1>
      {/* A link styled as a button; the Button component would add role="button". */}
      <Link to="/" className={buttonVariants()}>
        {t("notFound.backToLists")}
      </Link>
    </div>
  );
}
