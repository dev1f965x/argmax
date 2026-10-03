import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { ko } from "./ko";
import { detectLocale, type Locale, locales, storeLocale } from "./locale";

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    // Accessing localStorage throws when the browser blocks site data.
    return undefined;
  }
}

const initialLocale = detectLocale(browserStorage(), navigator.languages);

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
});

await i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ko: { translation: ko } },
  lng: initialLocale,
  fallbackLng: "en",
  supportedLngs: locales,
  initAsync: false,
  interpolation: { escapeValue: false },
});

/** Switches the UI language and remembers the choice in this browser. */
export async function chooseLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  if (!storeLocale(browserStorage(), locale)) {
    console.warn(
      "The language choice could not be saved; it applies to this visit only.",
    );
  }
}

export { i18n };
