import { useTranslation } from "react-i18next";
import { issuesUrl } from "@/lib/links";

export function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <article className="flex max-w-160 flex-col gap-4">
      <h1 className="text-title font-bold">{t("privacy.title")}</h1>
      <p>{t("privacy.noPersonalData")}</p>
      <p>{t("privacy.localOnly")}</p>
      <p>{t("privacy.noTracking")}</p>
      <p>{t("privacy.hosting")}</p>
      <p>
        <a
          href={issuesUrl}
          className="text-primary underline underline-offset-4"
        >
          {t("privacy.questions")}
        </a>
      </p>
    </article>
  );
}
