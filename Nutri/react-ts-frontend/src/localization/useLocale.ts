import { useContext } from "react";
import { LocaleContext } from "./LocaleContext";

export const useLocale = () => {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }

  return context;
};
