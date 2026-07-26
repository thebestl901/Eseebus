import type { EtaArrival, EtaDisplayMode, KmbStopEta, ClockFormat } from '../types/kmb'
import type { TranslationKey } from '../i18n/translations'
import type { AppLocale } from '../i18n/types'
import { pickLocalizedText } from '../i18n/types'
import type { RouteSearchItem, TransportOperator } from '../types/transport'

export type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string

export function boundToDirection(bound: 'O' | 'I'): 'outbound' | 'inbound' {
  return bound === 'O' ? 'outbound' : 'inbound'
}

export function extractStopCode(name: string): string | null {
  const match = name.match(/\(([A-Z0-9]+)\)\s*$/)
  return match ? match[1] : null
}

export function normalizeStopName(name: string): string {
  return name.replace(/\s*\([A-Z0-9]+\)\s*$/, '').trim()
}

export function stopNamesMatch(a: string, b: string): boolean {
  const left = normalizeStopName(a)
  const right = normalizeStopName(b)
  return left.length > 0 && left === right
}

export function formatEtaMinutes(eta: string | null): number | null {
  if (!eta) return null
  const etaDate = new Date(eta)
  const now = new Date()
  const diffMs = etaDate.getTime() - now.getTime()
  if (diffMs < 0) return 0
  return Math.round(diffMs / 60000)
}

export function formatEtaClock(
  eta: string,
  clockFormat: ClockFormat = '24h',
  locale: AppLocale = 'zh-TW',
): string {
  const d = new Date(eta)
  if (clockFormat === '24h') {
    const h = d.getHours()
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }

  if (locale === 'en') {
    return d.toLocaleTimeString('en-HK', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const hours = d.getHours()
  const period = hours < 12 ? '上午' : '下午'
  const hour12 = hours % 12 || 12
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${period}${hour12}:${m}`
}

export function isLastBusRemark(rmkTc: string): boolean {
  return rmkTc.includes('末班') || rmkTc.includes('最後班次')
}

export function getRemarkLabel(rmkTc: string, t: TranslateFn): { remarkType: EtaArrival['remarkType']; remarkLabel: string } {
  if (isLastBusRemark(rmkTc)) {
    return { remarkType: 'last', remarkLabel: t('lastBus') }
  }
  return { remarkType: 'scheduled', remarkLabel: t('scheduledBus') }
}

function inferKmbStatusText(e: KmbStopEta, locale: AppLocale, t: TranslateFn): string {
  if (locale === 'en' && e.rmk_en) return e.rmk_en
  if (locale === 'zh-CN' && e.rmk_sc) return e.rmk_sc
  if (e.rmk_tc) return e.rmk_tc
  const en = (e.rmk_en || '').toLowerCase()
  if (en.includes('final bus has departed')) return t('lastDeparted')
  if (en.includes('final bus')) return t('lastBus')
  if (e.eta === null) return t('noService')
  return '--'
}

function mapKmbStopEta(e: KmbStopEta, locale: AppLocale, t: TranslateFn): EtaArrival {
  if (e.eta) {
    const minutes = formatEtaMinutes(e.eta)
    const { remarkType, remarkLabel } = getRemarkLabel(e.rmk_tc, t)
    return {
      minutes: minutes ?? 0,
      eta: e.eta,
      remarkType,
      remarkLabel,
    }
  }
  const statusText = inferKmbStatusText(e, locale, t)
  const { remarkType, remarkLabel } = getRemarkLabel(statusText, t)
  return {
    minutes: 999,
    eta: '',
    remarkType,
    remarkLabel,
    statusText,
  }
}

export function getEtaArrivals(
  etas: KmbStopEta[],
  max = 3,
  locale: AppLocale = 'zh-TW',
  t?: TranslateFn,
): EtaArrival[] {
  const tr: TranslateFn = t ?? ((key) => key)
  if (etas.length === 0) return []

  const sorted = [...etas].sort((a, b) => a.eta_seq - b.eta_seq)
  const picked: KmbStopEta[] = []
  const seenKeys = new Set<string>()

  for (const entry of sorted) {
    const key = entry.eta ?? `__status__:${entry.rmk_tc}`
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    picked.push(entry)
    if (picked.length >= max) break
  }

  return picked.map((e) => mapKmbStopEta(e, locale, tr))
}

export function formatArrivalTime(
  arrival: EtaArrival,
  mode: EtaDisplayMode,
  t: TranslateFn,
  clockFormat: ClockFormat = '24h',
  locale: AppLocale = 'zh-TW',
): string {
  if (!arrival.eta) return arrival.statusText ?? arrival.remarkLabel ?? '--'
  if (mode === 'clock') return formatEtaClock(arrival.eta, clockFormat, locale)
  const unit = t('minutesUnit')
  return localeUsesMinuteSuffix(unit)
    ? `${arrival.minutes}${unit}`
    : `${arrival.minutes} ${unit}`
}

function localeUsesMinuteSuffix(unit: string): boolean {
  return unit.length > 1 && !unit.includes(' ')
}

export function getEtaMinutesList(
  etas: KmbStopEta[],
  max = 3,
  locale: AppLocale = 'zh-TW',
  t?: TranslateFn,
): number[] {
  return getEtaArrivals(etas, max, locale, t).map((a) => a.minutes)
}

export function getNextEtaMinutes(
  etas: KmbStopEta[],
  locale: AppLocale = 'zh-TW',
  t?: TranslateFn,
): number | null {
  return getEtaArrivals(etas, 1, locale, t)[0]?.minutes ?? null
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function directionLabel(dest: string, t: TranslateFn): string {
  return t('towards', { dest })
}

export function localizedStopName(
  locale: AppLocale,
  tc: string,
  sc?: string,
  en?: string,
): string {
  return pickLocalizedText(locale, tc, sc, en)
}

export function searchItemDest(item: RouteSearchItem, locale: AppLocale): string {
  return pickLocalizedText(locale, item.destTc, item.destSc, item.destEn)
}

export function operatorLabel(operator: TransportOperator, t: TranslateFn): string {
  const map = {
    KMB: t('operatorKmb'),
    CTB: t('operatorCtb'),
    GMB: t('operatorGmb'),
    NLB: t('operatorNlb'),
    MTR: t('operatorMtr'),
  } as const
  return map[operator]
}

export function searchResultLabel(
  dest: string,
  operator: TransportOperator | undefined,
  t: TranslateFn,
): string {
  const base = t('towards', { dest })
  if (!operator || operator === 'KMB') return base
  return `${base} - ${operatorLabel(operator, t)}`
}

/** Letters A–Z that appear in route codes (e.g. 8H, 1A, 10P). */
export function collectRouteLetters(routeNames: string[]): string[] {
  const letters = new Set<string>()
  for (const name of routeNames) {
    for (const ch of name.toUpperCase()) {
      if (ch >= 'A' && ch <= 'Z') letters.add(ch)
    }
  }
  return [...letters].sort()
}

/** Next keypresses that keep at least one matching route (for smart keypad). */
export function getValidRouteKeypresses(query: string, routeNames: string[]): Set<string> {
  const q = query.toUpperCase().trim()
  const unique = [...new Set(routeNames.map((r) => r.toUpperCase()))]
  const keys = new Set<string>()

  if (!q) {
    for (const route of unique) {
      if (route.length > 0) keys.add(route[0])
    }
    return keys
  }

  for (const route of unique) {
    if (!route.startsWith(q)) continue
    if (route.length > q.length) keys.add(route[q.length])
  }

  return keys
}

