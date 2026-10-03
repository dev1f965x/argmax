import { useTranslation } from "react-i18next";

export function ListsPage() {
  const { t } = useTranslation();

  return <h1 className="text-title font-bold">{t("lists.title")}</h1>;
}
