import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function BackToLists() {
  const { t } = useTranslation();
  return (
    <Link
      to="/"
      className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
      {t("list.allLists")}
    </Link>
  );
}
