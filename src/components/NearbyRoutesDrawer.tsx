import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RouteStopPoint, TransportOperator } from '../types/transport'
import { useTranslation } from '../i18n/I18nContext'
import { useSettings } from '../hooks/useSettings'
import {
  findNearbyRoutes,
  nearbyRoutePath,
  type NearbyRouteHit,
  type NearbyRoutesQuery,
} from '../services/nearbyRoutes'
import { searchItemDest, searchResultLabel, localizedStopName } from '../utils/helpers'

interface NearbyRoutesDrawerProps {
  open: boolean
  onClose: () => void
  point: RouteStopPoint | null
  operator: TransportOperator
  route: string
  direction: string
  serviceType?: string
  mtrLineRef?: string
  mtrReferenceId?: string
  routeId?: number
}

export function NearbyRoutesDrawer({
  open,
  onClose,
  point,
  operator,
  route,
  direction,
  serviceType,
  mtrLineRef,
  mtrReferenceId,
  routeId,
}: NearbyRoutesDrawerProps) {
  const { t } = useTranslation()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<NearbyRouteHit[]>([])

  useEffect(() => {
    if (!open || !point) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setResults([])

    const query: NearbyRoutesQuery = {
      nameTc: point.nameTc,
      operator,
      route,
      direction,
      serviceType,
      mtrLineRef,
      mtrReferenceId,
      routeId,
    }

    findNearbyRoutes(query)
      .then((hits) => {
        if (!cancelled) setResults(hits)
      })
      .catch(() => {
        if (!cancelled) setError(t('nearbyRoutesError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    open,
    point,
    operator,
    route,
    direction,
    serviceType,
    mtrLineRef,
    mtrReferenceId,
    routeId,
    t,
  ])

  if (!open || !point) return null

  const stopTitle = localizedStopName(
    settings.locale,
    point.nameTc,
    point.nameSc,
    point.nameEn,
  )

  const handleSelect = (hit: NearbyRouteHit) => {
    onClose()
    navigate(nearbyRoutePath(hit))
  }

  return (
    <div className="settings-overlay" onClick={onClose} role="presentation">
      <div
        className="settings-drawer nearby-routes-drawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={t('nearbyRoutes')}
      >
        <div className="settings-drawer__header">
          <h2>{t('nearbyRoutes')}</h2>
          <button className="btn-touch settings-drawer__close" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>

        <p className="nearby-routes-drawer__stop">{stopTitle}</p>

        {loading && <div className="loading-spinner nearby-routes-drawer__loading">{t('nearbyRoutesLoading')}</div>}
        {error && <div className="error-message nearby-routes-drawer__error">{error}</div>}

        {!loading && !error && results.length === 0 && (
          <p className="nearby-routes-drawer__empty">{t('nearbyRoutesEmpty')}</p>
        )}

        {!loading && results.length > 0 && (
          <ul className="search-results nearby-routes-drawer__list" aria-label={t('nearbyRoutes')}>
            {results.map((hit) => (
              <li key={nearbyRoutePath(hit)}>
                <button className="search-result-item" onClick={() => handleSelect(hit)}>
                  <span className="route-number">{hit.item.route}</span>
                  <span className="search-result-item__dest">
                    {searchResultLabel(
                      searchItemDest(hit.item, settings.locale),
                      hit.item.operator,
                      t,
                    )}
                  </span>
                  <span className="search-result-item__chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
