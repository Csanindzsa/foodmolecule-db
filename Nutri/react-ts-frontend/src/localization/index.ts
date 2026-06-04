import { ar } from "./locales/ar";
import { de } from "./locales/de";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { hi } from "./locales/hi";
import { hu } from "./locales/hu";
import { id } from "./locales/id";
import { it } from "./locales/it";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";
import { nl } from "./locales/nl";
import { pl } from "./locales/pl";
import { pt } from "./locales/pt";
import { ru } from "./locales/ru";
import { tr } from "./locales/tr";
import { zhCN } from "./locales/zh-CN";
import { LocaleCode, LocaleMessages } from "./types";

export const defaultLocale: LocaleCode = "en";

export const locales = {
  en,
  de,
  hu,
  es,
  pt,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  ru,
  hi,
  ar,
  id,
  it,
  nl,
  pl,
  tr,
} satisfies Record<LocaleCode, LocaleMessages>;

export const supportedLocales = Object.values(locales).map(
  ({ code, nativeName, englishName, direction }) => ({
    code,
    nativeName,
    englishName,
    direction,
  }),
);

export const isLocaleCode = (code: string | null | undefined): code is LocaleCode =>
  Boolean(code && code in locales);

export const getLocale = (code: string | null | undefined): LocaleMessages =>
  isLocaleCode(code) ? locales[code] : locales[defaultLocale];

export const resolveLocaleCode = (
  codes: readonly string[] | string | null | undefined,
): LocaleCode => {
  const candidates = Array.isArray(codes) ? codes : codes ? [codes] : [];

  for (const candidate of candidates) {
    if (isLocaleCode(candidate)) {
      return candidate;
    }

    const baseLanguage = candidate.split("-")[0];
    if (baseLanguage === "zh") {
      return "zh-CN";
    }

    if (isLocaleCode(baseLanguage)) {
      return baseLanguage;
    }
  }

  return defaultLocale;
};

export type { LocaleCode, LocaleMessages, TextDirection } from "./types";
