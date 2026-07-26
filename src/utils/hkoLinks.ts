import type { AppLocale } from '../i18n/types'

const HKO_INDEX: Record<AppLocale, string> = {
  'zh-TW': 'https://www.hko.gov.hk/tc/index.html',
  'zh-CN': 'https://www.hko.gov.hk/cis/index.html',
  en: 'https://www.hko.gov.hk/en/index.html',
}

/** Open HKO homepage for the current app language. */
export function openHkoWeather(locale: AppLocale): void {
  const url = HKO_INDEX[locale] ?? HKO_INDEX['zh-TW']
  window.open(url, '_blank', 'noopener,noreferrer')
}
