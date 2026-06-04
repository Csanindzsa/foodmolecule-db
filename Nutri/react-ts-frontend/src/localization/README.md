# Localization

The English catalog in `locales/en.ts` is the source of truth for message keys.
Other locale files are created with `createLocale`, so incomplete translations
fall back to English instead of breaking the UI.

Use `supportedLocales` for language selector metadata and `getLocale(code)` when
loading a locale from user settings, browser settings, or local storage.

Arabic is marked as RTL. When the UI provider is wired in, set the document
`dir` attribute from the active locale's `direction`.
