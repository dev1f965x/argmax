import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

export function ListPage() {
  const { t } = useTranslation();
  const { id } = useParams();

  return <h1 className="text-title font-bold">{t("list.title", { id })}</h1>;
}
