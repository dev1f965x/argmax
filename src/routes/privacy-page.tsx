import { useTranslation } from "react-i18next";
import { PageHeading } from "@/components/page-heading";
import { useScreenView } from "@/components/use-screen-view";
import { issuesUrl } from "@/lib/links";

export function PrivacyPage() {
  const { t } = useTranslation();
  useScreenView("privacy");

  return (
    <article className="flex max-w-160 flex-col gap-4">
      <PageHeading
        title={t("privacy.title")}
        className="text-title font-bold"
      />
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
