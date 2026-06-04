import { en } from "./locales/en";
import { LocaleMessages, LocaleOverride } from "./types";

const mergeSection = <T extends Record<string, unknown>>(
  base: T,
  override: Partial<T> | undefined,
): T => ({
  ...base,
  ...(override ?? {}),
});

export const createLocale = (override: LocaleOverride): LocaleMessages => ({
  ...en,
  ...override,
  common: mergeSection(en.common, override.common),
  nav: mergeSection(en.nav, override.nav),
  foodExplorer: mergeSection(en.foodExplorer, override.foodExplorer),
  ingredientExplorer: mergeSection(en.ingredientExplorer, override.ingredientExplorer),
  sort: mergeSection(en.sort, override.sort),
  hazard: {
    ...en.hazard,
    ...(override.hazard ?? {}),
    levels: {
      ...en.hazard.levels,
      ...(override.hazard?.levels ?? {}),
    },
  },
  dietary: mergeSection(en.dietary, override.dietary),
  detail: mergeSection(en.detail, override.detail),
  auth: mergeSection(en.auth, override.auth),
  states: mergeSection(en.states, override.states),
});
