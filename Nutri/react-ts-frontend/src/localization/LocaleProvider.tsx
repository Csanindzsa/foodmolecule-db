import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultLocale,
  getLocale,
  isLocaleCode,
  resolveLocaleCode,
} from ".";
import { LocaleContext } from "./LocaleContext";
import { LocaleCode } from "./types";

const STORAGE_KEY = "nutrii.locale";

const getInitialLocale = (): LocaleCode => {
  if (typeof window === "undefined") {
    return defaultLocale;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLocaleCode(stored)) {
    return stored;
  }

  return resolveLocaleCode(window.navigator.languages ?? [window.navigator.language]);
};

export const LocaleProvider = ({ children }: { children: React.ReactNode }) => {
  const [localeCode, setLocaleCodeState] = useState<LocaleCode>(getInitialLocale);
  const locale = getLocale(localeCode);

  useEffect(() => {
    document.documentElement.lang = locale.code;
    document.documentElement.dir = locale.direction;
    window.localStorage.setItem(STORAGE_KEY, locale.code);
  }, [locale]);

  const setLocaleCode = (code: LocaleCode) => {
    setLocaleCodeState(code);
  };

  const value = useMemo(
    () => ({
      localeCode,
      locale,
      setLocaleCode,
    }),
    [locale, localeCode],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};
