import { loadLocale, i18nObject } from '@rezics/dispatch-i18n'
import type { TranslationFunctions } from '@rezics/dispatch-i18n'

loadLocale('en')

let LL: TranslationFunctions = i18nObject('en')

export function useLL(): TranslationFunctions {
  return LL
}

export function setLocale(locale: 'en') {
  loadLocale(locale)
  LL = i18nObject(locale)
}
