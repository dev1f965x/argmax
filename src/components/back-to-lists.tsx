import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

export function BackToLists({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/"
      className={cn(
        "mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
      {t("list.allLists")}
    </Link>
  );
}
