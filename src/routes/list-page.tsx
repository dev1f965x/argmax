import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { useLists } from "@/components/lists-provider";
import { StorageBanner } from "@/components/storage-banner";
import { NotFoundPage } from "@/routes/not-found-page";

export function ListPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { state } = useLists();
  const list = state.lists.find((candidate) => candidate.id === id);
  if (!list) return <NotFoundPage />;

  return (
    <>
      <StorageBanner />
      <Link
        to="/"
        className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        {t("list.allLists")}
      </Link>
      <h1 className="text-title font-bold wrap-anywhere">{list.name}</h1>
    </>
  );
}
