import { useTranslation } from "react-i18next";
import { BackToLists } from "@/components/back-to-lists";
import { PageHeading } from "@/components/page-heading";
import { useScreenView } from "@/components/use-screen-view";
import {
  contactEmail,
  issuesUrl,
  umamiPrivacyUrl,
  umamiTermsUrl,
} from "@/lib/links";

const linkClass = "text-primary underline underline-offset-4";

export function PrivacyPage() {
  const { t } = useTranslation();
  useScreenView("privacy");

  return (
    <article className="flex max-w-160 flex-col gap-4">
      {/* In this flex column the link would stretch to full width, and the
          column gap already spaces it from the title. */}
      <BackToLists className="mb-0 self-start" />
      <PageHeading
        title={t("privacy.title")}
        className="text-title font-bold"
      />
      <p>{t("privacy.noAccounts")}</p>
      <p>{t("privacy.localOnly")}</p>
      <p>{t("privacy.analyticsIntro")}</p>
      <ul className="-mt-2 list-disc space-y-1 pl-6">
        <li>{t("privacy.analyticsScreen")}</li>
        <li>{t("privacy.analyticsEvent")}</li>
        <li>{t("privacy.analyticsDevice")}</li>
        <li>{t("privacy.analyticsReferrer")}</li>
      </ul>
      <p>{t("privacy.analyticsNever")}</p>
      <p>{t("privacy.analyticsUmami")}</p>
      <p>{t("privacy.analyticsOptOut")}</p>
      <p className="flex flex-wrap gap-x-4">
        <a href={umamiPrivacyUrl} className={linkClass}>
          {t("privacy.umamiPolicy")}
        </a>
        <a href={umamiTermsUrl} className={linkClass}>
          {t("privacy.umamiTerms")}
        </a>
      </p>
      <p>{t("privacy.hosting")}</p>
      <p>
        <a href={issuesUrl} className={linkClass}>
          {t("privacy.questions")}
        </a>
      </p>
      <p>
        <a href={`mailto:${contactEmail}`} className={linkClass}>
          {t("privacy.privacyContact", { email: contactEmail })}
        </a>
      </p>
      <p className="text-sm text-muted-foreground">{t("privacy.updated")}</p>
    </article>
  );
}
