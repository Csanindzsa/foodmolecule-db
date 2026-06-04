import { createContext } from "react";
import { LocaleCode, LocaleMessages } from "./types";

export type LocaleContextValue = {
  localeCode: LocaleCode;
  locale: LocaleMessages;
  setLocaleCode: (code: LocaleCode) => void;
};

export const LocaleContext = createContext<LocaleContextValue | undefined>(
  undefined,
);
