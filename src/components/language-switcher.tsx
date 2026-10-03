import { useTranslation } from "react-i18next";
import { chooseLocale } from "@/i18n";
import type { Locale } from "@/i18n/locale";
import { cn } from "@/lib/utils";

// Each name is written in its own language so speakers of either can find it.
const options: { locale: Locale; name: string }[] = [
  { locale: "en", name: "EN" },
  { locale: "ko", name: "한국어" },
];

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <fieldset className="flex rounded-md bg-surface-2 p-0.5 text-sm">
      <legend className="sr-only">{t("language.label")}</legend>
      {options.map(({ locale, name }) => {
        const selected = i18n.resolvedLanguage === locale;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            aria-pressed={selected}
            onClick={() => void chooseLocale(locale)}
            className={cn(
              "h-8 min-w-11 rounded-sm px-2.5 text-muted-foreground transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              selected &&
                "bg-background font-semibold text-foreground shadow-segment",
            )}
          >
            {name}
          </button>
        );
      })}
    </fieldset>
  );
}
